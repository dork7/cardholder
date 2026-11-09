# Everything about a document is encrypted, and search runs in memory

SQLite stores only what is needed for ordering and grouping: a document's id, pinned flag, position,
folder id and timestamps, plus one encrypted JSON payload (`src/storage/sqlDb.ts`). The name,
category, dates, tags and document text all live inside that payload. Folder names are sealed the
same way. Photos, thumbnails and PDFs are encrypted blobs on disk. So search, filtering and sorting
decrypt into memory and work there. We encrypt everything because deciding which fields are
"sensitive" is a guess that ends up wrong for identity papers. A person keeps tens of documents, not
thousands, so in-memory search stays instant.

## Considered Options

- **Encrypt only images and "sensitive" fields, query the rest in SQL:** faster queries, but names
  and categories ("Dad – Passport") would show who and what the user keeps. Rejected.

## Consequences

- New content (document text, reminders, tags) goes into the payload. A plain SQL column is only for
  ordering or grouping by opaque ids, never for anything the user wrote or the app read off a document.
- If collections ever grow to thousands of documents, search will need a different design, for
  example an encrypted index.
