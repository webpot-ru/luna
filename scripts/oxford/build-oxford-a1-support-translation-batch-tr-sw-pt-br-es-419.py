#!/usr/bin/env python3
"""Build Oxford A1 support translations for TR/SW/PT-BR/ES-419."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = PROJECT_ROOT / "outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_001_150_v1_en_us_pronunciations_v1.jsonl"
DEFAULT_OUTPUT_PATH = PROJECT_ROOT / "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_001_150_v1_support_translation_batch_tr_sw_pt_br_es_419_v1.jsonl"
DEFAULT_SUMMARY_PATH = PROJECT_ROOT / "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_001_150_v1_support_translation_batch_tr_sw_pt_br_es_419_v1_summary.md"
PT_SOURCE_PATH = PROJECT_ROOT / "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_001_150_v1_support_translation_batch_de_it_pt_v1.jsonl"
ES_SOURCE_PATH = PROJECT_ROOT / "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_001_150_v1_support_translation_batch_ru_es_fr_v1.jsonl"

LANGUAGES = ["TR", "SW", "PT-BR", "ES-419"]
NEW_TRANSLATION_LANGUAGES = ["TR", "SW"]
BATCH_ID = "tr_sw_pt_br_es_419_v1"

SENTENCE_END_RE = re.compile(r"[.!?]$")
LATINISH_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žƏəĞğİıŞşÇçÖöÜü]")

TR_SW_TSV = """source_headword	TR	example_TR	SW	example_SW
a, an	belirsiz artikel	Bir kalemim var.	kibainishi kisicho dhahiri	Nina kalamu moja.
about	hakkında; yaklaşık	Yemek hakkında konuşuruz.	kuhusu; takriban	Tunazungumza kuhusu chakula.
above	üstünde	Saat kapının üstünde.	juu ya	Saa iko juu ya mlango.
across	karşısında; boyunca	Dükkan sokağın karşısında.	ng'ambo ya; kuvuka	Duka liko ng'ambo ya barabara.
action	eylem; hareket	Onun eylemi bana yardım eder.	tendo	Tendo lake hunisaidia.
activity	etkinlik	Yüzmek eğlenceli bir etkinliktir.	shughuli	Kuogelea ni shughuli ya kufurahisha.
actor	aktör	Aktör bir filmde.	mwigizaji wa kiume	Mwigizaji yuko kwenye filamu.
actress	aktris	Aktris bize gülümser.	mwigizaji wa kike	Mwigizaji anatabasamu kwetu.
add	eklemek	Adını buraya ekle.	ongeza	Ongeza jina lako hapa.
address	adres	Adresim bu kartta.	anwani	Anwani yangu iko kwenye kadi hii.
adult	yetişkin	Bir yetişkin kapının yanında oturur.	mtu mzima	Mtu mzima anakaa karibu na mlango.
advice	tavsiye	Onun tavsiyesi basit.	ushauri	Ushauri wake ni rahisi.
afraid	korkmuş	Çocuk korkmuş.	mwenye hofu	Mtoto ana hofu.
after	sonra	Dersten sonra yerim.	baada ya	Ninakula baada ya darasa.
afternoon	öğleden sonra	Öğleden sonra çalışırım.	alasiri	Ninasoma alasiri.
again	tekrar; yine	Lütfen bunu tekrar söyle.	tena	Tafadhali sema tena.
age	yaş	Yaşın kaç?	umri	Una umri gani?
ago	önce	Buraya iki gün önce geldim.	iliyopita	Nilikuja hapa siku mbili zilizopita.
agree	katılmak; anlaşmak	Sana katılıyorum.	kubali	Ninakubaliana nawe.
air	hava	Hava soğuk.	hewa	Hewa ni baridi.
airport	havaalanı	Havaalanındayız.	uwanja wa ndege	Tuko uwanja wa ndege.
all	tüm; hepsi	Tüm öğrenciler burada.	wote; yote	Wanafunzi wote wako hapa.
also	de; da	Ben de çayı severim.	pia	Mimi pia napenda chai.
always	her zaman	O her zaman su içer.	kila wakati	Yeye hunywa maji kila wakati.
amazing	harika	Manzara harika.	ajabu	Mandhari ni ya ajabu.
and	ve	Tom ve Anna arkadaştır.	na	Tom na Anna ni marafiki.
angry	kızgın	O şimdi kızgın.	mwenye hasira	Ana hasira sasa.
animal	hayvan	Köpek bir hayvandır.	mnyama	Mbwa ni mnyama.
another	başka; bir tane daha	Bir fincan daha istiyorum.	mwingine	Ninataka kikombe kingine.
answer	cevap	Cevabı buraya yaz.	jibu	Andika jibu hapa.
any	herhangi bir	Hiç paran var mı?	yoyote; kiasi	Una pesa yoyote?
anyone	herhangi biri	Yardıma ihtiyacı olan var mı?	mtu yeyote	Je, mtu yeyote anahitaji msaada?
anything	herhangi bir şey	Hiçbir şey göremiyorum.	chochote	Sioni chochote.
apartment	daire	Dairem küçük.	ghorofa	Ghorofa yangu ni ndogo.
apple	elma	Bu elma kırmızı.	tufaha	Tufaha hili ni jekundu.
April	Nisan	Doğum günüm Nisan ayında.	Aprili	Siku yangu ya kuzaliwa iko Aprili.
area	alan; bölge	Bu bölge sessiz.	eneo	Eneo hili ni tulivu.
arm	kol	Kolum ağrıyor.	mkono	Mkono wangu unauma.
around	etrafında	Parkın etrafında yürürüz.	kuzunguka	Tunatembea kuzunguka bustani.
arrive	varmak	Onlar altıda varır.	fika	Wanafika saa sita.
art	sanat	Sanatı severim.	sanaa	Ninapenda sanaa.
article	makale	İnternette bir makale okurum.	makala	Ninasoma makala mtandaoni.
artist	sanatçı	Sanatçı bir yüz çizer.	msanii	Msanii anachora uso.
as	olarak; gibi	Öğretmen olarak çalışırım.	kama	Ninafanya kazi kama mwalimu.
ask	sormak; istemek	Şimdi öğretmene sor.	uliza; omba	Muulize mwalimu sasa.
at	-de; yanında	Evdeyim.	katika; karibu na	Niko nyumbani.
August	Ağustos	Ağustos ayında seyahat ederiz.	Agosti	Tunasafiri mwezi wa Agosti.
aunt	teyze; hala	Teyzem burada yaşar.	shangazi	Shangazi yangu anaishi hapa.
autumn	sonbahar	Sonbaharda yapraklar düşer.	msimu wa vuli	Majani huanguka msimu wa vuli.
away	uzağa	Otobüs uzağa gider.	mbali	Basi linaenda mbali.
baby	bebek	Bebek uyuyor.	mtoto mchanga	Mtoto mchanga analala.
back	sırt; geri	Sırtım ağrıyor.	mgongo; nyuma	Mgongo wangu unauma.
bad	kötü; bozuk	Bu süt bozuk.	mbaya; iliyoharibika	Maziwa haya yameharibika.
bag	çanta	Çantan sandalyenin üstünde.	begi	Begi lako liko juu ya kiti.
ball	top	Top masanın altında.	mpira	Mpira uko chini ya meza.
banana	muz	Muz yerim.	ndizi	Ninakula ndizi.
band	müzik grubu	Grup müzik çalar.	bendi	Bendi inapiga muziki.
bank (money)	banka	Banka dokuzda açılır.	benki	Benki hufunguliwa saa tatu.
bath	banyo	Geceleri banyo yaparım.	kuoga	Ninaoga usiku.
bathroom	banyo	Banyo temiz.	bafu	Bafu ni safi.
be	olmak	Mutluyum.	kuwa	Nina furaha.
beach	plaj	Plajda otururuz.	ufukwe	Tunakaa ufukweni.
beautiful	güzel	Çiçek güzel.	mrembo; mzuri	Ua ni zuri.
because	çünkü	Hastayım, bu yüzden evde kalırım.	kwa sababu	Ninakaa nyumbani kwa sababu ninaumwa.
become	olmak; haline gelmek	Hava soğuyabilir.	kuwa	Inaweza kuwa baridi.
bed	yatak	Yatak büyük.	kitanda	Kitanda ni kikubwa.
bedroom	yatak odası	Yatak odam sessiz.	chumba cha kulala	Chumba changu cha kulala ni kimya.
beer	bira	Akşam yemeğiyle bira içer.	bia	Anakunywa bia na chakula cha jioni.
before	önce	Öğle yemeğinden önce ellerini yıka.	kabla ya	Nawa mikono kabla ya chakula cha mchana.
begin	başlamak	Teste şimdi başla.	anza	Anza mtihani sasa.
beginning	başlangıç	Başlangıç kolay.	mwanzo	Mwanzo ni rahisi.
behind	arkasında	Kedi kanepenin arkasında.	nyuma ya	Paka yuko nyuma ya sofa.
believe	inanmak	Sana inanıyorum.	amini	Ninakuamini.
below	altında; aşağıda	Ad resmin altında.	chini ya	Jina liko chini ya picha.
best	en iyi	O benim en iyi arkadaşım.	bora zaidi	Yeye ni rafiki yangu bora zaidi.
better	daha iyi	Bugün daha iyi hissediyorum.	bora zaidi	Ninahisi vizuri zaidi leo.
between	arasında	Kafe iki dükkanın arasında.	kati ya	Kahawa iko kati ya maduka mawili.
bicycle	bisiklet	Bisikletim mavi.	baiskeli	Baiskeli yangu ni ya buluu.
big	büyük	Bu kutu büyük.	kubwa	Sanduku hili ni kubwa.
bike	bisiklet	Bisikletimi sürerim.	baiskeli	Ninaendesha baiskeli yangu.
bill	hesap	Hesap masanın üstünde.	bili	Bili iko juu ya meza.
bird	kuş	Ağaçta bir kuş var.	ndege	Ndege yuko mtini.
birthday	doğum günü	Bugün doğum günüm.	siku ya kuzaliwa	Leo ni siku yangu ya kuzaliwa.
black	siyah	Çantam siyah.	nyeusi	Begi langu ni jeusi.
blog	blog	O bir blog yazar.	blogu	Anaandika blogu.
blonde	sarışın	Onun sarı saçları var.	mwenye nywele za rangi ya dhahabu	Ana nywele za rangi ya dhahabu.
blue	mavi	Gökyüzü mavi.	buluu	Anga ni la buluu.
boat	tekne	Tekne suyun üstünde.	mashua	Mashua iko juu ya maji.
body	vücut	Vücudum yorgun.	mwili	Mwili wangu umechoka.
book	kitap	Bir kitap okurum.	kitabu	Ninasoma kitabu.
boot	bot	Bir bot yatağın altında.	buti	Buti moja iko chini ya kitanda.
bored	sıkılmış	Sıkıldım.	nimechoka; nimeboreka	Nimeboreka.
boring	sıkıcı	Bu film sıkıcı.	ya kuchosha	Filamu hii inachosha.
born	doğmuş	Mayıs ayında doğdum.	kuzaliwa	Nilizaliwa Mei.
both	ikisi de	İki kız da mutlu.	wote wawili	Wasichana wote wawili wana furaha.
bottle	şişe	Şişe dolu.	chupa	Chupa imejaa.
box	kutu	Kutu açık.	sanduku	Sanduku limefunguliwa.
boy	erkek çocuk	Erkek çocuk hızlı koşar.	mvulana	Mvulana anakimbia haraka.
boyfriend	erkek arkadaş	Onun erkek arkadaşı nazik.	mpenzi wa kiume	Mpenzi wake wa kiume ni mwema.
bread	ekmek	Ekmek istiyorum.	mkate	Ninataka mkate.
break	kırmak	Bardağı kırma.	vunja	Usivunje kikombe.
breakfast	kahvaltı	Kahvaltı hazır.	kifungua kinywa	Kifungua kinywa kiko tayari.
bring	getirmek	Kitabını getir.	leta	Leta kitabu chako.
brother	erkek kardeş	Erkek kardeşim uzun boylu.	kaka; ndugu wa kiume	Kaka yangu ni mrefu.
brown	kahverengi	Köpek kahverengi.	kahawia	Mbwa ni wa kahawia.
build	inşa etmek	Onlar bir ev inşa eder.	jenga	Wanajenga nyumba.
building	bina	Bu bina eski.	jengo	Jengo hili ni la zamani.
bus	otobüs	Otobüs gecikti.	basi	Basi limechelewa.
business	iş; işletme	Babamın bir işi var.	biashara	Baba yangu ana biashara.
busy	meşgul	Bugün meşgulüm.	mwenye shughuli	Nina shughuli leo.
but	ama; fakat	Çayı severim, ama kahveyi değil.	lakini	Napenda chai, lakini si kahawa.
butter	tereyağı	Ekmeğe tereyağı sür.	siagi	Weka siagi juu ya mkate.
buy	satın almak	Süt satın alırım.	nunua	Ninanunua maziwa.
by	yanında; ile	Pencerenin yanında otur.	karibu na; kwa	Kaa karibu na dirisha.
bye	hoşça kal	Hoşça kal, yarın görüşürüz.	kwaheri	Kwaheri, tuonane kesho.
cafe	kafe	Kafede buluşuruz.	mkahawa	Tunakutana kwenye mkahawa.
cake	kek	Kek tatlı.	keki	Keki ni tamu.
call	aramak; çağırmak	Lütfen beni ara.	piga simu; ita	Tafadhali nipigie simu.
camera	kamera	Kameram yeni.	kamera	Kamera yangu ni mpya.
can1 modal	-ebilmek	Yüzebilirim.	kuweza	Ninaweza kuogelea.
cannot	-ememek; yapamamak	Bugün gelemem.	kutoweza	Siwezi kuja leo.
capital	başkent	Paris bir başkenttir.	mji mkuu	Paris ni mji mkuu.
car	araba	Araba kırmızı.	gari	Gari ni jekundu.
card	kart	Bir doğum günü kartım var.	kadi	Nina kadi ya siku ya kuzaliwa.
career	kariyer	Sanatta bir kariyer istiyorum.	kazi ya maisha	Ninataka kazi ya maisha katika sanaa.
carrot	havuç	Havuç turuncu.	karoti	Karoti ni ya machungwa.
carry	taşımak	Çantamı taşırım.	beba	Ninabeba begi langu.
cat	kedi	Kedi uyur.	paka	Paka analala.
CD	CD; disk	Bu diskte müzik var.	CD; diski	Diski hii ina muziki.
cent	sent	Bir sent çok küçüktür.	senti	Senti moja ni ndogo sana.
centre	merkez	Şehir merkezi kalabalık.	kituo; katikati	Katikati ya mji kuna shughuli.
century	yüzyıl	Bir yüzyıl yüz yıldır.	karne	Karne moja ni miaka mia moja.
chair	sandalye	Sandalyeye otur.	kiti	Kaa kwenye kiti.
change	değiştirmek	Kıyafetlerimi değiştiririm.	badilisha	Ninabadilisha nguo zangu.
chart	grafik; tablo	Grafiğe bak.	chati	Angalia chati.
cheap	ucuz	Bu gömlek ucuz.	nafuu	Shati hili ni la bei nafuu.
check	kontrol etmek	Cevabını kontrol et.	angalia; hakiki	Angalia jibu lako.
cheese	peynir	Peyniri severim.	jibini	Ninapenda jibini.
chicken	tavuk	Akşam yemeğinde tavuk yeriz.	kuku; nyama ya kuku	Tunakula kuku kwa chakula cha jioni.
child	çocuk	Çocuk mutlu.	mtoto	Mtoto ana furaha.
chocolate	çikolata	Çikolata tatlıdır.	chokoleti	Chokoleti ni tamu.
choose	seçmek	Bir cevap seç.	chagua	Chagua jibu moja.
cinema	sinema	Sinemaya gideriz.	sinema	Tunaenda sinema.
city	şehir	Şehir büyük.	jiji; mji	Jiji ni kubwa.
class	ders; sınıf	Ders dokuzda başlar.	darasa	Darasa linaanza saa tatu.
classroom	sınıf	Sınıf sessiz.	chumba cha darasa	Chumba cha darasa ni kimya.
clean	temiz; temizlemek	Oda temiz.	safi; safisha	Chumba ni safi.
climb	tırmanmak	Onlar tepeye tırmanır.	panda	Wanapanda kilima.
clock	saat	Saat duvarda.	saa	Saa iko ukutani.
close1	kapatmak	Lütfen kapıyı kapat.	funga	Tafadhali funga mlango.
"""

REGIONAL_OVERRIDES = {
    "PT-BR": {
        "bathroom": ("banheiro", "O banheiro está limpo."),
        "breakfast": ("café da manhã", "O café da manhã está pronto."),
        "bus": ("ônibus", "O ônibus está atrasado."),
    },
    "ES-419": {
        "car": ("auto; carro", "El auto es rojo."),
    },
}


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_number}: invalid JSONL") from exc
    return rows


def load_new_translations() -> dict[str, dict[str, tuple[str, str]]]:
    lines = [line for line in TR_SW_TSV.strip().splitlines() if line.strip()]
    header = lines[0].split("\t")
    expected = ["source_headword", "TR", "example_TR", "SW", "example_SW"]
    if header != expected:
        raise ValueError(f"unexpected TSV header: {header}")

    translations: dict[str, dict[str, tuple[str, str]]] = {}
    seen: Counter[str] = Counter()
    for line_number, line in enumerate(lines[1:], start=2):
        cells = line.split("\t")
        if len(cells) != len(expected):
            raise ValueError(f"TR/SW TSV line {line_number}: expected {len(expected)} cells, got {len(cells)}")
        source_headword, tr, example_tr, sw, example_sw = cells
        seen[source_headword] += 1
        translations[source_headword] = {
            "TR": (tr.strip(), example_tr.strip()),
            "SW": (sw.strip(), example_sw.strip()),
        }
    duplicates = sorted(headword for headword, count in seen.items() if count > 1)
    if duplicates:
        raise ValueError(f"duplicate TR/SW TSV headwords: {duplicates[:10]}")
    return translations


def load_regional_translations(path: Path, base_language: str, target_language: str) -> dict[str, tuple[str, str]]:
    translations: dict[str, tuple[str, str]] = {}
    for row in load_jsonl(path):
        source_headword = row["source_headword"]
        display = row[base_language].strip()
        example = row[f"example_{base_language}"].strip()
        translations[source_headword] = REGIONAL_OVERRIDES.get(target_language, {}).get(source_headword, (display, example))
    return translations


def validate_source_alignment(source_rows: list[dict], *translation_sets: dict[str, object]) -> None:
    source_keys = [row["source_headword"] for row in source_rows]
    expected = set(source_keys)
    if len(source_keys) != len(expected):
        duplicates = sorted(headword for headword, count in Counter(source_keys).items() if count > 1)
        raise ValueError(f"duplicate source headwords: {duplicates[:10]}")
    for index, translations in enumerate(translation_sets, start=1):
        keys = set(translations)
        missing = sorted(expected - keys)
        extra = sorted(keys - expected)
        if missing or extra:
            raise ValueError(f"translation set {index} source mismatch: missing={missing[:10]} extra={extra[:10]}")


def validate_translation_cells(rows: list[dict]) -> None:
    for row in rows:
        source_headword = row["source_headword"]
        for language in LANGUAGES:
            display = row.get(language, "")
            example = row.get(f"example_{language}", "")
            if not display:
                raise ValueError(f"{source_headword}: {language} display is empty")
            if not example:
                raise ValueError(f"{source_headword}: {language} example is empty")
            if not SENTENCE_END_RE.search(example):
                raise ValueError(f"{source_headword}: {language} example has no sentence punctuation: {example}")
            if not LATINISH_RE.search(display):
                raise ValueError(f"{source_headword}: {language} display is not Latin-script enough: {display}")
            if not LATINISH_RE.search(example):
                raise ValueError(f"{source_headword}: {language} example is not Latin-script enough: {example}")


def build_rows(source_rows: list[dict], tr_sw: dict[str, dict[str, tuple[str, str]]], pt_br: dict[str, tuple[str, str]], es_419: dict[str, tuple[str, str]]) -> list[dict]:
    built_rows = []
    generated_at = datetime.now(timezone.utc).isoformat()
    for index, source_row in enumerate(source_rows, start=1):
        source_headword = source_row["source_headword"]
        blockers = [
            blocker
            for blocker in source_row.get("remaining_blockers", [])
            if blocker not in {"support_translation_meaning_check", "support_example_scene_check"}
        ]
        row = {
            "release_id": source_row["release_id"],
            "course_id": source_row["course_id"],
            "row_id": source_row["row_id"],
            "core_item_id": source_row["core_item_id"],
            "meaning_id": source_row["meaning_id"],
            "source_candidate_id": source_row["source_candidate_id"],
            "source_headword": source_headword,
            "reviewed_display_headword": source_row["reviewed_display_headword"],
            "reviewed_part_of_speech": source_row["reviewed_part_of_speech"],
            "meaning_note": source_row["meaning_note"],
            "example_EN": source_row["example_EN"],
            "support_translation_batch": BATCH_ID,
            "support_translation_status": "draft_native_style_needs_source_assisted_qa",
            "support_example_status": "draft_scene_preserving_needs_source_assisted_qa",
            "support_regionalization_note": "PT-BR and ES-419 derived from existing Oxford PT/ES support artifacts with explicit regional overrides",
            "source_note": "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
            "reviewer": f"codex_oxford_a1_support_translation_batch_{BATCH_ID}",
            "reviewed_at": generated_at,
            "generation_ready": False,
            "remaining_blockers": blockers,
            "target_language_transcriptions": False,
        }
        for language in NEW_TRANSLATION_LANGUAGES:
            display, example = tr_sw[source_headword][language]
            row[language] = display
            row[f"example_{language}"] = example
        row["PT-BR"], row["example_PT-BR"] = pt_br[source_headword]
        row["ES-419"], row["example_ES-419"] = es_419[source_headword]
        built_rows.append(row)
    validate_translation_cells(built_rows)
    return built_rows


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def write_summary(path: Path, rows: list[dict], output_path: Path, pt_source_path: Path, es_source_path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    display_cells = len(rows) * len(LANGUAGES)
    example_cells = len(rows) * len(LANGUAGES)
    first = rows[0]
    last = rows[-1]
    summary = f"""# Oxford A1 Support Translation Batch TR/SW/PT-BR/ES-419 v1

