import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATE = "20260603";
const RELEASE_ID = "hsk3_level_1_300_v1";
const SOURCE_URL =
  "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81%E8%AF%AD%E6%B3%95%EF%BC%89.pdf";
const CHINESE_TEST_URL = "https://www.chinesetest.cn/hsk";

const rowsTsv = String.raw`
1	1	爱	ài	动
2	1	八	bā	数
3	1	爸爸	bàba	名
4	1	吧	ba	助
5	1	白天	báitiān	名
6	1	百	bǎi	数
7	1（4）	半	bàn	数、（副）
8	1	包子	bāozi	名
9	1	杯子	bēizi	名
10	1	本1	běn	量
11	1	边	biān	名、后缀
12	1	病	bìng	名、动
13	1	不	bù	副
14	1	不客气	bú kèqi	
15	1	不要	búyào	副
16	1	菜	cài	名
17	1	茶	chá	名
18	1	唱	chàng	动
19	1	超市	chāoshì	名
20	1	车	chē	名
21	1	吃	chī	动
22	1	出租车	chūzūchē	名
23	1	穿	chuān	动
24	1	打电话	dǎ diànhuà	
25	1	大	dà	形
26	1	大家	dàjiā	代
27	1	大学	dàxué	名
28	1	大学生	dàxuéshēng	名
29	1	到	dào	动
30	1	的	de	助
31	1	第	dì	前缀
32	1	弟弟	dìdi	名
33	1（3）	点1	diǎn	量、（名）
34	1	店	diàn	名
35	1	电话	diànhuà	名
36	1	电脑	diànnǎo	名
37	1	电视	diànshì	名
38	1	电影	diànyǐng	名
39	1	电影院	diànyǐngyuàn	名
40	1	东西	dōngxi	名
41	1	都	dōu	副
42	1	读	dú	动
43	1	读书	dúshū	动
44	1（4）	对	duì	形、介、（动、量）
45	1	对不起	duìbuqǐ	动
46	1（2）	多	duō	形、动、代、（数、副）
47	1	多少	duōshao	代
48	1	儿子	érzi	名
49	1	二	èr	数
50	1	饭	fàn	名
51	1	饭店	fàndiàn	名
52	1	房间	fángjiān	名
53	1	非常	fēicháng	副
54	1	飞机	fēijī	名
55	1（3）	分	fēn	量、（动、名）
56	1	分钟	fēnzhōng	量
57	1	高兴	gāoxìng	形
58	1	歌	gē	名
59	1	哥哥	gēge	名
60	1	个	gè	量
61	1（2）	给	gěi	动、（介）
62	1	公司	gōngsī	名
63	1	工作	gōngzuò	动、名
64	1	狗	gǒu	名
65	1	贵	guì	形
66	1	国	guó	名
67	1	还	hái	副
68	1	孩子	háizi	名
69	1	汉语	Hànyǔ	名
70	1	汉字	Hànzì	名
71	1（2）（4）	好	hǎo	形、（副）、（动）
72	1	好吃	hǎochī	形
73	1	好看	hǎokàn	形
74	1	好听	hǎotīng	形
75	1	好玩儿	hǎowánr	形
76	1	号	hào	名、量
77	1	喝	hē	动
78	1	和1	hé	介、连
79	1	很	hěn	副
80	1	后	hòu	名
81	1（3）	回	huí	动、（量）
82	1	会1	huì	动
83	1	火车	huǒchē	名
84	1	鸡蛋	jīdàn	名
85	1	几	jǐ	代、数
86	1（3）	家	jiā	名、量、（后缀）
87	1	家人	jiārén	名
88	1	见	jiàn	动
89	1	件	jiàn	量
90	1	饺子	jiǎozi	名
91	1（4）	叫	jiào	动、（介）
92	1	姐姐	jiějie	名
93	1	今年	jīnnián	名
94	1	今天	jīntiān	名
95	1	九	jiǔ	数
96	1	觉得	juéde	动
97	1	开	kāi	动
98	1	开车	kāichē	动
99	1	看	kàn	动
100	1	看病	kànbìng	动
101	1	看见	kànjiàn	动
102	1	可以	kěyǐ	动、形
103	1	课	kè	名
104	1	口	kǒu	名、量
105	1	块	kuài	量
106	1	来	lái	动
107	1	老师	lǎoshī	名
108	1	了	le	助
109	1	冷	lěng	形
110	1	里	lǐ	名
111	1	两1	liǎng	数
112	1	零	líng	数
113	1	六	liù	数
114	1	妈妈	māma	名
115	1	吗	ma	助
116	1	买	mǎi	动
117	1	卖	mài	动
118	1	忙	máng	形、动
119	1	猫	māo	名
120	1	没关系	méi guānxi	
121	1	没事	méishì	动
122	1	没有	méiyǒu	动、副
123	1	妹妹	mèimei	名
124	1	们	men	后缀
125	1	米饭	mǐfàn	名
126	1	面包	miànbāo	名
127	1	面条儿	miàntiáor	名
128	1	明年	míngnián	名
129	1	明天	míngtiān	名
130	1	名字	míngzi	名
131	1	哪	nǎ	代
132	1	哪个	nǎge	代
133	1	哪里	nǎlǐ	代
134	1	哪儿	nǎr	代
135	1	哪些	nǎxiē	代
136	1（2）	那	nà	代、（连）
137	1	那边	nàbiān	代
138	1	那个	nàge	代
139	1	那里	nàlǐ	代
140	1	那儿	nàr	代
141	1	那些	nàxiē	代
142	1	男	nán	形
143	1	男朋友	nánpéngyou	名
144	1	呢	ne	助
145	1	能	néng	动
146	1	你	nǐ	代
147	1	你好	nǐhǎo	
148	1	你们	nǐmen	代
149	1	年	nián	名、量
150	1	您	nín	代
151	1	牛奶	niúnǎi	名
152	1	女	nǚ	形
153	1	女儿	nǚ’ér	名
154	1	女朋友	nǚpéngyou	名
155	1	女士	nǚshì	名
156	1	朋友	péngyou	名
157	1	便宜	piányi	形
158	1	漂亮	piàoliang	形
159	1	苹果	píngguǒ	名
160	1	七	qī	数
161	1	起床	qǐchuáng	动
162	1	千	qiān	数
163	1	前	qián	名
164	1	钱	qián	名
165	1	请	qǐng	动
166	1	请问	qǐngwèn	动
167	1	去	qù	动
168	1	去年	qùnián	名
169	1	热	rè	形
170	1	人	rén	名
171	1	认识	rènshi	动
172	1（4）	日	rì	量、（名）
173	1	三	sān	数
174	1	商店	shāngdiàn	名
175	1	上	shàng	名、动
176	1	上班	shàngbān	动
177	1	上课	shàngkè	动
178	1	上午	shàngwǔ	名
179	1	上学	shàngxué	动
180	1	少	shǎo	形、动
181	1	谁	shéi/shuí	代
182	1	什么	shénme	代
183	1	生病	shēngbìng	动
184	1	十	shí	数
185	1	时候	shíhou	名
186	1	时间	shíjiān	名
187	1	事	shì	名
188	1	是	shì	动
189	1	手机	shǒujī	名
190	1	书	shū	名
191	1	书店	shūdiàn	名
192	1	水	shuǐ	名
193	1	水果	shuǐguǒ	名
194	1	睡	shuì	动
195	1	睡觉	shuìjiào	动
196	1	说	shuō	动
197	1	说话	shuōhuà	动
198	1	四	sì	数
199	1	岁	suì	量
200	1	他	tā	代
201	1	它	tā	代
202	1	她	tā	代
203	1	他们	tāmen	代
204	1	它们	tāmen	代
205	1	她们	tāmen	代
206	1	太	tài	副
207	1	天	tiān	名、量
208	1	天气	tiānqì	名
209	1	听	tīng	动
210	1	听见	tīngjiàn	动
211	1	同学	tóngxué	名
212	1	外	wài	名
213	1	外边	wàibian	名
214	1	玩	wán	动
215	1	晚	wǎn	形
216	1	晚饭	wǎnfàn	名
217	1	晚上	wǎnshang	名
218	1	喂1	wèi	叹
219	1	问	wèn	动
220	1	问题	wèntí	名
221	1	我	wǒ	代
222	1	我们	wǒmen	代
223	1	五	wǔ	数
224	1	午饭	wǔfàn	名
225	1	喜欢	xǐhuan	动
226	1	下	xià	名、动、量
227	1	下雨	xià yǔ	
228	1	下班	xiàbān	动
229	1	下课	xiàkè	动
230	1	下午	xiàwǔ	名
231	1	先生	xiānsheng	名
232	1	现在	xiànzài	名
233	1	想	xiǎng	动
234	1	小	xiǎo	形、前缀
235	1	小朋友	xiǎopéngyǒu	名
236	1	小时	xiǎoshí	名
237	1	小学	xiǎoxué	名
238	1	小学生	xiǎoxuéshēng	名
239	1	些	xiē	量
240	1	写	xiě	动
241	1	谢谢	xièxie	动
242	1	新	xīn	形
243	1	星期	xīngqī	名
244	1	星期日	xīngqīrì	名
245	1	星期天	xīngqītiān	名
246	1	休息	xiūxi	动
247	1	学	xué	动
248	1	学生	xuéshēng	名
249	1	学习	xuéxí	动
250	1	学校	xuéxiào	名
251	1	雪	xuě	名
252	1	要	yào	动
253	1	也	yě	副
254	1	一	yī	数
255	1	衣服	yīfu	名
256	1	医生	yīshēng	名
257	1	医院	yīyuàn	名
258	1	一半	yíbàn	数
259	1（4）	一下	yíxià	数量、（副）
260	1	椅子	yǐzi	名
261	1	一点儿	yìdiǎnr	数量
262	1	一些	yìxiē	数量
263	1	有	yǒu	动
264	1	有的	yǒude	代
265	1	有点儿	yǒudiǎnr	副
266	1（3）	有些	yǒuxiē	代、（副）
267	1	雨	yǔ	名
268	1	元	yuán	量
269	1	月	yuè	名
270	1	再	zài	副
271	1	在	zài	动、介、副
272	1	再见	zàijiàn	动
273	1	早	zǎo	形
274	1	早饭	zǎofàn	名
275	1	早上	zǎoshang	名
276	1	怎么	zěnme	代
277	1	怎么样	zěnmeyàng	代
278	1	找	zhǎo	动
279	1	这	zhè	代
280	1	这边	zhèbiān	代
281	1	这个	zhège	代
282	1	这里	zhèlǐ	代
283	1	这儿	zhèr	代
284	1	这些	zhèxiē	代
285	1（4）	真	zhēn	副、（形）
286	1	正在	zhèngzài	副
287	1	只	zhī	量
288	1	知道	zhīdào	动
289	1	中国	Zhōngguó	名
290	1	中文	Zhōngwén	名
291	1	中午	zhōngwǔ	名
292	1	中学	zhōngxué	名
293	1	中学生	zhōngxuéshēng	名
294	1	住	zhù	动
295	1	桌子	zhuōzi	名
296	1	字	zì	名
297	1	昨天	zuótiān	名
298	1	坐	zuò	动
299	1	做	zuò	动
300	1	做饭	zuò fàn	
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
  const level = Number(rawLevel.match(/^\d+/u)?.[0] ?? 1);
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
            "Seeded from official PDF text extracted through web tooling because local PDF text tools were unavailable.",
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
      "This first-pass report checks exact simplified source-word reuse only. Compound-related rows require a separate semantic/compound audit before reuse.",
  };
}

function toMarkdown(summary, overlapRows) {
  const sampleAbsent = overlapRows
    .filter((row) => row.overlap_type === "absent_as_exact_classic_word")
    .slice(0, 30)
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
  if (newRows.length !== 300) throw new Error(`Expected 300 HSK3 level 1 rows, got ${newRows.length}`);
  const seenOrders = new Set(newRows.map((row) => row.hsk_order));
  for (let order = 1; order <= 300; order += 1) {
    if (!seenOrders.has(order)) throw new Error(`Missing HSK3 order ${order}`);
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
        source_path: sourceOut,
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
  console.log(JSON.stringify({ status: "ok", sourceOut, overlapJsonOut, overlapMdOut, summary }, null, 2));
}

await main();
