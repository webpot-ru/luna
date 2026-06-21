#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "outputs" / "youtube-channel-assets" / "site-assets"
OUT_DIR = ROOT / "outputs" / "youtube-channel-assets" / "en"

PAGE_BG = ASSET_DIR / "page_bg.webp"
LOGO = ASSET_DIR / "logo.png"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def cover(im: Image.Image, size: tuple[int, int], centering=(0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(im, size, method=Image.Resampling.LANCZOS, centering=centering)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_centered(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, fnt, fill: str):
    w, h = text_size(draw, text, fnt)
    draw.text((x - w / 2, y - h / 2), text, font=fnt, fill=fill)


def draw_glass_pill(draw: ImageDraw.ImageDraw, box, fill, outline):
    draw.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=fill, outline=outline, width=1)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    bg_source = Image.open(PAGE_BG).convert("RGB")
    # Match the site hero: moon/sky in the visible banner, person/cat lower.
    bg = cover(bg_source, CANVAS, centering=(0.48, 0.46)).convert("RGBA")

    # Site-like teal overlay, stronger only where YouTube crops the banner.
    overlay = Image.new("RGBA", CANVAS, (23, 78, 81, 78))
    bg.alpha_composite(overlay)
    band = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    bd.rectangle((0, 500, 2560, 942), fill=(20, 70, 72, 58))
    band = band.filter(ImageFilter.GaussianBlur(5))
    bg.alpha_composite(band)

    # Dark-to-clear bottom/top gradients like the landing hero.
    grad = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(508, 931):
        edge = min(abs(y - 508), abs(931 - y))
        alpha = max(0, 36 - int(edge * 0.45))
        gd.line((0, y, 2560, y), fill=(0, 26, 30, alpha))
    bg.alpha_composite(grad)

    d = ImageDraw.Draw(bg)

    # Brand mark and wordmark, aligned with the site's white nav style.
    logo = Image.open(LOGO).convert("RGBA").resize((76, 76), Image.Resampling.LANCZOS)
    bg.alpha_composite(logo, (812, 568))
    brand_font = font(FONT_BOLD, 34)
    d.text((902, 586), "FlashcardsLuna", font=brand_font, fill=(255, 255, 255, 245))

    # Main channel statement: same orange + white split as the site hero.
    headline_font = font(FONT_BLACK, 76)
    orange = "#ff9240"
    white = "#ffffff"
    left = "Flashcard"
    right = " lessons"
    lw, lh = text_size(d, left, headline_font)
    rw, _ = text_size(d, right, headline_font)
    x0 = 1280 - (lw + rw) / 2
    d.text((x0, 674), left, font=headline_font, fill=orange)
    d.text((x0 + lw, 674), right, font=headline_font, fill=white)

    sub_font = font(FONT_BOLD, 31)
    draw_centered(d, 1280, 788, "Learn languages with ready-made flashcard decks", sub_font, (255, 255, 255, 238))

    # Glass URL pill from the site input/button language.
    pill = (960, 836, 1600, 898)
    draw_glass_pill(d, pill, fill=(238, 244, 238, 116), outline=(255, 255, 255, 92))
    d.rounded_rectangle((1322, 840, 1594, 894), radius=27, fill="#ff7f62")
    url_font = font(FONT_BOLD, 27)
    d.text((1010, 853), "flashcardsluna.com", font=url_font, fill=(30, 74, 79, 238))
    draw_centered(d, 1458, 867, "Start learning", font(FONT_BOLD, 24), "#ffffff")

    upload = OUT_DIR / "lunacards-en-channel-banner-youtube-2560x1440-site-hero-v1.jpg"
    desktop = OUT_DIR / "lunacards-en-channel-banner-desktop-preview-site-hero-v1.jpg"
    safe = OUT_DIR / "lunacards-en-channel-banner-safearea-preview-site-hero-v1.jpg"
    meta = OUT_DIR / "lunacards-en-channel-banner-site-hero-v1-metadata.json"

    rgb = bg.convert("RGB")
    rgb.save(upload, "JPEG", quality=93, optimize=True, progressive=True)
    rgb.crop(DESKTOP_CROP).save(desktop, "JPEG", quality=94, optimize=True)
    rgb.crop(SAFE_CROP).save(safe, "JPEG", quality=94, optimize=True)

    metadata = {
        "status": "ok",
        "source": "flashcardsluna.com live site assets",
        "assets": {
            "pageBg": str(PAGE_BG),
            "logo": str(LOGO),
        },
        "uploadPath": str(upload),
        "desktopPreviewPath": str(desktop),
        "safeAreaPreviewPath": str(safe),
        "uploadDimensions": "2560x1440",
        "desktopPreviewDimensions": "2560x423",
        "safeAreaPreviewDimensions": "1546x423",
        "uploadBytes": upload.stat().st_size,
        "youtubeSpec": {
            "recommendedUploadPx": "2560x1440",
            "officialMinimumUploadPx": "2048x1152",
            "officialSafeAreaAtMinimumPx": "1235x338",
            "projectSafeAreaPreviewPx": "1546x423",
            "maxFileSize": "6 MB",
        },
        "note": "Generated from actual site hero visual system; not uploaded to YouTube Studio.",
    }
    meta.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
