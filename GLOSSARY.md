# Doc Keeper

A private, on-device keeper for the user's personal documents — IDs, licences, certificates,
contracts. Nothing leaves the phone.

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
The words read from a document's photos or PDF, kept with it so it can be searched.
_Avoid_: OCR, scan text

## Problems

**Crash report**:
The text the user can send after Doc Keeper closes unexpectedly: what went wrong, the phone model and
app version, and the app's recent log lines. Never a document. It exists only on the phone until the
user emails or shares it from Settings → Problems (ADR 0007).
_Avoid_: crashlytics, telemetry, analytics, diagnostics (in wording the user sees)

**Log**:
What the app writes about its own work ("Reading a document failed"), kept on the phone for a crash
report. Never a document's text or name.
_Avoid_: console, trace
