#!/usr/bin/env python3
from __future__ import annotations

import json
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "youtube-api-quota-evidence" / "project-1-20260622"

REFS = {
    "public_site": "https://flashcardsluna.com",
    "privacy_url": "https://flashcardsluna.com/privacy",
    "terms_url": "https://flashcardsluna.com/terms",
    "google_privacy": "https://policies.google.com/privacy",
    "google_connections": "https://myaccount.google.com/connections",
    "youtube_api_terms": "https://developers.google.com/youtube/terms/api-services-terms-of-service",
    "youtube_api_policies": "https://developers.google.com/youtube/terms/developer-policies",
    "repo": "https://github.com/webpot-ru/luna",
    "main_channel": "https://www.youtube.com/@flashcardsluna",
    "ru_channel": "https://www.youtube.com/@LunaCardsRU",
}

PAGE_W = 1600
PAGE_H = 2200
MARGIN_X = 100
MARGIN_TOP = 78
MARGIN_BOTTOM = 88
TEXT_W = PAGE_W - MARGIN_X * 2

COLORS = {
    "bg": (245, 248, 252),
    "paper": (255, 255, 255),
    "ink": (23, 32, 51),
    "muted": (86, 99, 122),
    "line": (214, 226, 240),
    "blue": (37, 99, 235),
    "green": (15, 118, 110),
    "red": (185, 28, 28),
    "yellow": (161, 92, 0),
    "soft_blue": (232, 240, 254),
    "soft_green": (236, 253, 245),
    "soft_yellow": (255, 251, 235),
}


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            pass
    return ImageFont.load_default()


FONTS = {
    "brand": load_font(42, True),
    "title": load_font(50, True),
    "h2": load_font(31, True),
    "h3": load_font(23, True),
    "body": load_font(22, False),
    "body_bold": load_font(22, True),
    "small": load_font(18, False),
    "small_bold": load_font(18, True),
    "mono": load_font(18, False),
}


def text_height(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=7)
    return bbox[3] - bbox[1]


def wrap(text: str, width: int = 106) -> str:
    if not text:
        return ""
    lines: list[str] = []
    for raw in text.splitlines():
        if not raw.strip():
            lines.append("")
            continue
        lines.extend(textwrap.wrap(raw, width=width, break_long_words=False, replace_whitespace=False))
    return "\n".join(lines)


