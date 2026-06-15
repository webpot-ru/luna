#!/usr/bin/env node
import { validateTranslationSourcePolicyCompleteness } from "./lib/translation-source-policy.mjs";

const result = await validateTranslationSourcePolicyCompleteness();

if (result.blockers.length > 0) {
  console.error(`Translation source policy check failed: ${result.blockers.length} blocker(s).`);
  for (const blocker of result.blockers) console.error(blocker);
  process.exit(1);
}

console.log(
  `Translation source policy OK: languages=${result.configuredLanguageCount}/${result.activeLanguageCount}, manifest_sources=${result.manifestSourceCount}, policy=${result.policyVersion}`
);
