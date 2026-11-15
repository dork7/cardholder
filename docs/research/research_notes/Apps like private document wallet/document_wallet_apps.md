# Consumer document wallet / ID vault / card holder apps (iOS and Android), state as of November 2026

Reading notes for the writer:
- Almost every feature claim below is the vendor's own (store listing, website, privacy policy). None is independently audited unless stated. App Store privacy labels are developer-declared and not verified by Apple.
- "Not mentioned" means the page I read did not mention it; it does not prove the feature is absent.
- App Store pages show version dates without a year ("Jun 23"); I report them as shown and flag the year as unverified.
- Google Play pages could not be read by the fetch tool (content truncated), so Play download counts, ratings, Data safety sections and Play reviews are mostly missing. Where I have Play numbers they come from the third-party tracker AppGoblin.
- Concept feature list used for the "does / does not" comparison: (1) offline-first, (2) on-device encryption with device-only key, (3) on-device OCR, (4) suggested name/expiry/category, (5) expiry reminders, (6) folders, tags, pins, (7) full-screen "show to staff" mode, (8) export card as PDF, (9) passphrase-encrypted backup file with no cloud account, (10) home-screen widget, (11) no analytics, no account.

## Which apps (at least 12-15, including indie and open-source ones) are the closest matches?

### Takeaway
The closest matches are a wave of small 2025-2026 indie apps (Travel Document Vault, DocHarbor, Document Expiry Reminder, Docarus, Proof Pocket, Keevan) that each cover roughly 6-8 of the 11 concept features; none that I found covers all 11, and the gaps cluster around tags/pins, home-screen widget, and the combination of "no analytics at all" with OCR-based suggestions. The established names (Folio, Pass2U, Klarna/Stocard, Ente Locker, Catima) each miss the core in a different way: account or cloud, ads and trackers, loyalty-barcodes only, or no expiry reminders.

### Cited Findings

Tier A: closest matches (offline, no account, document/ID focus)