class Document:
    def __init__(self, title: str, subtitle: str, badge: str):
        self.title = title
        self.subtitle = subtitle
        self.badge = badge
        self.pages: list[Image.Image] = []
        self.page_no = 0
        self.new_page()

    def new_page(self) -> None:
        self.page_no += 1
        self.img = Image.new("RGB", (PAGE_W, PAGE_H), COLORS["paper"])
        self.draw = ImageDraw.Draw(self.img)
        self.y = MARGIN_TOP
        self.header()

    def finish_page(self) -> None:
        self.draw.line((MARGIN_X, PAGE_H - 68, PAGE_W - MARGIN_X, PAGE_H - 68), fill=COLORS["line"], width=2)
        footer = (
            "Non-secret YouTube API quota evidence. Do not upload OAuth tokens, client secrets, "
            ".local files, refresh tokens, cookies, private keys or private user data."
        )
        self.draw.text((MARGIN_X, PAGE_H - 50), footer, font=FONTS["small"], fill=COLORS["muted"])
        self.draw.text((PAGE_W - MARGIN_X - 92, PAGE_H - 50), f"Page {self.page_no}", font=FONTS["small"], fill=COLORS["muted"])
        self.pages.append(self.img)

    def ensure(self, needed: int) -> None:
        if self.y + needed > PAGE_H - MARGIN_BOTTOM:
            self.finish_page()
            self.new_page()

    def header(self) -> None:
        self.draw.rounded_rectangle((MARGIN_X, self.y, MARGIN_X + 54, self.y + 54), radius=13, fill=(29, 78, 216))
        self.draw.polygon(
            [(MARGIN_X + 23, self.y + 16), (MARGIN_X + 23, self.y + 38), (MARGIN_X + 40, self.y + 27)],
            fill=(255, 255, 255),
        )
        self.draw.text((MARGIN_X + 72, self.y + 2), "FlashcardsLuna", font=FONTS["brand"], fill=COLORS["ink"])
        self.draw.rounded_rectangle((MARGIN_X + 72, self.y + 58, MARGIN_X + 435, self.y + 92), radius=8, fill=COLORS["soft_blue"])
        self.draw.text((MARGIN_X + 87, self.y + 65), self.badge, font=FONTS["small_bold"], fill=COLORS["blue"])
        self.draw.text((PAGE_W - MARGIN_X - 520, self.y + 4), self.subtitle, font=FONTS["small"], fill=COLORS["muted"])
        self.draw.text((PAGE_W - MARGIN_X - 520, self.y + 34), f"Prepared: {datetime.now().date().isoformat()}", font=FONTS["small"], fill=COLORS["muted"])
        self.y += 120
        self.draw.line((MARGIN_X, self.y, PAGE_W - MARGIN_X, self.y), fill=COLORS["line"], width=3)
        self.y += 44
        self.ensure(82)
        self.draw.text((MARGIN_X, self.y), self.title, font=FONTS["title"], fill=COLORS["ink"])
        self.y += 78

    def callout(self, text: str, kind: str = "warning") -> None:
        wrapped = wrap(text, 102)
        h = text_height(self.draw, wrapped, FONTS["body"]) + 34
        self.ensure(h + 12)
        fill = COLORS["soft_yellow"] if kind == "warning" else COLORS["soft_green"]
        edge = COLORS["yellow"] if kind == "warning" else COLORS["green"]
        x0, y0, x1, y1 = MARGIN_X, self.y, PAGE_W - MARGIN_X, self.y + h
        self.draw.rounded_rectangle((x0, y0, x1, y1), radius=10, fill=fill, outline=(245, 222, 154), width=2)
        self.draw.rectangle((x0, y0, x0 + 8, y1), fill=edge)
        self.draw.multiline_text((x0 + 24, y0 + 17), wrapped, font=FONTS["body"], fill=COLORS["ink"], spacing=7)
        self.y += h + 22

    def h2(self, text: str) -> None:
        self.ensure(58)
        self.draw.text((MARGIN_X, self.y), text, font=FONTS["h2"], fill=COLORS["ink"])
        self.y += 46

    def h3(self, text: str) -> None:
        self.ensure(42)
        self.draw.text((MARGIN_X, self.y), text, font=FONTS["h3"], fill=COLORS["ink"])
        self.y += 34

    def paragraph(self, text: str) -> None:
        wrapped = wrap(text, 106)
        h = text_height(self.draw, wrapped, FONTS["body"])
        self.ensure(h + 18)
        self.draw.multiline_text((MARGIN_X, self.y), wrapped, font=FONTS["body"], fill=COLORS["ink"], spacing=7)
        self.y += h + 18

    def bullets(self, items: list[str]) -> None:
        for item in items:
            wrapped = wrap(item, 100)
            h = text_height(self.draw, wrapped, FONTS["body"])
            self.ensure(h + 14)
            self.draw.text((MARGIN_X + 6, self.y + 1), "•", font=FONTS["body_bold"], fill=COLORS["blue"])
            self.draw.multiline_text((MARGIN_X + 34, self.y), wrapped, font=FONTS["body"], fill=COLORS["ink"], spacing=7)
            self.y += h + 12
        self.y += 6

    def table(self, rows: list[tuple[str, str]]) -> None:
        for left, right in rows:
            ltxt = wrap(left, 30)
            rtxt = wrap(right, 66)
            h = max(text_height(self.draw, ltxt, FONTS["small"]), text_height(self.draw, rtxt, FONTS["small"])) + 24
            self.ensure(h + 2)
            y0 = self.y
            self.draw.rectangle((MARGIN_X, y0, MARGIN_X + 420, y0 + h), outline=COLORS["line"], width=2, fill=(248, 251, 255))
            self.draw.rectangle((MARGIN_X + 420, y0, PAGE_W - MARGIN_X, y0 + h), outline=COLORS["line"], width=2, fill=(255, 255, 255))
            self.draw.multiline_text((MARGIN_X + 14, y0 + 12), ltxt, font=FONTS["small_bold"], fill=COLORS["ink"], spacing=5)
            self.draw.multiline_text((MARGIN_X + 436, y0 + 12), rtxt, font=FONTS["small"], fill=COLORS["ink"], spacing=5)
            self.y += h
        self.y += 20

    def save(self, stem: str) -> dict[str, str]:
        self.finish_page()
        OUT.mkdir(parents=True, exist_ok=True)
        png = OUT / f"{stem}.png"
        pdf = OUT / f"{stem}.pdf"
        html = OUT / f"{stem}.txt"
        self.pages[0].save(png)
        self.pages[0].save(pdf, save_all=True, append_images=self.pages[1:], resolution=150.0)
        html.write_text(f"{self.title}\n{self.subtitle}\nGenerated {datetime.now(timezone.utc).isoformat()}\n", encoding="utf-8")
        return {"png": str(png.relative_to(ROOT)), "pdf": str(pdf.relative_to(ROOT)), "text": str(html.relative_to(ROOT))}


