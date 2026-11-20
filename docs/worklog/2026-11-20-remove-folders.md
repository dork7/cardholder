# Remove folders (#50)

Removed the Folders tab and management screen, Home filter and shortcuts, editor picker and photo suggestions, and folder settings and copy. Tags and people remain separate.

On upgrade, a transaction converts each document folder name to a tag, including recently deleted documents. Same name tags are deduplicated case insensitively. Documents at eight tags can retain a ninth migrated tag, and 30 character legacy names remain accepted on edit and backup. New tags retain the standard limits. Older backups are converted during import; new exports omit folders.

Verification: TypeScript and full Jest suite. Android build and device behavior to be recorded in release verification.
