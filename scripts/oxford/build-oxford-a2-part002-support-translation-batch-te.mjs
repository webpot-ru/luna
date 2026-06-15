#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const RELEASE_ID = 'oxford_3000_core_a2_part_002_300_v1';
const SCRIPT_VERSION = '2026-05-21.v1';
const LANGUAGE = 'TE';
const BATCH_ID = 'te_v1';
const SCRIPT_PATH = 'scripts/oxford/build-oxford-a2-part002-support-translation-batch-te.mjs';
const DEFAULT_CONTRACT = path.join(PROJECT_ROOT, 'config', `${RELEASE_ID}_contract_v0.json`);
const DEFAULT_INPUT = path.join(
  PROJECT_ROOT,
  'outputs/oxford-vocabulary/examples',
  `${RELEASE_ID}_english_examples_v1.jsonl`,
);
const DEFAULT_TRANSLATIONS = path.join(
  PROJECT_ROOT,
  'config',
  `${RELEASE_ID}_support_translation_batch_te_v1.tsv`,
);
const DEFAULT_OUTPUT = path.join(
  PROJECT_ROOT,
  'outputs/oxford-vocabulary/support-translations',
  `${RELEASE_ID}_support_translation_batch_te_v1.jsonl`,
);
const DEFAULT_SUMMARY = path.join(
  PROJECT_ROOT,
  'outputs/oxford-vocabulary/support-translations',
  `${RELEASE_ID}_support_translation_batch_te_v1_summary.md`,
);

