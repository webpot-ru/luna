import { sameViewerLanguageTargetBlocker } from "./youtube-language-pair-policy.mjs";

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function canonicalSupportCode(value) {
  const code = normalizeCode(value);
  if (code === "EN-GB") return "EN";
  if (code === "ES") return "ES-419";
  if (code === "PT") return "PT-BR";
  return code;
}

function isPolyglotRow(row = {}) {
  return row.videoType === "polyglot" || Boolean(row.polyglotKey) || normalizeCode(row.targetLang || row.targetLangsCsv).includes(",");
}

function normalizedTargetLangs(row = {}) {
  const values = Array.isArray(row.targetLangs)
    ? row.targetLangs.map(normalizeCode).filter(Boolean)
    : normalizeCode(row.targetLang || row.targetLangsCsv).split(",").filter(Boolean);
  return [...new Set(values)].sort();
}

function orderedUniqueCodes(values = []) {
  return [...new Set(values.map(normalizeCode).filter(Boolean))];
}

function parsedPolyglotKey(row = {}) {
  const parts = String(row.polyglotKey || "").split(":");
  return parts[0] === "polyglot" ? parts : [];
}

function polyglotContentScope(row = {}) {
  const parts = parsedPolyglotKey(row);
  return String(row.contentScope || parts[5] || "full").trim().toLowerCase() || "full";
}

function polyglotBundleKey(row = {}) {
  const parts = parsedPolyglotKey(row);
  return String(row.bundleKey || parts[3] || "").trim();
}

function polyglotTargetSetKey(row = {}) {
  const parts = parsedPolyglotKey(row);
  return [
    "polyglot-target-set",
    row.setId || parts[1] || "",
    canonicalSupportCode(row.supportLang || parts[2]),
    polyglotContentScope(row),
    normalizedTargetLangs(row).join(","),
  ].join("|");
}

function polyglotSlotKey(row = {}) {
  const parts = parsedPolyglotKey(row);
  const bundleKey = polyglotBundleKey(row);
  if (!bundleKey) return polyglotTargetSetKey(row);
  return [
    "polyglot-slot",
    row.setId || parts[1] || "",
    canonicalSupportCode(row.supportLang || parts[2]),
    bundleKey,
    polyglotContentScope(row),
  ].join("|");
}

// A learning product is identified by support channel and bundle. Content
// scope is deliberately excluded: an unverified short must not coexist with
// the later full version of the same bundle on one channel.
function polyglotProductSlotKey(row = {}) {
  const parts = parsedPolyglotKey(row);
  const bundleKey = polyglotBundleKey(row);
  if (!bundleKey) {
    return [
      "polyglot-product-target-set",
      row.setId || parts[1] || "",
      canonicalSupportCode(row.supportLang || parts[2]),
      normalizedTargetLangs(row).join(","),
    ].join("|");
  }
  return [
    "polyglot-product-slot",
    row.setId || parts[1] || "",
    canonicalSupportCode(row.supportLang || parts[2]),
    bundleKey,
  ].join("|");
}

function resolvePolyglotBundleTargets(bundle = {}, supportLang) {
  const desiredCount = orderedUniqueCodes(bundle.targetLangs).length;
  const targetLangs = [];
  const removedSupportTargets = [];
  const fallbackAdded = [];

  for (const targetLang of orderedUniqueCodes(bundle.targetLangs)) {
    if (sameViewerLanguageTargetBlocker({ supportLang, targetLang })) {
      removedSupportTargets.push(targetLang);
      continue;
    }
    targetLangs.push(targetLang);
  }

  for (const targetLang of orderedUniqueCodes(bundle.fallbackLangs)) {
    if (targetLangs.length >= desiredCount) break;
    if (targetLangs.includes(targetLang) || sameViewerLanguageTargetBlocker({ supportLang, targetLang })) continue;
    targetLangs.push(targetLang);
    fallbackAdded.push(targetLang);
  }

  return { targetLangs, removedSupportTargets, fallbackAdded, desiredCount };
}

function isActive(row = {}) {
  if (!row.youtubeVideoId) return false;
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  return !["failed", "deleted", "superseded", "cancel"].some((token) => status.includes(token));
}

