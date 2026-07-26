import { defaultVoiceMap } from "./tts-voice-map.mjs";

function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/gu, "-").toUpperCase();
}

function declaredReadiness(channelRegistry = {}, channel = {}) {
  const value = channel?.videoProductionReadiness ?? channelRegistry?.defaults?.videoProductionReadiness;
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function voiceForSupport(channel = {}, supportLang = "") {
  const candidates = [supportLang, ...(channel?.supportLangs || [])]
    .map(normalizeLanguageCode)
    .filter(Boolean);
  for (const support of candidates) {
    if (defaultVoiceMap[support]) return { supportLang: support, voiceId: defaultVoiceMap[support] };
  }
  return { supportLang: candidates[0] || "", voiceId: "" };
}

function voiceProvider(voiceId) {
  if (String(voiceId).startsWith("edge_")) return "edge";
  if (String(voiceId).startsWith("ai33_")) return "ai33";
  return "unknown";
}

export function longVideoUploadAllowed(channelRegistry = {}, channel = {}) {
  const defaultValue = channelRegistry?.defaults?.longVideoUploadAllowed;
  const channelValue = channel?.longVideoUploadAllowed;
  if (channelValue === true) return true;
  if (channelValue === false) return false;
  return defaultValue === true;
}

// This is intentionally a no-spend gate. It proves that a support language has
// a configured production path and honours an explicit known-provider block;
// it never calls TTS or a rendering provider during campaign planning.
export function resolveYoutubeVideoProductionReadiness(channelRegistry = {}, channel = {}, supportLang = "") {
  const { supportLang: resolvedSupport, voiceId } = voiceForSupport(channel, supportLang);
  const provider = voiceProvider(voiceId);
  const declared = declaredReadiness(channelRegistry, channel);
  const status = String(declared.status || "").trim().toLowerCase();
  const reason = String(declared.reason || "").trim();
  const checkedAt = String(declared.checkedAt || "").trim();

  if (!voiceId) {
    return {
      ready: false,
      status: "blocked",
      reason: "tts_voice_not_configured",
      checkedAt,
      provider,
      voiceId: "",
      supportLang: resolvedSupport,
    };
  }
  if (["blocked", "unavailable", "failed"].includes(status)) {
    return {
      ready: false,
      status: "blocked",
      reason: reason || "production_provider_marked_unavailable",
      checkedAt,
      provider,
      voiceId,
      supportLang: resolvedSupport,
    };
  }
  if (status && status !== "ready") {
    return {
      ready: false,
      status: "blocked",
      reason: reason || `unsupported_production_readiness_status:${status}`,
      checkedAt,
      provider,
      voiceId,
      supportLang: resolvedSupport,
    };
  }
  if (provider !== "edge" && status === "ready" && !checkedAt) {
    return {
      ready: false,
      status: "blocked",
      reason: `${provider || "unknown"}_provider_ready_status_requires_checkedAt`,
      checkedAt,
      provider,
      voiceId,
      supportLang: resolvedSupport,
    };
  }
  if (provider !== "edge" && status !== "ready") {
    return {
      ready: false,
      status: "blocked",
      reason: reason || `${provider || "unknown"}_provider_requires_explicit_ready_verification`,
      checkedAt,
      provider,
      voiceId,
      supportLang: resolvedSupport,
    };
  }
  return {
    ready: true,
    status: status || "configured",
    reason: reason || "configured_tts_voice",
    checkedAt,
    provider,
    voiceId,
    supportLang: resolvedSupport,
  };
}