const SENTENCE_END_RE = /[.!?]$/u;
const TELUGU_RE = /\p{Script=Telugu}/u;
const LATIN_RE = /[A-Za-z]/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: DEFAULT_INPUT,
    contract: DEFAULT_CONTRACT,
    translations: DEFAULT_TRANSLATIONS,
    output: DEFAULT_OUTPUT,
    summary: DEFAULT_SUMMARY,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--input') opts.input = args[++i];
    else if (arg === '--contract') opts.contract = args[++i];
    else if (arg === '--translations') opts.translations = args[++i];
    else if (arg === '--output') opts.output = args[++i];
    else if (arg === '--summary') opts.summary = args[++i];
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: invalid JSON: ${error.message}`);
      }
    });
}

function readTranslations(filePath) {
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/u).filter(Boolean);
  const header = lines.shift();
  if (header !== 'source_headword\tTE\texample_TE') {
    throw new Error(`Unexpected TSV header in ${filePath}: ${header}`);
  }

  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const parts = line.split('\t');
    if (parts.length !== 3) {
      throw new Error(`${filePath}:${lineIndex + 2}: expected 3 tab-separated fields`);
    }
    const [headword, display, example] = parts.map(normalizeText);
    if (!headword || !display || !example) {
      throw new Error(`${filePath}:${lineIndex + 2}: empty TSV field`);
    }
    assertTeluguText(display, `${headword} TE`);
    assertTeluguText(example, `${headword} example_TE`);
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`${filePath}:${lineIndex + 2}: Telugu example must end with sentence punctuation`);
    }
    if (map.has(headword)) {
      throw new Error(`${filePath}:${lineIndex + 2}: duplicate headword ${headword}`);
    }
    map.set(headword, { display, example });
  }
  return map;
}

function assertTeluguText(value, context) {
  if (!TELUGU_RE.test(value)) {
    throw new Error(`${context}: expected Telugu-script text`);
  }
  if (LATIN_RE.test(value)) {
    throw new Error(`${context}: Latin fallback text is not allowed`);
  }
  if (UNEXPECTED_SCRIPT_RE.test(value)) {
    throw new Error(`${context}: unexpected non-Telugu script`);
  }
}

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath);
}

function buildSupportRow(exampleRow, translation, generatedAt) {
  return {
    release_id: exampleRow.release_id,
    course_id: exampleRow.course_id,
    row_id: exampleRow.row_id,
    core_item_id: exampleRow.core_item_id,
    meaning_id: exampleRow.meaning_id,
    source_candidate_id: exampleRow.source_candidate_id,
    source_headword: exampleRow.source_headword,
    reviewed_display_headword: exampleRow.reviewed_display_headword,
    reviewed_part_of_speech: exampleRow.reviewed_part_of_speech,
    meaning_note: exampleRow.meaning_note,
    example_EN: exampleRow.example_EN,
    support_translation_batch: BATCH_ID,
    support_translation_status: 'draft_native_style_needs_source_assisted_qa',
    support_example_status: 'draft_scene_preserving_needs_source_assisted_qa',
    source_note:
      'Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.',
    reviewer: 'codex_oxford_a2_part002_support_translation_batch_te_v1',
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: (exampleRow.remaining_blockers ?? []).filter(
      (blocker) =>
        ![
          'english_pronunciation_source_check',
          'english_example_quality_check',
          'support_translation_meaning_check',
          'support_example_scene_check',
        ].includes(blocker),
    ),
    TE: translation.display,
    example_TE: translation.example,
  };
}

function updateContract(contract, opts, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: 'draft_native_style_needs_source_assisted_qa_not_delivery_ready',
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    translations_path: relativePath(opts.translations),
    path: relativePath(opts.output),
    summary_path: relativePath(opts.summary),
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: false,
    closes_gate_layer: [],
    does_not_close: [
      'support_translation_meaning_check',
      'support_example_scene_check',
      'weak_language_targeted_review',
      'support_translation_sample_review',
      'support_translation_source_backed_audit',
      'support_example_quality_audit',
      'support_article_display_repair_check',
      'final_delivery_approval_check',
    ],
  };

  const existing = contract.latest_support_translation_batches ?? [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID && !item.languages?.includes(LANGUAGE)),
    batch,
  ];
  contract.status = 'support_language_batches_in_progress_not_delivery_ready';
  contract.next_stage_options = [
    'Generate the next support-language batch in documented order: KN.',
    'Run weak-language targeted review and source-backed support-language audits after all support languages are covered.',
    'Export US/UK workbooks only after all support-language gates pass.',
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

function main() {
  const opts = parseArgs();
  const sourceRows = readJsonl(opts.input);
  const translations = readTranslations(opts.translations);
  const contract = readJson(opts.contract);

  if (sourceRows.length !== 300) {
    throw new Error(`Expected 300 source rows, found ${sourceRows.length}`);
  }
  if (translations.size !== sourceRows.length) {
    throw new Error(`Expected ${sourceRows.length} TE translations, found ${translations.size}`);
  }

  const seenSource = new Set();
  const generatedAt = new Date().toISOString();
  const outputRows = sourceRows.map((row, index) => {
    const sourceHeadword = row.source_headword;
    if (!sourceHeadword) {
      throw new Error(`Source row ${index + 1}: missing source_headword`);
    }
    if (seenSource.has(sourceHeadword)) {
      throw new Error(`Duplicate source headword in source rows: ${sourceHeadword}`);
    }
    seenSource.add(sourceHeadword);

    const translation = translations.get(sourceHeadword);
    if (!translation) {
      throw new Error(`Missing TE translation for ${sourceHeadword}`);
    }

    return buildSupportRow(row, translation, generatedAt);
  });

  const extra = [...translations.keys()].filter((headword) => !seenSource.has(headword));
  if (extra.length > 0) {
    throw new Error(`Unexpected TE translations: ${extra.join(', ')}`);
  }

  mkdirSync(path.dirname(opts.output), { recursive: true });
  writeFileSync(opts.output, `${outputRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  writeFileSync(
    opts.summary,
    [
      `# Oxford A2 Part 002 Support Translation Batch ${BATCH_ID}: ${RELEASE_ID}`,
      '',
      `- Script version: \`${SCRIPT_VERSION}\``,
      `- Source rows: \`${relativePath(opts.input)}\``,
      `- Translation TSV: \`${relativePath(opts.translations)}\``,
      `- Rows: ${outputRows.length}`,
      `- Languages: ${LANGUAGE}`,
      '- Article display: not applicable for Telugu',
      '- Translation status: `draft_native_style_needs_source_assisted_qa`',
      '- Example status: `draft_scene_preserving_needs_source_assisted_qa`',
      '- Script-aware validation: Telugu-script text, no Latin fallback, sentence punctuation and unexpected-script leak guard',
      '- Target-language transcriptions: not included',
      '- Postgres import: false',
      '- Google Sheet delivery: false',
      '',
      'This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.',
      '',
    ].join('\n'),
  );

  const updatedContract = updateContract(contract, opts, outputRows);
  writeFileSync(opts.contract, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        batch_id: BATCH_ID,
        support_language: LANGUAGE,
        source_rows: sourceRows.length,
        output: opts.output,
        summary: opts.summary,
        contract_updated: opts.contract,
        completed_support_languages: updatedContract.latest_support_translation_batches.length,
        next_language: 'KN',
      },
      null,
      2,
    ),
  );
}

main();
