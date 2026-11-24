# Work log: profile backups (#78)

- Profile details are parsed from encrypted backups alongside their document and card image. Unknown templates or malformed profile details are dropped while the document still restores.
- Replace restores profiles and their card pictures. Merge maps incoming People by name or ID and skips an incoming profile when that Person already has one. Older backups without profiles still use the existing path.
- Added backup service tests for encrypted export and replace, merge deduplication, and malformed profile details. Existing old-backup tests cover backward compatibility.
- Verified with TypeScript typecheck and the full Jest suite.
