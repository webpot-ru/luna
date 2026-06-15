#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fetchDeckCards, fetchDeckTitle } from "./lib/video-generator.mjs";
import { psqlJson } from "./lib/qa-utils.mjs";

const DEFAULT_DRIVE_FOLDER_ID = "1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei";
const OAUTH_CLIENT_FILE = path.resolve(".secrets/google-oauth-client.json");
const OAUTH_TOKEN_FILE = path.resolve(".secrets/google-oauth-token.json");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

// Re-use token fetcher logic
async function refreshOAuthToken(client, token) {
  if (!token.refresh_token) {
    fail("OAuth token has no refresh_token. Run refresh script first.");
  }
  const body = new URLSearchParams({
    client_id: client.client_id,
    client_secret: client.client_secret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });
  const response = await fetch(client.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    fail(`OAuth token refresh failed (${response.status}): ${text}`);
  }
  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  fs.writeFileSync(OAUTH_TOKEN_FILE, JSON.stringify(nextToken, null, 2), "utf8");
  return nextToken.access_token;
}

async function getOAuthAccessToken() {
  const clientData = JSON.parse(fs.readFileSync(OAUTH_CLIENT_FILE, "utf8"));
  const client = clientData.installed || clientData.web;
  if (!client) fail("Invalid client structure in client secret file.");

  let token = JSON.parse(fs.readFileSync(OAUTH_TOKEN_FILE, "utf8"));
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) {
    return token.access_token;
  }
  return refreshOAuthToken(client, token);
}

async function findExistingFile(accessToken, folderId, name) {
  const query = `'${folderId.replace(/'/g, "\\'")}' in parents and name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name)");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive search failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return data.files?.[0] || null;
}

async function uploadFile(accessToken, filePath, folderId, title, existingFileId) {
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = `lunacards_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = { name: title, mimeType: "application/json" };
  if (!existingFileId) metadata.parents = [folderId];

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\ncontent-type: application/json\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const url = new URL(
    existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}`
      : "https://www.googleapis.com/upload/drive/v3/files"
  );
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("fields", "id,name");

  const response = await fetch(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive upload failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function makeFilePublic(accessToken, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive make-public failed: ${text}`);
  }
}

async function main() {
  const setId = process.argv[2] || "home_kitchen_cookware_pilot_01";
  
  // 1. Get all unique languages from the database
  const langsSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select distinct language_code 
      from meaning_language_entries 
      where language_code is not null and language_code <> ''
    ) rows;
  `;
  const langsResult = await psqlJson(langsSql);
  const allLangs = langsResult.map(r => r.language_code.toUpperCase());
  
  console.log(`[1/4] Exporting cards data for deck "${setId}"...`);
  const deckData = {
    setId,
    titles: {},
    cards: {}
  };
  
  // Fetch all titles in one query
  const titleSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select language_code, title 
      from content_set_localizations 
      where set_id = '${setId.replace(/'/g, "''")}'
    ) rows;
  `;
  const titlesResult = await psqlJson(titleSql);
  for (const row of titlesResult) {
    if (row.language_code) {
      deckData.titles[row.language_code.toUpperCase()] = row.title;
    }
  }
  
  // Fetch all cards and example translations in one single query
  const cardsSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      with deck_examples as (
        select distinct on (meaning_id)
          example_id,
          meaning_id
        from meaning_examples
        where set_id = '${setId.replace(/'/g, "''")}' or example_role = 'base'
        order by meaning_id, case when set_id = '${setId.replace(/'/g, "''")}' then 1 else 2 end
      )
      select
        msm.meaning_id,
        msm.display_order,
        mu.canonical_english,
        ex.example_id,
        (
          select json_object_agg(language_code, row_to_json(le))
          from (
            select language_code, native_word, word_with_article_or_marker, transcription
            from meaning_language_entries
            where meaning_id = msm.meaning_id
          ) le
        ) as word_entries,
        (
          select json_object_agg(language_code, example_text)
          from meaning_example_translations
          where example_id = ex.example_id
        ) as example_translations
      from meaning_set_memberships msm
      join meaning_units mu on mu.meaning_id = msm.meaning_id
      left join deck_examples ex on ex.meaning_id = msm.meaning_id
      where msm.set_id = '${setId.replace(/'/g, "''")}'
      order by msm.display_order, msm.meaning_id
    ) rows;
  `;
  const cardsResult = await psqlJson(cardsSql);
  
  // Compile combinations in memory
  const supportLangs = allLangs;
  for (const supportLang of supportLangs) {
    deckData.cards[supportLang] = {};
    for (const targetLang of allLangs) {
      if (targetLang === supportLang) continue;
      
      const cardsList = [];
      for (const row of cardsResult) {
        const wordT = row.word_entries?.[targetLang];
        const wordS = row.word_entries?.[supportLang];
        
        if (wordT && wordT.native_word) {
          cardsList.push({
            meaning_id: row.meaning_id,
            display_order: row.display_order,
            canonical_english: row.canonical_english,
            target_word: wordT.native_word,
            target_display: wordT.word_with_article_or_marker || wordT.native_word,
            target_transcription: wordT.transcription || "",
            support_word: wordS ? (wordS.native_word || "") : "",
            support_display: wordS ? (wordS.word_with_article_or_marker || wordS.native_word || "") : "",
            example_id: row.example_id || null,
            target_example: row.example_translations?.[targetLang] || "",
            support_example: row.example_translations?.[supportLang] || ""
          });
        }
      }
      
      if (cardsList.length > 0) {
        deckData.cards[supportLang][targetLang] = cardsList;
      }
    }
  }
  
  const localDir = path.resolve("data/decks");
  fs.mkdirSync(localDir, { recursive: true });
  const localFile = path.join(localDir, `${setId}.json`);
  fs.writeFileSync(localFile, JSON.stringify(deckData, null, 2), "utf8");
  console.log(`[SUCCESS] Saved offline data locally to: data/decks/${setId}.json`);
  
  // 2. Upload to Google Drive
  console.log(`[2/4] Authenticating with Google Drive...`);
  const accessToken = await getOAuthAccessToken();
  
  const driveFileName = `${setId}.json`;
  console.log(`[3/4] Uploading "${driveFileName}" to Google Drive...`);
  const existing = await findExistingFile(accessToken, DEFAULT_DRIVE_FOLDER_ID, driveFileName);
  
  const result = await uploadFile(accessToken, localFile, DEFAULT_DRIVE_FOLDER_ID, driveFileName, existing?.id);
  const fileId = result.id;
  console.log(`[SUCCESS] Uploaded to Google Drive. File ID: ${fileId}`);
  
  console.log(`[4/4] Setting file permissions to "anyone with link can read"...`);
  await makeFilePublic(accessToken, fileId);
  console.log(`[SUCCESS] File is now public by link.`);
  
  // 3. Update deck-sources.json
  const sourcesPath = path.resolve("data/deck-sources.json");
  let sources = {};
  if (fs.existsSync(sourcesPath)) {
    sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  }
  sources[setId] = fileId;
  fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2), "utf8");
  console.log(`[SUCCESS] Updated data/deck-sources.json with new File ID!`);
  
  console.log(`\n🎉 All done! You can now git commit and push to trigger cloud rendering.`);
}

main().catch(console.error);
