# The data key never leaves the phone, so the passphrase file is the only backup

Every document is sealed with AES-256-GCM under one random key kept in the Keychain/Keystore as
`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (`src/crypto/secureVault.ts`). It is never synced to iCloud
Keychain or restored onto another phone, and Android device backup is off (`allowBackup: false`).
The only way to move documents to a new phone is the passphrase-encrypted `.cardholder` export
(PBKDF2-SHA256 key, AES-GCM, `src/backup/backupFile.ts`). We chose this because "nothing leaves your
phone" has to hold for the data key as well as the documents. There are no accounts and no servers to
hold a recovery key.

## Considered Options

- **Let the key sync through iCloud Keychain / Google backup:** a new phone would just work, but the
  key would leave the device and the platform account would become the way in. Rejected.

## Consequences

- A lost or replaced phone without a recent export means lost documents. A forgotten passphrase
  cannot be recovered. The app says both plainly.
- iOS device backups may still copy the encrypted files. They are useless without the key. At launch a
  failed key-check shows a recovery screen ("import your backup" or "start fresh") instead of crashing.
