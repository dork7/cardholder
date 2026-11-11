---
status: accepted 2026-11-11
---

# No language model in the app

Asking questions of documents (ADR 0001) and the downloadable models (ADR 0006) are removed. The app
no longer loads, downloads or talks to any language model: no Ask window, no lookup file, no
Settings → AI models, no `llama.rn`, and no `builtin-model` or `model-download` native modules.

The owner decided the models were not worth what they cost: downloads of 290 MB to 1 GB, answers
that were slow and sometimes wrong on ordinary phones, and a large share of the app's code and
native size.

A new document's name, expiry date and tag are still suggested, by the rules alone (`src/analysis`:
MRZ, labelled dates, keywords), from the text the phone's own OCR reads. Search on the home screen
is how documents are found.

## Consequences

- Fields the rules can't read stay empty for the user to type; nothing fills the gaps.
- Model files downloaded by earlier versions are deleted when the app starts
  (`src/app/removeModelFiles.ts`), and the stored lookup file is dropped by a database migration.
- The Hugging Face download is gone from the list of network traffic the user can start (ADR 0005).
- Supersedes ADR 0001 and ADR 0006.
