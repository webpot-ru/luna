# YouTube API Quota Extension Form Draft

Status: working draft for the YouTube API Services Audit and Quota Extension Form.

Form URL: <https://support.google.com/youtube/contact/yt_api_form>

Official references:

- YouTube Data API quota costs: <https://developers.google.com/youtube/v3/determine_quota_cost>
- YouTube Data API quota and compliance audits: <https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits>

## Current Blockers Before Submit

Do not submit the form until these are resolved:

1. Sign in to the Google account that owns the relevant Google Cloud project.
2. Fill personal/legal contact fields manually: full name, official organization or individual filer data, country, address, city, region/state, postal code and contact email.
3. Add the numeric Google Cloud project number for the project that owns the YouTube Data API OAuth client.
4. Fix or confirm the live privacy policy page. On 2026-06-22, `https://flashcardsluna.com/terms` rendered Terms text in a browser, but `https://flashcardsluna.com/privacy` rendered an empty page even though HTTP returned `200`. The quota form requires a direct public privacy policy URL, and Google also asks for screenshots.
5. Prepare the required supporting files:
   - privacy policy screenshot, with YouTube/Google privacy references if applicable;
   - home page screenshot showing the privacy policy link and any YouTube branding;
   - terms of service documentation/screenshot;
   - OAuth/upload flow screenshots: consent screen, scopes, revocation path and internal upload workflow evidence.

Never upload OAuth token JSON, client-secret JSON, `.local` files, GitHub secrets, refresh tokens or private credentials as supporting evidence.

2026-06-22 follow-up readback: user-provided privacy modal screenshots show useful partial policy text, including collected data, storage, deletion and user rights. However, those screenshots are not enough as the only public privacy evidence. `curl` readback of `https://flashcardsluna.com/privacy` and `https://flashcardsluna.com/terms` returned HTTP `200`, but the fetched HTML did not contain the expected policy/terms text or the required YouTube API / Google Privacy / data deletion / revoke-access wording. Before final submission, the same disclosures must be published on the live public site URL, not only uploaded as generated evidence PDFs.

## Request Type

Select:

- `I want to complete a compliance audit to request a quota extension`

## Organization / Contact Fields

Needs manual input from the user:

- Filing type: use `Individual` if there is no registered legal entity, otherwise use `Organization`.
- Full legal name / full personal name.
- Official organization name, if filing as an organization.
- Country, address, city, state/region and postal code.
- Primary contact name and email.
- Technical contact and business contact can match the primary contact if that is true.

Known project field:

- Organization website: `https://flashcardsluna.com`
- Industry / business vertical: `Education and e-learning`
- Business type: `Independent developer or individual entrepreneur`, unless the user is filing under a registered company.

## Business Model

Recommended text for "What does your organization do and how is it related to YouTube?":

```text
FlashcardsLuna is a multilingual flashcard learning platform at https://flashcardsluna.com. We create our own educational vocabulary flashcard decks and use YouTube to publish generated language-learning video lessons for viewers in different support languages.

The YouTube Data API is used only for owner-managed channels: upload our own generated videos, set titles/descriptions/tags/thumbnails, schedule private uploads with publishAt, create or reuse playlists, add videos to playlists, update channel branding/description/watermark when approved, and read back upload/playlist/status information.

We do not scrape YouTube, download third-party content, post comments, or expose YouTube API access to public users.
```

Recommended selections:

- Primary audience:
  - Educators and educational institutions
  - General viewers / language learners
  - Internal users
- Revenue model:
  - Free service, unless the current business/legal answer is different.
- Ads displayed over YouTube content:
  - Not applicable, unless the form requires a different answer after selecting a different revenue model.
- Commercial use approval:
  - No, unless the user already has explicit YouTube commercial-use approval.
- Google / YouTube partner manager:
  - No Google representative, unless one exists.
- How did you learn about the YouTube Data API?
  - Google Developer Documentation

## API Client Fields

Recommended values:

- API client name: `FlashcardsLuna`
- Does the API client name contain "YouTube"? `No`
- Primary access URL: `https://flashcardsluna.com`
- Privacy policy URL: `https://flashcardsluna.com/privacy` after the live page is fixed/readback verified.
- Terms URL: `https://flashcardsluna.com/terms`
- Is the API client public? `No`
- Access instructions:

```text
The YouTube API client is an internal GitHub Actions publishing workflow for owner-managed channels. There is no public user login. Reviewers can inspect the public website, public YouTube examples, uploaded screenshots, and OAuth/upload-flow documentation.
```

