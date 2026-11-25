# Competitor landscape: personal document vault / ID-card wallet apps (as of Nov 2026)

Method note: Google Play listing pages could not be fetched (they came back as navigation only), so **Play install counts and ratings are missing for nearly every app**. Prices and features come from vendor sites, App Store listings and 2025–2026 press. Developer marketing pages are vendor claims, not independent reviews.

## Which apps compete directly and indirectly, and how do they compare on features and pricing?

### Takeaway
The direct field is a long tail of small indie "document vault + expiry reminder" apps, many iOS-first. The closest to Doc Keeper are Travel Document Vault (offline, AES-256-GCM, family profiles, pay-once Pro, on iOS and Android) and Proof Pocket (offline, on-device encryption, expiry alerts, $39.99 lifetime or $14.99/yr, iOS only). Indirect competitors are much bigger: password managers with file attachments for about $20–$72 a year, Google, Apple and Samsung wallets, and government wallets like DigiLocker with about 724M users. None of the indirect ones combine offline storage, OCR search, expiry reminders and per-person organisation.

### Comparison table

| # | App | Type | Platform | Price model | Cloud / offline | Encryption | OCR / search | Expiry reminders | Family / persons | Backup | Installs / rating |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | **Doc Keeper** | Direct | Android (APK) | Free 10 docs; one-time unlock | Offline, no account | AES-256 on device | On-device OCR full-text search | Yes (14 d default) | Persons + spaces | Encrypted single file | n/a (not on Play) |
| 1 | Travel Document Vault | Direct | iOS + Android | Free; Pro is "pay once" (price not stated) | Offline, no account | AES-256-GCM on device | On-device passport MRZ read (expiry, country) | Yes, per type (passport 8 months out; IDs and insurance 3 months; tickets 1 week) | 1 profile free; unlimited in Pro | Encrypted iCloud/Drive backup (Pro); free export/import | not found |
| 2 | Proof Pocket | Direct | iOS/Mac (Android listing exists, unverified) | Free + $39.99 lifetime or $14.99/yr | Offline | On-device file encryption; Face ID or master password | "Automatic document recognition"; search | 90/30/7/1 days | Per-person "cases" (no sharing) | Optional encrypted iCloud Drive; export; local-network transfer | Too few ratings to show |
| 3 | Vault Guardian | Direct | iOS (Android "coming soon") | Free 3 docs; Pro $6.99/mo; Elite $10.99/mo | Cloud | "End-to-end encrypted" | "Searchable" (OCR not stated) | 90/60/30 days; Pro adds 14 to 1 days | Family sharing on Elite only | Cloud | not found |
| 4 | Folio Wallet | Direct | iOS + Android | Free (no paid tier found) | Not confirmed | Claims AES-256 / "E2E" | ID scanner | not found | not found | not found | not found |
| 5 | CardyWall | Direct | Android | not found | No cloud | Encrypted, biometric lock | not found | not found | not found | not found | not found; asks for ad-ID permission |
| 6 | DigiVault | Direct | not confirmed | not found | not found | not found | On-device expiry extraction | 90-day alerts | Multi-profile household | not found | not found |
| 7 | Bitwarden | Indirect (password manager) | All | Free; Premium $19.80/yr; Families $47.88/yr (6 users) | Cloud sync | E2E zero-knowledge | No OCR | No | Families plan | Cloud + export | not found |
| 8 | 1Password | Indirect | All | Individual $35.88 first yr / $47.88; Families $53.88 / $71.88 (5) | Cloud sync | E2E | No OCR | No | Families plan | Cloud | not found |
| 9 | Proton Pass | Indirect | All | Plus $23.88 first yr / $35.88; Family $33.48 / $59.88 (6) | Cloud sync | E2E | No OCR | No | Family plan | Cloud | not found |
| 10 | Google Wallet "Everything Else" | Indirect (platform) | Android | Free | Google account; IDs treated as private | Device auth before opening IDs | AI reads fields from the photo | not found | No | Google account | Preinstalled |
| 11 | Apple Wallet (Digital ID / state IDs) | Indirect (official ID) | iPhone | Free | Device + Apple | Secure Element | n/a | n/a | No | n/a | Preinstalled |
| 12 | Samsung Wallet + Secure Folder | Indirect (platform) | Galaxy only | Free | Local (Secure Folder) | Knox encryption | No | No | No | Local only (cloud files can't move in) | Preinstalled |
| 13 | DigiLocker (India) | Indirect (government) | Android/iOS/web | Free | Cloud, issuer-verified | Government | Issued docs only | not found | not found | Cloud | 72.43 crore (~724M) registered users |
| 14 | Microsoft Lens | Indirect (scanner), **retired** | — | — | — | — | — | — | — | — | Scanning stopped 9 Mar 2026 |
| 15 | Adobe Scan | Indirect (scanner) | All | Free; paid tier for advanced OCR/export | Adobe cloud | not found | OCR (advanced is paid) | No | No | Adobe cloud | not found |

### Cited Findings
**Direct dedicated apps**
- Travel Document Vault: works on iOS and Android with no account; documents, expiry dates and reminders all work offline; files encrypted with AES-256-GCM on the device; the passport MRZ is read on-device; passport reminders start 8 months out, IDs and insurance 3 months, tickets 1 week; 1 family profile free and unlimited in Pro; encrypted iCloud/Google Drive backup in Pro, with free export/import; free PIN or biometric lock with auto-erase; "Pay once. All v1.x updates included, forever." — [Travel Document Vault features](https://traveldocumentvault.com/features/)
- Travel Document Vault free-tier limits differ between sources: one says 5 documents and 1 profile, the vendor page states only 1 profile — [traveldocumentvault.com](https://traveldocumentvault.com/); [Google Play listing](https://play.google.com/store/apps/details?id=com.mustafahafeez.traveldocumentvault&hl=en)
- Proof Pocket (iOS): free with in-app purchases, "Full application unlock" $39.99 or yearly $14.99; scanning, encryption, search and reminders work offline; "Every file is encrypted on your device"; alerts 90/30/7/1 days before expiry; per-person cases; optional encrypted iCloud Drive backup and local-network transfer; too few ratings to display — [App Store](https://apps.apple.com/app/proof-pocket/id6753912757)
- Proof Pocket's Play listing says it is offline, encrypts on the device and backs up encrypted to the user's Google Drive (updated Sep 25, 2026 per search snippet; I could not load the page to verify) — [Google Play](https://play.google.com/store/apps/details?id=com.proofpocket)
- Vault Guardian: iPhone only, Google Play "coming soon"; Free $0 for 3 documents, Pro $6.99/mo, Elite $10.99/mo; cloud storage described as end-to-end encrypted; alerts at 90/60/30 days, Pro adds 14 to 1 days; PIN and biometric lock only on paid plans; family sharing only on Elite — [vaultguardian.app](https://vaultguardian.app/)
- Folio Wallet: free on the App Store and Google Play; stores driver's licences, passports, residence permits, birth certificates and health insurance cards; claims AES-256 encryption (vendor claim; G2 calls it end-to-end) — [Product Hunt](https://www.producthunt.com/posts/folio-wallet-app); [G2](https://www.g2.com/products/folio-wallet/reviews)
- CardyWall (Android): "encrypted, biometric-locked, no cloud", with a vault for passports and licences; asks for the advertising-ID permission — [chrome-stats](https://chrome-stats.com/d/com.redonelabs.cardywall)
- DigiVault: advertises 90-day alerts, on-device expiry extraction and multi-profile household tracking, plus a self-reported 99%+ extraction accuracy — [digivault.vtechworks.com](https://digivault.vtechworks.com/)
- Many more ID-holder apps are iOS-only, e.g. Cards+, CardScan and "ID Cards & Documents Holder" — [App Store: Cards plus](https://apps.apple.com/app/id6746193984); [App Store: CardScan](https://apps.apple.com/app/id6753971155)

**Password managers**
- Bitwarden: Premium $19.80/yr includes encrypted file attachments with 5 GB; Families $47.88/yr for 6 users with 5 GB personal plus 5 GB family storage — [Bitwarden pricing](https://bitwarden.com/pricing.md)
- Bitwarden Premium was reportedly $9.99/yr before Jan 2026 (secondary source) — [safepasswordgenerator.net](https://safepasswordgenerator.net/blog/bitwarden-pricing-2026/)
- Proton Pass Plus is $23.88 the first year and $35.88 on renewal, with 10 GB; 1Password Individual is $35.88 then $47.88, with 1 GB; Families: Proton $33.48 then $59.88 for 6, 1Password $53.88 then $71.88 for 5. The article is dated 1 Jul 2026 but cites pricing as of 14 Nov 2026, an internal inconsistency — [tech-insider.org](https://tech-insider.org/proton-pass-vs-bitwarden-vs-1password-2026/)
- Sources disagree on whether Proton Pass Plus supports attachments: Proton says its premium plans do, a Digital Trends review said Plus did not — [Proton](https://proton.me/pass/alternatives/bitwarden-alternative); Digital Trends (via search summary)

**Platform wallets and storage**
- Google Wallet "Everything Else": tap Add to Wallet, then Everything Else, and photograph the card; you can only create passes from barcode images unless you accept consent terms; listed types include driver's licence, passport, ID card, student ID and health insurance; government IDs are not synced to other devices and need authentication to open; "not an official ID" — [Google Wallet Help](https://support.google.com/wallet/answer/12060038), via [search summary incl. Tom's Guide](https://www.tomsguide.com/phones/android-phones/google-wallet-is-getting-the-biggest-upgrade-in-years-meet-the-everything-else-pass)
- The current Help page section is titled "Add items from a photo (except India)"; you can edit the fields AI pulled from the photo, and the original photo is kept under the pass — [Google Wallet Help](https://support.google.com/wallet/answer/12060038?hl=en)
- Announced at I/O 2024, launched in the US in Aug 2024, expanding outside the US by Sep 2025 (support page then excluded Australia, India and Japan) — [Android Authority, 3 Sep 2025](https://www.androidauthority.com/google-wallet-everything-else-pass-rolling-out-3593890/); [9to5Google, Aug 2024](https://9to5google.com/2024/08/12/google-wallet-everything-else/)
- Apple Digital ID launched Nov 2025 with iOS 26.1: scan the passport photo page, read the NFC chip, take a liveness selfie; accepted at TSA at 250+ US airports for domestic travel only; driver's licences and state IDs in Wallet in 12 states plus Puerto Rico — [Apple Newsroom](https://www.apple.com/newsroom/2025/11/apple-introduces-digital-id-a-new-way-to-create-and-present-an-id-in-apple-wallet/); [TechCrunch](https://techcrunch.com/2025/11/12/apple-launches-digital-id-a-way-to-carry-your-passport-on-your-phone-for-use-at-tsa-checkpoints)
- Samsung Secure Folder uses Knox and encrypts all data in it; files must be local, and cloud files can't be moved in — [Samsung UK](https://www.samsung.com/uk/support/mobile-devices/how-do-i-move-content-or-apps-to-the-secure-folder/)
- Samsung Wallet Digital ID varies by country; in India it pulls documents from DigiLocker and has no manual upload or scan (user report) — [Samsung Community](https://r2.community.samsung.com/t5/Galaxy-A/Suggestion-to-Add-Document-Storage-Feature-in-Samsung-Wallet/td-p/19080430)

**Government wallets**
- DigiLocker had 72.43 crore (~724M) registered users as of 31 Jul / Aug 2026 (government reply to Parliament) — [Free Press Journal](https://www.freepressjournal.in/business/digilocker-crosses-7243-crore-users-umang-records-1166-crore-registrations-govt-informs-rajya-sabha); [GKToday](https://www.gktoday.in/digilocker-crosses-72-crore-users-umang-reaches-11-crore/)

**Scanners**
- Microsoft Lens: retired from iOS and Android from 9 Jan 2026; unsupported after 9 Feb; new scans stopped 9 Mar 2026; Microsoft points users to OneDrive's scanner, which can't save scans locally — [Microsoft Support](https://support.microsoft.com/en-gb/topic/retirement-of-microsoft-lens-fc965de7-499d-4d38-aeae-f6e48271652d); [Windows Central](https://www.windowscentral.com/software-apps/microsoft-lens-is-dead-microsoft-wants-you-on-onedrive-but-it-doesnt-let-you-save-scans-locally)
- Adobe Scan: basic features are free with an Adobe account; advanced export and OCR are paid (no price found) — [PDFgear](https://www.pdfgear.com/scan-pdf/microsoft-lens-alternatives.htm)

### Inferences
- Pricing anchors: dedicated apps either charge once (Proof Pocket $39.99; Travel Document Vault "pay once") or subscribe ($14.99/yr up to $10.99/mo). Password managers cost about $20–$72 a year. Doc Keeper's one-time unlock fits the privacy-first indie norm, and a price roughly in the $10–$40 band would be credible.
- Free-tier limits run from 3 documents (Vault Guardian) to 1 profile (Travel Document Vault), so 10 documents free is generous.
- Travel Document Vault is the nearest rival: same privacy stance, cross-platform, on Google Play. It is travel-focused, though, and only extracts the passport MRZ, with no full-text OCR search.
- Microsoft Lens's retirement left scanner users looking for a home, and OneDrive's scanner won't save scans locally. An offline vault with a built-in scanner can pitch to them.

### Gaps
- Play install counts and ratings for every direct competitor (Play pages could not be fetched).
- The Travel Document Vault Pro price, and the exact Android pricing for Proof Pocket and Folio.
- Notion, Evernote, Google Drive and Files by Google "Safe folder": no current official sources were collected in this pass. Files by Google Safe folder was only mentioned in a user forum.
- UAE Pass: no sources found.
- Adobe Scan's current price.

## Has Google Wallet's "photo of any card/ID" feature changed the landscape?

### Takeaway
Yes, for the simplest use case. Since 2024–2025 any Android user can photograph an ID or insurance card into a free, preinstalled, auth-protected wallet, and AI reads the fields. That undercuts paid "ID card holder" apps that only store photos. It does not cover multi-page PDFs or contracts, OCR search across documents, per-family-member organisation or no-account use. Apple's 2025 Digital ID moves the official-ID tier further into the OS.

### Cited Findings
- AI reads the fields, you can edit them, and the original photo is kept. Government IDs are marked private: not synced across devices and opened only after authentication. "Not an official ID." — [Google Wallet Help](https://support.google.com/wallet/answer/12060038?hl=en); [Tom's Guide](https://www.tomsguide.com/phones/android-phones/google-wallet-is-getting-the-biggest-upgrade-in-years-meet-the-everything-else-pass)
- US launch Aug 2024; international rollout reported Sep 2025, with regional exclusions — [9to5Google](https://9to5google.com/2024/08/12/google-wallet-everything-else/); [Android Authority](https://www.androidauthority.com/google-wallet-everything-else-pass-rolling-out-3593890/)
- Apple Digital ID (Nov 2025) is a verified, signed ID usable at TSA, domestic only — [Apple Newsroom](https://www.apple.com/newsroom/2025/11/apple-introduces-digital-id-a-new-way-to-create-and-present-an-id-in-apple-wallet/)

### Inferences
- Doc Keeper shouldn't compete on "show my card at the counter" alone; Google Wallet does that for free. Its case rests on breadth (certificates, contracts, multi-page PDFs), OCR search across everything, expiry reminders, persons and spaces, and no Google account.
- No source confirmed that Google Wallet sends expiry reminders for photo passes. Treat that as an open question, not as a Doc Keeper advantage, until verified.

### Gaps
- Adoption figures for Everything Else passes: none found.
- Whether photo passes support expiry notifications: not confirmed.

## What features are table stakes vs. rare?

### Takeaway
Table stakes for dedicated vaults: on-device encryption, biometric or PIN lock, a camera scanner, expiry reminders and some backup or export. Rare: full-text OCR search over all documents, a widget, show-at-counter mode, spaces, and notes linked to documents. Doc Keeper is ahead on breadth and privacy. It is behind on distribution (no Play listing), iOS availability, cloud-sync convenience and verified official IDs.

### Cited Findings
- Expiry reminders are everywhere among direct apps: Travel Document Vault (per type), Proof Pocket (90/30/7/1), Vault Guardian (90/60/30), DigiVault (90-day) — sources above
- On-device encryption plus biometric lock is standard in Travel Document Vault, Proof Pocket and CardyWall. Vault Guardian charges for its app lock — sources above
- Most direct apps offer encrypted backup to the user's own iCloud or Google Drive (Travel Document Vault Pro; Proof Pocket) — sources above
- Per-person or family profiles appear in Travel Document Vault (Pro), Proof Pocket (cases), DigiVault and Vault Guardian (Elite) — sources above
- OCR in competitors is narrow: passport MRZ or expiry-date extraction (Travel Document Vault, DigiVault), not full-text search; Adobe Scan charges for advanced OCR — sources above

### Inferences
- Where Doc Keeper is differentiated:
  - full-text on-device OCR search
  - spaces plus tags plus linked notes
  - a home-screen widget and show-at-counter mode
  - a generous free tier (10 docs) with a one-time unlock
  - no analytics at all
- Where Doc Keeper is behind:
  - no Google Play presence, which hurts trust and discovery and is the biggest gap
  - no iOS version (rivals are cross-platform or iOS-first)
  - no automatic expiry-date extraction from scans (rivals auto-fill expiry from the MRZ)
  - reminders on one 14-day default rather than staged per type (rivals use 90/30/7 or 8-month passport alerts)
  - no backup to the user's own cloud or sync across devices
  - no shared family vault across devices

### Gaps
- No independent 2025–2026 review roundup of dedicated document-vault apps was found. The comparison relies on vendor pages and store listings.
