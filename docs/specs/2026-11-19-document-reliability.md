# Document reliability improvements

Implementation target for the 2026-11-19 `implement-spec` run. The authoritative acceptance criteria are the GitHub issues linked below.

## Scope

- [#54 Search text on every PDF page](https://github.com/dork7/cardholder/issues/54): on-device extraction for every page, encrypted storage, search and Details (.md), safe backfill, and backup compatibility.
- [#55 Warn about poor document photo quality](https://github.com/dork7/cardholder/issues/55): conservative local quality checks before Save, with an option to keep the image and no upload.
- [#56 Show backup health and verify an encrypted backup](https://github.com/dork7/cardholder/issues/56): clear status and non-destructive verification using restore validation rules.

The existing two-stage document search work for [#52](https://github.com/dork7/cardholder/issues/52) is the integration branch baseline because #54 needs its Details (.md) search path. The separate Notes search behavior in #52 is outside this run.

## Constraints

- Document content, OCR text, backup passphrases, and backup plaintext stay off the network and out of persistent unencrypted storage.
- Existing photo documents and older encrypted backups continue to work.
- Device-only behavior and performance are recorded as verification limits if no device or emulator is available.
