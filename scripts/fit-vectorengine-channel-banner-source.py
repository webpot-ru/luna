#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "outputs" / "youtube-channel-assets"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)
CENTER_BLOCK = (605, 508, 1955, 931)


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(im, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def edge_fade_mask(size: tuple[int, int], fade: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    draw = ImageDraw.Draw(mask)
    for x in range(fade):
        alpha = int(255 * x / fade)
        draw.line((x, 0, x, height), fill=alpha)
        draw.line((width - 1 - x, 0, width - 1 - x, height), fill=alpha)
    return mask


def important_bbox(raw: Image.Image) -> tuple[int, int, int, int]:
    rgb = raw.convert("RGB")
    width, height = rgb.size
    # Detect the central brand/text lockup, not the surrounding icon grids.
    # The first implementation used too wide a region and scaled new renders
    # down because side icons became part of the bbox.
    x_min, x_max = int(width * 0.34), int(width * 0.66)
    y_min, y_max = int(height * 0.20), int(height * 0.80)
    pixels = rgb.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(y_min, y_max, 2):
        for x in range(x_min, x_max, 2):
            r, g, b = pixels[x, y]
            dark = max(r, g, b) < 205
            blue = b > 150 and b - min(r, g) > 45 and r < 150
            navy = b > 70 and r < 90 and g < 120
            if dark or blue or navy:
                xs.append(x)
                ys.append(y)
    if not xs:
        return (int(width * 0.27), int(height * 0.27), int(width * 0.73), int(height * 0.78))
    xs.sort()
    ys.sort()
    low = int(len(xs) * 0.02)
    high = max(low, int(len(xs) * 0.98) - 1)
    return (xs[low], ys[low], xs[high], ys[high])


def build_source(raw: Image.Image) -> tuple[Image.Image, dict[str, Any]]:
    raw = raw.convert("RGB")
    bbox = important_bbox(raw)
    raw_w, raw_h = raw.size

    background = cover(raw, CANVAS).filter(ImageFilter.GaussianBlur(28))
    background = Image.blend(background, Image.new("RGB", CANVAS, (246, 249, 252)), 0.45)

    base_scale = CANVAS[0] / raw_w
    bbox_w = max(1, bbox[2] - bbox[0])
    bbox_h = max(1, bbox[3] - bbox[1])
    target_w = CENTER_BLOCK[2] - CENTER_BLOCK[0] - 80
    target_h = CENTER_BLOCK[3] - CENTER_BLOCK[1] - 64
    scale = min(0.78, target_w / (bbox_w * base_scale), target_h / (bbox_h * base_scale))
    scale = max(0.42, scale)

    foreground_w = int(raw_w * base_scale * scale)
    foreground_h = int(raw_h * base_scale * scale)
    foreground = raw.resize((foreground_w, foreground_h), Image.Resampling.LANCZOS).convert("RGBA")
    mask = edge_fade_mask(foreground.size, fade=max(80, int(foreground_w * 0.08)))
    foreground.putalpha(mask)

    bbox_center_x = (bbox[0] + bbox[2]) / 2 * base_scale * scale
    bbox_center_y = (bbox[1] + bbox[3]) / 2 * base_scale * scale
    target_center_x = (CENTER_BLOCK[0] + CENTER_BLOCK[2]) / 2
    target_center_y = (CENTER_BLOCK[1] + CENTER_BLOCK[3]) / 2
    x = int(target_center_x - bbox_center_x)
    y = int(target_center_y - bbox_center_y)

    canvas = background.convert("RGBA")
    canvas.alpha_composite(foreground, (x, y))

    desktop_band = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    band_draw = ImageDraw.Draw(desktop_band)
    band_draw.rectangle(DESKTOP_CROP, fill=(255, 255, 255, 20))
    canvas.alpha_composite(desktop_band)

    debug = {
        "rawSize": f"{raw_w}x{raw_h}",
        "importantBBoxRaw": bbox,
        "baseScale": base_scale,
        "foregroundScale": scale,
        "foregroundSize": f"{foreground_w}x{foreground_h}",
        "foregroundPaste": [x, y],
        "desktopCrop": DESKTOP_CROP,
        "safeCrop": SAFE_CROP,
        "centerBlock": CENTER_BLOCK,
    }
    return canvas.convert("RGB"), debug


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fit a full-render VectorEngine banner into the v1-site-ui source geometry used by the accepted v9-wide refit.")
    parser.add_argument("--raw", required=True)
    parser.add_argument("--code", required=True)
    parser.add_argument("--slug", default="v1-site-ui")
    parser.add_argument("--out-dir")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    code = args.code.lower()
    out_dir = Path(args.out_dir) if args.out_dir else OUT_ROOT / code
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_path = Path(args.raw)
    source_path = out_dir / f"lunacards-{code}-channel-banner-youtube-2560x1440-{args.slug}.png"
    desktop_path = out_dir / f"lunacards-{code}-channel-banner-desktop-preview-{args.slug}.png"
    safe_path = out_dir / f"lunacards-{code}-channel-banner-safearea-preview-{args.slug}.png"
    metadata_path = out_dir / f"lunacards-{code}-channel-banner-{args.slug}-source-metadata.json"

    canvas, debug = build_source(Image.open(raw_path))
    canvas.save(source_path, quality=95)
    canvas.crop(DESKTOP_CROP).save(desktop_path, quality=95)
    canvas.crop(SAFE_CROP).save(safe_path, quality=95)

    record: dict[str, Any] = {
        "status": "ok",
        "code": code,
        "method": "VectorEngine full-render fitted into v1-site-ui source geometry for accepted center-v9-wide refit",
        "rawPath": str(raw_path),
        "sourcePath": str(source_path),
        "desktopPreviewPath": str(desktop_path),
        "safeAreaPreviewPath": str(safe_path),
        "metadataPath": str(metadata_path),
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "debug": debug,
    }
    metadata_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
