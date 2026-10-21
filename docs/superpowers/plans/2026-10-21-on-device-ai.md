# Card Holder — On-device AI implementation plan

Oct 21, 2026 · Spec: [`docs/design.md`](../../design.md) · Market research: [`docs/research/market-research.md`](../../research/market-research.md)

**Stack:** the existing Expo app (SDK 58, React Native 0.88, dev-client builds) for iOS and Android. The native OCR engines live in a local Expo module; everything else is TypeScript under `src/` with Jest tests, like the rest of the app.

## Goal

Make adding a card almost typing-free: when the user adds a card's photos, the app reads the card, suggests its category, and fills in the name and expiry date. All of this happens on the phone, with no network requests.

**What the user gets**

- **Auto-fill:** name and expiry date are suggested once the photos are added. The user confirms or edits them; nothing is saved without a glance.
- **Auto-category:** ID, Insurance, Membership or Other (`CATEGORIES` in `src/cards/types.ts`) is pre-selected.
- **Search by card text:** finding "Daman" or "Gold's Gym" works even if the card was named something else.
- **Expiry reminders that set themselves:** a detected expiry date fills `expiresOn`, so the existing 30- and 7-day reminders (`src/reminders/`) follow with no extra work.

**Constraints carried over from the spec**

- No camera. The app never asks for camera permission (`android.permission.CAMERA` stays blocked in `app.json`) and has no scanner; only images the user adds are analysed.
- No network. Models ship inside the app binary; the app never downloads anything.
- Runs on the app's current minimums — Android 10 (`minSdkVersion` 29) and iOS 16.4 — and must be acceptable on low-end phones, not only flagships.
- Card photos and extracted text never leave the app's encrypted storage (AES-256-GCM, `src/crypto/`).

## Approach

Use a pipeline of small, fast, predictable steps instead of one large model. Rules and validators do most of the work; machine learning (ML) only reads the text and sorts the cards.

```
Image added (picked from the photo library, or shared to CardHolder) → freeform crop (src/images/capture.ts)
  → OCR (native, modules/card-ocr):
      Android: ML Kit Text Recognition v2 (Latin), plus PP-OCRv5 Arabic when Arabic script is present
      iOS:     Apple Vision text recognition (Latin, and Arabic if the phase 0 spike says it is good enough)
  → Field extraction (TypeScript): MRZ parser, regex and validators (ID formats, dates, check digits)
  → Category (TypeScript): keyword rules from the OCR text, later a small image classifier
  → Suggestions shown on the add/edit screen → user confirms → saved
```

A large vision-language model (Gemma 4 E2B, about 2.6 GB) is **not** in the core plan. It would rule out low-end devices, add gigabytes to the app, and can make up values. It stays as an optional later experiment (phase 5).

## Model and library choices

| Job | Choice | Size (approx.) | Why |
| --- | --- | --- | --- |
| Crop | The app's existing freeform crop (`react-native-image-crop-picker`) | 0 (already shipped) | No scanner needed; the user frames the card |
| OCR on Android (Latin, numbers, MRZ) | ML Kit Text Recognition v2, **bundled** Latin model (not the Play services download) | A few MB | Fast, free, mature, works offline from first launch |
| OCR on iOS (Latin, numbers, MRZ) | Apple Vision `VNRecognizeTextRequest`, accurate level | 0 (part of iOS) | Built in, no app-size cost, strong on Latin text |
| OCR (Arabic) | Android: PaddleOCR PP-OCRv5 mobile detector + Arabic recognizer on ONNX Runtime Mobile, called from Kotlin inside `card-ocr`. iOS: Vision if its Arabic is good enough, otherwise the same Paddle models from Swift | Under 20 MB in total, plus the runtime | ML Kit has **no Arabic**; PP-OCRv5 has a dedicated Arabic model |
| Field extraction | Plain TypeScript: MRZ parser, regex, validators | ~0 | Predictable, testable with Jest, can't make up values, shared by both platforms |
| Category (phase 3a) | Keyword and layout rules on the OCR text, in TypeScript | ~0 | Covers most cards ("Identity", "Insurance", "Member", company names) |
| Category (phase 3b) | Small image classifier (MobileNetV3 / EfficientNet-Lite) fine-tuned and run with `react-native-fast-tflite` (LiteRT) | ~3–6 MB | For cards with little text (gym fobs, logo-only cards) |
| Smart extract (optional) | Gemma 4 E2B on LiteRT-LM, high-end devices only | ~2.6 GB | Messy cards that rules can't parse |

