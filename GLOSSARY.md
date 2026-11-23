# Doc Keeper

A private, on-device keeper for the user's personal documents — IDs, licences, certificates,
contracts. Nothing leaves the phone.

## Keeping documents

**Document**:
One thing the user keeps: photos of something physical, a PDF, or a profile.
_Avoid_: card, item, file

**Profile**:
A document holding one Person's own details (date of birth, blood group), which Doc Keeper draws as a
card from a template; the drawn card is its front. A profile always belongs to a Person, and a Person
has at most one. Its name is its Person's name. The details are sealed with the rest of the document.
_Avoid_: medical ID, contact card

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
A topic used to find documents and notes. Either can have several tags, or none. A few are offered
to start with (ID, Insurance, Membership); the rest the user names. A tag exists while at least one
document or note has it.
_Avoid_: category, type, label

**Person**:
The family member whose document it is. A document belongs to at most one person; the person's
name is distinct from its tags. Notes do not belong to a person.

**Document text**:
The words read from a document's photos or PDF, kept with it so it can be searched.
_Avoid_: OCR, scan text

**Recently deleted**:
Where a deleted document waits 30 days, still encrypted, before it is erased. It can be restored
from there exactly as it was. Notes are not kept there.
_Avoid_: trash, bin, recycle

**Space**:
A place that holds documents and notes together. Every document and note has one space.
Spaces are Personal, Family, Home, and Travel.

## Keeping notes

**Note**:
Text the user writes and keeps, with an optional title. A note may link to one document and have
several tags, but remains its own item if that document is deleted. It is distinct from the Document
text read from photos or a PDF.
_Avoid_: document text

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