function isActiveReservation(row = {}) {
  if (!row.channelKey || !row.publishAt) return false;
  if (row.cancelledAt || row.deletedAt || row.supersededAt) return false;
  const status = String(row.status || row.publicationStatus || "").toLowerCase();
  return !["failed", "deleted", "superseded", "cancel"].some((token) => status.includes(token));
}

function ordinaryAssignmentKey(row = {}) {
  return ["ordinary", row.setId || "", canonicalSupportCode(row.supportLang), normalizeCode(row.targetLang)].join("|");
}

function polyglotAssignmentKey(row = {}) {
  const parsedKey = parsedPolyglotKey(row);
  const bundleKey = polyglotBundleKey(row);
  const targetIdentity = row.targetLangsHash || parsedKey[4] || normalizedTargetLangs(row).join(",");
  if (bundleKey && targetIdentity) {
    return [
      "polyglot",
      row.setId || parsedKey[1] || "",
      canonicalSupportCode(row.supportLang || parsedKey[2]),
      bundleKey,
      targetIdentity,
      polyglotContentScope(row),
    ].join("|");
  }
  return polyglotTargetSetKey(row);
}

function assignmentKey(row = {}) {
  if (isPolyglotRow(row)) return polyglotAssignmentKey(row);
  return ordinaryAssignmentKey(row);
}

function calendarAssignmentKey(row = {}) {
  if (isPolyglotRow(row)) {
    return [polyglotSlotKey(row), row.channelKey || ""].join("|");
  }
  return [ordinaryAssignmentKey(row), row.channelKey || ""].join("|");
}

function uniqueVideoIds(rows) {
  return [...new Set(rows.map((row) => row.youtubeVideoId).filter(Boolean))].sort();
}

function duplicateVideoGroups(rows, keyFor = assignmentKey) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const values = groups.get(key) || [];
    values.push(row);
    groups.set(key, values);
  }
  return [...groups.entries()]
    .map(([key, values]) => ({ key, videoIds: uniqueVideoIds(values), rows: values }))
    .filter((group) => group.videoIds.length > 1)
    .map(({ key, videoIds, rows: values }) => ({
      key,
      videoIds,
      titles: [...new Set(values.map((row) => row.title).filter(Boolean))],
      setId: values[0]?.setId || "",
      supportLang: canonicalSupportCode(values[0]?.supportLang),
      targetLang: normalizeCode(values[0]?.targetLang),
    }));
}

function duplicateCalendarGroups(rows, keyFor) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const values = groups.get(key) || [];
    values.push(row);
    groups.set(key, values);
  }
  return [...groups.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([key, values]) => ({
      key,
      count: values.length,
      assignments: [...new Set(values.map(calendarAssignmentKey))].sort(),
      videoIds: uniqueVideoIds(values),
    }));
}

function polyglotCrossScopeGroups(rows) {
  const groups = new Map();
  for (const row of rows.filter(isPolyglotRow)) {
    const key = polyglotProductSlotKey(row);
    const values = groups.get(key) || [];
    values.push(row);
    groups.set(key, values);
  }
  return [...groups.entries()]
    .filter(([, values]) => new Set(values.map(polyglotContentScope)).size > 1)
    .map(([key, values]) => ({
      key,
      setId: values[0]?.setId || "",
      supportLang: canonicalSupportCode(values[0]?.supportLang),
      bundleKey: polyglotBundleKey(values[0]),
      scopes: [...new Set(values.map(polyglotContentScope))].sort(),
      videoIds: uniqueVideoIds(values),
    }));
}

function selectedRow(row, { setId, supports }) {
  if (setId && String(row.setId || "") !== String(setId)) return false;
  if (supports.size && !supports.has(canonicalSupportCode(row.supportLang))) return false;
  return true;
}

function auditRows(liveAudit = {}) {
  return (liveAudit.supportReports || []).flatMap((report) => report.matchedPublications || []);
}

function unclassifiedAuditRows(liveAudit = {}) {
  return (liveAudit.supportReports || []).flatMap((report) => (report.unmatchedVideos || []).map((row) => ({
    ...row,
    supportLang: canonicalSupportCode(row.supportLang || report.supportLang),
    channelKey: row.channelKey || report.channelKey || "",
    youtubeChannelId: row.youtubeChannelId || report.youtubeChannelId || "",
  })));
}

function videoStatus(row = {}) {
  return row.youtubeStatus || row.readback || row;
}

