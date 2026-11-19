# Cases

Every case a run must cover, **in run order**: later sections reuse the documents, notes and folders earlier ones create. Each line reads `ID — case — how — expect`. Selectors are `ui.mjs` selectors (`id:` is the testID). `[manual]` cases cannot be driven from adb on a stock emulator: record them as `manual` with what a human must do, unless the run finds a way to drive them.

Pickers (photo, PDF, file, folder) are system UI: drive them through `ui.mjs screen` by visible text. The sample files are in a `DocKeeperTest` folder.

## E — Empty app (fresh install)
- E-01 — boot — launch after `pm clear` — "Opening your documents…" then home
- E-02 — empty home — home — `id:empty-state` "Add your first document"; no `id:search`, no view switcher
- E-03 — empty notes — `id:tab-notes` — "Keep your important notes here."
- E-04 — empty folders — `id:tab-folders` — `id:no-folders`
- E-05 — empty tags / people / recently deleted — `link tags`, `link people`, `link recently-deleted` — `id:no-tags`, "Add a person…", `id:recently-deleted-empty`
- E-06 — settings defaults — `id:tab-settings` — "0 of 10 free documents used", "Never backed up", `id:card-brightness-switch` on, `id:show-stack-switch` on

## A — Add and edit documents
- A-01 — save with no front — `id:add-card` → `id:save-card` — "Add a photo of the front."
- A-02 — discard — type a name, `id:close-edit` — "Discard changes?"; "Keep editing" stays, "Discard" leaves
- A-03 — add photo front + back — `id:front-library` → pick ID front; `id:back-library` → pick back — both previews; "Suggested from the photo" when OCR fills fields
- A-04 — OCR never overwrites typed name — type a name first, then pick a photo — typed name kept
- A-05 — folder offer — pick an ID photo with no folders — `id:folder-offer`; `id:accept-folder-offer` selects the new folder (created on save)
- A-06 — tags — `id:tag-add` → `id:new-tag-name` "travel" → `id:new-tag-submit` — chip `id:tag-chip-travel` selected
- A-07 — bad tag name — 25+ chars — "Type a name of up to 24 characters."
- A-08 — 9th tag — add 9 tags — "Too many tags"
- A-09 — new folder in form — `id:folder-add` → `id:new-folder-name` → `id:new-folder-submit`; blank → "Give the folder a name."; existing name → "There is already a folder with that name."
- A-10 — person — `id:person-add` → `id:person-name` → `id:person-create` — chip selected
- A-11 — expiry + reminder — "Add expiry date" → pick a date 10 days out; `id:remind-7` — date shows with "Clear"; first save asks for notification permission (allow)
- A-12 — custom reminder bounds — `id:remind-custom` → `id:remind-days` 0 and 400 — "Type a number of days from 1 to 365."
- A-13 — shape and blur — `id:shape-vertical`, `id:preview-blurred` — selected state changes
- A-14 — save — `id:save-card` — back on home with the new row `id:row-*`; note its id for later deep links
- A-15 — photo quality — add a document with the blurry photo — "Check this photo"; "Keep anyway" saves, dismissing cancels
- A-16 — PDF attach — new document → `id:front-pdf` → pick the multi-page PDF — "Thumbnail" label, `id:pdf-pages`, page 2 set as back
- A-17 — PDF back toggle — `id:back-remove` then `id:pdf-back-page` — back removed, then restored
- A-18 — PDF errors — pick the password PDF, then the >10 MB PDF — "That PDF is password protected…", "That PDF is over 10 MB…"
- A-19 — photo replaces PDF — pick a photo for the front after A-16 — PDF page picker gone
- A-20 — duplicate — add a document with the same name and tag as an existing one — "Replace <name>?"; "Keep both" makes two, "Replace" keeps one in the same place
- A-21 — edit existing — `link edit/<id>`, change the name, `id:save-card` ("Save changes") — new name on home and detail
- A-22 — bad ids — `link card/xyz`, `link edit/xyz`, `link note/xyz` — "This document no longer exists." / "This note is no longer available."
- A-23 — take photo [manual] — `id:front-camera` — system camera; capture needs the emulator's virtual scene

