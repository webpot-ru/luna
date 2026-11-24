import fs from "node:fs";
import path from "node:path";

const mode = process.env.YOUTUBE_CAMPAIGN_HTTP429_MODE;
const stopOn403 = process.env.YOUTUBE_CAMPAIGN_STOP_ON_403 === "1";
const evidencePath = "outputs/youtube-campaign-http429-stop.json";
export const campaignHttp429GuardEnabled = mode === "stop" || mode === "preserve-receipt";

function stop(status) {
  const message = `Provider HTTP ${status}; campaign stopped before another request.`;
  if (mode === "preserve-receipt") throw new Error(message);
  console.error(message);
  process.exit(75);
}

export function stopIfCampaignHitHttp429() {
  if (campaignHttp429GuardEnabled && fs.existsSync(evidencePath)) {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    stop(evidence.status);
  }
}

function recordStop(status, source) {
  if (!campaignHttp429GuardEnabled) return;
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  try {
    fs.writeFileSync(evidencePath, `${JSON.stringify({ status, source, observedAt: new Date().toISOString() })}\n`, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  stopIfCampaignHitHttp429();
}

export function recordCampaignHttp403(source) {
  if (stopOn403) recordStop(403, source);
}

export function recordCampaignHttp429(source) {
  recordStop(429, source);
}

if (campaignHttp429GuardEnabled) {
  const fetchRequest = globalThis.fetch;
  globalThis.fetch = async (resource, options) => {
    stopIfCampaignHitHttp429();
    const response = await fetchRequest(resource, options);
    if (response.status === 429 || (response.status === 403 && stopOn403)) {
      const requestUrl = response.url || resource?.url || resource;
      recordStop(response.status, new URL(requestUrl).hostname);
    }
    return response;
  };
}