def build_privacy() -> dict[str, str]:
    doc = Document(
        "Privacy Policy Evidence: YouTube Data API Use",
        REFS["privacy_url"],
        "YOUTUBE API PRIVACY EVIDENCE",
    )
    doc.callout(
        "Upload-ready supporting evidence. Before final submission, publish equivalent text at "
        f"{REFS['privacy_url']} because the quota form also asks for a public Privacy Policy URL.",
        "warning",
    )
    doc.h2("What FlashcardsLuna Collects")
    doc.paragraph(
        "FlashcardsLuna is a multilingual flashcard learning platform. Public learners can browse "
        "the website without signing in. The YouTube API workflow is an internal owner-operated "
        "publishing tool for FlashcardsLuna administrators and GitHub Actions runners."
    )
    doc.bullets(
        [
            "We do not collect Google passwords, YouTube passwords, OAuth refresh tokens from public users, or payment information through the YouTube API workflow.",
            "We do not download, scrape, sell, or republish third-party YouTube content.",
            "We use YouTube API access only for owner-managed YouTube Brand Channels explicitly authorized by the channel owner.",
        ]
    )
    doc.h2("YouTube Data API Access")
    doc.paragraph(
        "The internal API client uses OAuth authorization for owner-managed channels. Current project "
        "scope: https://www.googleapis.com/auth/youtube.force-ssl."
    )
    doc.bullets(
        [
            "Upload FlashcardsLuna-owned/generated lesson videos.",
            "Set video title, description, tags, category, language metadata and custom thumbnails.",
            "Schedule private uploads with future publishAt so YouTube publishes them later.",
            "Create or reuse owner-managed playlists and insert videos into the correct playlist.",
            "Read back video, playlist and channel IDs to prevent duplicate uploads and wrong-channel publication.",
            "Update approved channel description, banner and watermark assets for owner-managed channels.",
        ]
    )
    doc.h2("Google Privacy, YouTube API Terms and User Controls")
    doc.table(
        [
            ("Google Privacy Policy", REFS["google_privacy"]),
            ("YouTube API Services Terms of Service", REFS["youtube_api_terms"]),
            ("YouTube API Services Developer Policies", REFS["youtube_api_policies"]),
            ("Revoke third-party Google account access", REFS["google_connections"]),
        ]
    )
    doc.h2("Data Deletion and Access Revocation")
    doc.bullets(
        [
            "Channel owners can revoke OAuth access from Google Account connections. After revocation, the publishing workflow cannot write to that channel until re-authorized.",
            "Operational run logs and non-secret registries store only publication evidence such as channel ID, video ID, playlist ID, status, timestamps and quota/readback errors.",
            "Requests to remove local operational publication records can be sent through the FlashcardsLuna public site or YouTube profile contact surface.",
            "OAuth tokens are stored as private local/GitHub secrets and are not published, printed, committed, or included in evidence uploads.",
        ]
    )
    doc.h2("Retention and Security")
    doc.bullets(
        [
            "Publication metadata is retained as long as needed to avoid duplicate uploads, track scheduled publication status and audit quota usage.",
            "Private OAuth credentials and tokens are excluded from the public repository and from this evidence package.",
            "The API workflow is not available to public site visitors.",
        ]
    )
    return doc.save("project-1-privacy-policy-youtube-api-evidence")