## H — Home
Needs 3+ documents with tags, a folder, a person, one expiring within 30 days and one PDF.
- H-01 — list view — `id:view-list` — "All documents", "N documents", rows `id:row-*`
- H-02 — stack view — `id:view-stack`; `swipe left` — next document; dots move; `id:stack-tip` shows once, `id:stack-tip-dismiss` hides it for good
- H-03 — stack flip / blur — `id:flip-card` on a document with a back; `id:blur-card` — back shown; preview blurred and saved
- H-04 — gallery view — `id:view-gallery` — tiles `id:grid-*`, `id:gallery-tip`; view choice survives an app restart
- H-05 — sort and filter — `id:sort-chip` → `id:sort-expiry`, `id:sort-added`, `id:filter-expiring` — order changes; only expiring documents; "Nothing expires in the next 30 days." when none
- H-06 — search title — `id:search` type part of a name — matching row only
- H-07 — search details text — type a word that only appears in a document's scanned text — it shows after a short pause
- H-08 — search PDF page 3+ — a word only on page 3 of the PDF — PDF document found
- H-09 — search punctuation — digits of a number printed with dashes — found
- H-10 — no match / clear — nonsense query; `desc:Clear search` — "No documents."; full list back
- H-11 — tag / person / folder chips — `id:tag-chip-travel`, `id:person-filter-*`, `id:folder-filter-*`, `id:tag-chip-all` — list narrows each time and resets
- H-12 — pinned section — pin a document (D-08) and a note (N-07) — `id:pinned-section` with `id:pinned-*` and `id:pinned-note-*`
- H-13 — selection — gallery: `tap id:grid-* --long` — `id:selection-bar` "1 selected"; `key back` clears it
- H-14 — batch pin / tag — select 2 → `id:selection-pin`; `id:selection-tags` → `id:tag-input` → `id:tag-sheet-apply` — both pinned, both tagged
- H-15 — batch read again — select 2 → `id:selection-recreate` — "Reading 1 of 2…", then "Read text again" alert
- H-16 — batch share ID — select an ID-tagged document → `id:selection-share` — "Share an ID?"; Share opens the share sheet (`key back` out)
- H-17 — batch delete + undo — select 2 → `id:selection-delete` — "Deleted 2 documents", `id:undo-button` restores both
- H-18 — appearance — `id:appearance-toggle` ×3 — System → Light → Dark; screenshot each; survives a restart
- H-19 — backfill progress [manual] — needs documents saved without text; if `id:backfill-progress` shows, `id:backfill-cancel` hides it
- H-20 — FAB tooltip — `tap id:add-card --long` — tooltip shows

## D — Document detail
- D-01 — open — tap a row — name, expiry label, tags; `id:card-expiry-alert` on the expiring one; "Belongs to …" with a person
- D-02 — details view — `id:view-details` — `id:card-markdown` has the scanned text; PDF shows text per page
- D-03 — remove tag + undo — `id:tag-*-remove` — "Removed tag …", `id:undo-button` puts it back
- D-04 — add tag — `id:add-tag` → sheet → apply — new pill
- D-05 — read text again — `id:recreate-markdown` — "Reading the document again…", then text back
- D-06 — linked note — `id:add-linked-note` → write → `id:note-done` — `id:linked-note-*` listed; `id:link-existing-note` → `id:link-note-*` links another
- D-07 — share ID warning — on an ID document `id:share-card` — "Share this ID?"; Cancel stays
- D-08 — pin — `id:pin-card` — label becomes "Unpin from home"
- D-09 — more sheet — `id:more-card` — `id:card-more-sheet` with `id:export-pdf`, `id:edit-card`, `id:delete-card`; `id:card-more-sheet-cancel` closes
- D-10 — export PDF — `id:export-pdf` — share sheet with a PDF
- D-11 — full screen — `id:show-to-staff` — `id:staff-view`; `key back` does nothing; tap `id:finish-staff` → "Press and hold to finish."; `tap id:finish-staff --long` exits
- D-12 — full screen PDF — on the PDF document — `id:pdf-pager`; `swipe left` pages
- D-13 — quick-action style link — `link card/<id>?show=1` — opens straight into full screen
- D-14 — landscape — `adb shell settings put system user_rotation 1` (with auto-rotate off: `accelerometer_rotation 0`) — header hidden, sides side by side; rotate back to 0
- D-15 — delete + undo — `id:more-card` → `id:delete-card` — home with "Deleted <name>"; `id:undo-button` restores. Delete it again and leave it deleted for R-01