Generated: {datetime.now(timezone.utc).isoformat()}

## Artifact

- JSONL: `{output_path.relative_to(PROJECT_ROOT)}`
- Rows: {len(rows)}
- Languages: {", ".join(LANGUAGES)}
- Display cells: {display_cells}
- Example cells: {example_cells}
- Target-language transcriptions: no

## Inputs

- Source pronunciation package: `{SOURCE_PATH.relative_to(PROJECT_ROOT)}`
- PT-BR regional base: `{pt_source_path.relative_to(PROJECT_ROOT)}` (`PT` column with explicit Brazil overrides)
- ES-419 regional base: `{es_source_path.relative_to(PROJECT_ROOT)}` (`ES` column with explicit Latin America overrides)

## Validation

- Exact source-row coverage.
- Non-empty display and example cells.
- Sentence punctuation in every example.
- Latin-script support cells for TR, SW, PT-BR and ES-419.

## Status

This is a partial source-package support-language artifact, not learner-facing delivery. It closes only the deterministic coverage gap for these four support languages and still needs source-assisted meaning/example QA plus the shared Oxford launch blockers.

## Sample

- First row `{first["source_headword"]}`: TR `{first["TR"]}` | SW `{first["SW"]}` | PT-BR `{first["PT-BR"]}` | ES-419 `{first["ES-419"]}`
- Last row `{last["source_headword"]}`: TR `{last["TR"]}` | SW `{last["SW"]}` | PT-BR `{last["PT-BR"]}` | ES-419 `{last["ES-419"]}`
"""
    path.write_text(summary, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_PATH)
    parser.add_argument("--pt-source", type=Path, default=PT_SOURCE_PATH)
    parser.add_argument("--es-source", type=Path, default=ES_SOURCE_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY_PATH)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_rows = load_jsonl(args.source)
    tr_sw = load_new_translations()
    pt_br = load_regional_translations(args.pt_source, "PT", "PT-BR")
    es_419 = load_regional_translations(args.es_source, "ES", "ES-419")
    validate_source_alignment(source_rows, tr_sw, pt_br, es_419)
    rows = build_rows(source_rows, tr_sw, pt_br, es_419)
    write_jsonl(args.output, rows)
    write_summary(args.summary, rows, args.output, args.pt_source, args.es_source)
    print(f"wrote {len(rows)} rows to {args.output.relative_to(PROJECT_ROOT)}")
    print(f"wrote summary to {args.summary.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
