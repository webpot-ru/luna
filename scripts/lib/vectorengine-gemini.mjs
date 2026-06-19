const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_METHOD = "generateContent";
const DEFAULT_TIMEOUT_MS = 120000;

function cleanBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/u, "");
}

function normalizeTimeoutMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1000) return DEFAULT_TIMEOUT_MS;
  return parsed;
}

export function getVectorEngineGeminiKey() {
  const keyName = process.env.VECTORENGINE_API_KEY
    ? "VECTORENGINE_API_KEY"
    : "VECTOR_ENGINE_API_KEY";
  const apiKey = process.env.VECTORENGINE_API_KEY || process.env.VECTOR_ENGINE_API_KEY || "";
  return { apiKey, keyName };
}

function extractTextFromGeminiPayload(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("");
}

export function parseVectorEngineGeminiText(bodyText) {
  const raw = String(bodyText || "").trim();
  if (!raw) return "";

  let sseText = "";
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice("data:".length).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      sseText += extractTextFromGeminiPayload(JSON.parse(payload));
    } catch {
      // Ignore malformed stream chunks and fall back to full-body parsing below.
    }
  }
  if (sseText.trim()) return sseText.trim();

  try {
    return extractTextFromGeminiPayload(JSON.parse(raw)).trim();
  } catch {
    return raw;
  }
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("VectorEngine Gemini returned empty text.");
  try {
    return JSON.parse(raw);
  } catch {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error(`VectorEngine Gemini did not return JSON: ${raw.slice(0, 500)}`);
    }
    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  }
}

export async function callVectorEngineGeminiJson({
  prompt,
  schema,
  model = process.env.VECTORENGINE_GEMINI_MODEL || DEFAULT_MODEL,
  method = process.env.VECTORENGINE_GEMINI_METHOD || DEFAULT_METHOD,
  baseUrl = process.env.VECTORENGINE_BASE_URL || DEFAULT_BASE_URL,
  maxOutputTokens = 1600,
  temperature = 0.35,
  timeoutMs = normalizeTimeoutMs(process.env.VECTORENGINE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  systemInstruction = "Return strict JSON only. Do not use Markdown."
} = {}) {
  const { apiKey } = getVectorEngineGeminiKey();
  if (!apiKey) {
    throw new Error("VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY is required for VectorEngine Gemini.");
  }
  if (!prompt) throw new Error("VectorEngine Gemini prompt is required.");

  const cleanUrl = cleanBaseUrl(baseUrl);
  const normalizedMethod = method === "streamGenerateContent" ? "streamGenerateContent" : "generateContent";
  const altParam = normalizedMethod === "streamGenerateContent" ? "&alt=sse" : "";
  const endpoint = `${cleanUrl}/v1beta/models/${encodeURIComponent(model)}:${normalizedMethod}?key=${encodeURIComponent(apiKey)}${altParam}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
      topP: 1,
      maxOutputTokens
    }
  };
  if (schema && process.env.VECTORENGINE_SEND_RESPONSE_SCHEMA === "1") {
    body.generationConfig.responseSchema = schema;
  }

  let response;
  let bodyText;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    bodyText = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`VectorEngine Gemini timed out after ${timeoutMs}ms for model ${model}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    let message = bodyText.slice(0, 800);
    try {
      const data = JSON.parse(bodyText);
      message = data.error?.message || data.message || message;
    } catch {
      // Keep the bounded raw message.
    }
    throw new Error(`VectorEngine Gemini HTTP ${response.status}: ${message}`);
  }

  return extractJsonObject(parseVectorEngineGeminiText(bodyText));
}