## N — Notes
- N-01 — new note — `id:tab-notes` → `id:add-note` → `id:note-title`, `id:note-body` — `id:note-status` "Saved on this device"
- N-02 — empty note discarded — `id:add-note` → `id:note-done` with nothing typed — no new row
- N-03 — checklist — body `- [ ] milk` — row has a checkbox; tapping it toggles
- N-04 — tags before text — on a new note tap add tag — "Write a title or note before adding tags."
- N-05 — link document — pick a document chip — the note shows on that document's details (D-06)
- N-06 — reminder — "Remind me" → time in the past — "Choose a date and time in the future."; a future time shows "Reminder: …" and "Remove reminder"
- N-07 — pin — `id:note-pin` — shows on home pinned section
- N-08 — share / copy — `id:note-share` → "Share this note?"; `id:note-copy` → "Copy this text?" → "Text copied"
- N-09 — search — `id:notes-search` — match; nonsense → "No notes match your search."
- N-10 — delete — `id:note-delete` — "Delete this note?" → Delete; row gone (no undo)

## F — Folders, tags, people
- F-01 — new folder — `id:tab-folders` → `id:new-folder` → name → Create — row with "0 documents"; blank and duplicate names show their errors
- F-02 — rename folder — `id:rename-*` — new name shown
- F-03 — delete folder — `id:delete-*` — "Delete “X”?"; documents stay, now in no folder
- F-04 — tags screen — `id:tab-settings` → `id:manage-tags` — rows "N documents · M notes"; `id:delete-tag-*` → "Delete “tag”?" → tag gone from documents
- F-05 — people — `id:manage-people` → `id:add-person` → blank → "Enter a name of up to 60 characters."; valid → row; `id:rename-person-*`; `id:delete-person-*` → "Remove X?"

## R — Recently deleted
- R-01 — list — `id:recently-deleted` — `id:deleted-*` with "30 days left"
- R-02 — restore — `id:restore-*` — back on home as it was (tags, folder, pin)
- R-03 — delete now — `id:delete-now-*` → `id:confirm-sheet`; `id:confirm-cancel` keeps it; `id:confirm-action` erases it
- R-04 — empty all — delete two documents, then `id:recently-deleted-empty-all` → "Empty" — `id:recently-deleted-empty`

## S — Settings toggles
- S-01 — warn before sharing an ID off — `id:warn-id-share-switch` off, repeat D-07 — no alert, straight to share sheet; turn back on
- S-02 — show stack view off — `id:show-stack-switch` — home has no view switcher, gallery only
- S-03 — vertical swipe — `id:stack-vertical-switch` on — stack moves with `swipe up`; tip text changes
- S-04 — folder filter / manage folders shortcut off — `id:home-folder-filter-switch`, `id:home-manage-folders-switch` — home chips / button hidden
- S-05 — privacy — "Privacy policy" — `/privacy` text
- S-06 — problems — `id:no-crash` "No unexpected closes recorded."
- S-07 — check for updates — `id:check-update` — "Doc Keeper is up to date." or "Version X is available."; offline (`adb shell svc wifi disable; svc data disable`) → `id:update-failed`; re-enable network after. Absent on non-GitHub builds: record `blocked`

## B — Backup
- B-01 — export validation — Settings "Export backup" → `id:export-passphrase` "ab" → "Use at least 3 characters."; mismatch → "The passphrases don't match."
- B-02 — export save — matching passphrase → `id:export-run` → save in Downloads — "Saved DocKeeper-backup-….cardholder"; Settings shows "Last backup: …"
- B-03 — send instead — `id:export-send` — share sheet; last backup date unchanged
- B-04 — verify — "Verify backup" → `id:verify-pick` → the file → `id:verify-passphrase` → `id:verify-run` — `id:verify-summary` "Backup verified: …"; wrong passphrase → `id:verify-error`
- B-05 — import not a backup — "Import backup" → `id:import-pick` a PDF — "That file isn't a Doc Keeper backup."
- B-06 — import wrong passphrase — the backup, bad passphrase → `id:import-unlock` — "Wrong passphrase, or the file is damaged."
- B-07 — import merge — right passphrase → `id:import-summary` → "Merge with my data" — "Added 0 documents… Skipped …"
- B-08 — import replace — delete a document first, then "Replace my data" → "Replace all documents and notes?" → Replace — the deleted document is back
- B-09 — automatic backup — "Automatic backup" → `id:auto-weekly` → passphrases → `id:auto-enable` → pick a folder — "Automatic backup is on…"; `id:auto-disable` turns it off

