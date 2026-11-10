---
status: amended 2026-11-10: built-in model first, the downloaded model in use as the fallback or by choice (ADR 0006)
---

# Asking uses only the phone's built-in model, never the cloud

Questions about the user's documents are answered by the model that comes with the phone — Apple
Foundation Models on iPhone, Gemini Nano (ML Kit GenAI) on Android — and nothing else: no cloud model,
even on request, and for now no downloaded model on phones without a built-in one, which simply don't
offer asking. These are birth certificates and IDs, and "nothing leaves your phone" is the product's
promise; the built-in models are stronger than anything we could ship and cost the user no download.

## Considered Options

- **Gemma everywhere (downloaded, via llama.rn):** one model and the same answers on every phone, but
  an ~800 MB download for a weaker model. Kept in reserve as the fallback for phones without a
  built-in model, if users ask for one.
- **Cloud Gemini or similar:** the best answers and every phone, but documents would leave the device.
  Rejected outright.

## Consequences

- Fewer phones can ask: recent iPhones with Apple Intelligence on, and the Android phones that ship
  Gemini Nano.
- Two native code paths to build and test, and the same question can be answered differently on
  iPhone and Android.
- The built-in models read only a few thousand tokens at once, so each question is answered from a
  handful of documents picked by word matching, not from everything the user keeps.
- On phones with a built-in model it will also take over suggesting a new document's name, expiry and
  category, replacing the downloaded Gemma 270M there.

## Where things stand (2026-11-09)

Asking is not built yet: there is no Foundation Models or Gemini Nano code in the app. What runs today
is the groundwork from the spec (`docs/specs/ask-your-documents.md`): each document's text is read
(Vision on iOS, ML Kit on Android), kept encrypted, included in backups, read in the background for
older documents, searched, and shown in a document's Details (.md). Suggestions still come from the
rules plus the optional Gemma 3 270M (`llama.rn`, ~290 MB, downloaded once after the user agrees,
pinned and SHA-256 checked). It only fills fields the rules left empty.

## Amended (2026-11-09): built-in first, Gemma where there is none

Decided by the owner: asking is built now, and it should work on every phone, so the downloaded
Gemma 3 270M answers where the phone has no built-in model (or it's switched off). Still nothing
leaves the phone; no cloud model, as before. The order is in `src/ai/models.ts` (`chooseModel`):
the built-in model when it is ready, else Gemma if downloaded, else the Ask window says how to get
one (Gemini Nano's one-time AICore download where the phone offers it, or Gemma in Settings).

- **Native module:** `modules/builtin-model`: Gemini Nano through ML Kit GenAI Prompt API
  (`genai-prompt` 1.0.0-beta4; beta5 needs Kotlin 2.4) on Android, Apple Foundation Models on iOS 26+
  (weakly linked, so iOS 16.4 still runs). Same four calls on both: availability, prepare,
  generate, cancel.
- **How a question is answered** (`src/ai/ask.ts`), as the owner asked: the model first reads the
  **master lookup file** (`src/ai/lookup.ts`): a Markdown table of every document's name, category,
  expiry, tags, pages, a text excerpt and its reference. It names the rows most likely to hold the
  answer; then it reads each of those documents' own Markdown in turn and answers, or says the
  document doesn't, and moves on to the next (at most 4). Word matching with a small synonym
  table backs up the pick, and an answer is kept only if its evidence line (or the answer itself) is
  in that document.
- **Amended 2026-11-10, long documents and reworded answers.** A document too long for the model is
  read in parts split between lines: the start first, then the parts holding the most of the
  question's words, at most 3 parts a document (about 19,000 characters with a 7,000-character
  prompt; text beyond that is not read for a question). If the model fails on a part, its two halves
  are tried once each. Small models reword what they copy ("31 May 2027" for "31/05/2027"), so an
  answer that is not in the document as written is still kept when **one line** of the document
  backs all of it: every number in the answer is on that line (a month's name may be its number
  there), or, for an answer with no numbers, every word is. Numbers taken from different lines, a
  different month or amount, or a word the line doesn't have are turned away. The evidence shown is
  always that line of the document, never the model's own wording, and a reply cut off partway
  through its answer is not used.
- **The lookup file** is stored sealed (`CardStore.saveLookup`), can be viewed, saved as .md and
  recreated (Settings → Ask your documents, or the Ask window), and is remade automatically before
  a question if documents changed since it was made.
- **Gemma's quality:** 270M is very small; expect it to miss answers a built-in model finds. Its
  context was raised from 1,024 to 4,096 tokens to hold a document and a question.
- Built-in field suggestions (replacing Gemma when adding a document) are still to do.

## Amended (2026-11-10): a menu of downloaded models

Gemma 3 270M is now one of four downloadable models (ADR 0006). The one in use answers where there
is no built-in model, and the user can choose it over the built-in model in Settings → AI models.
