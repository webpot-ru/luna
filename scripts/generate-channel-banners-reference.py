#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "outputs" / "youtube-channel-assets"
EN_DIR = OUT_ROOT / "en"

CENTER_REFERENCE = EN_DIR / "lunacards-en-channel-banner-youtube-2560x1440-v8-site-ui-general-clean.png"
WIDE_REFERENCE = EN_DIR / "lunacards-en-channel-banner-youtube-2560x1440-v9-wide-desktop.png"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)
SLUG = "v8-center-v9-wide-reference-v2-localized"

FONT_ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_ARIAL_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_UNICODE = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
FONT_HINDI_R = "/Library/Fonts/RODE Noto Sans Hindi R.ttf"
FONT_HINDI_B = "/Library/Fonts/RODE Noto Sans Hindi B.ttf"
FONT_CJK_R = "/Library/Fonts/RODE Noto Sans CJK SC R.otf"
FONT_CJK_B = "/Library/Fonts/RODE Noto Sans CJK SC B.otf"


CHANNELS: dict[str, dict[str, str]] = {
    "es": {
        "supportLanguage": "Spanish",
        "market": "Spanish speakers / LATAM",
        "headline": "Aprende con tarjetas",
        "subline": "Idiomas y más",
        "pill": "50+ idiomas",
        "fontRegular": FONT_ARIAL,
        "fontBold": FONT_ARIAL_BOLD,
    },
    "pt": {
        "supportLanguage": "Portuguese",
        "market": "Portuguese speakers / Brazil",
        "headline": "Aprenda com flashcards",
        "subline": "Idiomas e mais",
        "pill": "50+ idiomas",
        "fontRegular": FONT_ARIAL,
        "fontBold": FONT_ARIAL_BOLD,
    },
    "ru": {
        "supportLanguage": "Russian",
        "market": "Russian speakers",
        "headline": "Учитесь по карточкам",
        "subline": "Языки и не только",
        "pill": "50+ языков",
        "fontRegular": FONT_UNICODE,
        "fontBold": FONT_UNICODE,
    },
    "hi": {
        "supportLanguage": "Hindi",
        "market": "Hindi speakers",
        "headline": "फ्लैशकार्ड से सीखें",
        "subline": "भाषाएं और बहुत कुछ",
        "pill": "50+ भाषाएं",
        "fontRegular": FONT_HINDI_R,
        "fontBold": FONT_HINDI_B,
    },
    "id": {
        "supportLanguage": "Indonesian",
        "market": "Indonesian speakers",
        "headline": "Belajar dengan kartu",
        "subline": "Bahasa dan lainnya",
        "pill": "50+ bahasa",
        "fontRegular": FONT_ARIAL,
        "fontBold": FONT_ARIAL_BOLD,
    },
    "fr": {
        "supportLanguage": "French",
        "market": "French speakers",
        "headline": "Apprenez avec des cartes",
        "subline": "Langues et plus",
        "pill": "50+ langues",
        "fontRegular": FONT_ARIAL,
        "fontBold": FONT_ARIAL_BOLD,
    },
    "de": {
        "supportLanguage": "German",
        "market": "German speakers",
        "headline": "Lernen mit Lernkarten",
        "subline": "Sprachen und mehr",
        "pill": "50+ Sprachen",
        "fontRegular": FONT_ARIAL,
        "fontBold": FONT_ARIAL_BOLD,
    },
    "ja": {
        "supportLanguage": "Japanese",
        "market": "Japanese speakers",
        "headline": "フラッシュカードで学ぶ",
        "subline": "言語とその先へ",
        "pill": "50+ 言語",
        "fontRegular": FONT_CJK_R,
        "fontBold": FONT_CJK_B,
    },
    "ko": {
        "supportLanguage": "Korean",
        "market": "Korean speakers",
        "headline": "플래시카드로 배우기",
        "subline": "언어와 그 이상",
        "pill": "50+ 언어",
        "fontRegular": FONT_CJK_R,
        "fontBold": FONT_CJK_B,
    },
    "tr": {
        "supportLanguage": "Turkish",
        "market": "Turkish speakers",
        "headline": "Kartlarla öğren",
        "subline": "Diller ve daha fazlası",
        "pill": "50+ dil",
        "fontRegular": FONT_ARIAL,
        "fontBold": FONT_ARIAL_BOLD,
    },
    "zh": {
        "supportLanguage": "Chinese",
        "market": "Chinese speakers",
        "headline": "用抽认卡学习",
        "subline": "语言及更多",
        "pill": "50+ 种语言",
        "fontRegular": FONT_CJK_R,
        "fontBold": FONT_CJK_B,
    },
}


