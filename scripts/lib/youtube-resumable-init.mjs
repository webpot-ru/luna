// A failed creation POST may still allocate a YouTube video record. Never
// repeat videos.insert blindly; the exact assignment must be reconciled first.
export async function startResumableSession({ url, headers, resource, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(resource) });
  } catch (cause) {
    throw new Error("YouTube videos.insert init outcome is unknown; automatic creation retry is disabled. Reconcile the exact live assignment before another upload.", { cause });
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`YouTube videos.insert init failed (${response.status}) after 1 attempt; no automatic creation retry. Reconcile live state before retrying: ${detail}`);
  }
  const location = response.headers.get("location");
  if (!location) throw new Error("YouTube videos.insert init returned no resumable URL; outcome is unknown. Reconcile live state; do not repeat the creation POST.");
  return location;
}
