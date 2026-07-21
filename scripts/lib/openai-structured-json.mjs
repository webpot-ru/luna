const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_TIMEOUT_MS = 600000;
const ALLOWED_SERVICE_TIERS = new Set(["auto", "default", "flex"]);

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}
function normalizeStrictSchema(value) {
  if (Array.isArray(value)) return value.map(normalizeStrictSchema);
  if (!value || typeof value !== "object") return value;
  const result = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, normalizeStrictSchema(child)]),
  );
  if (result.type === "object" && result.properties && typeof result.properties === "object") {
    result.additionalProperties = false;
    result.required = Object.keys(result.properties);
  }
  return result;
}

function extractOutputText(data) {
  const texts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "refusal") {
        throw new Error(`OpenAI refused structured metadata: ${cleanText(content.refusal).slice(0, 500)}`);
      }
      if (content?.type === "output_text" && content.text) texts.push(content.text);
    }
  }
  return texts.join("").trim();
}

export function resolveOpenAiServiceTier(value = process.env.OPENAI_SERVICE_TIER || "auto") {
  const tier = String(value || "auto").trim().toLowerCase();
  if (!ALLOWED_SERVICE_TIERS.has(tier)) {
    throw new Error(`Unsupported OpenAI service tier: ${tier}. Expected auto, default or flex.`);
  }
  return tier;
}

export function estimateOpenAiRequestTokenUpperBound({ prompt, schema, systemInstruction = "Return strict JSON only. Do not use Markdown." } = {}) {
  const requestText = JSON.stringify({ instructions: systemInstruction, input: prompt, schema: normalizeStrictSchema(schema) });
  return Buffer.byteLength(requestText, "utf8");
}

export async function callOpenAiStructuredJson({
  prompt,
  schema,
  model = process.env.OPENAI_METADATA_MODEL || DEFAULT_MODEL,
  maxOutputTokens = 12000,
  serviceTier = process.env.OPENAI_SERVICE_TIER || "auto",
  timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  systemInstruction = "Return strict JSON only. Do not use Markdown.",
  validateValue,
  apiKey = process.env.OPENAI_API_KEY,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!String(apiKey || "").trim()) throw new Error("No OpenAI API key configured.");
  if (!prompt) throw new Error("OpenAI structured metadata prompt is required.");
  if (!schema) throw new Error("OpenAI structured metadata schema is required.");
  if (typeof fetchImpl !== "function") throw new Error("OpenAI API fetch implementation is unavailable.");
  const resolvedTier = resolveOpenAiServiceTier(serviceTier);
  const resolvedTimeoutMs = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) >= 1000
    ? Number(timeoutMs)
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolvedTimeoutMs);
  let response;
  let data;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${String(apiKey).trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: systemInstruction,
        input: prompt,
        max_output_tokens: maxOutputTokens,
        service_tier: resolvedTier,
        store: false,
        reasoning: { effort: "low" },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "lunacards_youtube_metadata",
            strict: true,
            schema: normalizeStrictSchema(schema),
          },
        },
      }),
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`OpenAI API timed out after ${resolvedTimeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`OpenAI API HTTP ${response.status}: ${cleanText(data?.error?.message || JSON.stringify(data)).slice(0, 800)}`);
  }
  if (data.status !== "completed") {
    throw new Error(`OpenAI API returned incomplete response: status=${data.status || "missing"}; ${cleanText(JSON.stringify(data.incomplete_details || data.error || {})).slice(0, 500)}`);
  }
  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("OpenAI API returned no structured output text.");
  let value;
  try {
    value = JSON.parse(outputText);
  } catch (error) {
    throw new Error(`OpenAI API returned invalid JSON: ${cleanText(error?.message).slice(0, 300)}`);
  }
  if (typeof validateValue === "function") await validateValue(value);
  const usage = {
    inputTokens: Number(data.usage?.input_tokens || 0),
    outputTokens: Number(data.usage?.output_tokens || 0),
    totalTokens: Number(data.usage?.total_tokens || 0),
    reasoningTokens: Number(data.usage?.output_tokens_details?.reasoning_tokens || 0),
  };
  return {
    value,
    provider: "openai",
    model: data.model || model,
    serviceTier: data.service_tier || resolvedTier,
    responseId: data.id || "",
    usage,
  };
}
