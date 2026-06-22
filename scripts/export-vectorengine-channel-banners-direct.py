#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "outputs" / "youtube-channel-assets"
COPY_CONFIG = ROOT / "config" / "youtube-channel-banner-copy.json"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)
MOBILE_STRICT_CROP = (662, 551, 1897, 889)
FONT_ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

CHANNEL_COPY = json.loads(COPY_CONFIG.read_text(encoding="utf8"))


def source_path(code: str, source_slug: str) -> Path:
    return OUT_ROOT / code / f"lunacards-{code}-channel-banner-youtube-2560x1440-{source_slug}.png"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_ARIAL_BOLD, size=size)


def write_banner(code: str, source_slug: str, slug: str) -> dict[str, Any]:
    copy = CHANNEL_COPY[code]
    out_dir = OUT_ROOT / code
    out_dir.mkdir(parents=True, exist_ok=True)

    source = source_path(code, source_slug)
    if not source.exists():
        raise FileNotFoundError(f"Missing VectorEngine source banner: {source}")

    canvas = Image.open(source).convert("RGB")
    if canvas.size != CANVAS:
        raise ValueError(f"{source} has size {canvas.size}, expected {CANVAS}")

    upload = out_dir / f"lunacards-{code}-channel-banner-youtube-2560x1440-{slug}.jpg"
    desktop = out_dir / f"lunacards-{code}-channel-banner-desktop-preview-{slug}.jpg"
    safe = out_dir / f"lunacards-{code}-channel-banner-safearea-preview-{slug}.jpg"
    mobile_strict = out_dir / f"lunacards-{code}-channel-banner-mobile-strict-preview-{slug}.jpg"
    metadata = out_dir / f"lunacards-{code}-channel-banner-{slug}-metadata.json"

    canvas.save(upload, "JPEG", quality=94, optimize=True, progressive=True)
    canvas.crop(DESKTOP_CROP).save(desktop, "JPEG", quality=95, optimize=True)
    canvas.crop(SAFE_CROP).save(safe, "JPEG", quality=95, optimize=True)
    canvas.crop(MOBILE_STRICT_CROP).save(mobile_strict, "JPEG", quality=95, optimize=True)

    record: dict[str, Any] = {
        "status": "ok",
        "code": code,
        "supportLanguage": copy["languageName"],
        "provider": "vectorengine",
        "model": "gpt-image-2",
        "sourceSlug": source_slug,
        "slug": slug,
        "method": "direct VectorEngine full-render source converted to YouTube JPG previews; no local wordmark patch and no old EN side-fill refit",
        "sourcePath": str(source),
        "uploadPath": str(upload),
        "desktopPreviewPath": str(desktop),
        "safeAreaPreviewPath": str(safe),
        "mobileStrictPreviewPath": str(mobile_strict),
        "metadataPath": str(metadata),
        "localizedCopy": {
            "brand": "FlashcardsLuna",
            "headline": copy["headline"],
            "subline": copy["subline"],
            "url": "flashcardsluna.com",
        },
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "mobileStrictPreviewDimensions": "1235x338",
        "uploadBytes": upload.stat().st_size,
        "youtubeMaxBytes": 6_000_000,
    }
    metadata.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return record


def make_contact_sheet(records: list[dict[str, Any]], kind: str, slug: str) -> Path:
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
    out = OUT_ROOT / f"channel-banner-{slug}-{kind}-contact-sheet.jpg"
    sheet.save(out, "JPEG", quality=94, optimize=True)
    return out


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export direct upload-ready JPGs from VectorEngine full-render channel banner sources.")
    parser.add_argument("--codes", nargs="+", default=sorted(CHANNEL_COPY.keys()))
    parser.add_argument("--source-slug", default="v1-site-ui")
    parser.add_argument("--slug", default="v1-site-ui-vectorengine-direct-v1")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    codes = [code.lower() for code in args.codes]
    unknown = [code for code in codes if code not in CHANNEL_COPY]
    if unknown:
        raise SystemExit(f"Unknown channel code(s): {', '.join(unknown)}")

    records = [write_banner(code, args.source_slug, args.slug) for code in codes]
    desktop_contact = make_contact_sheet(records, "desktop", args.slug)
    safe_contact = make_contact_sheet(records, "safe", args.slug)
    manifest = {
        "status": "ok",
        "slug": args.slug,
        "sourceSlug": args.source_slug,
        "generatedCount": len(records),
        "codes": codes,
        "desktopContactSheet": str(desktop_contact),
        "safeAreaContactSheet": str(safe_contact),
        "records": records,
    }
    manifest_path = OUT_ROOT / f"channel-banner-{args.slug}-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
