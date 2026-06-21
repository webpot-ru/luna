from __future__ import annotations

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "outputs" / "youtube-channel-assets"
LOGO_PATH = OUT_ROOT / "en" / "flashcardsluna-site-logo-light.png"

CANVAS = (2560, 1440)
DESKTOP_CROP = (0, 508, 2560, 931)
SAFE_CROP = (507, 508, 2053, 931)

FONT_ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_ARIAL_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_UNICODE = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
FONT_HINDI_R = "/Library/Fonts/RODE Noto Sans Hindi R.ttf"
FONT_HINDI_B = "/Library/Fonts/RODE Noto Sans Hindi B.ttf"
FONT_CJK_R = "/Library/Fonts/RODE Noto Sans CJK SC R.otf"
FONT_CJK_B = "/Library/Fonts/RODE Noto Sans CJK SC B.otf"


CHANNELS = {
    "en": {
        "headline": "Learn with flashcards",
        "subline": "Languages and more",
        "pill": "50+ languages",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "es": {
        "headline": "Aprende con tarjetas",
        "subline": "Idiomas y mas",
        "pill": "50+ idiomas",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "pt": {
        "headline": "Aprenda com flashcards",
        "subline": "Idiomas e mais",
        "pill": "50+ idiomas",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "ru": {
        "headline": "Учитесь с карточками",
        "subline": "Языки и многое другое",
        "pill": "50+ языков",
        "font_regular": FONT_UNICODE,
        "font_bold": FONT_UNICODE,
    },
    "hi": {
        "headline": "फ्लैशकार्ड से सीखें",
        "subline": "भाषाएं और बहुत कुछ",
        "pill": "50+ भाषाएं",
        "font_regular": FONT_HINDI_R,
        "font_bold": FONT_HINDI_B,
    },
    "id": {
        "headline": "Belajar dengan flashcard",
        "subline": "Bahasa dan lainnya",
        "pill": "50+ bahasa",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "fr": {
        "headline": "Apprenez avec des cartes",
        "subline": "Langues et plus",
        "pill": "50+ langues",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "de": {
        "headline": "Lernen mit Karten",
        "subline": "Sprachen und mehr",
        "pill": "50+ Sprachen",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "ja": {
        "headline": "フラッシュカードで学ぶ",
        "subline": "言語とその先へ",
        "pill": "50+ 言語",
        "font_regular": FONT_CJK_R,
        "font_bold": FONT_CJK_B,
    },
    "ko": {
        "headline": "플래시카드로 배우기",
        "subline": "언어와 그 이상",
        "pill": "50+ 언어",
        "font_regular": FONT_CJK_R,
        "font_bold": FONT_CJK_B,
    },
    "tr": {
        "headline": "Kartlarla öğren",
        "subline": "Diller ve daha fazlası",
        "pill": "50+ dil",
        "font_regular": FONT_ARIAL,
        "font_bold": FONT_ARIAL_BOLD,
    },
    "zh": {
        "headline": "用抽认卡学习",
        "subline": "语言及更多",
        "pill": "50+ 种语言",
        "font_regular": FONT_CJK_R,
        "font_bold": FONT_CJK_B,
    },
}


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def text_bbox(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont):
    return draw.textbbox((0, 0), text, font=fnt)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = text_bbox(draw, text, fnt)
    return box[2] - box[0], box[3] - box[1]


def fit_font(draw: ImageDraw.ImageDraw, text: str, font_path: str, max_size: int, min_size: int, max_width: int):
    for size in range(max_size, min_size - 1, -2):
        fnt = font(font_path, size)
        if text_size(draw, text, fnt)[0] <= max_width:
            return fnt
    return font(font_path, min_size)


def center_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt, fill: str):
    x, y = xy
    w, h = text_size(draw, text, fnt)
    draw.text((x - w / 2, y - h / 2), text, font=fnt, fill=fill)


def rounded_shadow(base: Image.Image, box, radius: int, fill, shadow=(22, 48, 92, 34), blur=30, offset=(0, 14), outline=None, width=1):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    sx0, sy0, sx1, sy1 = box
    ox, oy = offset
    ld.rounded_rectangle((sx0 + ox, sy0 + oy, sx1 + ox, sy1 + oy), radius=radius, fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_globe(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color: str):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=4)
    draw.arc((cx - r, cy - r, cx + r, cy + r), 70, 290, fill=color, width=3)
    draw.arc((cx - r, cy - r, cx + r, cy + r), -110, 110, fill=color, width=3)
    draw.line((cx - r + 3, cy, cx + r - 3, cy), fill=color, width=3)


def draw_book(draw: ImageDraw.ImageDraw, x: int, y: int, color: str):
    draw.rounded_rectangle((x, y, x + 62, y + 76), radius=8, fill="#edf3ff", outline="#cddbf2", width=2)
    draw.line((x + 31, y + 7, x + 31, y + 68), fill="#cddbf2", width=2)
    draw.line((x + 12, y + 22, x + 26, y + 22), fill=color, width=3)
    draw.line((x + 38, y + 22, x + 52, y + 22), fill=color, width=3)
    draw.line((x + 12, y + 38, x + 25, y + 38), fill="#d9e5f4", width=3)
    draw.line((x + 38, y + 38, x + 52, y + 38), fill="#d9e5f4", width=3)


def draw_atom(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: str):
    for angle in (0, 60, 120):
        rx, ry = 48, 15
        pts = []
        for t in range(0, 360, 12):
            rad = math.radians(t)
            px, py = math.cos(rad) * rx, math.sin(rad) * ry
            a = math.radians(angle)
            pts.append((cx + px * math.cos(a) - py * math.sin(a), cy + px * math.sin(a) + py * math.cos(a)))
        draw.line(pts + [pts[0]], fill=color, width=3)
    draw.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=color)


def draw_card_stack(draw: ImageDraw.ImageDraw, x: int, y: int, color: str):
    for i, shift in enumerate((18, 9, 0)):
        draw.rounded_rectangle((x + shift, y + i * 7, x + shift + 62, y + i * 7 + 76), radius=10, fill="#f4f7ff", outline="#cddbf2", width=2)
    draw.pieslice((x + 26, y + 23, x + 60, y + 57), 65, 300, fill=color)


def draw_audio(draw: ImageDraw.ImageDraw, x: int, y: int, color: str):
    draw.rounded_rectangle((x, y + 20, x + 30, y + 56), radius=8, fill=color)
    draw.polygon([(x + 29, y + 22), (x + 58, y + 2), (x + 58, y + 74), (x + 29, y + 54)], fill=color)
    draw.arc((x + 54, y + 13, x + 88, y + 63), -45, 45, fill=color, width=4)
    draw.arc((x + 61, y + 4, x + 108, y + 72), -45, 45, fill="#9cb4f6", width=3)


def draw_topic_tile(draw: ImageDraw.ImageDraw, box, icon: str, label: str, fnt, accent: str):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=22, fill="#ffffff", outline="#d9e5ef", width=2)
    icon_box = (x0 + 24, y0 + 20, x0 + 104, y0 + 100)
    draw.rounded_rectangle(icon_box, radius=18, fill="#eef4ff")
    cx, cy = x0 + 64, y0 + 60
    if icon == "globe":
        draw_globe(draw, cx, cy, 26, accent)
    elif icon == "book":
        draw_book(draw, x0 + 33, y0 + 22, accent)
    elif icon == "atom":
        draw_atom(draw, cx, cy, accent)
    elif icon == "audio":
        draw_audio(draw, x0 + 34, y0 + 24, accent)
    else:
        draw_card_stack(draw, x0 + 28, y0 + 20, accent)
    draw.rounded_rectangle((x0 + 22, y1 - 38, x0 + 118, y1 - 16), radius=11, fill="#eef3fb")
    tw, th = text_size(draw, label, fnt)
    draw.text((x0 + 70 - tw / 2, y1 - 36 + (22 - th) / 2 - 1), label, font=fnt, fill="#5570a0")


def draw_banner(code: str, cfg: dict):
    out_dir = OUT_ROOT / code
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGBA", CANVAS, "#f4f7f9")
    d = ImageDraw.Draw(img)

    # Full-size upload canvas with a calm site-colored center band.
    d.rectangle((0, 0, 2560, 1440), fill="#f4f7f9")
    d.rectangle((0, 508, 2560, 931), fill="#f7fafc")
    for x in range(0, 2560, 160):
        d.line((x, 508, x + 48, 931), fill=(214, 225, 237, 42), width=1)
    d.ellipse((-220, 420, 420, 1060), fill=(75, 114, 245, 22))
    d.ellipse((2140, 406, 2780, 1046), fill=(113, 91, 255, 20))

    rounded_shadow(
        img,
        (110, 525, 2450, 905),
        radius=36,
        fill=(255, 255, 255, 232),
        shadow=(36, 67, 118, 26),
        blur=34,
        offset=(0, 16),
        outline="#dde8f1",
        width=2,
    )

    # Side panels fill desktop width but stay secondary.
    panel_fill = (249, 252, 255, 232)
    for box in ((150, 560, 650, 870), (1910, 560, 2410, 870)):
        rounded_shadow(img, box, radius=30, fill=panel_fill, shadow=(26, 50, 96, 18), blur=26, offset=(0, 10), outline="#e2ebf3", width=2)

    label_font = font(cfg["font_regular"], 18)
    small_font = font(cfg["font_bold"], 22)
    topic_labels = [cfg["pill"], "Audio", "Quiz", "Decks"]
    if code == "ru":
        topic_labels = [cfg["pill"], "Аудио", "Квиз", "Колоды"]
    elif code == "es":
        topic_labels = [cfg["pill"], "Audio", "Quiz", "Mazos"]
    elif code == "pt":
        topic_labels = [cfg["pill"], "Audio", "Quiz", "Decks"]
    elif code == "fr":
        topic_labels = [cfg["pill"], "Audio", "Quiz", "Cartes"]
    elif code == "de":
        topic_labels = [cfg["pill"], "Audio", "Quiz", "Karten"]
    elif code == "tr":
        topic_labels = [cfg["pill"], "Ses", "Quiz", "Kartlar"]
    elif code == "id":
        topic_labels = [cfg["pill"], "Audio", "Kuis", "Dek"]
    elif code == "hi":
        topic_labels = [cfg["pill"], "ऑडियो", "क्विज", "डेक"]
    elif code == "ja":
        topic_labels = [cfg["pill"], "音声", "クイズ", "カード"]
    elif code == "ko":
        topic_labels = [cfg["pill"], "오디오", "퀴즈", "카드"]
    elif code == "zh":
        topic_labels = [cfg["pill"], "音频", "测验", "卡片"]

    tile_specs = [
        ((190, 590, 330, 725), "globe", topic_labels[0]),
        ((365, 590, 505, 725), "audio", topic_labels[1]),
        ((190, 745, 330, 850), "cards", topic_labels[2]),
        ((365, 745, 505, 850), "book", topic_labels[3]),
        ((2055, 590, 2195, 725), "book", topic_labels[3]),
        ((2230, 590, 2370, 725), "cards", topic_labels[2]),
        ((2055, 745, 2195, 850), "atom", "STEM"),
        ((2230, 745, 2370, 850), "globe", topic_labels[0]),
    ]
    for box, icon, label in tile_specs:
        draw_topic_tile(d, box, icon, label, label_font, "#4b70f4")

    # Central content stays well inside YouTube's safe crop.
    center_x = 1280
    logo = Image.open(LOGO_PATH).convert("RGBA").resize((86, 86), Image.Resampling.LANCZOS)
    img.alpha_composite(logo, (center_x - 43, 558))

    brand_font = font(FONT_ARIAL_BLACK, 92)
    center_text(d, (center_x, 688), "LunaCards", brand_font, "#06134a")

    d.line((870, 752, 1182, 752), fill="#d8e4f3", width=2)
    d.line((1378, 752, 1690, 752), fill="#d8e4f3", width=2)
    d.rounded_rectangle((1268, 740, 1292, 764), radius=6, fill="#7590ff")

    headline_font = fit_font(d, cfg["headline"], cfg["font_bold"], 38, 26, 820)
    sub_font = fit_font(d, cfg["subline"], cfg["font_bold"], 32, 24, 760)
    center_text(d, (center_x, 797), cfg["headline"], headline_font, "#06134a")
    center_text(d, (center_x, 838), cfg["subline"], sub_font, "#4b70f4")

    url_font = font(FONT_ARIAL_BOLD, 24)
    pill_w, pill_h = 360, 54
    pill_box = (center_x - pill_w // 2, 865, center_x + pill_w // 2, 865 + pill_h)
    d.rounded_rectangle(pill_box, radius=27, fill="#4771f4")
    d.ellipse((pill_box[0] + 24, pill_box[1] + 15, pill_box[0] + 48, pill_box[1] + 39), outline="#ffffff", width=3)
    d.line((pill_box[0] + 31, pill_box[1] + 27, pill_box[0] + 41, pill_box[1] + 27), fill="#ffffff", width=2)
    center_text(d, (center_x + 18, 892), "flashcardsluna.com", url_font, "#ffffff")

    # Upload image and the exact visual crops used for QA.
    upload = out_dir / f"lunacards-{code}-channel-banner-youtube-2560x1440-v10-premium-wide.png"
    desktop = out_dir / f"lunacards-{code}-channel-banner-desktop-preview-v10-premium-wide.png"
    safe = out_dir / f"lunacards-{code}-channel-banner-safearea-preview-v10-premium-wide.png"

    rgb = img.convert("RGB")
    rgb.save(upload, quality=95)
    rgb.crop(DESKTOP_CROP).save(desktop, quality=95)
    rgb.crop(SAFE_CROP).save(safe, quality=95)

    return upload, desktop, safe


def make_contact_sheet(items):
    thumb_w, thumb_h = 640, 106
    label_h = 34
    cols = 2
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#f4f7f9")
    d = ImageDraw.Draw(sheet)
    label_font = font(FONT_ARIAL_BOLD, 20)
    for index, (code, _upload, desktop, _safe) in enumerate(items):
        x = (index % cols) * thumb_w
        y = (index // cols) * (thumb_h + label_h)
        preview = Image.open(desktop).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x, y + label_h))
        d.rectangle((x, y, x + thumb_w, y + label_h), fill="#eaf1f8")
        d.text((x + 16, y + 7), code.upper(), font=label_font, fill="#06134a")
    out = OUT_ROOT / "channel-banner-v10-premium-wide-desktop-contact-sheet.png"
    sheet.save(out, quality=95)
    return out


def main():
    generated = []
    for code in CHANNELS:
        generated.append((code, *draw_banner(code, CHANNELS[code])))
    contact = make_contact_sheet(generated)
    print("Generated channel banners:")
    for code, upload, desktop, safe in generated:
        print(f"{code.upper()}:")
        print(f"  upload:  {upload}")
        print(f"  desktop: {desktop}")
        print(f"  safe:    {safe}")
    print(f"CONTACT: {contact}")


if __name__ == "__main__":
    main()
