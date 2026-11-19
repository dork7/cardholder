# Work log: backup health and verification (#56)

- Settings now reports changes to documents as well as notes since the most recent successful backup. Existing stale-backup and automatic-backup failure messages remain, and Settings links to Verify backup.
- Verify backup asks for a saved `.cardholder` file and its passphrase, authenticates and validates through the same decoder used for restore, then reports its date and document/note counts. It does not receive store or settings handles and cannot import data.
- The document picker's temporary cache copy is removed after reading. The passphrase is cleared from screen state after each attempt; decrypted contents are reduced to a summary and not written to a file.
- Focused backup service and screen tests pass (39 tests), including successful verification, wrong passphrase/corruption errors, and unchanged vault contents. TypeScript typecheck passes. Device verification remains outstanding.
