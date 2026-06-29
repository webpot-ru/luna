import assert from "node:assert/strict";

import {
  getPublicCourseUrl,
  getPublicSiteLanguagePath,
  getSiteLanguagePath,
  isSpecificStudyCourseUrl
} from "./lib/video-public-url.mjs";

const sitePathCases = [
  ["EN", "en"],
  ["EN-GB", "en"],
  ["GB", "en"],
  ["ES", "es"],
  ["ES-419", "es"],
  ["MX", "es"],
  ["PT", "pt"],
  ["PT-BR", "pt"],
  ["BR", "pt"],
  ["NO", "no"],
  ["NB", "no"],
  ["RU", "ru"],
  ["JA", "ja"]
];

for (const [input, expected] of sitePathCases) {
  assert.equal(getPublicSiteLanguagePath(input), expected, `public site path for ${input}`);
  assert.equal(getSiteLanguagePath(input), expected, `legacy alias path for ${input}`);
}

const cookware = "home_kitchen_cookware_pilot_01";

assert.equal(
  getPublicCourseUrl({ setId: cookware, supportLang: "EN-GB", targetLang: "ES-419" }),
  "https://flashcardsluna.com/en/courses/kitchenware-basic/study/standard?langs=es-419"
);

assert.equal(
  getPublicCourseUrl({ setId: cookware, supportLang: "ES-419", targetLang: "EN-GB" }),
  "https://flashcardsluna.com/es/courses/kitchenware-basic/study/standard?langs=en-gb"
);

assert.equal(
  getPublicCourseUrl({ setId: cookware, supportLang: "PT-BR", targetLang: "PT-BR" }),
  "https://flashcardsluna.com/pt/courses/kitchenware-basic/study/standard?langs=pt-br"
);

assert.equal(
  getPublicCourseUrl({ setId: cookware, supportLang: "RU", targetLang: "PT-BR" }),
  "https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=pt-br"
);

assert.equal(
  getPublicCourseUrl({ setId: cookware, supportLang: "RU", targetLangs: ["EN", "ES", "FR", "DE"] }),
  "https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=en%2Ces%2Cfr%2Cde"
);

assert.equal(
  isSpecificStudyCourseUrl(getPublicCourseUrl({ setId: cookware, supportLang: "RU", targetLang: "PT-BR" })),
  true,
  "ordinary video courseUrl must be a specific study route"
);

assert.equal(
  isSpecificStudyCourseUrl(getPublicCourseUrl({ setId: cookware, supportLang: "RU", targetLangs: ["EN", "ES", "FR", "DE"] })),
  true,
  "polyglot video courseUrl must be a specific study route"
);

assert.equal(
  getPublicCourseUrl({ setId: "unknown_set", supportLang: "PT-BR", targetLang: "ES" }),
  "https://flashcardsluna.com/pt/courses"
);

assert.equal(
  isSpecificStudyCourseUrl(getPublicCourseUrl({ setId: "unknown_set", supportLang: "PT-BR", targetLang: "ES" })),
  false,
  "fallback courses URL is not publish-ready"
);

console.log("Video public URL checks passed.");
