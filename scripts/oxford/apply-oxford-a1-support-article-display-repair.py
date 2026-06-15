#!/usr/bin/env python3
"""Apply learner-facing article/gender display repair to Oxford A1 support batches."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = PROJECT_ROOT / "config/oxford-vocabulary-release-contract-v0.json"
OUTPUT_DIR = PROJECT_ROOT / "outputs/oxford-vocabulary/support-translations"
QA_DIR = PROJECT_ROOT / "outputs/oxford-vocabulary/qa"
RELEASE_ID = "oxford_3000_core_a1_part_001_150_v1"
REPAIR_ID = "support_article_display_repair_v1"
TARGET_LANGUAGES = ["ES", "FR", "DE", "IT", "PT", "NL", "SV", "NO", "DA", "RO", "ES-419", "PT-BR"]
ARTICLE_DISPLAY_POLICY = (
    "English headwords stay Oxford-style lemmas. Support-language noun displays use natural "
    "articles/gender markers for article languages; languages without articles are not changed."
)

OVERRIDES = """
row|ES|FR|DE|IT|PT|NL|SV|NO|DA|RO|ES-419|PT-BR
005|la acción|l'action|die Handlung; die Aktion|l'azione|a ação|de actie; de handeling|en handling|en handling|en handling|o acțiune||
006|la actividad|l'activité|die Aktivität; die Tätigkeit|l'attività|a atividade|de activiteit|en aktivitet|en aktivitet|en aktivitet|o activitate||
007|el actor|l'acteur|der Schauspieler|l'attore|o ator|de acteur|en skådespelare|en skuespiller|en skuespiller|un actor||
008|la actriz|l'actrice|die Schauspielerin|l'attrice|a atriz|de actrice|en skådespelerska|en skuespillerinne|en skuespillerinde|o actriță||
010|la dirección|l'adresse|die Adresse|l'indirizzo|a morada; o endereço|het adres|en adress|en adresse|en adresse|o adresă||o endereço
011|el adulto|l'adulte|der Erwachsene; die Erwachsene|l'adulto; l'adulta|o adulto; a adulta|de volwassene|en vuxen|en voksen|en voksen|un adult||
012|el consejo|le conseil|der Rat|il consiglio|o conselho|het advies|ett råd|et råd|et råd|un sfat||
015|la tarde|l'après-midi|der Nachmittag|il pomeriggio|a tarde|de middag|en eftermiddag|en ettermiddag|en eftermiddag|o după-amiază||
017|la edad|l'âge|das Alter|l'età|a idade|de leeftijd|en ålder|en alder|en alder|o vârstă||
020|el aire|l'air|die Luft|l'aria|o ar|de lucht||||aer||
021|el aeropuerto|l'aéroport|der Flughafen|l'aeroporto|o aeroporto|de luchthaven|en flygplats|en flyplass|en lufthavn|un aeroport||
028|el animal|l'animal|das Tier|l'animale|o animal|het dier|ett djur|et dyr|et dyr|un animal||
030|la respuesta|la réponse|die Antwort|la risposta|a resposta|het antwoord|ett svar|et svar|et svar|un răspuns||
034|el apartamento; el piso|l'appartement|die Wohnung|l'appartamento|o apartamento|het appartement|en lägenhet|en leilighet|en lejlighed|un apartament|el apartamento|
035|la manzana|la pomme|der Apfel|la mela|a maçã|de appel|ett äpple|et eple|et æble|un măr||
037|la zona; el área|la zone; le quartier|das Gebiet; der Bereich|la zona; l'area|a área; a zona|het gebied|ett område|et område|et område|o zonă; o regiune||
038|el brazo|le bras|der Arm|il braccio|o braço|de arm|en arm|en arm|en arm|un braț||
041|el arte|l'art|die Kunst|l'arte|a arte|de kunst||||o artă||
042|el artículo|l'article|der Artikel|l'articolo|o artigo|het artikel|en artikel|en artikkel|en artikel|un articol||
043|el artista; la artista|l'artiste|der Künstler; die Künstlerin|l'artista|o artista; a artista|de kunstenaar|en konstnär|en kunstner|en kunstner|un artist; o artistă||
048|la tía|la tante|die Tante|la zia|a tia|de tante|en moster; en faster|en tante|en tante|o mătușă||
049|el otoño|l'automne|der Herbst|l'autunno|o outono|de herfst|en höst|en høst|et efterår|o toamnă||
051|el bebé|le bébé|das Baby|il bambino piccolo; il bebè|o bebé|de baby|en bebis|en baby|en baby|un bebeluș||o bebê
052|la espalda; atrás|le dos; l'arrière|der Rücken|la schiena|as costas|de rug|en rygg|en rygg|en ryg|spate; înapoi||
054|la bolsa; el bolso|le sac|die Tasche|la borsa|o saco; a mala|de tas|en väska|en veske|en taske|o geantă||
055|la pelota; el balón|le ballon; la balle|der Ball|la palla|a bola|de bal|en boll|en ball|en bold|o minge||
056|el plátano; la banana|la banane|die Banane|la banana|a banana|de banaan|en banan|en banan|en banan|o banană|la banana; el plátano|
057|la banda; el grupo|le groupe; la fanfare|die Band|il gruppo musicale|a banda|de band|ett band|et band|et band|o trupă; o formație||
058|el banco|la banque|die Bank|la banca|o banco|de bank|en bank|en bank|en bank|o bancă||
059|el baño; la bañera|le bain|das Bad|il bagno|o banho|het bad|ett bad|et bad|et bad|o baie||
060|el baño|la salle de bain|das Badezimmer|il bagno|a casa de banho|de badkamer|ett badrum|et bad; et badrom|et badeværelse|o baie||o banheiro
062|la playa|la plage|der Strand|la spiaggia|a praia|het strand|en strand|en strand|en strand|o plajă||
066|la cama|le lit|das Bett|il letto|a cama|het bed|en säng|en seng|en seng|un pat||
067|el dormitorio; la habitación|la chambre|das Schlafzimmer|la camera da letto|o quarto|de slaapkamer|ett sovrum|et soverom|et soveværelse|un dormitor||
068|la cerveza|la bière|das Bier|la birra|a cerveja|het bier|en öl|en øl|en øl|o bere||
071|el principio; el comienzo|le début|der Anfang|l'inizio|o início|het begin|en början|en begynnelse|en begyndelse|un început||
078|la bicicleta|le vélo; la bicyclette|das Fahrrad|la bicicletta|a bicicleta|de fiets|en cykel|en sykkel|en cykel|o bicicletă||
080|la bicicleta|le vélo|das Rad; das Fahrrad|la bici|a bicicleta|de fiets|en cykel|en sykkel|en cykel|o bicicletă||
081|la cuenta; la factura|l'addition; la facture|die Rechnung|il conto|a conta|de rekening|en nota|en regning|en regning|o notă de plată||
082|el pájaro; el ave|l'oiseau|der Vogel|l'uccello|o pássaro|de vogel|en fågel|en fugl|en fugl|o pasăre||
083|el cumpleaños|l'anniversaire|der Geburtstag|il compleanno|o aniversário|de verjaardag|en födelsedag|en bursdag|en fødselsdag|o zi de naștere||
085|el blog|le blog|der Blog|il blog|o blogue|de blog|en blogg|en blogg|en blog|un blog||o blog
088|el barco; el bote|le bateau|das Boot|la barca|o barco|de boot|en båt|en båt|en båd|o barcă||
089|el cuerpo|le corps|der Körper|il corpo|o corpo|het lichaam|en kropp|en kropp|en krop|un corp||
090|el libro|le livre|das Buch|il libro|o livro|het boek|en bok|en bok|en bog|o carte||
091|la bota|la botte|der Stiefel|lo stivale|a bota|de laars|en stövel|en støvel|en støvle|o cizmă||
096|la botella|la bouteille|die Flasche|la bottiglia|a garrafa|de fles|en flaska|en flaske|en flaske|o sticlă||
097|la caja|la boîte|die Schachtel; die Kiste|la scatola|a caixa|de doos|en låda|en eske|en kasse; en boks|o cutie||
098|el niño; el chico|le garçon|der Junge|il ragazzo|o rapaz|de jongen|en pojke|en gutt|en dreng|un băiat||
099|el novio|le petit ami|der Freund|il fidanzato|o namorado|het vriendje|en pojkvän|en kjæreste|en kæreste|un iubit||
100|el pan|le pain|das Brot|il pane|o pão|het brood|ett bröd|et brød|et brød|o pâine||
102|el desayuno|le petit déjeuner|das Frühstück|la colazione|o pequeno-almoço|het ontbijt|en frukost|en frokost|en morgenmad|un mic dejun||o café da manhã
104|el hermano|le frère|der Bruder|il fratello|o irmão|de broer|en bror|en bror|en bror|un frate||
107|el edificio|le bâtiment|das Gebäude|l'edificio|o edifício|het gebouw|en byggnad|en bygning|en bygning|o clădire||
108|el autobús|le bus|der Bus|l'autobus|o autocarro|de bus|en buss|en buss|en bus|un autobuz||o ônibus
109|el negocio; la empresa|l'entreprise; les affaires|das Geschäft; das Unternehmen|l'attività; l'azienda|o negócio|het bedrijf|ett företag|en forretning; en virksomhet|en forretning; en virksomhed|o afacere||
112|la mantequilla|le beurre|die Butter|il burro|a manteiga|de boter||||unt||
116|la cafetería|le café|das Café|il caffè|o café|het café|ett kafé|en kafé|en café|o cafenea||
117|el pastel; la tarta|le gâteau|der Kuchen|la torta|o bolo|de cake; de taart|en kaka|en kake|en kage|o prăjitură; un tort|la torta; el pastel|
119|la cámara|l'appareil photo|die Kamera|la fotocamera|a câmara|de camera|en kamera|et kamera|et kamera|un aparat foto||a câmera
122|la capital|la capitale|die Hauptstadt|la capitale|a capital|de hoofdstad|en huvudstad|en hovedstad|en hovedstad|o capitală||
123|el coche; el carro|la voiture|das Auto|l'auto|o carro|de auto|en bil|en bil|en bil|o mașină|el auto; el carro|
124|la tarjeta|la carte|die Karte|la carta; il biglietto|o cartão|de kaart|ett kort|et kort|et kort|un card; o felicitare||
125|la carrera profesional|la carrière|die Karriere|la carriera|a carreira|de carrière|en karriär|en karriere|en karriere|o carieră||
126|la zanahoria|la carotte|die Karotte|la carota|a cenoura|de wortel|en morot|en gulrot|en gulerod|un morcov||
128|el gato|le chat|die Katze|il gatto|o gato|de kat|en katt|en katt|en kat|o pisică||
129|el CD|le CD|die CD|il CD|o CD|de cd|en cd|en CD|en cd|un CD||
130|el centavo; el céntimo|le centime|der Cent|il centesimo|o cêntimo|de cent|en cent|en cent|en cent|un cent||o centavo
131|el centro|le centre|das Zentrum|il centro|o centro|het centrum|ett centrum|et sentrum|et centrum|un centru||
132|el siglo|le siècle|das Jahrhundert|il secolo|o século|de eeuw|ett århundrade|et århundre|et århundrede|un secol||
133|la silla|la chaise|der Stuhl|la sedia|a cadeira|de stoel|en stol|en stol|en stol|un scaun||
135|el gráfico; la tabla|le graphique; le tableau|das Diagramm|il grafico|o gráfico|de grafiek|ett diagram|et diagram|et diagram|un grafic; un tabel||
138|el queso|le fromage|der Käse|il formaggio|o queijo|de kaas|ost|ost|ost|o brânză||
139|el pollo|le poulet|das Hähnchen; das Huhn|il pollo|o frango|de kip|en kyckling|en kylling|en kylling|un pui||
140|el niño; la niña|l'enfant|das Kind|il bambino|a criança|het kind|ett barn|et barn|et barn|un copil||
141|el chocolate|le chocolat|die Schokolade|il cioccolato|o chocolate|de chocolade|choklad|sjokolade|chokolade|o ciocolată||
143|el cine|le cinéma|das Kino|il cinema|o cinema|de bioscoop|en bio|en kino|en biograf|un cinema||
144|la ciudad|la ville|die Stadt|la città|a cidade|de stad|en stad|en by|en by|un oraș||
145|la clase|le cours; la classe|der Unterricht|la lezione|a aula|de les|en lektion|en time; en klasse|en time; en klasse|un curs; o clasă||
146|el aula|la salle de classe|das Klassenzimmer|l'aula|a sala de aula|het klaslokaal|ett klassrum|et klasserom|et klasselokale|o sală de clasă||
149|el reloj|l'horloge|die Uhr|l'orologio|o relógio|de klok|en klocka|en klokke|et ur|un ceas||
"""


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def parse_overrides() -> dict[str, dict[str, str]]:
    lines = [line for line in OVERRIDES.strip().splitlines() if line.strip()]
    header = lines[0].split("|")
    if header != ["row", *TARGET_LANGUAGES]:
        raise ValueError(f"Bad override header: {header}")
    overrides: dict[str, dict[str, str]] = {}
    for line in lines[1:]:
        parts = line.split("|")
        if len(parts) != len(header):
            raise ValueError(f"Bad override row has {len(parts)} columns instead of {len(header)}: {line}")
        row_no = parts[0]
        row_id = f"{RELEASE_ID}::{row_no}"
        values = dict(zip(TARGET_LANGUAGES, parts[1:]))
        if values["ES"] and not values["ES-419"]:
            values["ES-419"] = values["ES"]
        if values["PT"] and not values["PT-BR"]:
            values["PT-BR"] = values["PT"]
        overrides[row_id] = {language: value for language, value in values.items() if value}
    return overrides


def v2_path(path: str) -> str:
    return path.replace("_v1.jsonl", "_article_display_v2.jsonl")


def v2_summary_path(path: str) -> str:
    return path.replace("_v1_summary.md", "_article_display_v2_summary.md")


def main() -> None:
    contract = read_json(CONTRACT_PATH)
    overrides = parse_overrides()
    generated_at = datetime.now(timezone.utc).isoformat()
    changed_batches = []
    total_changes = 0
    changes_by_language = defaultdict(int)

    for batch in contract.get("latest_support_translation_batches", []):
        batch_languages = set(batch.get("languages") or [])
        affected_languages = sorted(batch_languages.intersection(TARGET_LANGUAGES))
        if not affected_languages:
            continue
        source_path = PROJECT_ROOT / batch["path"]
        rows = read_jsonl(source_path)
        batch_changes = []
        for row in rows:
            row_overrides = overrides.get(row.get("row_id"), {})
            for language in affected_languages:
                next_value = row_overrides.get(language)
                if next_value and row.get(language) != next_value:
                    batch_changes.append(
                        {
                            "row_id": row["row_id"],
                            "language": language,
                            "before": row.get(language),
                            "after": next_value,
                        }
                    )
                    row[language] = next_value
                    changes_by_language[language] += 1
                    total_changes += 1
        if not batch_changes:
            continue
        next_path_rel = v2_path(batch["path"])
        next_summary_rel = v2_summary_path(batch["summary_path"])
        next_path = PROJECT_ROOT / next_path_rel
        next_summary = PROJECT_ROOT / next_summary_rel
        write_jsonl(next_path, rows)
        next_summary.write_text(
            "\n".join(
                [
                    f"# Oxford A1 support article display repair: {batch['batch_id']}",
                    "",
                    f"- Repair id: `{REPAIR_ID}`",
                    f"- Generated at: `{generated_at}`",
                    f"- Source batch: `{batch['path']}`",
                    f"- Output batch: `{next_path_rel}`",
                    f"- Affected languages: {', '.join(affected_languages)}",
                    f"- Display cells changed: {len(batch_changes)}",
                    f"- Policy: {ARTICLE_DISPLAY_POLICY}",
                    "- Examples changed: 0",
                    "- Target-language transcriptions added: 0",
                    "",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        batch["batch_id"] = batch["batch_id"].replace("_v1", "_article_display_v2")
        batch["path"] = next_path_rel
        batch["summary_path"] = next_summary_rel
        batch["article_display_repair"] = {
            "repair_id": REPAIR_ID,
            "source_batch_path": str(source_path.relative_to(PROJECT_ROOT)),
            "generated_at": generated_at,
            "policy": ARTICLE_DISPLAY_POLICY,
            "affected_languages": affected_languages,
            "display_cells_changed": len(batch_changes),
            "examples_changed": 0,
            "target_language_transcriptions_added": 0,
        }
        changed_batches.append(
            {
                "batch_id": batch["batch_id"],
                "path": next_path_rel,
                "affected_languages": affected_languages,
                "display_cells_changed": len(batch_changes),
                "sample": batch_changes[:8],
            }
        )

    contract["latest_support_article_display_repair"] = {
        "repair_id": REPAIR_ID,
        "generated_at": generated_at,
        "policy": ARTICLE_DISPLAY_POLICY,
        "target_languages": TARGET_LANGUAGES,
        "changed_batches": changed_batches,
        "display_cells_changed": total_changes,
        "changes_by_language": dict(sorted(changes_by_language.items())),
        "examples_changed": 0,
        "target_language_transcriptions_added": 0,
    }
    write_json(CONTRACT_PATH, contract)

    QA_DIR.mkdir(parents=True, exist_ok=True)
    report_path = QA_DIR / f"{RELEASE_ID}_{REPAIR_ID}.json"
    report_md_path = QA_DIR / f"{RELEASE_ID}_{REPAIR_ID}.md"
    report = {
        "release_id": RELEASE_ID,
        "repair_id": REPAIR_ID,
        "generated_at": generated_at,
        "policy": ARTICLE_DISPLAY_POLICY,
        "target_languages": TARGET_LANGUAGES,
        "display_cells_changed": total_changes,
        "changes_by_language": dict(sorted(changes_by_language.items())),
        "changed_batches": changed_batches,
        "examples_changed": 0,
        "target_language_transcriptions_added": 0,
    }
    write_json(report_path, report)
    report_md_path.write_text(
        "\n".join(
            [
                f"# Oxford A1 Support Article Display Repair: {RELEASE_ID}",
                "",
                f"- Repair id: `{REPAIR_ID}`",
                f"- Generated at: `{generated_at}`",
                f"- Display cells changed: {total_changes}",
                f"- Target languages: {', '.join(TARGET_LANGUAGES)}",
                f"- Policy: {ARTICLE_DISPLAY_POLICY}",
                "- Examples changed: 0",
                "- Target-language transcriptions added: 0",
                "",
                "## Changes By Language",
                "",
                *[f"- {language}: {count}" for language, count in sorted(changes_by_language.items())],
                "",
                "## Changed Batches",
                "",
                *[
                    f"- `{item['batch_id']}`: {item['display_cells_changed']} cells -> `{item['path']}`"
                    for item in changed_batches
                ],
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "repair_id": REPAIR_ID,
                "display_cells_changed": total_changes,
                "changed_batches": len(changed_batches),
                "report": str(report_path.relative_to(PROJECT_ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
