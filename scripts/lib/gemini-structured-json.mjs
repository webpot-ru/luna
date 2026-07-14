const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_TIMEOUT_MS = 120000;

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function boundedError(error) {
  return cleanText(error?.message || String(error || "unknown Gemini error")).slice(0, 800);
}

export function isRecoverableGeminiProviderError(error) {
  const message = boundedError(error);
  return [
    /no direct Gemini API keys configured/iu,
    /returned no text/iu,
    /did not return JSON/iu,
    /did not return every requestId/iu,
    /did not return the exact requestId set/iu,
    /Unexpected token/iu,
    /JSON\.parse/iu,
    /timed out/iu,
    /fetch failed/iu,
    /ECONNRESET/iu,
    /ENETUNREACH/iu,
    /HTTP 403/iu,
    /HTTP 429/iu,
    /HTTP 5\d\d/iu,
    /PERMISSION_DENIED/iu,
    /RESOURCE_EXHAUSTED/iu,
  ].some((pattern) => pattern.test(message));
}

function isDirectKeyRotationError(error) {
  const message = boundedError(error);
  return [
    /HTTP 403/iu,
    /HTTP 429/iu,
    /PERMISSION_DENIED/iu,
    /RESOURCE_EXHAUSTED/iu,
  ].some((pattern) => pattern.test(message));
}

export function parseGeminiBackendChain(value, { hasDirectApiKey = false } = {}) {
  const fallback = hasDirectApiKey ? "api" : "cli";
  const requested = String(value || fallback)
    .split(",")
    .map((backend) => backend.trim().toLowerCase())
    .filter(Boolean);
  const supported = new Set(["api", "vectorengine", "cli"]);
  const result = [];
  for (const backend of requested) {
    if (!supported.has(backend)) {
      throw new Error(`Unsupported Gemini backend: ${backend}. Expected api, vectorengine or cli.`);
    }
    if (!result.includes(backend)) result.push(backend);
  }
  if (result.length === 0) result.push(fallback);
  return result;
}

export function getDirectGeminiApiKeys(env = process.env) {
  const primaryName = env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "GOOGLE_API_KEY";
  const candidates = [
    [primaryName, env.GEMINI_API_KEY || env.GOOGLE_API_KEY],
    ["GEMINI_API_KEY_2", env.GEMINI_API_KEY_2],
  ];
  const seen = new Set();
  return candidates.flatMap(([name, value]) => {
    const apiKey = String(value || "").trim();
    if (!apiKey || seen.has(apiKey)) return [];
    seen.add(apiKey);
    return [{ name, apiKey }];
  });
}

function parseGeminiTextResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error(`Gemini API returned no text: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return text;
}

export async function callGeminiApiJsonWithKeys({
  prompt,
  schema,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  maxOutputTokens = 1600,
  temperature = 0.35,
  systemInstruction = "Return strict JSON only. Do not use Markdown.",
  apiKeys = getDirectGeminiApiKeys(),
  fetchImpl = globalThis.fetch,
  timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
} = {}) {
  if (!prompt) throw new Error("Gemini API prompt is required.");
  if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
    throw new Error("No direct Gemini API keys configured.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Gemini API fetch implementation is unavailable.");
  const parsedTimeoutMs = Number(timeoutMs);
  const effectiveTimeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs >= 1000
    ? parsedTimeoutMs
    : DEFAULT_TIMEOUT_MS;

  let lastError;
  for (let index = 0; index < apiKeys.length; index += 1) {
    const entry = apiKeys[index];
    const apiKey = String(entry?.apiKey || entry || "").trim();
    const keyName = String(entry?.name || `key_${index + 1}`);
    if (!apiKey) continue;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);
    try {
      const body = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
          maxOutputTokens,
        },
      };
      const response = await fetchImpl(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status} via ${keyName}: ${JSON.stringify(data).slice(0, 800)}`);
      }
      return {
        value: JSON.parse(parseGeminiTextResponse(data)),
        provider: "api",
        keyName,
        keyIndex: index,
        model,
      };
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? new Error(`Gemini API timed out after ${effectiveTimeoutMs}ms via ${keyName}.`)
        : error;
      const hasNextKey = index < apiKeys.length - 1;
      if (!hasNextKey || !isDirectKeyRotationError(lastError)) throw lastError;
      console.warn(`[GEMINI_DIRECT_KEY_FALLBACK] ${keyName}: ${boundedError(lastError)}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("No usable direct Gemini API keys configured.");
}

export async function runGeminiBackendChain({ backends, providers } = {}) {
  if (!Array.isArray(backends) || backends.length === 0) {
    throw new Error("Gemini backend chain is empty.");
  }
  let lastError;
  for (let index = 0; index < backends.length; index += 1) {
    const backend = backends[index];
    const provider = providers?.[backend];
    if (typeof provider !== "function") {
      throw new Error(`Gemini backend ${backend} is not configured.`);
    }
    try {
      const result = await provider();
      return {
        ...result,
        backend,
      };
    } catch (error) {
      lastError = error;
      const hasNextBackend = index < backends.length - 1;
      if (!hasNextBackend || !isRecoverableGeminiProviderError(error)) throw error;
      console.warn(`[GEMINI_BACKEND_FALLBACK] ${backend}: ${boundedError(error)}`);
    }
  }
  throw lastError || new Error("Gemini backend chain failed without an error.");
}
