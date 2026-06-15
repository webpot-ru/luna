import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATE = "20260604";
const RELEASE_ID = "hsk3_level_2_200_v1";
const SOURCE_URL =
  "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81%E8%AF%AD%E6%B3%95%EF%BC%89.pdf";
const CHINESE_TEST_URL = "https://www.chinesetest.cn/hsk";

const rowsTsv = String.raw`
301	2	啊	a	助
302	2	爱好	àihào	动、名
303	2	白色	báisè	名
304	2（5）	班	bān	名、（量）
305	2	帮	bāng	动
306	2	帮忙	bāngmáng	动
307	2	包	bāo	动、名、量
308	2	本子	běnzi	名
309	2	比	bǐ	动、介
310	2（5）	笔	bǐ	名、（量）
311	2	别1	bié	副
312	2	不错	búcuò	形
313	2	不好意思	bù hǎoyìsi	
314	2	长	cháng	形
315	2	车站	chēzhàn	名
316	2	出	chū	动
317	2	出国	chūguó	动
318	2	出来	chūlái	动
319	2	出门	chūmén	动
320	2	出去	chūqù	动
321	2	床	chuáng	名
322	2	词	cí	名
323	2（7-9）	次	cì	量、（形）
324	2（4）	从	cóng	介、（副）
325	2	从小	cóngxiǎo	副
326	2	错	cuò	形
327	2	打1	dǎ	动
328	2	打车	dǎchē	动
329	2	打开	dǎkāi	动
330	2（7-9）	但	dàn	连、（副）
331	2	但是	dànshì	连
332	2	得	de	助
333	2	地	de	助
334	2（4）	等1	děng	动、（介）
335	2	地铁	dìtiě	名
336	2（4）	点2	diǎn	动、（名、量）
337	2	懂	dǒng	动
338	2	动	dòng	动
339	2	饭馆	fànguǎn	名
340	2	飞	fēi	动
341	2	高	gāo	形、名
342	2	高中	gāozhōng	名
343	2	告诉	gàosu	动
344	2	个子	gèzi	名
345	2（5）	跟	gēn	介、连、（名、动）
346	2	公交车	gōngjiāochē	名
347	2	过	guò	动
348	2	过来	guòlái	动
349	2	过年	guònián	动
350	2	过去1	guòqù	动
351	2	过	guo	助
352	2	还是	háishi	副、连
353	2	黑色	hēisè	名
354	2	红茶	hóngchá	名
355	2	红色	hóngsè	名
356	2	后面	hòumiàn	名
357	2	花1	huā	动
358	2（6）	花2	huā	名、（形）
359	2	画	huà	动、名
360	2	坏	huài	形
361	2	回来	huílái	动
362	2	回去	huíqù	动
363	2	机场	jīchǎng	名
364	2	机票	jīpiào	名
365	2	记得	jìde	动
366	2（4）	间	jiān	量、（名）
367	2	教	jiāo	动
368	2	教室	jiàoshì	名
369	2	介绍	jièshào	动
370	2	进	jìn	动
371	2	近	jìn	形
372	2	进来	jìnlái	动
373	2	进去	jìnqù	动
374	2	经常	jīngcháng	副
375	2	酒店	jiǔdiàn	名
376	2（7-9）	就	jiù	副、（介）
377	2	咖啡	kāfēi	名
378	2	开始	kāishǐ	动、名
379	2	开学	kāixué	动
380	2	考	kǎo	动
381	2	考试	kǎoshì	动、名
382	2	可能	kěnéng	形、名、动
383	2	裤子	kùzi	名
384	2	快	kuài	形、副
385	2	快乐	kuàilè	形
386	2	快要	kuàiyào	副
387	2	篮球	lánqiú	名
388	2	累	lèi	形、动
389	2	离	lí	动
390	2	里面	lǐmiàn	名
391	2	楼	lóu	名
392	2	路	lù	名
393	2	路上	lùshang	名
394	2	旅游	lǚyóu	动
395	2	绿茶	lǜchá	名
396	2（4）	绿色	lǜsè	名、（形）
397	2	慢	màn	形
398	2	没意思	méi yìsi	
399	2（4）	每	měi	代、（副）
400	2	门	mén	名
401	2	门口	ménkǒu	名
402	2	门票	ménpiào	名
403	2（5）	面1	miàn	后缀、（动、名、量）
404	2	名	míng	名、量
405	2	拿	ná	动
406	2	那么	nàme	代、连
407	2	那样	nàyàng	代
408	2	奶茶	nǎichá	名
409	2	奶奶	nǎinai	名
410	2	男孩儿	nánháir	名
411	2	鸟	niǎo	名
412	2	女孩儿	nǚháir	名
413	2	旁边	pángbiān	名
414	2	跑	pǎo	动
415	2	跑步	pǎobù	动
416	2	票	piào	名
417	2	妻子	qīzi	名
418	2	起来	qǐlái	动
419	2	前面	qiánmiàn	名
420	2	晴	qíng	形
421	2	球	qiú	名
422	2（4）	让	ràng	动、（介）
423	2	肉	ròu	名
424	2	商场	shāngchǎng	名
425	2	上来	shànglái	动
426	2	上面	shàngmiàn	名
427	2	上去	shàngqù	动
428	2	上网	shàngwǎng	动
429	2	身体	shēntǐ	名
430	2	生日	shēngrì	名
431	2（6）	时	shí	名、（量）
432	2	事情	shìqing	名
433	2	手	shǒu	名
434	2	手表	shǒubiǎo	名
435	2	书包	shūbāo	名
436	2	舒服	shūfu	形
437	2	送	sòng	动
438	2	虽然	suīrán	连
439	2	所以	suǒyǐ	连
440	2（6）	疼	téng	形、（动）
441	2	踢	tī	动
442	2	题	tí	名
443	2（5）	条	tiáo	量、（名）
444	2	跳舞	tiàowǔ	动
445	2（3）（5）	头	tóu	名、（量）、（形）
446	2	外国	wàiguó	名
447	2	外面	wàimiàn	名
448	2	完	wán	动
449	2	万	wàn	数
450	2	往	wǎng	动、介
451	2	网上	wǎngshang	名
452	2	忘	wàng	动
453	2	位	wèi	量
454	2	为什么	wèi shénme	
455	2	希望	xīwàng	动
456	2	洗	xǐ	动
457	2	洗手间	xǐshǒujiān	名
458	2	下来	xiàlái	动
459	2	下面	xiàmiàn	名
460	2	下去	xiàqù	动
461	2	小孩儿	xiǎoháir	名
462	2	小时候	xiǎoshíhou	名
463	2	笑	xiào	动
464	2	姓	xìng	名、动
465	2	姓名	xìngmíng	名
466	2	颜色	yánsè	名
467	2	眼睛	yǎnjing	名
468	2	药	yào	名
469	2	药店	yàodiàn	名
470	2	爷爷	yéye	名
471	2（3）	一会儿	yíhuìr	数量、（副）
472	2	已经	yǐjīng	副
473	2	一起	yìqǐ	副
474	2	意思	yìsi	名
475	2	阴	yīn	形
476	2	因为	yīnwèi	介、连
477	2	游	yóu	动
478	2	游泳	yóuyǒng	动
479	2	有意思	yǒu yìsi	
480	2	有时	yǒushí	副
481	2	右	yòu	名
482	2	右边	yòubian	名
483	2	鱼	yú	名
484	2	远	yuǎn	形
485	2	运动	yùndòng	动、名
486	2	站1	zhàn	名
487	2	丈夫	zhàngfu	名
488	2	这么	zhème	代
489	2	这样	zhèyàng	代
490	2	着	zhe	助
491	2（5）	正	zhèng	副、（形）
492	2（6）	周	zhōu	名、（量）
493	2	准备	zhǔnbèi	动
494	2	自己	zìjǐ	代
495	2	走	zǒu	动
496	2	走路	zǒulù	动
497	2	足球	zúqiú	名
498	2	最	zuì	副
499	2	左	zuǒ	名
500	2	左边	zuǒbian	名
`;