Sizes are estimates from vendor pages, and package support for Expo SDK 58 must be checked; confirm both in the phase 0 spike.

**Why a local module instead of a ready-made OCR package:** one small module keeps the native surface to a single function, lets Android and iOS use their best engine, and accepts the image bytes directly so no plaintext card image is written to disk for OCR. Ready-made wrappers (for example `@react-native-ml-kit/text-recognition`) are a fallback if the module turns out to be more work than expected.

## Architecture

Native code does one job: turn an image into text with positions. Everything that decides what the text means is TypeScript, so it runs in Jest without a device.

| Piece | Where | Responsibility |
| --- | --- | --- |
| `card-ocr` native module | `modules/card-ocr/` (created with `npx create-expo-module --local`; Kotlin + Swift) | `recognize(jpegBase64, { scripts }): Promise<OcrResult>`. Android: ML Kit, plus the Paddle Arabic path. iOS: Vision. Decodes the image in memory, runs off the JS thread, frees models after use |
| `OcrResult` types | `src/analysis/types.ts` | Blocks, lines, boxes, confidence, detected script |
| `TextRecognizer` | `src/analysis/recognizer.ts` | Thin wrapper over `card-ocr` behind an interface, so tests and Expo web use a fake |
| `detectScript` | `src/analysis/script.ts` | Decides whether to run the Arabic pass (Arabic code points in the first pass, or a cheap pre-check) |
| `extractFields` | `src/analysis/fields.ts`, `src/analysis/mrz.ts` | MRZ parsing, date parsers, name heuristics; returns `FieldSuggestion { value, confidence, source }` for name and expiry |
| `classifyCard` | `src/analysis/classify.ts` | Rules first, model later; returns a category plus confidence |
| `analyzeImage` | `src/analysis/analyze.ts` | Runs the steps, enforces a timeout, ignores results that arrive after the image was replaced, returns `CardAnalysis` |

## Input: images the user adds

Only images the user adds to a card are analysed. There is no camera, no scanner, and no scanning of the user's photo library.

- **Sources:** an image picked from the photo library on the add/edit screen (`pickImage`), or an image shared to CardHolder from another app (`cropSharedImage`).
- **When:** right after the image is cropped, while the user is still on the add/edit screen. Front and back are analysed separately as each one is added. Suggestions appear as they come in, and the screen never waits on them.
- **What is analysed:** the cropped JPEG the app is about to save, passed to `card-ocr` as the base64 it already has in memory. `capture.ts` keeps deleting its temporary files as it does today. Replacing an image re-runs analysis for that side; removing the back drops its text.
- **Not kept:** any photo the user didn't choose is never read. If the user cancels the add/edit screen, the text read from its images is discarded with them.

## Data model

`CardFields` (`name`, `category`, `expiresOn`) does not change. The new data goes in the card's sealed payload (`src/cards/cardStore.ts`), so it is encrypted exactly like the name.

| Where | New fields |
| --- | --- |
| `Card` and the sealed `Payload` | `cardText: { front: string; back: string \| null } \| null`, `textScripts`, `analysisVersion`, `categorySource: 'user' \| 'suggested'` |
| `SettingKey` (`src/storage/settings.ts`) | `readCardText` (the on/off setting) |

- **Search:** no FTS table. A full-text index would store card text in plaintext next to the encrypted payloads. Cards are already decrypted into memory for the home screen and people keep few of them, so `filterCards` (`src/cards/listing.ts`) also matches the card's text, after lower-casing and digit normalization.
- **Re-analysis:** `analysisVersion` lets a later app update re-run improved analysis on existing cards. It runs in the foreground, one card at a time, after launch when the app is idle. Background tasks are unreliable on both platforms, so they aren't used.
- **Backups:** card text is not written to backup files (`src/backup/`); it is re-derived after import. That keeps the backup format at `formatVersion: 1` and keeps extracted ID text out of exported files.

