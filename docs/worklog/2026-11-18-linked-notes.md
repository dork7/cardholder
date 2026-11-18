# Work log: document links for notes (#41)

- A note can link to one current document. The document's Details view shows linked notes and offers Add note and Link existing note.
- The note editor shows the linked document and can change or remove the link.
- Deleting a document clears its note links while keeping the notes. Backups preserve valid links and discard dangling ones.
- Verified with note-store deletion and encrypted backup round-trip tests; full suite: 899 tests passing.
- Review fix: document deletion and backup import share the note write queue with editors. Backup merge clears links whose documents are only in Recently deleted. Added concurrent save/delete and merge regression tests.