const classicCsvSpecs = [
  [1, 150],
  [2, 150],
  [3, 300],
  [4, 600],
  [5, 1300],
  [6, 2500],
];

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function normalizeSourceWord(word) {
  return String(word ?? "").normalize("NFC").replace(/[0-9]+$/u, "");
}

function parseLevel(rawLevel) {
  const level = Number(rawLevel.match(/^\d+/u)?.[0] ?? 2);
  const crossLevelNotes = Array.from(rawLevel.matchAll(/（([^）]+)）/gu)).map((match) => match[1]);
  return { level, raw_level: rawLevel, cross_level_notes: crossLevelNotes };
}

function parseRows() {
  return rowsTsv
    .trim()
    .split(/\r?\n/u)
    .map((line) => {
      const [orderRaw, levelRaw, wordRaw, pinyin, pos = ""] = line.split("\t");
      const order = Number(orderRaw);
      if (!Number.isInteger(order)) throw new Error(`Invalid order in line: ${line}`);
      const level = parseLevel(levelRaw);
      return {
        release_id: RELEASE_ID,
        hsk_version: "HSK 3.0",
        hsk_order: order,
        hsk_level: level.level,
        raw_level: level.raw_level,
        cross_level_notes: level.cross_level_notes,
        source_word: wordRaw,
        simplified: normalizeSourceWord(wordRaw),
        hsk_key: `${order}:${wordRaw}`,
        pinyin,
        pos,
        source: {
          label: "Official HSK 3.0 syllabus vocabulary/characters/grammar PDF",
          publisher: "中外语言交流合作中心",
          publication_date: "2025-11",
          implementation_date: "2026-07",
          official_page_url: CHINESE_TEST_URL,
          pdf_url: SOURCE_URL,
          local_pdf_path: "outputs/hsk/source/hsk3_official_syllabus_vocab_chars_grammar_202511_202607.pdf",
          extraction_note:
            "Seeded from the official local PDF snapshot; rows 301-500 were extracted with bundled pypdf and normalized into this TSV.",
        },
      };
    });
}