## Field extraction rules

The most reliable source of data is the **MRZ** (the machine-readable lines on the back of IDs and passports). It has check digits, so a correct read can be verified.

The app no longer stores a card number, so numbers are used only to **validate** a read and to **pick the category**, not as a field. They stay searchable through the card text.

| Field | How |
| --- | --- |
| MRZ (TD1 ID cards, TD3 passports) | Find 2–3 lines of `A–Z 0–9 <`; parse; validate check digits; fills name and expiry. A valid MRZ also means category ID |
| Emirates ID number | Pattern `784-YYYY-NNNNNNN-C`; check the 15-digit length and check digit (confirm the algorithm). A match means category ID |
| Other card numbers | Long digit groups near labels such as "Member", "Policy", "رقم" are category hints, not stored fields |
| Expiry date | Near labels "Expiry", "Exp", "Valid until", "تاريخ الانتهاء"; parse common formats into `YYYY-MM-DD` (the `expiresOn` format, via `src/time/dates.ts`); choose the latest future date |
| Name | MRZ first; else lines near "Name" / "الاسم"; else the largest line of text that is not a label. Must pass `validateCardFields` (≤ 60 chars) |
| Digits | Convert Arabic-Indic digits (٠–٩) to 0–9 before parsing |

Each suggestion has a confidence score. Below a threshold, the field stays empty instead of showing a guess.

## Phases

### Phase 0: Spike and test set (1 week)

- [ ] Build a test set of about 50–100 card photos as users will add them, i.e. taken with the phone's own camera app and then picked from the library (own cards, consenting friends, sample/specimen cards), front and back, Latin and Arabic, good and bad lighting.
- [ ] Write the ground truth for each: category, name, expiry.
- [ ] Keep real card photos **out of git**. Commit only the OCR output as JSON fixtures (redacted, or from specimen cards), so the Jest tests for extraction run on real OCR output without real IDs in the repo.
- [ ] Pick test phones: one low-end Android (Android 10–11, ≤ 4 GB RAM), one mid-range Android, one older iPhone (oldest that runs iOS 16.4), one recent iPhone.
- [ ] Prototype `card-ocr` with one engine per platform; benchmark ML Kit Latin vs PP-OCRv5 (Latin + Arabic) on Android, and Vision (Latin + Arabic) on iOS, for accuracy, speed and memory.
- [ ] Measure how much each option adds to the Android AAB and the iOS app.
- [ ] Confirm the chosen packages build with Expo SDK 58 (dev client and release builds, `npx expo prebuild --clean`).
- [ ] Check licenses (ML Kit terms, PaddleOCR Apache-2.0, ONNX Runtime MIT, any classifier weights).

**Exit criteria:** OCR finishes in under 1.5 s per side on the low-end phone, field accuracy targets look reachable, and each platform's app grows by no more than about 25 MB.

### Phase 1: OCR and search (1–2 weeks)

- [ ] `modules/card-ocr` with `recognize()` on both platforms (Latin), plus `src/analysis/recognizer.ts` and a fake for tests.
- [ ] Run OCR on each image after it is picked or shared in and cropped; store `cardText` in the sealed payload.
- [ ] Search over name + card text in `filterCards`.
- [ ] Setting: "Read text on cards" (on by default, explained as on-device). Strings go in `src/strings.ts`.

### Phase 2: Auto-fill fields (2 weeks)

- [ ] `extractFields` with MRZ, date and name rules, unit-tested against the phase 0 fixtures.
- [ ] Show suggestions as pre-filled, editable fields marked "Suggested" in the add/edit form (`src/cards/editForm.ts`, `app/edit/[id].tsx`). A suggestion never overwrites something the user typed.
- [ ] A suggested expiry date fills `expiresOn`, so the existing reminders apply once the user saves.
- [ ] Track (locally only) how often users accept or edit each suggestion, for tuning.

### Phase 3: Auto-category (1–2 weeks)

- [ ] 3a: keyword and layout rules → category with confidence; pre-select it in `CategoryChips`.
- [ ] 3b (only if 3a accuracy < ~85%): fine-tune a small image classifier on labelled card images; run it with `react-native-fast-tflite`; combine its score with the rules.

