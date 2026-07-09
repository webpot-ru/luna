#!/usr/bin/env python3
"""Generate deterministic square YouTube playlist cover images.

This script is intentionally local/offline: it does not call YouTube APIs and
does not spend image-generation credits. It overlays registry playlist titles
onto an approved square base image.

Note: this PIL renderer is kept as a simple fallback/prototype. Use
`scripts/generate-youtube-playlist-covers.swift` for production playlist cover
batches because CoreText handles Thai/Myanmar/Devanagari shaping more reliably.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_BASE = (
    "outputs/design-prototypes/"
    "youtube-playlist-cover-universal-language-learning-base-ai-20260709/"
    "base-no-text-universal-v1-1024.jpg"
)
DEFAULT_OUTPUT = "outputs/design-prototypes/youtube-playlist-covers-upload-eligible-20260709"

FONT_ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_ARIAL_UNICODE = "/Library/Fonts/Arial Unicode.ttf"
FONT_CJK = "/Library/Fonts/RODE Noto Sans CJK SC R.otf"
FONT_CJK_BOLD = "/Library/Fonts/RODE Noto Sans CJK SC B.otf"
FONT_THAI = "/System/Library/Fonts/ThonburiUI.ttc"
FONT_DEVANAGARI = "/Library/Fonts/RODE Noto Sans Hindi R.ttf"
FONT_DEVANAGARI_BOLD = "/Library/Fonts/RODE Noto Sans Hindi B.ttf"
FONT_MYANMAR = "/System/Library/Fonts/NotoSansMyanmar.ttc"

NAVY = (8, 26, 69)
GREEN = (16, 138, 99)
MUTED = (71, 90, 111)
BRAND = (38, 104, 121)
PANEL_FILL = (255, 255, 250, 226)
PANEL_OUTLINE = (232, 226, 210, 190)


FONT_BY_SUPPORT = {
    "JA": (FONT_CJK, FONT_CJK_BOLD),
    "MY": (FONT_MYANMAR, FONT_MYANMAR),
    "NE": (FONT_DEVANAGARI, FONT_DEVANAGARI_BOLD),
    "TH": (FONT_THAI, FONT_THAI),
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def font_path(path: str) -> str:
    if Path(path).exists():
        return path
    return FONT_ARIAL_UNICODE


def make_font(size: int, *, support: str = "", bold: bool = False) -> ImageFont.FreeTypeFont:
    regular, bold_path = FONT_BY_SUPPORT.get(support.upper(), (FONT_ARIAL_UNICODE, FONT_ARIAL_BOLD))
    selected = bold_path if bold else regular
    return ImageFont.truetype(font_path(selected), size)


def text_bbox(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    return draw.textbbox((0, 0), text, font=font)


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    box = text_bbox(draw, text, font)
    return box[2] - box[0]


def split_long_token(draw: ImageDraw.ImageDraw, token: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    chunks: list[str] = []
    current = ""
    for ch in token:
        candidate = current + ch
        if current and text_width(draw, candidate, font) > max_width:
            chunks.append(current)
            current = ch
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return [""]

    if " " not in text:
        return split_long_token(draw, text, font, max_width)

    lines: list[str] = []
    current = ""
    for word in text.split(" "):
        if text_width(draw, word, font) > max_width:
            if current:
                lines.append(current)
                current = ""
            lines.extend(split_long_token(draw, word, font, max_width))
            continue
        candidate = word if not current else f"{current} {word}"
        if text_width(draw, candidate, font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def fit_lines(
    draw: ImageDraw.ImageDraw,
    text: str,
    *,
    support: str,
    max_width: int,
    max_lines: int,
    max_size: int,
    min_size: int,
    bold: bool,
) -> tuple[ImageFont.FreeTypeFont, list[str], int]:
    for size in range(max_size, min_size - 1, -2):
        f = make_font(size, support=support, bold=bold)
        lines = wrap_text(draw, text, f, max_width)
        if len(lines) <= max_lines and all(text_width(draw, line, f) <= max_width for line in lines):
            return f, lines, size
    f = make_font(min_size, support=support, bold=bold)
    lines = wrap_text(draw, text, f, max_width)[:max_lines]
    return f, lines, min_size


def clean_title(title: str) -> str:
    title = re.sub(r"\s*\|\s*FlashcardsLuna\s*$", "", title or "", flags=re.I)
    title = re.sub(r"\s+", " ", title).strip()
    return title or "A1 Vocabulary"


def split_title(title: str) -> tuple[str, str]:
    title = clean_title(title)
    if ":" in title:
        head, tail = title.split(":", 1)
        return head.strip(), tail.strip()
    if " - " in title:
        head, tail = title.split(" - ", 1)
        return head.strip(), tail.strip()
    return title, ""


def safe_segment(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("_") or "playlist"


def channel_by_key(channels: Iterable[dict]) -> dict[str, dict]:
    return {row.get("key", ""): row for row in channels}


def render_cover(base: Image.Image, playlist: dict, out_path: Path) -> dict:
    support = str(playlist.get("supportLang") or "").upper()
    title = str(playlist.get("title") or playlist.get("playlistTitle") or playlist.get("playlist_key") or "")
    headline, detail = split_title(title)

    img = base.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    panel = (40, 58, 650, 650)
    od.rounded_rectangle(panel, radius=34, fill=PANEL_FILL, outline=PANEL_OUTLINE, width=2)
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle((72, 92, 316, 136), radius=22, fill=(246, 252, 249), outline=(191, 219, 210), width=2)
    draw.text((96, 101), "FlashcardsLuna", font=make_font(28, support="EN"), fill=BRAND)

    max_width = 542
    title_font, title_lines, title_size = fit_lines(
        draw,
        headline,
        support=support,
        max_width=max_width,
        max_lines=3,
        max_size=72,
        min_size=34,
        bold=True,
    )

    y = 166
    for line in title_lines:
        draw.text((72, y), line, font=title_font, fill=NAVY)
        box = text_bbox(draw, line, title_font)
        y += (box[3] - box[1]) + 8

    y += 16
    badge_height = 68
    draw.rounded_rectangle((72, y, 196, y + badge_height), radius=18, fill=GREEN)
    draw.text((96, y - 2), "A1", font=make_font(49, support="EN", bold=True), fill=(255, 255, 255))

    level_note = {
        "RU": "для начинающих",
        "EN": "for beginners",
        "EN-GB": "for beginners",
        "ES": "para principiantes",
        "ES-419": "para principiantes",
        "PT": "para iniciantes",
        "PT-BR": "para iniciantes",
        "TR": "yeni başlayanlar",
        "VI": "cho người mới bắt đầu",
        "SW": "kwa wanaoanza",
        "SR": "za početnike",
        "JA": "初心者向け",
        "TH": "สำหรับผู้เริ่มต้น",
        "NE": "सुरुवातीका लागि",
        "MY": "စတင်လေ့လာသူများအတွက်",
    }.get(support, "")
    if level_note:
        note_font, note_lines, _ = fit_lines(
            draw,
            level_note,
            support=support,
            max_width=385,
            max_lines=1,
            max_size=29,
            min_size=22,
            bold=False,
        )
        draw.text((218, y + 18), note_lines[0], font=note_font, fill=MUTED)

    y += badge_height + 34
    if detail:
        detail_font, detail_lines, detail_size = fit_lines(
            draw,
            detail,
            support=support,
            max_width=max_width,
            max_lines=3,
            max_size=44,
            min_size=26,
            bold=True,
        )
        for line in detail_lines:
            draw.text((72, y), line, font=detail_font, fill=NAVY)
            box = text_bbox(draw, line, detail_font)
            y += (box[3] - box[1]) + 7
    else:
        detail_size = 0
        detail_lines = []

    footer = {
        "RU": "повседневные слова",
        "EN": "everyday vocabulary",
        "EN-GB": "everyday vocabulary",
        "ES": "vocabulario cotidiano",
        "ES-419": "vocabulario cotidiano",
        "PT": "vocabulário do dia a dia",
        "PT-BR": "vocabulário do dia a dia",
        "TR": "günlük kelimeler",
        "VI": "từ vựng hằng ngày",
        "SW": "msamiati wa kila siku",
        "SR": "svakodnevne reči",
        "JA": "日常語彙",
        "TH": "คำศัพท์ในชีวิตประจำวัน",
        "NE": "दैनिक शब्दहरू",
        "MY": "နေ့စဉ်သုံး ဝေါဟာရ",
    }.get(support, "everyday vocabulary")
    footer_font, footer_lines, _ = fit_lines(
        draw,
        footer,
        support=support,
        max_width=480,
        max_lines=1,
        max_size=30,
        min_size=21,
        bold=False,
    )
    draw.ellipse((76, 586, 102, 612), fill=GREEN)
    draw.text((118, 579), footer_lines[0], font=footer_font, fill=MUTED)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, quality=92, optimize=True)

    return {
        "headline": headline,
        "detail": detail,
        "titleFontSize": title_size,
        "titleLines": title_lines,
        "detailFontSize": detail_size,
        "detailLines": detail_lines,
        "footer": footer,
        "path": str(out_path),
    }


def build_contact_sheet(image_paths: list[Path], out_path: Path, *, thumb_size: int = 160, columns: int = 12) -> None:
    if not image_paths:
        return
    rows = math.ceil(len(image_paths) / columns)
    sheet = Image.new("RGB", (columns * thumb_size, rows * thumb_size), (248, 250, 252))
    for index, path in enumerate(image_paths):
        try:
            thumb = Image.open(path).convert("RGB").resize((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        except Exception:
            continue
        x = (index % columns) * thumb_size
        y = (index // columns) * thumb_size
        sheet.paste(thumb, (x, y))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, quality=88, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=DEFAULT_BASE)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--playlists", default="config/youtube-playlists.json")
    parser.add_argument("--channels", default="config/youtube-channels.json")
    parser.add_argument("--include-uncreated", action="store_true")
    args = parser.parse_args()

    base_path = REPO_ROOT / args.base
    output_root = REPO_ROOT / args.output
    playlists_registry = load_json(REPO_ROOT / args.playlists)
    channels_registry = load_json(REPO_ROOT / args.channels)
    playlists = playlists_registry.get("playlists", [])
    channels = channel_by_key(channels_registry.get("channels", []))
    base = Image.open(base_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)

    manifest: dict = {
        "schemaVersion": 1,
        "generatedAt": "2026-07-09",
        "baseImage": str(base_path.relative_to(REPO_ROOT)),
        "outputRoot": str(output_root.relative_to(REPO_ROOT)),
        "selection": {
            "customThumbnailUploadAllowed": True,
            "includeUncreated": bool(args.include_uncreated),
        },
        "records": [],
        "skipped": [],
    }
    rendered_by_channel: dict[str, list[Path]] = {}

    for playlist in playlists:
        channel_key = playlist.get("channelKey")
        channel = channels.get(channel_key or "")
        if not channel or channel.get("customThumbnailUploadAllowed") is not True:
            manifest["skipped"].append(
                {
                    "playlistKey": playlist.get("playlist_key"),
                    "channelKey": channel_key,
                    "reason": "custom_playlist_cover_not_allowed_for_channel",
                }
            )
            continue
        if not args.include_uncreated and not playlist.get("youtube_playlist_id"):
            manifest["skipped"].append(
                {
                    "playlistKey": playlist.get("playlist_key"),
                    "channelKey": channel_key,
                    "reason": "missing_youtube_playlist_id",
                }
            )
            continue

        playlist_key = playlist.get("playlist_key") or f"{playlist.get('supportLang')}__{playlist.get('targetLang')}"
        folder = output_root / "by-channel" / safe_segment(channel_key or "channel") / safe_segment(playlist_key)
        image_path = folder / "playlist_cover.jpg"
        render_meta = render_cover(base, playlist, image_path)

        sidecar = {
            "playlistKey": playlist_key,
            "supportLang": playlist.get("supportLang"),
            "targetLang": playlist.get("targetLang"),
            "channelKey": channel_key,
            "channelId": playlist.get("youtube_channel_id") or channel.get("channelId"),
            "playlistId": playlist.get("youtube_playlist_id"),
            "title": playlist.get("title"),
            "description": playlist.get("description"),
            "status": playlist.get("status"),
            "coverPath": str(image_path.relative_to(REPO_ROOT)),
            "render": render_meta,
            "uploadEligible": bool(playlist.get("youtube_playlist_id")),
            "uploadBlocker": "" if playlist.get("youtube_playlist_id") else "missing_youtube_playlist_id",
        }
        (folder / "playlist.json").write_text(json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        manifest["records"].append(sidecar)
        rendered_by_channel.setdefault(channel_key or "channel", []).append(image_path)

    for channel_key, paths in sorted(rendered_by_channel.items()):
        build_contact_sheet(paths, output_root / "by-channel" / safe_segment(channel_key) / "contact-sheet.jpg")

    all_paths = [Path(REPO_ROOT / row["coverPath"]) for row in manifest["records"]]
    build_contact_sheet(all_paths, output_root / "contact-sheet.jpg", thumb_size=128, columns=18)

    manifest_path = output_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "ok",
                "rendered": len(manifest["records"]),
                "skipped": len(manifest["skipped"]),
                "outputRoot": str(output_root.relative_to(REPO_ROOT)),
                "manifest": str(manifest_path.relative_to(REPO_ROOT)),
                "contactSheet": str((output_root / "contact-sheet.jpg").relative_to(REPO_ROOT)),
                "channels": {k: len(v) for k, v in sorted(rendered_by_channel.items())},
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
