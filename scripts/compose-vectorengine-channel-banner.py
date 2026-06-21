#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "outputs" / "youtube-channel-assets" / "en" / "flashcardsluna-site-logo-light.png"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)

FONT_ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_ARIAL_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def center_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt, fill: str):
    x, y = xy
    w, h = text_size(draw, text, fnt)
    draw.text((x - w / 2, y - h / 2), text, font=fnt, fill=fill)


def rounded_shadow(base: Image.Image, box, radius: int, fill, shadow=(22, 48, 92, 35), blur=34, offset=(0, 18), outline=None, width=1):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    ox, oy = offset
    ld.rounded_rectangle((x0 + ox, y0 + oy, x1 + ox, y1 + oy), radius=radius, fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(im, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def build_banner(
    raw_path: Path,
    out_dir: Path,
    slug: str,
    code: str,
    headline: str,
    subline: str,
):
    raw = Image.open(raw_path).convert("RGB")
    raw_size = raw.size

    bg = cover(raw, CANVAS).convert("RGBA")

    # Keep VectorEngine artwork visible. Only soften the center so local text
    # stays readable and exact; do not cover the wide banner sides.
    tint = Image.new("RGBA", CANVAS, (244, 247, 249, 34))
    bg.alpha_composite(tint)
    center_scrim = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    cs = ImageDraw.Draw(center_scrim)
    cs.rounded_rectangle((760, 548, 1800, 918), radius=90, fill=(255, 255, 255, 118))
    center_scrim = center_scrim.filter(ImageFilter.GaussianBlur(70))
    bg.alpha_composite(center_scrim)

    # Center content. All important text is inside 1546x423 safe area
    # with margin above the lower edge, so YouTube desktop crop cannot cut the URL.
    center_x = 1280
    logo = Image.open(LOGO_PATH).convert("RGBA").resize((92, 92), Image.Resampling.LANCZOS)
    bg.alpha_composite(logo, (center_x - 46, 548))

    d = ImageDraw.Draw(bg)
    brand_font = font(FONT_ARIAL_BLACK, 96)
    headline_font = font(FONT_ARIAL_BOLD, 38)
    sub_font = font(FONT_ARIAL_BOLD, 32)
    url_font = font(FONT_ARIAL_BOLD, 25)

    center_text(d, (center_x, 686), "LunaCards", brand_font, "#06134a")
    center_text(d, (center_x, 792), headline, headline_font, "#06134a")
    center_text(d, (center_x, 835), subline, sub_font, "#4b70f4")

    pill_w, pill_h = 390, 58
    pill_box = (center_x - pill_w // 2, 862, center_x + pill_w // 2, 862 + pill_h)
    d.rounded_rectangle(pill_box, radius=29, fill="#4771f4")
    d.ellipse((pill_box[0] + 27, pill_box[1] + 17, pill_box[0] + 51, pill_box[1] + 41), outline="#ffffff", width=3)
    d.line((pill_box[0] + 34, pill_box[1] + 29, pill_box[0] + 44, pill_box[1] + 29), fill="#ffffff", width=2)
    center_text(d, (center_x + 22, 891), "flashcardsluna.com", url_font, "#ffffff")

    upload_path = out_dir / f"lunacards-{code}-channel-banner-youtube-2560x1440-{slug}.jpg"
    desktop_path = out_dir / f"lunacards-{code}-channel-banner-desktop-preview-{slug}.jpg"
    safe_path = out_dir / f"lunacards-{code}-channel-banner-safearea-preview-{slug}.jpg"

    rgb = bg.convert("RGB")
    rgb.save(upload_path, "JPEG", quality=92, optimize=True, progressive=True)
    rgb.crop(DESKTOP_CROP).save(desktop_path, "JPEG", quality=94, optimize=True)
    rgb.crop(SAFE_CROP).save(safe_path, "JPEG", quality=94, optimize=True)

    return {
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
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--code", default="en")
    parser.add_argument("--headline", default="Learn with Flashcards")
    parser.add_argument("--subline", default="Languages and more")
    args = parser.parse_args()

    result = build_banner(
        Path(args.raw),
        Path(args.out_dir),
        args.slug,
        args.code,
        args.headline,
        args.subline,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