function isVisibleLiveRow(row = {}) {
  const status = row.youtubeStatus;
  if (!status) return true;
  return String(status.uploadStatus || "").toLowerCase() !== "not_returned";
}

function isYoutubeDeletedTombstone(row = {}) {
  return row.youtubeDeletedTombstone === true
    || (String(row.title || "").trim() === "Deleted video"
      && String(row.youtubeStatus?.uploadStatus || "").toLowerCase() === "not_returned");
}

function mergeNonEmpty(base, incoming) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    merged[key] = value;
  }
  return merged;
}

function publicationInventory(ordinaryRows, polyglotRows, liveRows) {
  const byVideoId = new Map();
  const add = (row, source) => {
    if (!row.youtubeVideoId) return;
    const current = byVideoId.get(row.youtubeVideoId) || { row: {}, sources: new Set() };
    current.row = mergeNonEmpty(current.row, row);
    current.sources.add(source);
    byVideoId.set(row.youtubeVideoId, current);
  };
  ordinaryRows.forEach((row) => add(row, "ordinary_registry"));
  polyglotRows.forEach((row) => add(row, "polyglot_registry"));
  liveRows.forEach((row) => add(row, "youtube_live_readback"));
  return [...byVideoId.values()].map(({ row, sources }) => {
    const status = videoStatus(row);
    const polyglot = row.videoType === "polyglot" || Boolean(row.polyglotKey) || normalizeCode(row.targetLang).includes(",");
    const targetLangs = Array.isArray(row.targetLangs)
      ? row.targetLangs.map(normalizeCode).filter(Boolean)
      : (polyglot ? normalizeCode(row.targetLang || row.targetLangsCsv).split(",").filter(Boolean) : []);
    return {
      videoType: polyglot ? "polyglot" : "ordinary",
      assignmentKey: assignmentKey(row),
      setId: row.setId || "",
      supportLang: canonicalSupportCode(row.supportLang),
      targetLang: polyglot ? "" : normalizeCode(row.targetLang),
      targetLangs,
      bundleKey: row.bundleKey || "",
      polyglotKey: row.polyglotKey || "",
      contentScope: polyglot ? polyglotContentScope(row) : "",
      polyglotSlotKey: polyglot ? polyglotSlotKey(row) : "",
      youtubeVideoId: row.youtubeVideoId,
      youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
      channelKey: row.channelKey || "",
      privacyStatus: status.privacyStatus || row.privacyStatus || "",
      publishAt: status.publishAt || row.publishAt || row.scheduledPublishAt || "",
      publicationStatus: row.publicationStatus || row.status || "",
      thumbnailSet: typeof row.thumbnailSet === "boolean" ? row.thumbnailSet : null,
      thumbnailUploadMode: row.thumbnailUploadMode || "",
      needsThumbnailPermission: row.needsThumbnailPermission === true,
      needsPlaylistInsert: row.needsPlaylistInsert === true,
      durableRegistryPresent: sources.has("ordinary_registry") || sources.has("polyglot_registry"),
      liveReadbackPresent: sources.has("youtube_live_readback"),
      sources: [...sources].sort(),
    };
  }).sort((a, b) => [a.supportLang, a.publishAt, a.assignmentKey, a.youtubeVideoId].join("|").localeCompare(
    [b.supportLang, b.publishAt, b.assignmentKey, b.youtubeVideoId].join("|"),
  ));
}

function datesBetween(start, end) {
  const dates = [];
  if (!start || !end || start >= end) return dates;
  let cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor < last) {
    cursor = new Date(cursor.getTime() + 86_400_000);
    const value = cursor.toISOString().slice(0, 10);
    if (value < end) dates.push(value);
  }
  return dates;
}

function calendarDayGaps(rows, gapStartDateByChannel = {}) {
  const byChannel = new Map();
  for (const row of rows) {
    if (!row.localDate) continue;
    const dates = byChannel.get(row.channelKey) || new Set();
    dates.add(row.localDate);
    byChannel.set(row.channelKey, dates);
  }
  const gaps = [];
  for (const [channelKey, dates] of byChannel) {
    const ordered = [...dates].sort();
    const configuredStart = String(gapStartDateByChannel[channelKey] || "");
    const firstDate = configuredStart && configuredStart < ordered[0] ? configuredStart : ordered[0];
    const missingDates = [
      ...(firstDate < ordered[0] && !dates.has(firstDate) ? [firstDate] : []),
      ...datesBetween(firstDate, ordered.at(-1)).filter((date) => !dates.has(date)),
    ];
    if (missingDates.length) gaps.push({ channelKey, firstDate, lastDate: ordered.at(-1), missingDates });
  }
  return gaps;
}

