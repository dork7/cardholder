# Ask your documents

Labels: `ready-for-agent`

## Problem Statement

I keep my family's important documents in Doc Keeper — Emirates IDs, passports, vehicle licences, insurance cards, birth certificates, rental contracts — as photos and PDFs. When I need one fact from them ("when does the car insurance expire?", "what's my passport number?", "what's my daughter's date of birth?") I have to remember which document holds it, find it, open it, and read it, often squinting at small print or paging through a PDF. Search only matches a document's name, so a word printed inside a document can't find it. And I won't send these documents to a cloud AI to ask about them: they are identity papers.

## Solution

Doc Keeper reads and keeps each document's text, encrypted on the phone, so search finds words printed inside documents. On phones that come with a built-in model (Apple Foundation Models on iPhone, Gemini Nano on Android), I can type a question into the same search field and tap **Ask**. Doc Keeper picks the few documents most likely to hold the answer, asks the phone's own model, and shows me a short answer, the document it came from, and the exact line it rests on, with a button to open that document. If my documents don't say, it tells me so instead of guessing. Nothing — documents, text, or questions — ever leaves the phone. On phones without a built-in model, Ask doesn't appear, and the search field stays a search field (now one that looks inside documents).

## User Stories

### Document text

1. As a user, I want Doc Keeper to read the text of a document when I save it, so that I can later find and ask about what it says.
2. As a user, I want the text of a photo document read from both its front and its back, so that details printed on the back (like an Emirates ID's machine-readable lines) are included.
3. As a user, I want the text of a PDF document taken from the PDF itself where its pages have real text, so that it's exact rather than guessed from pictures.
4. As a user, I want scanned PDF pages (pictures with no text in them) read like photos, so that scanned contracts and certificates can be searched and asked about too.
5. As a user, I want every page of a PDF read, not only its cover page, so that facts on page 3 of a contract can be found.
6. As a user, I want a document's text kept encrypted like its photos, so that it is as private as the document itself.
7. As a user, I want a document's text replaced when I replace its photos or its PDF, so that it never describes a picture that's no longer there.
8. As a user, I want a document's text deleted when I delete the document, so that nothing about it lingers.
9. As a user, I want documents I added before this feature to have their text read in the background, so that I don't have to re-add anything.
10. As a user, I want that background reading not to slow the app down or block what I'm doing, so that the app stays responsive.
11. As a user, I want background reading to pick up where it left off if I close the app, so that it eventually covers every document.
12. As a user, I want my backups to include each document's text, so that a restored phone can search and ask straight away without re-reading everything.
13. As a user restoring an older backup without text, I want those documents read in the background after the restore, so that they become searchable too.
14. As a user, I want reading a document's text never to stop me saving it, so that a failed read doesn't lose my document.
15. As a user, I want a document whose text couldn't be read to still be kept and shown normally, so that a blurry photo isn't punished beyond being unsearchable.

### Searching inside documents

16. As a user, I want search to match words printed inside my documents, so that typing "FAZAA" finds the vehicle licence owned by Fazaa.
17. As a user, I want search to keep matching document names and categories too, so that what worked before still works.
18. As a user, I want search inside text on every phone, including phones that can't ask, so that every user gets better search.
19. As a user, I want search to ignore case and Arabic-Indic vs Western digits, so that "784-1990" matches however it was printed.
20. As a user, I want search results to stay instant as I type, so that searching text doesn't feel slower than searching names.

### Asking

21. As a user on a phone with a built-in model, I want to type a question into the search field and see an **Ask** row at the top, so that asking is where I already go to find things.
22. As a user, I want the matching documents still listed below the Ask row while I type, so that I can open a document directly if that's quicker.
23. As a user, I want to ask in plain English ("when does my car insurance expire?"), so that I don't need to know any special syntax.
24. As a user, I want my question answered even when the document is in Arabic, so that Arabic-only documents like a birth certificate can still be asked about.
25. As a user, I want a short, direct answer ("31 May 2027"), so that I get the fact without reading a paragraph.
26. As a user, I want every answer to name the document it came from, so that I know where it was found.
27. As a user, I want every answer to show the exact line of the document it rests on (evidence), so that I can check it at a glance.
28. As a user, I want a button on the answer that opens the source document, so that I can see the original when it matters.
29. As a user, I want "I couldn't find that in your documents" when they don't say, so that I'm never given a made-up answer.
30. As a user, I want an answer whose evidence doesn't actually appear in the source document to be treated as not found, so that the model can't invent a date or number.
31. As a user, I want "car", "vehicle", "mulkiya" and "licence" understood as related, so that "car insurance" finds my vehicle licence.
32. As a user, I want "ID" to find my Emirates ID and passport, so that common shorthand works.
33. As a user, I want my categories (including ones I named, like "Dad") used when picking documents, so that "Dad's passport" looks in the right place.
34. As a user, I want to see that an answer is being worked on, so that I know the app hasn't frozen.
35. As a user, I want to be able to cancel a question that's taking too long, so that I'm never stuck waiting.
36. As a user, I want a clear message if the phone's model is busy, still downloading, or switched off, so that I know why Ask didn't answer.
37. As a user, I want each question answered on its own, so that answers don't depend on an earlier question I've forgotten.
38. As a user, I want my questions and answers forgotten when I leave, so that no record of what I asked is kept.
39. As a user with no documents, I want Ask not to appear, so that I'm not offered something that can only fail.
40. As a user, I want Ask to work offline, so that it works on a plane or abroad.

### Phones and the built-in model

41. As a user on an iPhone with Apple Intelligence on, I want Ask available without downloading anything, so that it just works.
42. As a user on an Android phone with Gemini Nano, I want Ask available without downloading anything, so that it just works.
43. As a user on a phone without a built-in model, I want Ask not to appear at all, so that I'm not shown a feature I can never use.
44. As a user who turns Apple Intelligence on later, or whose phone finishes preparing Gemini Nano, I want Ask to appear without reinstalling, so that it shows up once it can work.
45. As a user, I want my documents and questions never sent off the phone, even if I'd allow it, so that my identity papers stay private.

### Suggestions when adding a document

46. As a user on a phone with a built-in model, I want it to suggest a new document's name, expiry and category, so that I get good suggestions without downloading Gemma.
47. As a user on a phone without a built-in model, I want the existing optional Gemma download to keep suggesting fields as it does now, so that nothing gets worse for me.
48. As a user on a phone with a built-in model, I want the Gemma download option hidden in Settings, so that I'm not offered a 290 MB download I don't need.

### Words and grouping

49. As a user, I want the app to call what I keep "documents" everywhere (titles, buttons, search placeholder, messages), so that birth certificates and contracts don't feel out of place in a "card" app.
50. As a user, I want Category to be the only way to group documents, so that I don't have to understand both folders and categories.

## Implementation Decisions

- **Vocabulary.** Use the project glossary's terms throughout: Document, Front, Back, Page, Cover page, Category, Document text, Question, Answer, Source, Evidence, Built-in model. Code identifiers that say "card" are not renamed as part of this work; only user-facing text changes.
- **Built-in models only (ADR 0001).** Answers come only from Apple Foundation Models (iOS) or Gemini Nano via ML Kit GenAI Prompt API (Android). No cloud model under any circumstances; no downloaded fallback for asking in this version.
- **Built-in model module.** A new native module per platform (alongside the existing card-ocr and card-pdf modules) exposes one small interface to TypeScript:
  - availability: available / not available (with a reason: unsupported device, turned off, not ready yet);
  - generate: prompt in, text out, with structured output constrained to a given JSON shape, cancellable.
  The TypeScript side wraps it as a `BuiltInModel` interface that the rest of the app depends on, so tests pass a fake — the same pattern as the existing text recognizer and smart reader.
- **Document text model.** Each document gains its document text: an ordered list of text blocks, one per front/back photo or PDF page, each block's lines in reading order. Sealed (encrypted) in storage like the other blob kinds, stored as its own blob so listing documents doesn't decrypt every text. Absent means "not read yet"; an empty list means "read, nothing found".
- **Reading text.** At save time, photo documents reuse the existing on-device text recognizer on front and back. PDF documents use the PDF's own text layer per page via the card-pdf module (new function: page text), falling back to rendering the page and running the text recognizer when a page has no text. Reading never blocks or fails a save: the document is saved first, its text follows.
- **Backfill.** A background job reads text for any document without it, one at a time, after unlock, resumable across launches, and yields to the user's own actions. The same job covers documents restored from a backup that had no text.
- **Backup format.** The backup file gains an optional per-document text field. Older backups without it still import; those documents are queued for backfill.
- **Search.** The listing's search matches name, category label and document text, case-insensitive with digits normalised (reusing the existing digit normalisation). To keep typing instant, the text index is held in memory after unlock rather than decrypted per keystroke.
- **Asking — the one seam.** A single function: given a question, the user's documents with their text and categories, and a `BuiltInModel`, it returns one of: `answer` (short answer, source document, evidence line), `not-found`, or `unavailable`. Internally:
  - Retrieval by word matching: score each document's text, name and category against the question's words, with a small synonym table (car ↔ vehicle, licence, license, mulkiya; ID ↔ identity, Emirates ID, passport; insurance ↔ policy, cover; …). Take the top 3–4 that fit the built-in model's context budget, trimming the longest texts first.
  - Prompt: instructions, then each candidate document labelled by an index, its name and category, and its text; answer only from these; reply in a fixed JSON shape (document index, answer, evidence line copied verbatim) or a not-found marker.
  - Validation: the cited document must be one of the candidates, and its evidence must appear in that document's text (after digit and whitespace normalisation); otherwise the result is `not-found`. Same principle as the existing check on Gemma's suggestions.
- **Ask UI.** The home screen search field gains an **Ask** row at the top when the text looks like a question or the user taps Ask, but only when the built-in model is available and there is at least one document. Tapping it shows a working state (cancellable) and then the answer panel: answer, source document name, evidence line, and an Open button. One question, one answer; nothing persisted; leaving clears it.
- **Field suggestions.** On phones with a built-in model, the existing smart-reader slot used when adding a document is filled by the built-in model instead of Gemma, using the same structured output and the same validation. Gemma 270M and its Settings download remain only where no built-in model exists.
- **Folders removed.** The hidden Folders feature is removed (screens, setting, storage of folder membership, folder suggestions on save); Category is the only grouping. Existing folder data is dropped on upgrade; it was never visible.

## Testing Decisions

- **What makes a good test:** exercise behaviour through the highest seam, with fakes only at the edge of the device (native modules), asserting on what the user would see or what is stored — never on internal helpers, prompt wording, or call order.
- **Asking seam (main):** unit tests with a fake `BuiltInModel` that records the prompt and returns scripted output. Cover: the right documents are picked (synonyms, categories, Arabic-only text); the context budget is respected; a correct answer comes back with its source and evidence; evidence not in the document → not-found; a cited document outside the candidates → not-found; malformed output → not-found; model unavailable → unavailable; cancellation stops it. Prior art: the card reading tests with a fake recognizer and fake smart reader, and the smart extraction tests.
- **Document store:** extend the existing store tests (in-memory database, blob store and vault): text saved sealed, replaced with new photos or PDF, deleted with the document, absent vs empty distinguished; backfill fills documents without text and resumes. Prior art: the existing store and refresh coordinator tests.
- **Backup:** extend the backup file and backup service tests: text round-trips; older backups without text import and are queued for backfill.
- **Search:** extend the listing tests: a word only inside a document's text finds it; digits normalised; names and categories still match.
- **Screens:** extend the home screen tests: Ask row only with an available model and documents; answer shows source, evidence and Open; not-found message; nothing remains after leaving. Extend the edit screen tests: the built-in model fills suggestions when available. Prior art: the existing home and edit screen tests with mocked services.
- **Not unit-tested:** the native Foundation Models and Gemini Nano modules and PDF text extraction; check them on a real iPhone and Android phone with the sample documents in `dataSet/`.

## Out of Scope

- Any cloud model, opt-in or not.
- A downloaded fallback model (e.g. Gemma 3 1B) for asking on phones without a built-in model.
- Follow-up questions or conversation history.
- Saving questions or answers.
- Asking in Arabic, or answers in Arabic.
- Viewing or editing a document's text.
- Embedding / meaning-based search.
- Siri / App Intents ("Hey Siri, ask Doc Keeper…").
- Renaming code identifiers from "card" to "document".

## Further Notes

- Suggested order: (1) document text, storage, backfill and backup; (2) search inside text; (3) built-in model modules and availability; (4) the asking seam and Ask UI; (5) built-in field suggestions; (6) "document" wording and removing Folders. Steps 1–2 help every phone and can ship on their own.
- Arabic quality of the built-in models was not tested up front by choice; Arabic-only documents may answer poorly, which is acceptable for this version.
- Both built-in models have small context windows (about 4,000 tokens on iOS), which is why retrieval picks only a few documents per question.
- See `GLOSSARY.md` and `docs/adr/0001-built-in-models-only-for-asking.md`.