async function loadClassicRows() {
  const rows = [];
  for (const [level, count] of classicCsvSpecs) {
    const csvPath = path.join(ROOT, "outputs", "hsk", `hsk2_classic_level_${level}_${count}_v1.csv`);
    const text = await fs.readFile(csvPath, "utf8");
    const lines = text.trimEnd().split(/\r?\n/u);
    const headers = parseCsvLine(lines[0]);
    for (const line of lines.slice(1)) {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      rows.push({
        release_id: row.release_id,
        classic_level: level,
        hsk_order: Number(row.hsk_order),
        simplified: normalizeSourceWord(row.simplified),
        source_word: row.simplified,
        pinyin: row.pinyin,
        en: row.EN,
      });
    }
  }
  return rows;
}

function buildOverlap(newRows, classicRows) {
  const bySimplified = new Map();
  for (const row of classicRows) {
    const list = bySimplified.get(row.simplified) ?? [];
    list.push(row);
    bySimplified.set(row.simplified, list);
  }

  return newRows.map((row) => {
    const exactMatches = bySimplified.get(row.simplified) ?? [];
    return {
      hsk3_order: row.hsk_order,
      hsk3_level: row.hsk_level,
      hsk3_source_word: row.source_word,
      hsk3_simplified: row.simplified,
      hsk3_pinyin: row.pinyin,
      hsk3_pos: row.pos,
      overlap_type: exactMatches.length ? "exact_classic_word" : "absent_as_exact_classic_word",
      classic_matches: exactMatches.map((match) => ({
        classic_release_id: match.release_id,
        classic_level: match.classic_level,
        classic_order: match.hsk_order,
        classic_source_word: match.source_word,
        classic_pinyin: match.pinyin,
        classic_en: match.en,
        pinyin_same: match.pinyin === row.pinyin,
      })),
    };
  });
}