## Google Cloud Project

Needs manual input:

- Number of Google Cloud projects: `4` if the `youtube 1`-`youtube 4` routing plan is used for production uploads; otherwise use the actual number of YouTube Data API projects at submission time.
- Google Cloud project numbers: numeric project numbers from Google Cloud Console for each submitted project. Route assignments live in [YouTube API Project Routing](youtube-api-project-routing.md) and `config/youtube-api-project-routing.json`.

Use case selections for Project 1:

- Video uploading and account management
- Education and research
- Internal company tools
- Statistics and reports, only if we continue using Data API statistics readback.

OAuth / auth type:

- `Yes`, because the workflow uses OAuth tokens authorized for owner-managed YouTube Brand Channels.
- Upload supporting screenshots for consent screen, scopes and revocation path.

Expected API volume:

- `1,000 to 10,000 requests per day`

This is request count, not total quota units. The daily quota request below should cover endpoint costs and retry margin.

## Endpoints To Select

Select these endpoints for the current accepted workflow:

- `youtube.videos.insert`
- `youtube.thumbnails.set`
- `youtube.playlists.insert`
- `youtube.playlists.list`
- `youtube.playlistItems.insert`
- `youtube.playlistItems.list`
- `youtube.videos.list`
- `youtube.videos.update`
- `youtube.channels.list`
- `youtube.channels.update`
- `youtube.channelBanners.insert`
- `youtube.watermarks.set`

Do not request extra `youtube.search.list` quota unless the workflow changes. The current publishing path does not require search.

## Quota Request

Requested general quota:

- General daily quota: `250000`
- General peak per minute: `3000`

General quota justification:

```text
The current default quota blocks our approved publishing workflow. We operate 51 owner-managed public support-language YouTube channels for FlashcardsLuna lessons, representing 54 support-language variants because EN/EN-GB, ES/ES-419 and PT/PT-BR share public channels. The accepted starting cadence is up to 6 scheduled public releases per support-language variant per local day, which is up to 324 video uploads per day across channels.

Each upload requires a scheduled videos.insert, thumbnails.set, playlist lookup/create when needed, playlistItems.insert, videos.list/channels.list readback, and occasional videos.update/channel branding operations. A real GitHub Actions scheduled upload probe for support EN -> target RU on 2026-06-22 failed before videos.insert because POST /youtube/v3/playlists returned 403 youtube.quota/quotaExceeded.

We request enough quota for scheduled owned educational uploads, readback, retry margin, and first-wave playlist creation without using search.list.
```

Requested `videos.insert` quota:

- Daily `videos.insert`: `500`
- Peak per minute: `20`

`videos.insert` justification:

```text
Required for uploading FlashcardsLuna owned/generated educational videos to the correct owner-managed channel. Planned starting cadence is up to 324 scheduled uploads per day across 51 public channels / 54 support-language variants, plus retry margin. We request 500 videos.insert calls/day and a modest peak allowance for GitHub Actions batches; uploads are scheduled/private with future publishAt and become public by schedule.
```

Requested `search.list` quota:

- No additional `search.list` quota.

## Evidence To Mention Or Attach

Useful non-secret evidence:

- Public site: `https://flashcardsluna.com`
- Public terms page: `https://flashcardsluna.com/terms`
- Public channel examples:
  - `https://www.youtube.com/@flashcardsluna`
  - `https://www.youtube.com/@LunaCardsRU`
- Example published videos from the owner-managed RU channel:
  - `https://www.youtube.com/watch?v=TMOdF3jl2wQ`
  - `https://www.youtube.com/watch?v=TkHEdDbwqRg`
  - `https://www.youtube.com/watch?v=mealfhnUI6w`
- GitHub repository: `https://github.com/webpot-ru/luna`
- Quota failure evidence from the current registry:
  - GitHub run `27922957687`
  - support `EN`, target `RU`, set `home_kitchen_cookware_pilot_01`
  - `publish_mode=scheduled`
  - planned `publishAt=2026-06-23T12:30:00.000Z`
  - failure: `POST /youtube/v3/playlists` returned `403`, `domain=youtube.quota`, `reason=quotaExceeded`
  - no video id or playlist id was created for that run

## Submission Rule

Form submission is an external Google request and must be confirmed at action time. A draft can be filled and reviewed, but do not click the final submit button until the user confirms the exact destination, account and data being sent.
