# Deck14 approved cover package

Deck: `home_apartment_common_areas_a2`, Apartment Building & Common Areas, A2.
Owner lali approved the visual samples and then all covers on 2026-10-28.
GitHub commit/push is authorized; video publication and SR actions are not.

`manifest.json` is the authoritative allowlist: 3,075 JPG covers, comprising
2,859 ordinary and 216 Polyglot covers for 54 language variants. Each cover is
1280x720 JPEG below 2MB, pinned by SHA256, with a matching JSON sidecar. Existing
Course Metadata supplies the localized text unchanged; NO uses NB metadata.
Technical text/layout checks do not constitute native linguistic certification.

The approved watercolor base was created once using built-in Codex image
generation. All text overlays were rendered with `npm run build:youtube-cover-assets`;
no paid external image APIs or runtime image generation were used.

Only 909 assets are upload-eligible: 845 ordinary and 64 Polyglot covers for
16 currently custom-thumbnail-enabled canonical supports. The other 2,166 remain
ineligible. Shared EN-GB/ES/PT variants do not create extra physical channels.
Channel capabilities, routes, voices, calendars and existing videos are unchanged.

There are 3,183 JPGs locally because 108 contact sheets (54 languages x 2 types)
remain under `video/contact-sheets/`. They are current review artifacts, preserved
locally and excluded from Git. The original draft base and scratch are excluded too.
Stage only the manifest paths, their sidecars and the exact support files recorded
by `git-preparation-audit.json`; never recursively stage the package directory.

The canonical local-only deck export is committed at
`data/decks/home_apartment_common_areas_a2.json` for reproducible clean-runner builds.
SHA256: `b0e044bc71f53559d659a6843d79d82c74b78457d1532b62c1f5e3f0ee7d2ffa`.
No Drive upload, YouTube workflow dispatch, publication claim or SR repair is
part of this cover package.