function targetAssignmentKey(setId, supportLang, targetLang) {
  return ordinaryAssignmentKey({ setId, supportLang, targetLang });
}

export function effectiveScheduleStartDate({ automaticStartDate, requestedStartDate = "", fillEarliest = false }) {
  if (!automaticStartDate) throw new Error("automaticStartDate is required");
  if (!requestedStartDate) return automaticStartDate;
  return fillEarliest && requestedStartDate > automaticStartDate ? automaticStartDate : requestedStartDate;
}

export function buildPublicationControlReport({
  ordinaryRegistry = { publications: [] },
  polyglotRegistry = { publications: [] },
  calendar = { reservations: [] },
  liveAudit = null,
  setId = "",
  supports = [],
  videoTypes = [],
  desiredTargetsBySupport = {},
  desiredPolyglotAssignmentsBySupport = {},
  proposedOrdinaryAssignments = [],
  proposedPolyglotAssignments = [],
  gapStartDateByChannel = {},
  requireCompleteLiveAudit = false,
  now = new Date(),
} = {}) {
  const nowMillis = now instanceof Date ? now.getTime() : Date.parse(now);
  const supportSet = new Set((supports || []).map(canonicalSupportCode).filter(Boolean));
  const videoTypeSet = new Set((videoTypes || []).map((value) => String(value || "").trim().toLowerCase()).filter(Boolean));
  const includesOrdinary = !videoTypeSet.size || videoTypeSet.has("ordinary");
  const includesPolyglot = !videoTypeSet.size || videoTypeSet.has("polyglot");
  const selectedVideoType = (row) => !videoTypeSet.size || videoTypeSet.has(isPolyglotRow(row) ? "polyglot" : "ordinary");
  const liveRows = auditRows(liveAudit || {})
    .filter((row) => selectedRow(row, { setId, supports: supportSet }))
    .filter(selectedVideoType);
  const deletedTombstoneRows = liveRows.filter(isYoutubeDeletedTombstone);
  const deletedTombstoneVideoIds = new Set(deletedTombstoneRows.map((row) => row.youtubeVideoId).filter(Boolean));
  const selectedOrdinaryRegistryRows = (ordinaryRegistry.publications || []).filter(isActive)
    .filter((row) => selectedRow(row, { setId, supports: supportSet }))
    .filter(selectedVideoType)
    .filter((row) => !deletedTombstoneVideoIds.has(row.youtubeVideoId));
  const ordinaryRows = selectedOrdinaryRegistryRows.filter((row) => !isPolyglotRow(row));
  const legacyPolyglotRows = selectedOrdinaryRegistryRows.filter(isPolyglotRow);
  const polyglotRows = [
    ...legacyPolyglotRows,
    ...(polyglotRegistry.publications || []).filter(isActive)
      .filter((row) => selectedRow(row, { setId, supports: supportSet }))
      .filter(selectedVideoType)
      .filter((row) => !deletedTombstoneVideoIds.has(row.youtubeVideoId)),
  ];
  const visibleLiveRows = liveRows.filter(isVisibleLiveRow);
  const statusNotReturnedRows = liveRows.filter((row) => row.youtubeStatus
    && String(row.youtubeStatus.uploadStatus || "").toLowerCase() === "not_returned"
    && !isYoutubeDeletedTombstone(row));
  const unclassifiedUploads = unclassifiedAuditRows(liveAudit || {})
    .filter((row) => !supportSet.size || supportSet.has(canonicalSupportCode(row.supportLang)));
  const unclassifiedRecentUploads = unclassifiedUploads.filter((row) => row.potentialCurrentSet === true
    && row.reviewedNonProduct !== true
    && String(row.youtubeStatus?.uploadStatus || "").toLowerCase() !== "not_returned");
  const activeCalendarRows = (calendar.reservations || []).filter(isActiveReservation);
  const selectedChannelKeys = new Set([
    ...ordinaryRows.map((row) => row.channelKey),
    ...polyglotRows.map((row) => row.channelKey),
    ...(liveAudit?.supportReports || []).filter((report) => !supportSet.size || supportSet.has(canonicalSupportCode(report.supportLang))).map((report) => report.channelKey),
  ].filter(Boolean));
  const selectedCalendarRows = activeCalendarRows.filter((row) => !selectedChannelKeys.size || selectedChannelKeys.has(row.channelKey));
  const futureCalendarRows = selectedCalendarRows.filter((row) => Date.parse(row.publishAt) > nowMillis);

  const registryDuplicates = [
    ...duplicateVideoGroups(ordinaryRows, ordinaryAssignmentKey),
    ...duplicateVideoGroups(polyglotRows, polyglotSlotKey),
  ];
  const liveDuplicates = duplicateVideoGroups(visibleLiveRows, assignmentKey);
  const registryPolyglotCrossScopeConflicts = polyglotCrossScopeGroups(polyglotRows);
  const livePolyglotCrossScopeConflicts = polyglotCrossScopeGroups(visibleLiveRows);
  const calendarAssignmentDuplicates = duplicateCalendarGroups(futureCalendarRows, calendarAssignmentKey);
  const calendarSlotCollisions = duplicateCalendarGroups(
    futureCalendarRows,
    (row) => `${row.channelKey || ""}|${row.publishAt || ""}`,
  ).filter((group) => group.assignments.length > 1);

  const calendarByVideoId = new Map(futureCalendarRows.filter((row) => row.youtubeVideoId).map((row) => [row.youtubeVideoId, row]));
  const calendarByAssignment = new Map(futureCalendarRows.map((row) => [calendarAssignmentKey(row), row]));
  const liveScheduledMissingCalendar = visibleLiveRows.filter((row) => {
    const status = videoStatus(row);
    const publishAt = status.publishAt || row.publishAt || "";
    if (status.privacyStatus !== "private" || Date.parse(publishAt) <= nowMillis) return false;
    let reservation = calendarByVideoId.get(row.youtubeVideoId) || calendarByAssignment.get(calendarAssignmentKey(row));
    if (!reservation && polyglotContentScope(row) === "short_unverified") {
      const fullRow = { ...row, contentScope: "full" };
      reservation = calendarByAssignment.get(calendarAssignmentKey(fullRow));
    }
    return !reservation || Math.abs(Date.parse(reservation.publishAt) - Date.parse(publishAt)) > 1000;
  }).map((row) => ({
    youtubeVideoId: row.youtubeVideoId,
    setId: row.setId,
    supportLang: canonicalSupportCode(row.supportLang),
    targetLang: normalizeCode(row.targetLang),
    publishAt: videoStatus(row).publishAt || row.publishAt || "",
  }));

  const availableAssignmentKeys = new Set([
    ...ordinaryRows.map(ordinaryAssignmentKey),
    ...visibleLiveRows.filter((row) => !normalizeCode(row.targetLang).includes(",")).map(ordinaryAssignmentKey),
  ]);
  const ordinaryTails = [];
  for (const [supportRaw, targets] of Object.entries(includesOrdinary ? desiredTargetsBySupport || {} : {})) {
    const supportLang = canonicalSupportCode(supportRaw);
    for (const targetRaw of targets || []) {
      const targetLang = normalizeCode(targetRaw);
      if (!availableAssignmentKeys.has(targetAssignmentKey(setId, supportLang, targetLang))) {
        ordinaryTails.push({ videoType: "ordinary", setId, supportLang, targetLang });
      }
    }
  }

  const activePolyglotKeys = new Set(polyglotRows.map(polyglotAssignmentKey));
  const activePolyglotSlots = new Set(polyglotRows.map(polyglotSlotKey));
  const activePolyglotProductSlots = new Set(polyglotRows.map(polyglotProductSlotKey));
  const activePolyglotTargetSets = new Set(polyglotRows.map(polyglotTargetSetKey));
  const polyglotTails = [];
  const polyglotBundleMismatches = [];
  const polyglotCrossScopeConflicts = [];
  for (const [supportRaw, assignments] of Object.entries(includesPolyglot ? desiredPolyglotAssignmentsBySupport || {} : {})) {
    const supportLang = canonicalSupportCode(supportRaw);
    for (const assignment of assignments || []) {
      const expected = { ...assignment, setId, supportLang };
      const expectedKey = polyglotAssignmentKey(expected);
      const expectedSlot = polyglotSlotKey(expected);
      const expectedProductSlot = polyglotProductSlotKey(expected);
      const expectedTargetSet = polyglotTargetSetKey(expected);
      const activeSlotRows = polyglotRows.filter((row) => polyglotSlotKey(row) === expectedSlot);
      if (activeSlotRows.length) {
        if (!activeSlotRows.some((row) => polyglotAssignmentKey(row) === expectedKey || polyglotTargetSetKey(row) === expectedTargetSet)) {
          polyglotBundleMismatches.push({
            setId,
            supportLang,
            bundleKey: assignment.bundleKey || "",
            contentScope: polyglotContentScope(expected),
            expectedTargetLangs: normalizedTargetLangs(expected),
            activeVideoIds: uniqueVideoIds(activeSlotRows),
            activeTargetLangs: activeSlotRows.map(normalizedTargetLangs),
          });
        }
        continue;
      }
      const otherScopeRows = polyglotRows.filter((row) => (
        polyglotProductSlotKey(row) === expectedProductSlot
        && polyglotContentScope(row) !== polyglotContentScope(expected)
      ));
      if (otherScopeRows.length) {
        polyglotCrossScopeConflicts.push({
          setId,
          supportLang,
          bundleKey: assignment.bundleKey || "",
          expectedContentScope: polyglotContentScope(expected),
          activeScopes: [...new Set(otherScopeRows.map(polyglotContentScope))].sort(),
          activeVideoIds: uniqueVideoIds(otherScopeRows),
        });
      }
      if (!assignment.polyglotKey || activePolyglotKeys.has(expectedKey) || activePolyglotTargetSets.has(expectedTargetSet)) continue;
      polyglotTails.push({
        videoType: "polyglot",
        setId,
        supportLang,
        bundleKey: assignment.bundleKey || "",
        contentScope: polyglotContentScope(expected),
        targetLangs: (assignment.targetLangs || []).map(normalizeCode).filter(Boolean),
        polyglotKey: assignment.polyglotKey,
      });
    }
  }
  const tails = [...ordinaryTails, ...polyglotTails];

  const proposedOrdinaryConflicts = (proposedOrdinaryAssignments || []).filter((assignment) => availableAssignmentKeys.has(ordinaryAssignmentKey({
    setId: assignment.setId || setId,
    supportLang: assignment.supportLang,
    targetLang: assignment.targetLang,
  }))).map((assignment) => ({
    setId: assignment.setId || setId,
    supportLang: canonicalSupportCode(assignment.supportLang),
    targetLang: normalizeCode(assignment.targetLang),
    key: ordinaryAssignmentKey({ setId: assignment.setId || setId, supportLang: assignment.supportLang, targetLang: assignment.targetLang }),
  }));
  const proposedPolyglotConflicts = (proposedPolyglotAssignments || []).map((assignment) => {
    const candidate = {
      ...assignment,
      setId: assignment.setId || setId,
      supportLang: canonicalSupportCode(assignment.supportLang),
    };
    return { assignment, candidate };
  }).filter(({ candidate }) => (
    activePolyglotSlots.has(polyglotSlotKey(candidate))
      || activePolyglotKeys.has(polyglotAssignmentKey(candidate))
      || activePolyglotTargetSets.has(polyglotTargetSetKey(candidate))
      || activePolyglotProductSlots.has(polyglotProductSlotKey(candidate))
  )).map(({ assignment, candidate }) => {
    const crossScopeRows = polyglotRows.filter((row) => (
      polyglotProductSlotKey(row) === polyglotProductSlotKey(candidate)
      && polyglotContentScope(row) !== polyglotContentScope(candidate)
    ));
    return {
      setId: assignment.setId || setId,
      supportLang: canonicalSupportCode(assignment.supportLang),
      bundleKey: assignment.bundleKey || String(assignment.polyglotKey || "").split(":")[3] || "",
      contentScope: polyglotContentScope(candidate),
      targetLangs: (assignment.targetLangs || []).map(normalizeCode).filter(Boolean),
      polyglotKey: assignment.polyglotKey || "",
      key: polyglotAssignmentKey(candidate),
      crossScopeConflict: crossScopeRows.length > 0,
      activeScopes: [...new Set(crossScopeRows.map(polyglotContentScope))].sort(),
      activeVideoIds: uniqueVideoIds(crossScopeRows),
    };
  });
  const proposedPolyglotCrossScopeConflicts = proposedPolyglotConflicts.filter((item) => item.crossScopeConflict);
  const liveAuditPaginationBlockers = requireCompleteLiveAudit && liveAudit?.paginationComplete !== true
    ? [{
      type: "live_audit_pagination_incomplete",
      truncatedSupportCount: Number(liveAudit?.truncatedSupportCount || 0),
      supports: (liveAudit?.supportReports || []).filter((row) => row.paginationComplete !== true).map((row) => canonicalSupportCode(row.supportLang)),
    }]
    : [];
  const liveStatusBlockers = statusNotReturnedRows.map((row) => ({
    type: "live_video_status_not_returned",
    youtubeVideoId: row.youtubeVideoId || "",
    youtubeVideoUrl: row.youtubeVideoUrl || (row.youtubeVideoId ? `https://www.youtube.com/watch?v=${row.youtubeVideoId}` : ""),
    setId: row.setId || setId,
    supportLang: canonicalSupportCode(row.supportLang),
    targetLang: normalizeCode(row.targetLang),
  }));
  const unclassifiedUploadBlockers = unclassifiedRecentUploads.map((row) => ({
    type: "unclassified_recent_channel_upload",
    youtubeVideoId: row.youtubeVideoId || "",
    youtubeVideoUrl: row.youtubeVideoUrl || (row.youtubeVideoId ? `https://www.youtube.com/watch?v=${row.youtubeVideoId}` : ""),
    supportLang: canonicalSupportCode(row.supportLang),
    channelKey: row.channelKey || "",
    title: row.title || "",
    uploadedAt: row.uploadedAt || "",
    auditWindowStart: row.auditWindowStart || "",
  }));

  const publications = publicationInventory(ordinaryRows, polyglotRows, visibleLiveRows);
  const registryVideoIds = new Set([...ordinaryRows, ...polyglotRows].map((row) => row.youtubeVideoId).filter(Boolean));
  const liveVideosMissingRegistry = visibleLiveRows.filter((row) => row.youtubeVideoId && !registryVideoIds.has(row.youtubeVideoId)).map((row) => ({
    youtubeVideoId: row.youtubeVideoId,
    youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
    setId: row.setId || "",
    supportLang: canonicalSupportCode(row.supportLang),
    targetLang: normalizeCode(row.targetLang),
  }));
  let scheduledCount = 0;
  let publicCount = 0;
  let privateUnscheduledCount = 0;
  for (const row of publications) {
    if (row.privacyStatus === "public") publicCount += 1;
    else if (row.publishAt && Date.parse(row.publishAt) > nowMillis) scheduledCount += 1;
    else privateUnscheduledCount += 1;
  }

  // A short_unverified publication intentionally leaves the future full product
  // tail open.  It must block an actual proposed full assignment, but it must
  // not make every unrelated publication-control run unhealthy forever.
  const advisories = polyglotCrossScopeConflicts.map((item) => ({
    type: "polyglot_full_tail_deferred_by_active_short_unverified",
    ...item,
  }));
  const blockers = [
    ...registryDuplicates.map((item) => ({ type: "duplicate_registry_assignment", ...item })),
    ...liveDuplicates.map((item) => ({ type: "duplicate_live_assignment", ...item })),
    ...registryPolyglotCrossScopeConflicts.map((item) => ({ type: "duplicate_registry_polyglot_cross_scope", ...item })),
    ...livePolyglotCrossScopeConflicts.map((item) => ({ type: "duplicate_live_polyglot_cross_scope", ...item })),
    ...calendarAssignmentDuplicates.map((item) => ({ type: "duplicate_calendar_assignment", ...item })),
    ...calendarSlotCollisions.map((item) => ({ type: "calendar_slot_collision", ...item })),
    ...liveScheduledMissingCalendar.map((item) => ({ type: "live_schedule_missing_calendar", ...item })),
    ...liveVideosMissingRegistry.map((item) => ({ type: "live_video_missing_durable_registry", ...item })),
    ...proposedOrdinaryConflicts.map((item) => ({ type: "proposed_ordinary_assignment_already_active", ...item })),
    ...proposedPolyglotConflicts.map((item) => ({ type: "proposed_polyglot_assignment_already_active", ...item })),
    ...proposedPolyglotCrossScopeConflicts.map((item) => ({ type: "proposed_polyglot_cross_scope_conflict", ...item })),
    ...polyglotBundleMismatches.map((item) => ({ type: "polyglot_bundle_target_mismatch", ...item })),
    ...liveStatusBlockers,
    ...unclassifiedUploadBlockers,
    ...liveAuditPaginationBlockers,
  ];
  const dayGaps = calendarDayGaps(futureCalendarRows, gapStartDateByChannel);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_publication_control",
    setId,
    supports: [...supportSet].sort(),
    videoTypes: [...videoTypeSet].sort(),
    summary: {
      healthy: blockers.length === 0,
      blockerCount: blockers.length,
      activeVideoCount: publications.length,
      publicCount,
      scheduledCount,
      privateUnscheduledCount,
      tailCount: tails.length,
      ordinaryTailCount: ordinaryTails.length,
      polyglotTailCount: polyglotTails.length,
      registryDuplicateGroupCount: registryDuplicates.length,
      liveDuplicateGroupCount: liveDuplicates.length,
      registryPolyglotCrossScopeConflictCount: registryPolyglotCrossScopeConflicts.length,
      livePolyglotCrossScopeConflictCount: livePolyglotCrossScopeConflicts.length,
      calendarAssignmentDuplicateCount: calendarAssignmentDuplicates.length,
      calendarSlotCollisionCount: calendarSlotCollisions.length,
      liveScheduleMissingCalendarCount: liveScheduledMissingCalendar.length,
      liveVideoMissingDurableRegistryCount: liveVideosMissingRegistry.length,
      proposedAssignmentConflictCount: proposedOrdinaryConflicts.length + proposedPolyglotConflicts.length,
      proposedPolyglotCrossScopeConflictCount: proposedPolyglotCrossScopeConflicts.length,
      polyglotBundleTargetMismatchCount: polyglotBundleMismatches.length,
      polyglotRequiredScopeBlockedByOtherScopeCount: polyglotCrossScopeConflicts.length,
      advisoryCount: advisories.length,
      liveAuditPaginationComplete: liveAudit?.paginationComplete === true,
      liveStatusNotReturnedCount: statusNotReturnedRows.length,
      youtubeDeletedTombstoneCount: deletedTombstoneRows.length,
      unclassifiedUploadCount: unclassifiedUploads.length,
      unclassifiedRecentUploadCount: unclassifiedRecentUploads.length,
      calendarDayGapCount: dayGaps.reduce((sum, item) => sum + item.missingDates.length, 0),
    },
    blockers,
    advisories,
    publications,
    deletedTombstones: deletedTombstoneRows.map((row) => ({
      youtubeVideoId: row.youtubeVideoId || "",
      youtubeVideoUrl: row.youtubeVideoUrl || (row.youtubeVideoId ? `https://www.youtube.com/watch?v=${row.youtubeVideoId}` : ""),
      setId: row.setId || setId,
      supportLang: canonicalSupportCode(row.supportLang),
      videoType: isPolyglotRow(row) ? "polyglot" : "ordinary",
      targetLang: normalizeCode(row.targetLang),
      targetLangs: normalizedTargetLangs(row),
      bundleKey: polyglotBundleKey(row),
      contentScope: isPolyglotRow(row) ? polyglotContentScope(row) : "",
      evidence: "uploads_playlist_title_deleted_video_and_videos_list_not_returned",
    })),
    unclassifiedUploads,
    tails,
    calendarDayGaps: dayGaps,
  };
}

export {
  assignmentKey,
  calendarAssignmentKey,
  canonicalSupportCode,
  duplicateVideoGroups,
  isActive,
  isActiveReservation,
  isPolyglotRow,
  normalizeCode,
  normalizedTargetLangs,
  polyglotContentScope,
  polyglotProductSlotKey,
  polyglotSlotKey,
  polyglotTargetSetKey,
  resolvePolyglotBundleTargets,
};
