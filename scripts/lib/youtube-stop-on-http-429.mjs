import fs from "node:fs";
import path from "node:path";

const mode = process.env.YOUTUBE_CAMPAIGN_HTTP429_MODE;
const evidencePath = "outputs/youtube-campaign-http429-stop.json";
export const campaignHttp429GuardEnabled = mode === "stop" || mode === "preserve-receipt";

function stop() {
  const message = "Provider HTTP 429; campaign stopped before another request.";
  if (mode === "preserve-receipt") throw new Error(message);
  console.error(message);
  process.exit(75);
}

export function stopIfCampaignHitHttp429() {
  if (campaignHttp429GuardEnabled && fs.existsSync(evidencePath)) stop();
}

export function recordCampaignHttp429(source) {
  if (!campaignHttp429GuardEnabled) return;
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  try {
    fs.writeFileSync(evidencePath, `${JSON.stringify({ status: 429, source, observedAt: new Date().toISOString() })}\n`, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  stop();
}

if (campaignHttp429GuardEnabled) {
  const fetchRequest = globalThis.fetch;
  globalThis.fetch = async (resource, options) => {
    stopIfCampaignHitHttp429();
    const response = await fetchRequest(resource, options);
    if (response.status === 429) {
      const requestUrl = response.url || resource?.url || resource;
      recordCampaignHttp429(new URL(requestUrl).hostname);
    }
    return response;
  };
}