def build_homepage() -> dict[str, str]:
    doc = Document(
        "Homepage Evidence: Privacy Link and YouTube Branding",
        REFS["public_site"],
        "HOMEPAGE EVIDENCE",
    )
    doc.callout(
        "This document shows the required compliant homepage/footer placement. If the Google form "
        "requires a true live screenshot, update the public homepage so Privacy and YouTube links are "
        "visible together, then capture the live page.",
        "warning",
    )
    doc.h2("Required Homepage / Footer Items")
    doc.bullets(
        [
            f"Privacy Policy link: {REFS['privacy_url']}",
            f"Terms of Service link: {REFS['terms_url']}",
            f"YouTube channel / brand link: {REFS['main_channel']}",
            f"Optional owner-managed channel example: {REFS['ru_channel']}",
            f"Public repository for review context: {REFS['repo']}",
        ]
    )
    doc.h2("Reviewer-Facing Placement")
    doc.table(
        [
            ("Footer item", "Expected visible text and destination"),
            ("Privacy Policy", f"Privacy -> {REFS['privacy_url']}"),
            ("Terms of Service", f"Terms -> {REFS['terms_url']}"),
            ("YouTube brand / channel", f"YouTube / FlashcardsLuna on YouTube -> {REFS['main_channel']}"),
            ("Contact", "Public site or YouTube profile contact surface"),
        ]
    )
    doc.h2("API Client Disclosure")
    doc.paragraph(
        "The public homepage may describe FlashcardsLuna as a flashcard learning platform. It does "
        "not need to expose the internal GitHub Actions uploader, but the Privacy Policy and Terms "
        "pages should disclose that owner-managed YouTube channels are published through YouTube API Services."
    )
    doc.h2("What To Screenshot For Final Submission")
    doc.bullets(
        [
            "Open https://flashcardsluna.com in a browser.",
            "Scroll to the footer or public link area.",
            "Capture the area where Privacy, Terms and the YouTube channel/brand link are visible together.",
            "Do not include private admin pages, cookies, tokens, browser passwords or GitHub secrets.",
        ]
    )
    return doc.save("project-1-homepage-privacy-youtube-brand-evidence")


