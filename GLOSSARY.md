# Doc Keeper

A private, on-device keeper for the user's personal documents — IDs, licences, certificates,
contracts — that can answer questions about them without anything leaving the phone.

## Keeping documents

**Document**:
One thing the user keeps: photos of something physical, or a PDF.
_Avoid_: card, item, file

**Front**:
The main photo of a photo document, the side that identifies it.
_Avoid_: image, picture, side A

**Back**:
An optional second photo of a photo document. A PDF document has none.
_Avoid_: reverse, side B

**Page**:
One page of a PDF document.

**Cover page**:
The page of a PDF document chosen to show as its picture. Never called its front.
_Avoid_: thumbnail page, first page

**Tag**:
A group a document belongs to. A document can have several, or none. A few are offered to start
with (ID, Insurance, Membership); the rest the user names (Car, Dad). A tag exists only while some
document has it.
_Avoid_: category, folder, type, label

**Document text**:
The words read from a document's photos or PDF, kept with it so it can be searched and asked about.
_Avoid_: OCR, scan text

## Asking

**Question**:
Something the user asks, in English, about what their documents say.
_Avoid_: prompt, query, chat

**Answer**:
A reply drawn only from the user's documents, always naming its source; when the documents don't say, the answer is "not found", never a guess.
_Avoid_: response, reply, result

**Source**:
The document an answer came from, which the user can open to check it.
_Avoid_: citation, reference

**Evidence**:
The exact line of document text an answer rests on, shown with it so the user can check it at a glance.
_Avoid_: quote, snippet, highlight

**Built-in model**:
The language model that comes with the phone (Apple Foundation Models on iPhone, Gemini Nano on Android). It answers questions where it is ready, unless the user chose the downloaded model in use instead.
_Avoid_: AI, Siri, Gemini (cloud), LLM, this phone's AI

**Downloaded model**:
One of the fixed menu of language models the user can download in Settings → AI models (ADR 0006). Several can be downloaded; phones with neither a built-in model nor a downloaded one cannot ask.
_Avoid_: local model (in wording the user sees), Gemma (for any of them), offline model

**Model in use**:
The one downloaded model the user picked: it suggests a new document's name, expiry date and tag, and answers questions where there is no built-in model or the user chose it under "Answer questions with".
_Avoid_: active model (in wording the user sees), current model, selected model
