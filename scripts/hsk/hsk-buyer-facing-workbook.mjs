export function buildHskBuyerFacingMainSheet({ rows, allLanguages }) {
  const configuredLanguageHeaders = allLanguages.map((language) => language.spreadsheetCode);
  if (!configuredLanguageHeaders.includes("ZH")) {
    throw new Error("HSK buyer-facing sheet requires ZH in config/language-order.json.");
  }

  const targetLanguageHeaders = configuredLanguageHeaders.filter((code) => code !== "ZH");
  const exampleHeaders = targetLanguageHeaders.map((code) => `${code} example`);
  const headers = [
    "ZH",
    "ZH transcription",
    ...targetLanguageHeaders,
    "ZH example",
    "ZH example transcription",
    ...exampleHeaders,
  ];
  const buyerRows = rows.map((row) => {
    const output = {};
    output.ZH = row.simplified ?? "";
    output["ZH transcription"] = row.pinyin ?? "";
    for (const code of targetLanguageHeaders) {
      output[code] = row[code] ?? "";
    }
    output["ZH example"] = row.example_zh ?? "";
    output["ZH example transcription"] = row.example_pinyin ?? "";
    for (const code of targetLanguageHeaders) {
      output[`${code} example`] = row[`example_${code}`] ?? "";
    }
    return output;
  });

  return { headers, rows: buyerRows, languageHeaders: targetLanguageHeaders, exampleHeaders };
}

export function addInternalDataSheet({ workbook, setValues, headers, rows, sheetName = "Internal Data" }) {
  const sheet = workbook.worksheets.add(sheetName);
  setValues(sheet, 1, 0, [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]);
}
