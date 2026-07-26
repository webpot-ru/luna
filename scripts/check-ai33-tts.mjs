import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getTtsAudio, getVoiceForLanguage } from "./lib/video-generator.mjs";

const REQUIRED_CONFIRMATION = "CHECK_AI33_TTS";
const SAMPLE_TEXT = "Բարև, LunaCards։";

function readOption(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function writeReport(outputPath, report) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function safeFailure(error) {
  const message = String(error?.message || error || "");
  const http = message.match(/HTTP\s+(\d{3})\b/u);
  if (http) {
    return {
      code: `http_${http[1]}`,
      message: "AI33 отклонил запрос синтеза.",
    };
  }
  if (message.includes("Missing AI33_API_KEY")) {
    return {
      code: "missing_api_key",
      message: "В GitHub runner не передан AI33_API_KEY.",
    };
  }
  if (message.includes("CHECK_AI33_TTS")) {
    return {
      code: "missing_confirmation",
      message: "Для smoke-теста требуется точное подтверждение CHECK_AI33_TTS.",
    };
  }
  return {
    code: "tts_failed",
    message: "AI33 не вернул пригодный аудиофайл.",
  };
}

const outputPath = path.resolve(readOption("output", "outputs/ai33-tts-smoke.json"));
const confirmation = readOption("confirm");
const voiceId = getVoiceForLanguage("HY");
const startedAt = new Date().toISOString();

try {
  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`Expected --confirm=${REQUIRED_CONFIRMATION}`);
  }
  if (!process.env.AI33_API_KEY) {
    throw new Error("Missing AI33_API_KEY for Armenian HY TTS fallback.");
  }

  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "lunacards-ai33-tts-smoke-"));
  const audioPath = await getTtsAudio({
    text: SAMPLE_TEXT,
    voiceId,
    langCode: "HY",
    cacheDir,
  });
  const audio = fs.readFileSync(audioPath);

  if (audio.byteLength < 256) {
    throw new Error("AI33 TTS returned unusably short audio.");
  }

  writeReport(outputPath, {
    schemaVersion: 1,
    status: "ready",
    checkedAt: new Date().toISOString(),
    startedAt,
    provider: "ai33",
    supportLang: "HY",
    voiceId,
    sampleCharacterCount: Array.from(SAMPLE_TEXT).length,
    audio: {
      bytes: audio.byteLength,
      sha256: crypto.createHash("sha256").update(audio).digest("hex"),
      signature: audio.subarray(0, 3).toString("ascii") === "ID3" ? "id3" : "audio_bytes_present",
    },
  });
  console.log(`AI33 Armenian TTS smoke passed: ${outputPath}`);
} catch (error) {
  writeReport(outputPath, {
    schemaVersion: 1,
    status: "blocked",
    checkedAt: new Date().toISOString(),
    startedAt,
    provider: "ai33",
    supportLang: "HY",
    voiceId,
    failure: safeFailure(error),
  });
  console.error(`AI33 Armenian TTS smoke failed: ${safeFailure(error).code}`);
  process.exitCode = 1;
}
