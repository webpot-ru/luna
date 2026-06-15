#!/usr/bin/env node
import { validateTranscriptionSourcePolicyCompleteness } from "./lib/transcription-source-policy.mjs";

const result = await validateTranscriptionSourcePolicyCompleteness();

if (result.blockers.length > 0) {
  console.error(`Transcription source policy check failed: ${result.blockers.length} blocker(s).`);
  for (const blocker of result.blockers) console.error(blocker);
  process.exit(1);
}

console.log(
  `Transcription source policy OK: languages=${result.configuredLanguageCount}/${result.activeLanguageCount}, manifest_sources=${result.manifestSourceCount}`
);