1. Travel Document Vault (iOS + Android, indie, developer Mustafa Hafeez)
- Platforms iOS and Android; documents stored on device by default; developer says it runs no servers holding documents; no account for the local vault — [TDV FAQ](https://traveldocumentvault.com/faq/)
- Stored images/PDFs encrypted on disk; Pro cloud backup (user's own iCloud or Google Drive) is encrypted on device with AES-256-GCM using a key derived from a recovery code — [TDV FAQ](https://traveldocumentvault.com/faq/)
- On-device OCR reads expiry dates; passport scanning reads the MRZ to fill expiry date and issuing country; the user confirms or edits — [TDV FAQ](https://traveldocumentvault.com/faq/), [TDV Features](https://traveldocumentvault.com/features/)
- Expiry reminders: passports start 8 months out, stepping down to 1 week and expiry day; visas, national IDs and travel insurance start 3 months out; also fires the day after and a week after expiry; Pro can change the start point — [TDV FAQ](https://traveldocumentvault.com/faq/). Other pages of the same site give different schedules (6 months / 3 months / 6 weeks / expiry day) — [TDV site](https://traveldocumentvault.com/); treat exact timings as inconsistent.
- Organisation: profiles per family member, trips (Pro), colour-coding by status, filters by person, type and expiry status; no folders or tags mentioned — [TDV Features](https://traveldocumentvault.com/features/)
- "Show to Another Person" protected viewing mode with screen-capture protection; single-document PDF export; Trip PDF export (Pro) — [TDV Features](https://traveldocumentvault.com/features/)
- Free export of a password-protected encrypted .tdvault file; automatic local backups — [TDV FAQ](https://traveldocumentvault.com/faq/)
- Says no analytics SDKs, ad networks or tracking; Sentry crash reporting off by default and opt-in — [TDV FAQ](https://traveldocumentvault.com/faq/)
- Pricing: free tier 1 profile and up to 5 documents; Pro is one-time, no subscription — [TDV FAQ](https://traveldocumentvault.com/faq/). A search summary gave the Pro price as $9.99 one-time, sourced to its Product Hunt page — [Product Hunt](https://www.producthunt.com/products/travel-document-vault) (price not confirmed on the vendor's own page).
- Against the concept: has 1, 2, 3, 4 (expiry and country only), 5, 7, 8, 9, 11 (mostly). Missing or not mentioned: folders/tags/pins (6), widget (10). Scope is travel documents, not loyalty cards or contracts.

2. DocHarbor: Document Vault (iOS/iPadOS/Mac/Vision, developer Mark Opanasiuk)
- Local-first, no account, no company servers; files protected by iOS Data Protection at rest (no app-level encryption claimed); Face ID / Touch ID / passcode lock free — [App Store](https://apps.apple.com/app/id6786043565)
- On-device Apple Vision OCR suggests titles, categories, owners and dates which the user confirms; recognition is "English-first"; OCR search in free tier — [App Store](https://apps.apple.com/app/id6786043565)
- Expiry reminders at 6 months, 3 months, 1 month, 1 week; "Expiring" dashboard; free tier limits reminders to 2 documents — [App Store](https://apps.apple.com/app/id6786043565)
- Folders by person or object plus categories; custom categories and fields need Pro; tags not mentioned — [App Store](https://apps.apple.com/app/id6786043565)
- Widgets: Quick Add (free) and Expiring Soon (Pro); Siri, Shortcuts and Spotlight support — [App Store](https://apps.apple.com/app/id6786043565)
- Whole-vault export as .zip with summary index, free and offline (the listing does not say the zip is encrypted) — [App Store](https://apps.apple.com/app/id6786043565)
- Pricing: Pro Monthly $3.99, Pro Annual $24.99, Pro Lifetime $49.99; no ratings yet — [App Store](https://apps.apple.com/app/id6786043565)
- Privacy label: "Data Not Linked to You" including Usage Data and Diagnostics for Analytics — [App Store](https://apps.apple.com/app/id6786043565)
- Against the concept: has 1, 3, 4, 5, 6 (folders, no tags), 10, no account. Missing or weaker: own encryption with device-only key (2, relies on iOS Data Protection), encrypted backup (9, plain zip as far as stated), no analytics (11, declares analytics usage data), full-screen show mode (7) and PDF export (8) not mentioned. iOS only.

3. Document Expiry Reminder (iOS/iPadOS, developer MO NOUR)
- "No accounts, no sync, no servers"; privacy label "Data Not Collected" — [App Store](https://apps.apple.com/us/app/id6756968613)
- AES-256-GCM encryption of documents and attachments on device; Face ID / Touch ID lock — [App Store](https://apps.apple.com/us/app/id6756968613)
- Expiry dates extracted with on-device Apple Vision OCR, no cloud processing; camera scanning — [App Store](https://apps.apple.com/us/app/id6756968613)
- Local notification reminders; document types include passports, visas, residence permits, IDs, driving licences, insurance, contracts, certificates — [App Store](https://apps.apple.com/us/app/id6756968613)
- Encrypted backup files, CSV export, PDF reports — [App Store](https://apps.apple.com/us/app/id6756968613)
- Pricing: free with IAP; Premium Lifetime $39.99; Family $69.99; rating 5.0 from 1 rating; version 1.7 dated "Jul 7" (year not shown); requires iOS 17 — [App Store](https://apps.apple.com/us/app/id6756968613)
- Against the concept: has 1, 2, 3, 4 (expiry only), 5, 9, 11. Not mentioned: folders/tags/pins, full-screen show mode, widget; "PDF reports" is not clearly per-card PDF export. iOS only. It is a reminder tracker first, wallet second.

4. Docarus: Documents Organizer (iOS, developer Aliaksandr Dudzinski)
- 100% offline, no cloud sync, no servers, no account; privacy label "Data Not Collected" — [App Store](https://apps.apple.com/us/app/id6761782909)
- AES-256 encrypted storage, Face ID; hidden documents; password-protected PDF import — [App Store](https://apps.apple.com/us/app/id6761782909)
- Text/data recognition (release notes cite improved recognition accuracy in 2.4); NFC chip reading for passports and IDs; barcode/QR recognition — [App Store](https://apps.apple.com/us/app/id6761782909)
- Expiry reminders and encrypted backups are Pro features; categories (unlimited in Pro); free plan limited to 2 documents — [App Store](https://apps.apple.com/us/app/id6761782909)
- Pricing: Pro $6.99 monthly, $29.99 yearly, $14.99 lifetime (as listed; lifetime cheaper than yearly); no ratings; version 2.4 dated "May 28" (year not shown) — [App Store](https://apps.apple.com/us/app/id6761782909)
- Against the concept: has 1, 2, 3, 5 (paid), 9 (paid), 11. Not mentioned: tags/pins, show mode, PDF export, widget. iOS only.

5. Proof Pocket (iOS 16+ and Android 10+, developer Karol Burdzinski)
- On-device vault, "We don't operate a server holding your vault", "no account system"; master password plus Face ID / Touch ID — [proofpocket.com](https://proofpocket.com/)
- Expiry tracking with reminders 90, 30, 7 or 1 day before; "Cases" to group documents by trip, move or person; categories; search and filters — [App Store](https://apps.apple.com/us/app/proof-pocket/id6753912757), [proofpocket.com](https://proofpocket.com/)
- Encrypted backup file to iCloud Drive, Google Drive or Files (three most recent kept); phone-to-phone transfer over local Wi-Fi via QR; password-protected .ppcase case sharing (Pro) — [proofpocket.com](https://proofpocket.com/), [App Store](https://apps.apple.com/us/app/proof-pocket/id6753912757)
- OCR not mentioned on either page; encryption algorithm not named — [proofpocket.com](https://proofpocket.com/)
- Pricing: full unlock $39.99 one-time or $14.99 yearly; no ratings yet; version 1.7.1 dated "Sep 28" (copyright 2026) — [App Store](https://apps.apple.com/us/app/proof-pocket/id6753912757)
- Privacy label: Diagnostics (crash, performance), not linked to user — [App Store](https://apps.apple.com/us/app/proof-pocket/id6753912757)
- Against the concept: has 1, 2, 5, 9, no account. Missing or not mentioned: OCR (3, 4), tags/pins, show mode, PDF export, widget; collects diagnostics.

6. Keevan, listed as "Document Vault: ID Card Wallet" (Android, developer Sivakumar Reddy Malapati; formerly "Virtual Wallet")
- Encrypted storage (Android Keystore) for passports, IDs, driving licences, insurance, bank cards; camera scan with edge detection, gallery and file import; offline — [AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet)
- Expiry reminder 30 days before; phone lock or separate 6-digit app PIN; auto-lock; screenshot and screen-recording blocking — [AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet)
- Password-protected backups and a daily "Emergency Backup"; no account, no ads, no subscription; first 5 items free then a one-time payment — [AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet)
- About 4K+ installs, no rating yet, last updated 30 October 2026 — [AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet); Play listing — [Google Play](https://play.google.com/store/apps/details?id=com.siva.virtualWallet&hl=en_US)
- Against the concept: has 1, 2, 5, 9, 11 (as claimed). OCR not mentioned; folders/tags, show mode, PDF export, widget not mentioned.

7. LibreCrate (Android, open source, F-Droid, developer David Neurieder)
- Private offline vault for PDFs, ebooks, boarding passes, wallet cards, photos, notes; files encrypted on device with a user-set password; never connects to the internet; no account, no tracking, no ads — [F-Droid](https://f-droid.org/en/packages/com.librecrate.app/)
- Backup and restore of the whole vault as one encrypted file; built-in PDF reader; search inside document text; sorting and filtering — [F-Droid](https://f-droid.org/en/packages/com.librecrate.app/)
- AGPL-3.0-only; source at github.com/DavidNeurieder/LibreCrate; version 0.5.6 added 3 October 2026 (pre-1.0) — [F-Droid](https://f-droid.org/en/packages/com.librecrate.app/)
- Against the concept: has 1, 2, 9, 11. Not mentioned: OCR, expiry reminders, name/expiry suggestions, show mode, widget. General document library, not ID-specific.

Tier B: established or well-known apps that overlap but depart from the concept

8. Folio: Digital Wallet App (iOS + Android, Folio Technologies Ltd)
- Free, no IAP listed; 4.7 from 6.9K ratings on the US App Store; version 3.2.8 dated "Jun 23" (year not shown) — [App Store](https://apps.apple.com/us/app/id1266382717)
- Built-in scanner for cards and documents; expiry reminders for passports, driving licences and IDs; travel timeline with tickets and sharing (v3.0.0, June 2025); passkeys (v3.2.1) — [App Store](https://apps.apple.com/us/app/id1266382717)
- Backup and restore on another device needs an account — [App Store](https://apps.apple.com/us/app/id1266382717)
- Privacy policy (updated 17 December 2025): "Your personal documents are encrypted and stored only in your wallet on your device"; "We store only cryptographic hashes on our servers"; "zero-knowledge architecture"; recovery code created at registration; may collect a selfie for biometric verification, retained up to three years; collects "anonymized data about how you interact with the app" — [Folio privacy policy](https://folio.id/en/privacy/)
- App Store privacy label: "Data Used to Track You: Identifiers"; Device ID used for third-party advertising and analytics; Usage Data for analytics; User Content linked to user — [App Store](https://apps.apple.com/us/app/id1266382717)
- Vendor site also describes sync across devices and shared family folders — [folio.id ID wallet page](https://folio.id/id-wallet-app/). This sits awkwardly beside "stored only on your device"; the policy does not explain how backup works.
- Against the concept: has 5, scanning, encryption claim. Departs on account (needed for backup), tracking identifiers and analytics (11), identity/selfie verification. OCR suggestions, tags/pins, widget, passphrase backup file: not mentioned.

9. Ente Locker (iOS, Android, web; open source, Ente)
- End-to-end encrypted vault for IDs, personal documents, financial records, credentials, notes; encrypted on device before upload; architecture and source audited by Cure53; AGPL-3.0; F-Droid version 1.0.11 added 29 October 2026 — [F-Droid](https://f-droid.org/en/packages/io.ente.locker.fdroid/)
- Collections, title search, sharing collections with other Ente users, trusted contacts / digital inheritance — [Ente help](https://ente.com/help/locker/)
- Free tier limited to 100 items; an Ente Photos subscription raises it to 1,000 items and 10 GB — [Ente help](https://ente.com/help/locker/)
- Launch reported February 2026 — [AlternativeTo news](https://alternativeto.net/news/2026/2/ente-launches-locker-a-new-open-source-secure-vault-with-end-to-end-encryption)
- IzzyOnDroid flags it NonFreeNet (non-libre sync server) per a search summary — [IzzyOnDroid](https://apt.izzysoft.de/fdroid/index/apk/io.ente.locker.fdroid?repo=main)
- No source I found mentions expiry reminders or OCR.
- Against the concept: strong encryption and open source, but cloud-synced with an Ente account (account requirement inferred from the sync/sharing model; the F-Droid page does not state it). Not offline-only.

10. Catima (Android, open source loyalty card wallet)
- Stores barcodes, memberships, loyalty programmes, coupons and tickets; no Internet permission, no ads; manual code entry; backup and transfer; share cards; Wear OS and Gadgetbridge sync; 40+ languages; GPL-3.0-or-later; version 2.45.2 added 25 October 2026 — [F-Droid](https://f-droid.org/en/packages/me.hackerchick.catima/)
- 1.7k GitHub stars; supports pkpass files; works fully offline; imports from FidMe, Loyalty Card Keychain, Voucher Vault — [GitHub](https://github.com/CatimaLoyalty/Android)
- Release notes mention a list widget and a full-screen card view (2.45.x notes: list widget fix; full-screen view avoids the camera inset) — [F-Droid](https://f-droid.org/en/packages/me.hackerchick.catima/)
- Neither page claims encryption at rest — [GitHub](https://github.com/CatimaLoyalty/Android)
- Against the concept: has 1, 7, 10, 11, plain backup. Missing: encryption (2), OCR (3, 4), document/PDF storage. It is a barcode wallet, not a document vault.

11. Pass2U Wallet (iOS + Android, MicroMacro Mobile Inc.)
- Turns loyalty, membership, store, gift and stamp cards into Apple Wallet passes — [App Store](https://apps.apple.com/us/app/pass2u-wallet-create-and-put-cards-into-wallet/id1142473931)
- Android: about 5.6M installs, 3.96 stars from 19K ratings, last updated 24 October 2026, free with ads and IAP; detected SDKs include Google and Facebook ad networks, AdMob, Firebase and Mixpanel — [AppGoblin](https://appgoblin.info/apps/com.passesalliance.wallet)
- Backup via Google Drive on Android and iCloud Wallet on iOS, per a search summary of its listing — [App Store](https://apps.apple.com/us/app/pass2u-wallet-create-and-put-cards-into-wallet/id1142473931)
- Against the concept: card passes only, ad-supported with trackers, cloud backup. Not a document vault.

12. Stocard, now inside the Klarna app (discontinued as a standalone app)
- Klarna acquired Stocard in 2021 and folded loyalty cards into the Klarna app; users reported a 14-day shutdown notice — [MacRumors forum](https://forums.macrumors.com/threads/stocard-replacement.2434874/), [iphone-ticker.de](https://www.iphone-ticker.de/klarna-schluckt-stocard-kundenkarten-app-wird-zur-klarna-marke-188900/)
- French press reported in May 2025 that 7 million French users would lose access to their loyalty cards — [Journal du Geek](https://www.journaldugeek.com/2025/05/28/7-millions-de-francais-vont-perdre-lacces-a-leurs-cartes-de-fidelite/)
- Against the concept: discontinued; the successor requires a Klarna account and is a payments app.

13. Docutain (iOS + Android, scanner and document manager)
- Scanner with automatic OCR; App Store listing says data is stored locally on the device; optional encryption; optional Google Drive / Dropbox / OneDrive links; free with IAP; 4.8 stars (187 ratings on the listing seen) — [App Store](https://apps.apple.com/us/app/docutain-scan-pdf-ocr/id1416707024), [bestforandroid review](https://bestforandroid.com/docutain-document-scanner-app/)
- I found no source confirming expiry reminders.
- Against the concept: local OCR and local storage, but it is a scanner/archive, not a card wallet.

Tier C: newer 2025-2026 entrants seen but only lightly checked

14. Truefold (iPhone/iPad, developer Dilip Raj Bishwokarma): on-device reading of passports, IDs and cards that fills fields; values encrypted on the iPhone before storage or sync; syncs through personal iCloud with keys in iCloud Keychain; no account; offline; full-text search; vault export; household profiles; reminders not mentioned; listed 15 September 2026 — [AlternativeTo](https://alternativeto.net/software/truefold/about/)
15. Kinship Vault (iOS, subscription): AES-256-GCM, alerts 90/30/7/1 days before expiry, limited free tier — [mwm.ai listing](https://mwm.ai/apps/kinship-vault/6764678332) (search summary only, page not read)
16. Kryven Vault (iOS 18.6+): offline access, automated encrypted backups to iCloud Drive — [App Store](https://apps.apple.com/app/id6759934403) (search summary only)
17. ExpiryGuard (iOS): reminder timing from 30 days to expiry day, calendar view, data stays on device — [App Store](https://apps.apple.com/app/id6777413276) (search summary only)
18. Docsly: Smart Document Vault (Android): offline, no ads, folders for scans and PDFs, listing updated 25 October 2026 — [Google Play](https://play.google.com/store/apps/details?id=app.docsly.app) (search summary only; page could not be read)
19. IDSafe (iOS, since 2017): free with ads; scans passports, driving licences, visas; updated April 2026 — [appshunter](https://appshunter.io/ios/app/idsafe/id1258136557) (search summary only)
20. CardScan / IDPouch (iOS): says all processing is local and declares no data collected — [App Store](https://apps.apple.com/us/app/cardscan-scan-id-passport-card/id6753971155) (search summary only)
21. Quicken LifeHub: ranked "best overall" by Quicken's own blog, from $1.99/month with 30 GB cloud storage and a "Smart Add" camera capture for licences — [Quicken blog](https://www.quicken.com/blog/?p=9504). Vendor ranking itself; cloud subscription product, far from the concept.
22. DigiVault (vtechworks): advertises on-device OCR and AES-256 encryption on device "before any backup" — [DigiVault site](https://digivault.vtechworks.com/) (search summary only)

One-line mentions (out of scope for depth)
- Monica (Android, F-Droid, GPL-3.0): local-first password manager that can also hold bank cards and ID documents; AES-256-GCM with Android Keystore; WebDAV and encrypted local backups; version 1.0.324 added 6 November 2026 — [F-Droid](https://f-droid.org/packages/takagi.ru.monica.fdroid/)
- Samsung Wallet: passport-derived digital ID for US passport holders, verified through CLEAR; this is a government-style digital ID, not a scan vault — [Android Central](https://www.androidcentral.com/apps-software/samsung-wallet-now-holds-your-passport-where-it-works-and-where-it-doesnt). Wider document storage in Samsung Pass is an APK leak only, not a shipped feature — [Android Authority](https://www.androidauthority.com/samsung-pass-passport-id-storage-leak-3611987/)

### Inferences
- The space is crowded at the bottom: 2025-2026 searches return more than a dozen single-developer iOS vaults with near-identical pitches (offline, AES-256, Face ID, expiry reminders). Most have zero or single-digit ratings, so none has visible traction; differentiation on features alone will be hard to see from a store listing.
- Android is far thinner than iOS for this exact concept. The Android matches found are Travel Document Vault, Proof Pocket, Keevan, Docsly and the open-source LibreCrate; none of them combines OCR suggestions, expiry reminders, folders/tags and a widget.
- No open-source app found covers the concept. Catima is offline and widget-equipped but barcode-only and unencrypted as far as its pages state; LibreCrate is encrypted and offline but has no OCR or reminders; Ente Locker is encrypted but cloud-based.
- Tags, pinned cards and a home-screen widget are the rarest features in the set: only DocHarbor advertises widgets and folders, and no app read mentions tags or pinning.
- Loyalty and membership cards and ID documents are served by two separate families of apps (Catima/Pass2U/Klarna versus the vaults). Folio is the only sizeable app spanning both, and it does so with an account and tracking identifiers.
- Typical indie pricing is a small free tier (2-5 documents) plus a one-time unlock in the $10-$50 range, sometimes with a parallel subscription ($15-$30 per year).

### Gaps
- Trunk, "Cards - Mobile Wallet", WalletPasses, Card Diary, Dox/Doks, FileSafe, Keepsafe, TrustedDocs, Documents by Readdle, Paperless mobile clients, SafeInCloud and Enpass: not researched to a citable standard. A search for "Trunk" returned no matching app; "Cards - Mobile Wallet" and WalletPasses appeared only in low-quality directory pages. These should be treated as unverified, not as absent from the market.
- Catima details I believe to be true but did not verify in a source this session: an optional expiry date field per card, card groups, front/back photos, archive, and unencrypted exports. The pages read do not state them.
- Google Play download counts, ratings and Data safety declarations for Travel Document Vault, Proof Pocket, Docsly, Folio and Catima: Play pages could not be read.
- Whether Ente Locker strictly requires an account, and its standalone price, were not confirmed.
- Tier C apps (15-22) rest on search summaries, not on pages I read in full.
- No independent security audit was found for any Tier A app.

## For each: platforms, storage, encryption, account, OCR, reminders, organisation, backup/export, widget, AI, pricing, downloads/ratings, last update, developer

### Takeaway
The table below condenses the per-app findings; every cell is sourced in the previous section. No app markets generative or LLM features; "AI" in this category means on-device OCR/field recognition at most.

### Cited Findings

| App | Platforms | Storage | Encryption claim | Account | OCR | Expiry reminders | Organisation | Backup / export | Widget | Price | Traction | Last update seen | Developer |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Travel Document Vault | iOS, Android | Device; optional own iCloud/Drive (Pro) | Files encrypted on disk; AES-256-GCM backups | None | On-device, MRZ + expiry | Yes, multi-step | Profiles, trips, colours, filters | Encrypted .tdvault file (free); PDF export; cloud backup (Pro) | Not mentioned | Free (5 docs); one-time Pro (about $9.99, unconfirmed) | Not found | Not found | Mustafa Hafeez |
| DocHarbor | iOS, iPadOS, Mac | Device | iOS Data Protection only | None | On-device Vision; suggests title, category, owner, dates | Yes (2 docs free) | Folders, categories | Plain .zip vault export | Yes (Quick Add; Expiring Soon in Pro) | $3.99/mo, $24.99/yr, $49.99 lifetime | No ratings | Not shown | Mark Opanasiuk |
| Document Expiry Reminder | iOS, iPadOS | Device | AES-256-GCM | None | On-device Vision, expiry dates | Yes | Document types | Encrypted backup file, CSV, PDF reports | Not mentioned | $39.99 lifetime; $69.99 family | 5.0 (1 rating) | v1.7, "Jul 7" | MO NOUR |
| Docarus | iOS | Device | AES-256 | None | Text recognition + NFC chip | Yes (Pro) | Categories, hidden docs | Encrypted backups (Pro) | Not mentioned | $6.99/mo, $29.99/yr, $14.99 lifetime | No ratings | v2.4, "May 28" | Aliaksandr Dudzinski |
| Proof Pocket | iOS, Android | Device; optional file to iCloud/Drive | Master password, algorithm unnamed | None | Not mentioned | Yes (90/30/7/1 days) | Cases, categories | Encrypted backup file; Wi-Fi transfer; .ppcase | Not mentioned | $39.99 one-time or $14.99/yr | No ratings | v1.7.1, "Sep 28" | Karol Burdzinski |
| Keevan | Android | Device | Android Keystore | None | Not mentioned | Yes (30 days) | Not stated | Password-protected backups | Not mentioned | 5 items free, one-time unlock | 4K+ installs | 30 Oct 2026 | Sivakumar Reddy Malapati |
| LibreCrate | Android (F-Droid) | Device, no network | Password-based, on device | None | Not mentioned (text search exists) | Not mentioned | Sort, filter | Single encrypted vault file | Not mentioned | Free, AGPL-3.0 | Not found | 0.5.6, 3 Oct 2026 | David Neurieder |
| Folio | iOS, Android | Device per policy; hashes on servers; sync described | "Zero-knowledge" | Needed for backup | Scanner; OCR not stated | Yes | Family folders, travel timeline | Account-based backup/restore | Not mentioned | Free | 4.7 (6.9K ratings, iOS US) | 3.2.8, "Jun 23" | Folio Technologies Ltd |
| Ente Locker | iOS, Android, web | Ente cloud, E2EE | E2EE, Cure53-audited | Ente account (inferred) | Not mentioned | Not found | Collections | Cloud sync, sharing | Not mentioned | Free to 100 items; more with Ente Photos plan | Not found | 1.0.11, 29 Oct 2026 | Ente |
| Catima | Android (F-Droid, Play) | Device, no network | None claimed | None | Barcode scan only | Not verified | Not verified | Backup/transfer, share | List widget | Free, GPL-3.0 | 1.7k GitHub stars | 2.45.2, 25 Oct 2026 | Catima project |
| Pass2U Wallet | iOS, Android | Device + Google Drive / iCloud Wallet | Not found | Not found | Barcode scan | Not found | Not found | Drive / iCloud | Not found | Free, ads + IAP | 5.6M installs, 3.96 (19K) Android | 24 Oct 2026 | MicroMacro Mobile |
| Stocard (Klarna) | Discontinued standalone | Klarna account | n/a | Klarna account | n/a | n/a | n/a | n/a | n/a | n/a | 7M French users cited | n/a | Klarna |
| Docutain | iOS, Android | Device; optional clouds | Optional encryption | Not required (unverified) | On-device OCR | Not found | Not checked | Cloud links | Not found | Free + IAP | 4.8 (187 ratings seen) | Not found | Docutain |
| Truefold | iPhone, iPad | Device + personal iCloud | Encrypted before store/sync | None | On-device field reading | Not mentioned | Household profiles | Vault export | Not mentioned | Listed as free | Not found | Listed 15 Sep 2026 | Dilip Raj Bishwokarma |

Sources for the table: [TDV FAQ](https://traveldocumentvault.com/faq/), [TDV Features](https://traveldocumentvault.com/features/), [DocHarbor](https://apps.apple.com/app/id6786043565), [Document Expiry Reminder](https://apps.apple.com/us/app/id6756968613), [Docarus](https://apps.apple.com/us/app/id6761782909), [Proof Pocket site](https://proofpocket.com/), [Proof Pocket App Store](https://apps.apple.com/us/app/proof-pocket/id6753912757), [Keevan on AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet), [LibreCrate](https://f-droid.org/en/packages/com.librecrate.app/), [Folio App Store](https://apps.apple.com/us/app/id1266382717), [Folio privacy policy](https://folio.id/en/privacy/), [Ente Locker F-Droid](https://f-droid.org/en/packages/io.ente.locker.fdroid/), [Ente help](https://ente.com/help/locker/), [Catima F-Droid](https://f-droid.org/en/packages/me.hackerchick.catima/), [Catima GitHub](https://github.com/CatimaLoyalty/Android), [Pass2U on AppGoblin](https://appgoblin.info/apps/com.passesalliance.wallet), [Journal du Geek](https://www.journaldugeek.com/2025/05/28/7-millions-de-francais-vont-perdre-lacces-a-leurs-cartes-de-fidelite/), [Docutain App Store](https://apps.apple.com/us/app/docutain-scan-pdf-ocr/id1416707024), [Truefold on AlternativeTo](https://alternativeto.net/software/truefold/about/)

- AI features: no app page read mentions generative AI, an LLM or a chat/ask feature. The most advanced "smart" behaviour found is DocHarbor's on-device Apple Vision suggestions of title, category, owner and dates — [DocHarbor](https://apps.apple.com/app/id6786043565); Truefold's field filling from scans — [Truefold](https://alternativeto.net/software/truefold/about/); and Travel Document Vault's MRZ parsing — [TDV Features](https://traveldocumentvault.com/features/)

### Inferences
- An on-device question-answering or document-reading feature over stored documents would be unmatched among the apps read; it should be checked against the Tier C apps before being claimed as unique.
- Declared privacy posture splits three ways: "Data Not Collected" (Document Expiry Reminder, Docarus), diagnostics/analytics declared (Proof Pocket, DocHarbor), and tracking identifiers plus third-party advertising use (Folio, Pass2U).

### Gaps
- Android "Data safety" sections were not readable for any app.
- Last-update years on App Store pages are not shown; most are presumably 2026 but this is unverified.
- Download counts for iOS apps are not published; only rating counts are available.

## Which apps are offline-only with no account, and which of those have expiry reminders plus OCR?

### Takeaway
Seven apps read in detail are offline with no account (Travel Document Vault, DocHarbor, Document Expiry Reminder, Docarus, Proof Pocket, Keevan, LibreCrate, plus Catima for barcode cards). Of those, four combine expiry reminders with on-device OCR: Travel Document Vault (iOS and Android), DocHarbor, Document Expiry Reminder and Docarus (all three iOS only).

### Cited Findings
- Offline, no account, expiry reminders AND on-device OCR:
  - Travel Document Vault: no account, on-device OCR and MRZ, stepped reminders; the only one of the four on Android — [TDV FAQ](https://traveldocumentvault.com/faq/)
  - DocHarbor: no account, Apple Vision suggestions, reminders (limited to 2 documents on free); declares analytics usage data; relies on iOS Data Protection — [App Store](https://apps.apple.com/app/id6786043565)
  - Document Expiry Reminder: "No accounts, no sync, no servers", Apple Vision expiry extraction, AES-256-GCM, "Data Not Collected" — [App Store](https://apps.apple.com/us/app/id6756968613)
  - Docarus: no account, no servers, text recognition plus NFC, reminders in Pro, "Data Not Collected" — [App Store](https://apps.apple.com/us/app/id6761782909)
- Offline, no account, expiry reminders but no OCR mentioned:
  - Proof Pocket — [proofpocket.com](https://proofpocket.com/)
  - Keevan — [AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet)
- Offline, no account, neither reminders nor OCR mentioned:
  - LibreCrate — [F-Droid](https://f-droid.org/en/packages/com.librecrate.app/)
  - Catima (no Internet permission; barcode cards only) — [F-Droid](https://f-droid.org/en/packages/me.hackerchick.catima/)
- Not offline-only or account-based: Folio (account for backup, tracking identifiers) — [App Store](https://apps.apple.com/us/app/id1266382717); Ente Locker (cloud E2EE) — [F-Droid](https://f-droid.org/en/packages/io.ente.locker.fdroid/); Pass2U (ads, Firebase, Mixpanel) — [AppGoblin](https://appgoblin.info/apps/com.passesalliance.wallet); Klarna/Stocard — [MacRumors forum](https://forums.macrumors.com/threads/stocard-replacement.2434874/); Truefold (personal iCloud sync, no vendor account) — [AlternativeTo](https://alternativeto.net/software/truefold/about/)
- "Offline-only" is qualified for several: Travel Document Vault and Proof Pocket offer optional backup into the user's own iCloud or Google Drive, and Travel Document Vault has opt-in Sentry crash reporting — [TDV FAQ](https://traveldocumentvault.com/faq/), [proofpocket.com](https://proofpocket.com/)

### Inferences
- On Android, only one app found (Travel Document Vault) pairs no-account offline storage with OCR and expiry reminders, and it is scoped to travel documents with a 5-document free tier. An Android app covering IDs, insurance, loyalty cards and contracts with OCR, reminders, tags and a widget would face little direct competition among the apps found.
- None of the four OCR-plus-reminder apps mentions tags, pinned cards, or loyalty/membership cards with barcodes; only DocHarbor has a widget.
- Among the four, only Document Expiry Reminder and Docarus declare no data collection at all, and both are iOS only.

### Gaps
- Docsly (Android, offline, no ads) might belong in this group but its listing could not be read; OCR and reminders unknown.
- Whether the OCR in Travel Document Vault's Android build is really on-device was taken from the vendor FAQ; engine not named.
- Tier C apps (Kinship Vault, Kryven Vault, ExpiryGuard, CardScan) were not classified.

## What do users complain about in reviews for the top 5 closest apps?

### Takeaway
There is almost no review evidence for the closest apps: the indie vaults that match the concept best have zero or one rating, and no Reddit thread surfaced in any search. Usable complaints exist only for the larger adjacent apps (Folio, Klarna/Stocard, Pass2U), and they centre on forced identity/selfie steps, awkward capture, loss of a trusted app to an acquirer, and ads.

### Cited Findings
- Travel Document Vault, DocHarbor, Docarus, Proof Pocket: no user reviews displayed; the App Store says each "hasn't received enough ratings or reviews to display an overview" (for the three iOS listings read) — [DocHarbor](https://apps.apple.com/app/id6786043565), [Docarus](https://apps.apple.com/us/app/id6761782909), [Proof Pocket](https://apps.apple.com/us/app/proof-pocket/id6753912757)
- Document Expiry Reminder: one rating (5.0), no written reviews — [App Store](https://apps.apple.com/us/app/id6756968613)
- Keevan: no rating yet on Google Play per tracker — [AppGoblin](https://appgoblin.info/apps/com.siva.virtualWallet)
- Folio (App Store reviews, dated 2021-2022, so possibly outdated):
  - Capture friction: "I hate trying to steady my phone to take a decent proportional scan of a card" and a request to "add the option to upload existing scans from the camera roll" — [App Store](https://apps.apple.com/us/app/id1266382717)
  - Category limits: "I don't like the way the 'other' option works currently"; "I will like to see a passport option" — [App Store](https://apps.apple.com/us/app/id1266382717)
  - Identity verification pushback: "Not sure why the developers are using the heavy handed push for a selfie" and "Under what authority were you planning on verifying my ID anyways?" — [App Store](https://apps.apple.com/us/app/id1266382717)
  - Folio's policy confirms selfie biometric verification exists and that verification data is kept up to three years — [Folio privacy policy](https://folio.id/en/privacy/)
  - Trustpilot and Product Hunt reviews found were favourable and few — [Product Hunt](https://www.producthunt.com/products/folio-wallet-app/reviews)
- Stocard to Klarna migration (forum posts):
  - Users report the Klarna app does not work with Apple Watch, cannot add cards to Apple Wallet, shows cards as a long list with no preview of frequently used cards, and renders cards blurry; some say they got a 14-day shutdown notice, others none — [MacRumors forum](https://forums.macrumors.com/threads/stocard-replacement.2434874/page-2)
  - Threads on OzBargain and Cheapies show users actively looking for replacements — [OzBargain](https://www.ozbargain.com.au/node/869886?page=1), [Cheapies NZ](https://www.cheapies.nz/node/51156)
- Pass2U Wallet: 3.96 average on Android from 19K ratings; ad-supported with Google and Facebook ad SDKs, AdMob, Firebase and Mixpanel — [AppGoblin](https://appgoblin.info/apps/com.passesalliance.wallet). Specific review texts were not retrieved.
- Ente Locker: a Privacy Guides forum thread discusses it; one commenter argues that competing solutions do not encrypt documents the way Ente does (single opinion) — [Privacy Guides forum](https://discuss.privacyguides.net/t/ente-locker-new-app-from-ente/33048?page=3)
- A competitor's blog (Folio) claims Pass2U has no cloud sync so passes are lost with the phone; this conflicts with Pass2U's documented Google Drive / iCloud backup and comes from a rival — [Folio blog](https://folio.id/en/blog/pass2u-alternative/); contradicted by [Pass2U App Store listing](https://apps.apple.com/us/app/pass2u-wallet-create-and-put-cards-into-wallet/id1142473931)

### Inferences
- The absence of reviews is itself a finding: the closest competitors have no demonstrated user base, so there is no evidence yet of what users of an offline OCR vault dislike. Complaints must be borrowed from adjacent apps.
- Borrowed themes that map onto the concept: users resent being asked for identity or an account by a wallet app (Folio); they want import from gallery and files, not camera-only capture (Folio); they want fast access to frequently used cards and crisp card rendering (Klarna); and they are wary of losing their data when an app is acquired or shut down (Stocard), which favours user-held encrypted backup files and open export.
- Paywall design may be a latent complaint for the indie vaults: free tiers of 2-5 documents with reminders or backup behind Pro (Docarus, DocHarbor, Travel Document Vault) are tight for an app whose value starts once many documents are in.

### Gaps
- No Reddit threads (r/androidapps, r/iosapps, r/privacy, r/selfhosted) were surfaced by any of three searches; Reddit sentiment is unreported, not known to be absent.
- Google Play written reviews for Folio, Catima, Pass2U and Travel Document Vault could not be read.
- Catima complaints (for example lack of encryption or sync) were not found in a citable source; its GitHub issue tracker was not examined.
- Folio's review excerpts are from 2021-2022; no recent written complaints were retrieved.
