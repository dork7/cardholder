# Work log: all-page PDF search (#54)

- PDFs now keep OCR text for every page in the encrypted document payload. The existing front/back fields remain for compatibility with older records and photo documents.
- Details (.md) lists every PDF page in order. Home's Details search can find a word on page 3 or later without a plaintext search index.
- Recreate .md renders and reads PDF pages one at a time. If the document changes while reading, the job stops and does not overwrite the edit. A newly saved PDF starts background indexing; older PDFs are backfilled on launch.
- Home shows background backfill progress and a Cancel action. Cancellation stops before the next PDF page or document and leaves incomplete documents eligible for a later launch.
- Backup export/import preserves page text, while older backups without it remain readable and eligible for background backfill.
- Focused card, editor, backup, Markdown, and search tests pass (161 tests); TypeScript typecheck passes. Android device performance and OCR accuracy on multi-page PDFs remain unverified because no device or SDK is available here.