## X — Ways in from outside the app
- X-01 — quick actions — `adb shell cmd shortcut get-shortcuts --user 0 com.hamza.cardholder` lists "New note", "Add document", "Show <pinned name>"; launch one by long-pressing the launcher icon — target screen opens
- X-02 — share in one image — `adb shell am start -a android.intent.action.SEND -t image/jpeg --eu android.intent.extra.STREAM content://media/external/images/media/<id> com.hamza.cardholder` (find ids with `adb shell content query --uri content://media/external/images/media --projection _id:_display_name`) — crop UI, then New document with that front
- X-03 — share in two images — `SEND_MULTIPLE` with two streams — front and back filled
- X-04 — share in a PDF — `SEND` `-t application/pdf` with a Downloads file uri — New document with the PDF
- X-05 — share in three images — `SEND_MULTIPLE` ×3 — "Share one photo for the front, two for the front and back, or one PDF."
- X-06 — share in text — `am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'hello' com.hamza.cardholder` — `/note/new` with "hello"
- X-07 — process text — `am start -a android.intent.action.PROCESS_TEXT -t text/plain --es android.intent.extra.PROCESS_TEXT 'hello' com.hamza.cardholder` — new note with the text
- X-08 — widget [manual] — add "Pinned cards" widget to the launcher — pinned documents, "+" opens Add; with app lock on "Locked. Tap to open."
- X-09 — expiry reminder [manual] — needs the clock moved to 09:00 on a reminder day (`adb root` + `adb shell date`, only on non-Play images) — "<name> expires in N days"; tap opens the document

## L — App lock
Needs a screen PIN and fingerprint on the emulator: `adb shell locksettings set-pin 1111`, then enrol in Settings › Security using `adb -e emu finger touch 1`.
- L-01 — no device lock — before setting the PIN, `id:app-lock-switch` — "Set a passcode, Face ID or fingerprint on this phone first…"
- L-02 — turn on — `id:app-lock-switch` → `adb -e emu finger touch 1` — switch on
- L-03 — cold start locked — `am force-stop`, relaunch — `id:app-lock` "Doc Keeper is locked"; fingerprint → home
- L-04 — cancel unlock — relaunch, `key back` on the prompt — cover stays; `id:unlock` asks again
- L-05 — short background — `key home`, return within 10 s — no lock
- L-06 — long background — `key home`, wait 35 s, return — locked
- L-07 — share in while locked — X-06 while locked — note opens only after unlock
- L-08 — turn off — `id:app-lock-switch` → fingerprint — off; then `adb shell locksettings clear --old 1111`

## P — Free limit and paywall
Run last: it needs 10 documents. Import a backup holding 10+ or add plain photos quickly.
- P-01 — counter — Settings — "10 of 10 free documents used"
- P-02 — FAB at limit — `id:add-card` — `/paywall` "Unlimited documents"
- P-03 — save at limit — `link edit/new`, add a photo, `id:save-card` — paywall
- P-04 — restore at limit — `id:restore-*` in Recently deleted — paywall
- P-05 — share in at limit — X-02 — paywall
- P-06 — store — `id:purchase-price` — `id:purchase-message` "Purchases need a supported app store…" on emulators without Play; with Play, "Unlock for <price>". Never complete a purchase
- P-07 — restore purchases — `id:restore-purchases` — "No previous purchase was found…" or store message
- P-08 — existing documents still usable — open and edit one at the limit — saves fine

## C — Crash and boot errors [manual]
- C-01 — JS error screen — needs a thrown render error — "Something went wrong" with `id:crash-retry`, `id:crash-report`
- C-02 — crash prompt — after C-01, relaunch — "Doc Keeper closed unexpectedly"
- C-03 — orphaned keys — needs the key in secure storage removed (`run-as com.hamza.cardholder` on a debug build) — "These documents can't be opened" with "Import backup" / "Start fresh"
- C-04 — storage full — "Your phone is out of storage…" on save
