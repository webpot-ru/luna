#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "outputs" / "youtube-channel-assets" / "en"

CENTER_REFERENCE = OUT_DIR / "lunacards-en-channel-banner-youtube-2560x1440-v8-site-ui-general-clean.png"
WIDE_REFERENCE = OUT_DIR / "lunacards-en-channel-banner-youtube-2560x1440-v9-wide-desktop.png"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)


def edge_fade_mask(size: tuple[int, int], fade: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    draw = ImageDraw.Draw(mask)
    for x in range(fade):
        alpha = int(255 * x / fade)
        draw.line((x, 0, x, height), fill=alpha)
        draw.line((width - 1 - x, 0, width - 1 - x, height), fill=alpha)
    return mask


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

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

    slug = "v8-center-v9-wide-reference-v1"
    upload = OUT_DIR / f"lunacards-en-channel-banner-youtube-2560x1440-{slug}.jpg"
    desktop = OUT_DIR / f"lunacards-en-channel-banner-desktop-preview-{slug}.jpg"
    safe = OUT_DIR / f"lunacards-en-channel-banner-safearea-preview-{slug}.jpg"
    meta = OUT_DIR / f"lunacards-en-channel-banner-{slug}-metadata.json"

    canvas.save(upload, "JPEG", quality=94, optimize=True, progressive=True)
    canvas.crop(DESKTOP_CROP).save(desktop, "JPEG", quality=95, optimize=True)
    canvas.crop(SAFE_CROP).save(safe, "JPEG", quality=95, optimize=True)

    metadata = {
        "status": "ok",
        "centerReference": str(CENTER_REFERENCE),
        "wideReference": str(WIDE_REFERENCE),
        "method": "v8 center block over v9 wide reference side panels; no paid image generation",
        "uploadPath": str(upload),
        "desktopPreviewPath": str(desktop),
        "safeAreaPreviewPath": str(safe),
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "uploadBytes": upload.stat().st_size,
        "note": "Reference-style fixed-size candidate, not uploaded to YouTube Studio.",
    }
    meta.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