def edge_fade_mask(size: tuple[int, int], fade: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    draw = ImageDraw.Draw(mask)
    for x in range(fade):
        alpha = int(255 * x / fade)
        draw.line((x, 0, x, height), fill=alpha)
        draw.line((width - 1 - x, 0, width - 1 - x, height), fill=alpha)
    return mask


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    if Path(path).exists():
        return ImageFont.truetype(path, size=size)
    return ImageFont.truetype(FONT_ARIAL, size=size)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def fit_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str,
    max_size: int,
    min_size: int,
    max_width: int,
) -> ImageFont.FreeTypeFont:
    for size in range(max_size, min_size - 1, -2):
        fnt = font(font_path, size)
        if text_size(draw, text, fnt)[0] <= max_width:
            return fnt
    return font(font_path, min_size)


def centered_text(draw: ImageDraw.ImageDraw, center: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont, fill: str) -> None:
    x, y = center
    width, height = text_size(draw, text, fnt)
    draw.text((x - width / 2, y - height / 2), text, font=fnt, fill=fill)


def build_reference_canvas() -> Image.Image:
    center_image = Image.open(CENTER_REFERENCE).convert("RGB")
    wide_image = Image.open(WIDE_REFERENCE).convert("RGB")

    center_band = center_image.crop(DESKTOP_CROP)
    wide_band = wide_image.crop(DESKTOP_CROP)
    band = wide_band.copy()

    center_block = center_band.crop((605, 0, 1955, 423))
    center_mask = edge_fade_mask(center_block.size, fade=90)
    band.paste(center_block, (605, 0), center_mask)

    wash = Image.new("RGB", band.size, (248, 251, 253))
    band = Image.blend(band, wash, 0.06)
    band.paste(center_block, (605, 0), center_mask)

    background = band.resize(CANVAS, Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(28))
    background = Image.blend(background, Image.new("RGB", CANVAS, (246, 249, 252)), 0.48)

    canvas = background.copy()
    canvas.paste(band, (0, DESKTOP_CROP[1]))
    return canvas


def localize_center(canvas: Image.Image, cfg: dict[str, str]) -> Image.Image:
    img = canvas.convert("RGBA")
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    center_x = 1280
    # Keep the accepted EN reference geometry intact. Only the old two-line
    # English tagline is covered with a feathered patch; the logo, divider,
    # side panels and URL pill remain from the original reference image.
    patch_box = (990, 758, 1570, 852)
    patch_mask = Image.new("L", CANVAS, 0)
    mask_draw = ImageDraw.Draw(patch_mask)
    mask_draw.rounded_rectangle(patch_box, radius=16, fill=255)
    patch_mask = patch_mask.filter(ImageFilter.GaussianBlur(7))
    patch = Image.new("RGBA", CANVAS, (248, 251, 253, 255))
    layer.alpha_composite(Image.composite(patch, Image.new("RGBA", CANVAS, (0, 0, 0, 0)), patch_mask))

    headline_font = fit_font(draw, cfg["headline"], cfg["fontBold"], 48, 30, 820)
    subline_font = fit_font(draw, cfg["subline"], cfg["fontBold"], 34, 22, 760)
    centered_text(draw, (center_x, 790), cfg["headline"], headline_font, "#06134a")
    centered_text(draw, (center_x, 830), cfg["subline"], subline_font, "#4b70f4")

    img.alpha_composite(layer)
    return img.convert("RGB")


