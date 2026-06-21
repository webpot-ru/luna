#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps


CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(im, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def main() -> None:
    parser = argparse.ArgumentParser(description="Fit a full AI-rendered channel banner to YouTube upload geometry without adding local overlays.")
    parser.add_argument("--raw", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--code", required=True)
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    raw = Image.open(args.raw).convert("RGB")
    raw_size = raw.size
    canvas = cover(raw, CANVAS)

    upload_path = out_dir / f"lunacards-{args.code}-channel-banner-youtube-2560x1440-{args.slug}.jpg"
    desktop_path = out_dir / f"lunacards-{args.code}-channel-banner-desktop-preview-{args.slug}.jpg"
    safe_path = out_dir / f"lunacards-{args.code}-channel-banner-safearea-preview-{args.slug}.jpg"

    canvas.save(upload_path, "JPEG", quality=94, optimize=True, progressive=True)
    canvas.crop(DESKTOP_CROP).save(desktop_path, "JPEG", quality=95, optimize=True)
    canvas.crop(SAFE_CROP).save(safe_path, "JPEG", quality=95, optimize=True)

    print(json.dumps({
        "rawInputSize": f"{raw_size[0]}x{raw_size[1]}",
        "uploadPath": str(upload_path),
        "desktopPreviewPath": str(desktop_path),
        "safeAreaPreviewPath": str(safe_path),
        "uploadBytes": upload_path.stat().st_size,
        "desktopPreviewBytes": desktop_path.stat().st_size,
        "safeAreaPreviewBytes": safe_path.stat().st_size,
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "method": "full AI render fitted to YouTube geometry; no local text/logo/card overlay",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