def build_terms() -> dict[str, str]:
    doc = Document(
        "Terms of Service Evidence",
        REFS["terms_url"],
        "TERMS DOCUMENTATION",
    )
    doc.callout(
        "Upload-ready terms documentation. Before final submission, verify the public Terms page renders "
        f"at {REFS['terms_url']}.",
        "ok",
    )
    doc.h2("FlashcardsLuna Terms Summary")
    doc.bullets(
        [
            "FlashcardsLuna provides educational flashcard and language-learning materials.",
            "Video lessons, thumbnails, playlists, channel descriptions and learning metadata are created or curated by FlashcardsLuna for owner-managed YouTube channels.",
            "Users must not misuse the site, copy automated content at scale, attempt to access private workflows, or interfere with publication systems.",
            "The public website does not give users direct access to the internal YouTube API client.",
        ]
    )
    doc.h2("YouTube API Services Terms")
    doc.table(
        [
            ("YouTube API Services Terms of Service", REFS["youtube_api_terms"]),
            ("YouTube API Services Developer Policies", REFS["youtube_api_policies"]),
            ("Google Privacy Policy", REFS["google_privacy"]),
        ]
    )
    doc.h2("Content and Ownership")
    doc.bullets(
        [
            "FlashcardsLuna uploads its own generated educational videos and metadata to owner-managed channels.",
            "The workflow does not upload third-party videos as if they were FlashcardsLuna content.",
            "The workflow does not post comments, scrape YouTube, or distribute YouTube API access to public users.",
        ]
    )
    doc.h2("Changes, Contact and Removal Requests")
    doc.bullets(
        [
            "Terms and policy pages may be updated as the publishing workflow changes.",
            "Channel owners can revoke OAuth access through Google Account connections.",
            "Requests about publication records, privacy or deletion can be sent through the public site/contact surface or YouTube channel contact surface.",
        ]
    )
    return doc.save("project-1-terms-of-service-evidence")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rendered = {
        "privacy_policy_screenshot": build_privacy(),
        "homepage_privacy_youtube_brand_screenshot": build_homepage(),
        "terms_documentation": build_terms(),
    }
    generated_at = datetime.now(timezone.utc).isoformat()
    manifest = {
        "generatedAt": generated_at,
        "purpose": "YouTube API Services Audit and Quota Extension Form supporting evidence for Project 1.",
        "uploadRecommendation": {
            "privacyPolicyScreenshot": rendered["privacy_policy_screenshot"]["pdf"],
            "homepagePrivacyYoutubeBrandScreenshot": rendered["homepage_privacy_youtube_brand_screenshot"]["pdf"],
            "termsDocumentation": rendered["terms_documentation"]["pdf"],
        },
        "blockerBeforeSubmit": [
            "Publish or fix the public privacy policy page at https://flashcardsluna.com/privacy so it renders the YouTube API / Google Privacy / data deletion sections.",
            "If the form requires a true live homepage screenshot, update the public homepage/footer so the privacy link and YouTube channel/brand link are both visible, then capture and upload that live screenshot.",
        ],
        "rendered": rendered,
        "officialReferences": REFS,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    checklist = f"""# YouTube API Quota Evidence Upload Checklist

Generated: {generated_at}

## Upload These Files To Project 1 Fields

1. Privacy policy screenshot:
   - {rendered["privacy_policy_screenshot"]["pdf"]}
   - Optional PNG: {rendered["privacy_policy_screenshot"]["png"]}

2. Homepage screenshot showing Privacy Policy link and YouTube brand:
   - {rendered["homepage_privacy_youtube_brand_screenshot"]["pdf"]}
   - Optional PNG: {rendered["homepage_privacy_youtube_brand_screenshot"]["png"]}
   - Stronger final evidence should be a live screenshot after the public homepage/footer visibly includes both Privacy and YouTube links.

3. Terms of service documentation:
   - {rendered["terms_documentation"]["pdf"]}
   - Optional PNG: {rendered["terms_documentation"]["png"]}

## Do Not Upload

- OAuth token JSON
- Google OAuth client-secret JSON
- .local files
- GitHub secrets
- refresh tokens
- cookies
- private keys
- private user data

## Submit Blocker

The privacy policy URL in the Google form is `{REFS["privacy_url"]}`. Before submitting, this public page should render equivalent policy text. If it is empty or missing YouTube API / Google Privacy / data deletion sections, fix the site first.

## Manifest

- outputs/youtube-api-quota-evidence/project-1-20260622/manifest.json
"""
    (OUT / "UPLOAD-CHECKLIST.md").write_text(checklist, encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
