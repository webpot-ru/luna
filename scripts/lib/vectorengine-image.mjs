import fs from "node:fs";

export const DEFAULT_VECTORENGINE_BASE_URL = "https://api.vectorengine.ai";
export const DEFAULT_VECTORENGINE_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_VECTORENGINE_IMAGE_TIMEOUT_MS = 420000;

export function loadDotEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [rawKey, ...rawValueParts] = line.split("=");
    const key = rawKey.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key]) continue;
    let value = rawValueParts.join("=").trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

export function getVectorEngineApiKey() {
  const keyName = process.env.VECTORENGINE_API_KEY
    ? "VECTORENGINE_API_KEY"
    : "VECTOR_ENGINE_API_KEY";
  const apiKey = process.env.VECTORENGINE_API_KEY || process.env.VECTOR_ENGINE_API_KEY || "";
  return { keyName, apiKey };
}

export async function callVectorEngineImage({
  prompt,
  model = process.env.VECTORENGINE_IMAGE_MODEL || DEFAULT_VECTORENGINE_IMAGE_MODEL,
  size = "1536x864",
  apiKey,
  baseUrl = process.env.VECTORENGINE_BASE_URL || DEFAULT_VECTORENGINE_BASE_URL,
  timeoutMs = Number(process.env.VECTORENGINE_IMAGE_TIMEOUT_MS || DEFAULT_VECTORENGINE_IMAGE_TIMEOUT_MS),
}) {
  if (!apiKey) {
    throw new Error("VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY is required for VectorEngine image generation.");
  }
  const endpoint = String(baseUrl || DEFAULT_VECTORENGINE_BASE_URL).replace(/\/+$/u, "");
  const response = await fetch(`${endpoint}/v1/images/generations`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1,
    }),
  });
  const bodyText = await response.text();
  if (!response.ok) {
    let message = bodyText.slice(0, 800);
    try {
      const data = JSON.parse(bodyText);
      message = data.error?.message || data.message || message;
    } catch {
      // Keep bounded raw response text.
    }
    throw new Error(`VectorEngine image HTTP ${response.status}: ${message}`);
  }

  const data = JSON.parse(bodyText);
  const first = data.data?.[0];
  if (!first) throw new Error(`VectorEngine image response missing data[0]: ${bodyText.slice(0, 500)}`);
  if (first.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first.url) {
    const imageResponse = await fetch(first.url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!imageResponse.ok) throw new Error(`VectorEngine image URL fetch HTTP ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error(`VectorEngine image response has neither b64_json nor url: ${JSON.stringify(first).slice(0, 500)}`);
}
