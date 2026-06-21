import assert from "node:assert/strict";

import {
  buildPlaylistAssignment,
  findChannelForSupport,
  loadPlaylistRegistry,
  loadYoutubeChannels,
} from "./lib/youtube-playlists.mjs";

function ordinaryAssignment(supportLang, targetLang) {
  return buildPlaylistAssignment({
    supportLang,
    targetLang,
    setId: "home_kitchen_cookware_pilot_01",
    level: "A1",
  });
}

function assertDistinctRegionalTargets({ supportLang, baseTarget, regionalTarget, baseTitleNeedle, regionalTitleNeedle }) {
  const base = ordinaryAssignment(supportLang, baseTarget);
  const regional = ordinaryAssignment(supportLang, regionalTarget);

  assert.notEqual(base.key, regional.key, `${baseTarget}/${regionalTarget} must not collapse to one playlist key`);
  assert.ok(base.key.includes(`__${baseTarget}__`), `base playlist key must preserve ${baseTarget}: ${base.key}`);
  assert.ok(regional.key.includes(`__${regionalTarget}__`), `regional playlist key must preserve ${regionalTarget}: ${regional.key}`);
  assert.notEqual(base.title, regional.title, `${baseTarget}/${regionalTarget} playlist titles must be distinct`);
  assert.ok(base.title.includes(baseTitleNeedle), `base playlist title should contain "${baseTitleNeedle}": ${base.title}`);
  assert.ok(
    regional.title.includes(regionalTitleNeedle),
    `regional playlist title should contain "${regionalTitleNeedle}": ${regional.title}`,
  );

  return { base, regional };
}

function assertSharedSupportChannel(channels, variants, expectedKey) {
  const resolved = variants.map((code) => {
    const channel = findChannelForSupport(channels, code);
    assert.ok(channel, `missing support channel for ${code}`);
    return { code, key: channel.key, channelId: channel.channelId };
  });
  for (const item of resolved) {
    assert.equal(item.key, expectedKey, `${item.code} should resolve to shared channel ${expectedKey}`);
    assert.ok(item.channelId, `${item.code} shared channel must have channelId`);
  }
  assert.equal(new Set(resolved.map((item) => item.channelId)).size, 1, `${variants.join("/")} must share one channelId`);
}

function assertRegistryNoConflictingDuplicateKeys(registry) {
  const seen = new Map();
  for (const playlist of registry.playlists || []) {
    const key = playlist.playlist_key || playlist.key;
    assert.ok(key, "playlist registry row is missing playlist_key");
    const signature = JSON.stringify({
      supportLang: playlist.supportLang,
      targetLang: playlist.targetLang,
      courseFamily: playlist.courseFamily,
      levelOrTrack: playlist.levelOrTrack,
      variantOrYear: playlist.variantOrYear || "",
    });
    if (seen.has(key)) {
      assert.equal(seen.get(key), signature, `playlist_key ${key} has conflicting meanings`);
    } else {
      seen.set(key, signature);
    }
  }
}

const enEs = assertDistinctRegionalTargets({
  supportLang: "EN",
  baseTarget: "ES",
  regionalTarget: "ES-419",
  baseTitleNeedle: "Spanish",
  regionalTitleNeedle: "Latin American Spanish",
});

const ruEs = assertDistinctRegionalTargets({
  supportLang: "RU",
  baseTarget: "ES",
  regionalTarget: "ES-419",
  baseTitleNeedle: "Испанский",
  regionalTitleNeedle: "Латиноамериканский испанский",
});

const ruPt = assertDistinctRegionalTargets({
  supportLang: "RU",
  baseTarget: "PT",
  regionalTarget: "PT-BR",
  baseTitleNeedle: "Португальский",
  regionalTitleNeedle: "Бразильский португальский",
});

const ruEn = assertDistinctRegionalTargets({
  supportLang: "RU",
  baseTarget: "EN",
  regionalTarget: "EN-GB",
  baseTitleNeedle: "Английский",
  regionalTitleNeedle: "Британский английский",
});

const channels = loadYoutubeChannels();
assertSharedSupportChannel(channels.channels, ["EN", "EN-GB"], "en");
assertSharedSupportChannel(channels.channels, ["ES", "ES-419"], "es");
assertSharedSupportChannel(channels.channels, ["PT", "PT-BR"], "pt");

const registry = loadPlaylistRegistry();
assertRegistryNoConflictingDuplicateKeys(registry);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        regionalTargetPairs: [
          enEs.base.key,
          enEs.regional.key,
          ruEs.base.key,
          ruEs.regional.key,
          ruPt.base.key,
          ruPt.regional.key,
          ruEn.base.key,
          ruEn.regional.key,
        ],
        sharedSupportChannels: ["EN/EN-GB -> en", "ES/ES-419 -> es", "PT/PT-BR -> pt"],
        registryPlaylists: registry.playlists.length,
      },
    },
    null,
    2,
  ),
);
