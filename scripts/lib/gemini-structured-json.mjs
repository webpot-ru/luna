const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_TIMEOUT_MS = 120000;
const LARGE_RESPONSE_TIMEOUT_MS = 600000;
const LARGE_RESPONSE_TOKEN_THRESHOLD = 10000;
export const GEMINI_STRUCTURED_BATCH_MAX_OUTPUT_TOKENS = 60000;

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function boundedError(error) {
  return cleanText(error?.message || String(error || "unknown Gemini error")).slice(0, 800);
}

const RESPONSE_INTEGRITY_ERROR_CODES = new Set([
  "GEMINI_INCOMPLETE_RESPONSE",
  "GEMINI_INVALID_JSON",
  "GEMINI_INVALID_RESPONSE",
]);

function responseIntegrityError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function isResponseIntegrityError(error) {
  return RESPONSE_INTEGRITY_ERROR_CODES.has(String(error?.code || ""));
}

export function isRecoverableGeminiProviderError(error) {
  if (isResponseIntegrityError(error)) return true;
  const message = boundedError(error);
  return [
    /no direct Gemini API keys configured/iu,
    /returned no text/iu,
    /did not return JSON/iu,
    /did not return every requestId/iu,
    /did not return the exact requestId set/iu,
    /Unexpected token/iu,
    /Unexpected end of JSON input/iu,
    /Unterminated string/iu,
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
  if (isResponseIntegrityError(error)) return true;
  const message = boundedError(error);
  return [
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

export function resolveGeminiTimeoutMs({ maxOutputTokens = 1600, timeoutMs, env = process.env } = {}) {
  const configured = timeoutMs ?? env.GEMINI_TIMEOUT_MS;
  if (configured !== undefined && configured !== null && String(configured).trim() !== "") {
    const parsed = Number(configured);
    if (Number.isFinite(parsed) && parsed >= 1000) return parsed;
  }
  return Number(maxOutputTokens) >= LARGE_RESPONSE_TOKEN_THRESHOLD
    ? LARGE_RESPONSE_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS;
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
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error(`Gemini API returned no text: ${JSON.stringify(data).slice(0, 500)}`);
  }
  const finishReason = String(candidate?.finishReason || "").trim().toUpperCase();
  if (finishReason && finishReason !== "STOP") {
    throw responseIntegrityError(
      "GEMINI_INCOMPLETE_RESPONSE",
      `Gemini API returned an incomplete response: finishReason=${finishReason}, textLength=${text.length}.`,
    );
  }
  return { text, finishReason: finishReason || "UNKNOWN" };
}

export async function callGeminiApiJsonWithKeys({
  prompt,
  schema,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  maxOutputTokens = 1600,
  temperature = 0.35,
  systemInstruction = "Return strict JSON only. Do not use Markdown.",
  validateValue,
  apiKeys = getDirectGeminiApiKeys(),
  fetchImpl = globalThis.fetch,
  timeoutMs,
} = {}) {
  if (!prompt) throw new Error("Gemini API prompt is required.");
  if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
    throw new Error("No direct Gemini API keys configured.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Gemini API fetch implementation is unavailable.");
  const effectiveTimeoutMs = resolveGeminiTimeoutMs({ maxOutputTokens, timeoutMs });

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
      const parsedResponse = parseGeminiTextResponse(data);
      let value;
      try {
        value = JSON.parse(parsedResponse.text);
      } catch (error) {
        throw responseIntegrityError(
          "GEMINI_INVALID_JSON",
          `Gemini API returned invalid JSON via ${keyName}: finishReason=${parsedResponse.finishReason}; ${boundedError(error)}`,
          error,
        );
      }
      if (typeof validateValue === "function") {
        try {
          await validateValue(value);
        } catch (error) {
          throw responseIntegrityError(
            "GEMINI_INVALID_RESPONSE",
            `Gemini API response validation failed via ${keyName}: ${boundedError(error)}`,
            error,
          );
        }
      }
      return {
        value,
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