function summarize(overlapRows) {
  const exact = overlapRows.filter((row) => row.overlap_type === "exact_classic_word");
  const absent = overlapRows.filter((row) => row.overlap_type === "absent_as_exact_classic_word");
  const byClassicLevel = {};
  for (const row of exact) {
    for (const match of row.classic_matches) {
      byClassicLevel[match.classic_level] = (byClassicLevel[match.classic_level] ?? 0) + 1;
    }
  }
  return {
    release_id: RELEASE_ID,
    hsk3_rows: overlapRows.length,
    exact_classic_word_rows: exact.length,
    absent_as_exact_classic_word_rows: absent.length,
    exact_match_count_by_classic_level: byClassicLevel,
    note:
      "This first-pass report checks exact simplified source-word reuse only. Compound-related rows require separate HSK 3.0 work before reuse.",
  };
}

function toMarkdown(summary, overlapRows) {
  const sampleAbsent = overlapRows
    .filter((row) => row.overlap_type === "absent_as_exact_classic_word")
    .slice(0, 40)
    .map((row) => `${row.hsk3_order} ${row.hsk3_source_word} (${row.hsk3_pinyin})`)
    .join(", ");
  return [
    `# ${RELEASE_ID} Classic Overlap`,
    "",
    `Rows checked: ${summary.hsk3_rows}`,
    `Exact Classic word rows: ${summary.exact_classic_word_rows}`,
    `Absent as exact Classic word rows: ${summary.absent_as_exact_classic_word_rows}`,
    `Exact matches by Classic level: ${JSON.stringify(summary.exact_match_count_by_classic_level)}`,
    "",
    "This is an exact simplified-word overlap report only. It deliberately does not auto-reuse compound-related rows.",
    "",
    "First absent exact rows:",
    "",
    sampleAbsent || "None",
    "",
  ].join("\n");
}

async function main() {
  const newRows = parseRows();
  if (newRows.length !== 200) throw new Error(`Expected 200 HSK3 level 2 rows, got ${newRows.length}`);
  const seenOrders = new Set(newRows.map((row) => row.hsk_order));
  for (let order = 301; order <= 500; order += 1) {
    if (!seenOrders.has(order)) throw new Error(`Missing HSK3 order ${order}`);
  }
  for (const row of newRows) {
    if (row.hsk_level !== 2) throw new Error(`Row ${row.hsk_order} is not HSK level 2`);
  }

  const classicRows = await loadClassicRows();
  const overlapRows = buildOverlap(newRows, classicRows);
  const summary = summarize(overlapRows);

  const sourceOut = path.join(ROOT, "outputs", "hsk", "source", `${RELEASE_ID}.source.json`);
  const overlapJsonOut = path.join(ROOT, "outputs", "hsk", "qa", `${RELEASE_ID}_classic_overlap_${DATE}.json`);
  const overlapMdOut = path.join(ROOT, "outputs", "hsk", "qa", `${RELEASE_ID}_classic_overlap_${DATE}.md`);

  await fs.mkdir(path.dirname(sourceOut), { recursive: true });
  await fs.mkdir(path.dirname(overlapJsonOut), { recursive: true });
  await fs.writeFile(sourceOut, `${JSON.stringify(newRows, null, 2)}\n`);
  await fs.writeFile(
    overlapJsonOut,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_release_id: RELEASE_ID,
        source_path: path.relative(ROOT, sourceOut),
        classic_inputs: classicCsvSpecs.map(
          ([level, count]) => `outputs/hsk/hsk2_classic_level_${level}_${count}_v1.csv`
        ),
        summary,
        rows: overlapRows,
      },
      null,
      2
    )}\n`
  );
  await fs.writeFile(overlapMdOut, toMarkdown(summary, overlapRows));
  console.log(
    JSON.stringify(
      {
        status: "ok",
        source: path.relative(ROOT, sourceOut),
        overlap_json: path.relative(ROOT, overlapJsonOut),
        overlap_md: path.relative(ROOT, overlapMdOut),
        summary,
      },
      null,
      2
    )
  );
}

await main();
