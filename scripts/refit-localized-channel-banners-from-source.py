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

WIDE_REFERENCE = EN_DIR / "lunacards-en-channel-banner-youtube-2560x1440-v9-wide-desktop.png"
COPY_CONFIG = ROOT / "config" / "youtube-channel-banner-copy.json"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)
MOBILE_STRICT_CROP = (662, 551, 1897, 889)
CENTER_BLOCK = (605, 0, 1955, 423)
SLUG = "v1-site-ui-center-v9-wide-reference-v1"

FONT_ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BRAND_TEXT = "FlashcardsLuna"

CHANNEL_COPY = json.loads(COPY_CONFIG.read_text(encoding="utf8"))
CHANNELS = {code: cfg["languageName"] for code, cfg in sorted(CHANNEL_COPY.items())}


def edge_fade_mask(size: tuple[int, int], fade: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    draw = ImageDraw.Draw(mask)
    for x in range(fade):
        alpha = int(255 * x / fade)
        draw.line((x, 0, x, height), fill=alpha)
        draw.line((width - 1 - x, 0, width - 1 - x, height), fill=alpha)
    return mask


def source_path(code: str) -> Path:
    return OUT_ROOT / code / f"lunacards-{code}-channel-banner-youtube-2560x1440-v1-site-ui.png"


def build_refit_canvas(code: str) -> Image.Image:
    center_reference = source_path(code)
    if not center_reference.exists():
        raise FileNotFoundError(f"Missing localized source banner: {center_reference}")

    center_image = Image.open(center_reference).convert("RGB")
    wide_image = Image.open(WIDE_REFERENCE).convert("RGB")

    center_band = center_image.crop(DESKTOP_CROP)
    wide_band = wide_image.crop(DESKTOP_CROP)
    band = wide_band.copy()

    center_block = center_band.crop(CENTER_BLOCK)
    center_mask = edge_fade_mask(center_block.size, fade=90)
    band.paste(center_block, (CENTER_BLOCK[0], 0), center_mask)

    wash = Image.new("RGB", band.size, (248, 251, 253))
    band = Image.blend(band, wash, 0.06)
    band.paste(center_block, (CENTER_BLOCK[0], 0), center_mask)

    background = band.resize(CANVAS, Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(28))
    background = Image.blend(background, Image.new("RGB", CANVAS, (246, 249, 252)), 0.48)

    canvas = background.copy()
    canvas.paste(band, (0, DESKTOP_CROP[1]))
    return canvas


def write_banner(code: str) -> dict[str, Any]:
    out_dir = OUT_ROOT / code
    out_dir.mkdir(parents=True, exist_ok=True)

    canvas = build_refit_canvas(code)
    upload = out_dir / f"lunacards-{code}-channel-banner-youtube-2560x1440-{SLUG}.jpg"
    desktop = out_dir / f"lunacards-{code}-channel-banner-desktop-preview-{SLUG}.jpg"
    safe = out_dir / f"lunacards-{code}-channel-banner-safearea-preview-{SLUG}.jpg"
    mobile_strict = out_dir / f"lunacards-{code}-channel-banner-mobile-strict-preview-{SLUG}.jpg"
    metadata = out_dir / f"lunacards-{code}-channel-banner-{SLUG}-metadata.json"

    canvas.save(upload, "JPEG", quality=94, optimize=True, progressive=True)
    canvas.crop(DESKTOP_CROP).save(desktop, "JPEG", quality=95, optimize=True)
    canvas.crop(SAFE_CROP).save(safe, "JPEG", quality=95, optimize=True)
    canvas.crop(MOBILE_STRICT_CROP).save(mobile_strict, "JPEG", quality=95, optimize=True)

    record: dict[str, Any] = {
        "status": "ok",
        "code": code,
        "supportLanguage": CHANNELS[code],
        "localizedCopy": {
            "brand": BRAND_TEXT,
            "headline": CHANNEL_COPY[code]["headline"],
            "subline": CHANNEL_COPY[code]["subline"],
            "url": "flashcardsluna.com",
        },
        "slug": SLUG,
        "method": "localized v1-site-ui center reference over EN v9 wide side panels; center text must come from the source artwork, not a local text patch",
        "centerReference": str(source_path(code)),
        "wideReference": str(WIDE_REFERENCE),
        "uploadPath": str(upload),
        "desktopPreviewPath": str(desktop),
        "safeAreaPreviewPath": str(safe),
        "mobileStrictPreviewPath": str(mobile_strict),
        "metadataPath": str(metadata),
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "mobileStrictPreviewDimensions": "1235x338",
        "uploadBytes": upload.stat().st_size,
        "youtubeMaxBytes": 6_000_000,
        "note": "Upload-ready refit of the already drawn localized banner. Do not use the text-overlay batch for channel upload.",
    }
    metadata.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return record


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_ARIAL_BOLD, size=size)


def make_contact_sheet(records: list[dict[str, Any]], kind: str) -> Path:
    source_key = "desktopPreviewPath" if kind == "desktop" else "safeAreaPreviewPath"
    thumb_w = 640 if kind == "desktop" else 618
    thumb_h = 106 if kind == "desktop" else 169
    label_h = 34
    cols = 2
    rows = math.ceil(len(records) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#f4f7f9")
    draw = ImageDraw.Draw(sheet)
    label_font = font(20)
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
    parser = argparse.ArgumentParser(description="Refit already drawn localized LunaCards channel banners to the accepted full-width YouTube layout.")
    parser.add_argument("--codes", nargs="+", default=list(CHANNELS.keys()))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    unknown = [code for code in args.codes if code not in CHANNELS]
    if unknown:
        raise SystemExit(f"Unknown channel code(s): {', '.join(unknown)}")

    records = [write_banner(code) for code in args.codes]
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