def write_banner(code: str, cfg: dict[str, str]) -> dict[str, Any]:
    out_dir = OUT_ROOT / code
    out_dir.mkdir(parents=True, exist_ok=True)

    canvas = localize_center(build_reference_canvas(), cfg)
    upload = out_dir / f"lunacards-{code}-channel-banner-youtube-2560x1440-{SLUG}.jpg"
    desktop = out_dir / f"lunacards-{code}-channel-banner-desktop-preview-{SLUG}.jpg"
    safe = out_dir / f"lunacards-{code}-channel-banner-safearea-preview-{SLUG}.jpg"
    metadata = out_dir / f"lunacards-{code}-channel-banner-{SLUG}-metadata.json"

    canvas.save(upload, "JPEG", quality=94, optimize=True, progressive=True)
    canvas.crop(DESKTOP_CROP).save(desktop, "JPEG", quality=95, optimize=True)
    canvas.crop(SAFE_CROP).save(safe, "JPEG", quality=95, optimize=True)

    record: dict[str, Any] = {
        "status": "ok",
        "code": code,
        "supportLanguage": cfg["supportLanguage"],
        "market": cfg["market"],
        "headline": cfg["headline"],
        "subline": cfg["subline"],
        "pill": cfg["pill"],
        "slug": SLUG,
        "method": "v8 center reference over v9 wide side panels; localized center copy layer; no paid image generation",
        "centerReference": str(CENTER_REFERENCE),
        "wideReference": str(WIDE_REFERENCE),
        "uploadPath": str(upload),
        "desktopPreviewPath": str(desktop),
        "safeAreaPreviewPath": str(safe),
        "metadataPath": str(metadata),
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "uploadBytes": upload.stat().st_size,
        "youtubeMaxBytes": 6_000_000,
        "siteUrl": "https://flashcardsluna.com",
        "note": "Upload-ready channel banner candidate; visually QA desktop and safe-area crops before YouTube Studio upload.",
    }
    metadata.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return record


def make_contact_sheet(records: list[dict[str, Any]], kind: str) -> Path:
    source_key = "desktopPreviewPath" if kind == "desktop" else "safeAreaPreviewPath"
    thumb_w = 640 if kind == "desktop" else 618
    thumb_h = 106 if kind == "desktop" else 169
    label_h = 34
    cols = 2
    rows = math.ceil(len(records) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#f4f7f9")
    draw = ImageDraw.Draw(sheet)
    label_font = font(FONT_ARIAL_BOLD, 20)
    for index, record in enumerate(records):
        x = (index % cols) * thumb_w
        y = (index // cols) * (thumb_h + label_h)
        preview = Image.open(record[source_key]).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x, y + label_h))
        draw.rectangle((x, y, x + thumb_w, y + label_h), fill="#eaf1f8")
        label = f"{record['code'].upper()} · {record['supportLanguage']}"
        draw.text((x + 16, y + 7), label, font=label_font, fill="#06134a")
    out = OUT_ROOT / f"channel-banner-{SLUG}-{kind}-contact-sheet.jpg"
    sheet.save(out, "JPEG", quality=94, optimize=True)
    return out


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate localized LunaCards YouTube channel banners in the accepted reference style.")
    parser.add_argument(
        "--codes",
        nargs="+",
        default=list(CHANNELS.keys()),
        help="Support-language codes to generate. Default: all non-English priority channel codes.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    unknown = [code for code in args.codes if code not in CHANNELS]
    if unknown:
        raise SystemExit(f"Unknown channel code(s): {', '.join(unknown)}")

    records = [write_banner(code, CHANNELS[code]) for code in args.codes]
    desktop_contact = make_contact_sheet(records, "desktop")
    safe_contact = make_contact_sheet(records, "safe")
    manifest = {
        "status": "ok",
        "slug": SLUG,
        "generatedCount": len(records),
        "codes": args.codes,
        "desktopContactSheet": str(desktop_contact),
        "safeAreaContactSheet": str(safe_contact),
        "records": records,
    }
    manifest_path = OUT_ROOT / f"channel-banner-{SLUG}-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
