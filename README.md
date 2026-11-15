# Doc Keeper

**Doc Keeper is a free, offline document vault for Android. It keeps photos and PDFs of your IDs,
licences, insurance cards, certificates and contracts encrypted on your phone, with no account and
no server.**

[Website](https://dork7.github.io/cardholder/) ·
[Download the latest APK](https://github.com/dork7/cardholder/releases/latest) ·
[Privacy policy](https://dork7.github.io/cardholder/privacy.html)

## What it does

- **Keeps documents as photos or PDFs.** A photo document has a front and an optional back. A PDF is
  kept whole, up to 10 MB.
- **Encrypts everything on the phone.** Photos, PDFs and details are sealed with AES-256-GCM. The
  key is random, stays in the Android Keystore and never leaves the phone.
- **Works without the internet.** There are no accounts, no servers, no analytics and no ads.
- **Finds a document by what is written on it.** The text on each photo or PDF is read on the phone,
  so search matches names, numbers and other printed words.
- **Reminds you before a document expires.** A daily notification starts 14 days before the expiry
  date; you can change the number of days per document.
- **Shows a document full screen** at full brightness, with pinch to zoom, for showing at a counter.
- **Takes documents from other apps.** Share one or two photos, or one PDF, to Doc Keeper from the
  gallery or a files app.
- **Shares a document** through Android's share sheet as a photo or a PDF.
- **Groups documents with tags** such as ID, Insurance, Membership, or any you name.
- **Locks with your fingerprint, face or passcode** if you turn on app lock.
- **Hides previews.** A document's pictures can be blurred on the home screen.
- **Backs up to one encrypted file** protected by a passphrase you choose. You decide where to keep
  it.
- **Has a home screen widget** that lists pinned documents by name, never their pictures.

## Install

Doc Keeper needs Android 10 or later.

1. Open the [latest release](https://github.com/dork7/cardholder/releases/latest) on your phone.
2. Download `DocKeeper-<version>.apk` and open it.
3. Android asks you to allow installs from your browser or files app. Allow it and tap Install.

To update later, open **Settings → App updates → Check for updates** in the app. The update is
downloaded from this repository's releases and checked against its SHA-256 before Android installs
it. Your documents stay on the phone through the update.

Doc Keeper is not on Google Play or the App Store yet.

## Price

Ten documents are free. Unlimited documents is a one-time purchase through the app store, not a
subscription. Documents you already have are never locked.

## Questions

### Does Doc Keeper upload my documents?

No. Documents are stored only on the phone. Doc Keeper has no accounts and no servers. It connects to
the internet only when you tap Check for updates, or when you choose to see the price, buy or
restore a purchase.

### How are documents protected?

Every photo, PDF and detail is encrypted with AES-256-GCM using a random key kept in the Android
Keystore. Documents are left out of Google's device backups. With app lock on, the app asks for your
fingerprint, face or passcode when it opens.

### What happens if I lose or change my phone?

Documents exist only on the phone, so export a backup first: **Settings → Export backup**. The backup is one
file encrypted with a passphrase you choose. Import it on the new phone with the same passphrase. A
forgotten passphrase cannot be recovered.

### Does Doc Keeper use AI or a cloud service to read my documents?

No. Text is read from photos and PDFs on the phone itself. The app has no language model and sends
nothing to a cloud service.

### Which kinds of documents can I keep?

Anything you can photograph or have as a PDF: national IDs, passports, driving licences, residency
and insurance cards, membership cards, certificates, policies, contracts and receipts.

### Does Doc Keeper work on iPhone?

Not yet. The app is written to run on both, but only the Android version is released.

### Does Doc Keeper collect analytics or crash reports?

No. If the app closes unexpectedly it keeps a short technical record on the phone and asks whether
you want to send it. Nothing is sent unless you choose to, and the record never contains a document.

## For developers

Doc Keeper is an Expo (React Native) app written in TypeScript.

```sh
npm install
npm run typecheck
npm test
npx expo run:android
```

- [`docs/design.md`](docs/design.md): what the app does and why
- [`docs/architecture.md`](docs/architecture.md): how the code is organised
- [`docs/adr/`](docs/adr): decisions and their reasons
- [`GLOSSARY.md`](GLOSSARY.md): the words the project uses
- `scripts/release-android.sh v1.2.3`: build a signed APK and publish it as a GitHub release