### Phase 4: Arabic (2 weeks)

- [ ] Arabic path in `card-ocr`: PP-OCRv5 detector + Arabic recognizer on ONNX Runtime Mobile on Android; on iOS, Vision or the same Paddle models, depending on phase 0.
- [ ] `detectScript` so the Arabic pass runs only when needed.
- [ ] Bidirectional text handling and Arabic-Indic digit normalization.
- [ ] Arabic labels added to the field rules.
- [ ] Re-run the test set; check speed on the low-end phone.

### Phase 5 (optional, later): Smart extract with a VLM

- [ ] Prototype Gemma 4 E2B via LiteRT-LM (or `react-native-executorch`) for cards the rules can't parse.
- [ ] Only on devices with ≥ 8 GB RAM and a supported GPU.
- [ ] Delivery is the blocker: 2.6 GB can't ship in the base app. It would need Play Asset Delivery on Android and On-Demand Resources on iOS, neither of which Expo supports out of the box, so this means custom config plugins. Confirm both work with no network requests from the app.
- [ ] Ask the model for strict JSON, then pass the output through the same validators. Never save model output without the user confirming it.
- [ ] Go / no-go based on whether it beats phase 2–4 results enough to justify ~2.6 GB and the delivery work.

Rough total for phases 0–4: **7–9 weeks** of one developer, after the v1 MVP. This matches the research note's advice to ship OCR soon after v1.

## Success metrics

| Metric | Target |
| --- | --- |
| OCR + extraction time per side | < 1.5 s low-end, < 0.5 s flagship |
| Peak extra memory during analysis | < 300 MB (without VLM) |
| App size increase (Android AAB, iOS app) | ≤ 25 MB each |
| Expiry date correct (exact match) | ≥ 90% of cards that show one |
| Name correct | ≥ 90% (≥ 98% when the MRZ validates) |
| Category correct | ≥ 85% |
| Wrong suggestions shown | < 5% (better to leave a field empty) |

## Mobile limits and how this plan handles them

| Limit | Handling |
| --- | --- |
| Low RAM on older phones | No large model in the core; one analysis at a time; native models freed after use |
| JS thread | OCR runs natively off the JS thread; only text crosses the bridge, so swipes and animations stay smooth |
| App size | Small models only; ML Kit Latin bundled on Android, Vision built into iOS; the VLM only as an optional on-demand pack |
| No network | Models bundled in the binary; nothing fetched by the app |
| Heat and battery | Analysis runs once per added image; re-analysis one card at a time, only when the app is idle |
| Background limits | Analysis runs on the add/edit screen; re-analysis in the foreground, not in background tasks |
| Device variety | CPU paths must be fast enough; GPU/NPU is a bonus, never required |
| Expo Go | Not supported (native module); the app already needs a dev client build |
| Photo permission policy | The system photo picker, not full library access; no camera permission |
| Model mistakes | Validators, confidence thresholds, and the user always confirms |

## Privacy

- Card images and card text stay in the app's encrypted storage: text in the sealed payload, images in the encrypted blob store, like everything else.
- The OCR input is the in-memory JPEG; no extra plaintext image file is written for analysis.
- Card text is not included in backup files.
- No analytics leave the device; accept/edit counts are local only (or behind an explicit opt-in export).
- Screens showing card images or extracted text stay hidden in the app switcher (task 17 in `docs/task-list.md`).
- The App Store privacy label and the Play data-safety label can still say "No data collected".

## Risks and open questions

- **Arabic accuracy** of PP-OCRv5 (and of Vision on iOS) on real UAE cards is unproven; phase 0 must test it.
- **Native module upkeep:** `card-ocr` has to be kept building across Expo SDK and React Native upgrades.
- **Government IDs:** is it OK to keep the full text of an ID card (ID numbers, dates of birth) in the card text, or should some of it be dropped after extraction? Check UAE data-protection rules before launch.
- **Hijri dates** on some cards: support them or ignore them?
- Can the phase 5 model be delivered on both stores with no network requests from the app? Confirm before committing to phase 5.
- Should OCR be on by default, or offered after the first card is added?
- Should the analysis version re-run on old cards automatically, or only on request?
