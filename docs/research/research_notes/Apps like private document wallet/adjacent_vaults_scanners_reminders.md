# Adjacent app categories overlapping a private phone document wallet (password managers/vaults, scanner apps, expiry reminder apps, life-admin organisers) — state as of November 2026

Reader notes on evidence quality:
- "Fetched" = I opened the vendor page or store listing myself. "Search summary" = the claim came from a search-result digest of the named page and I did not open the page; treat those as less certain, and the URL as the most likely origin among the results returned.
- App Store / Google Play listing text and privacy labels are developer-written and not verified by the stores.
- Prices are USD. Several vendor prices conflict between third-party trackers; conflicts are stated, not resolved.

## 1. Password managers / secure vaults: ID/document items, attachments, expiry alerts, OCR, offline, price, device-only storage

### Takeaway
Password managers are the strongest "I already use X for this" answer: 1Password, NordPass, Dashlane, Proton Pass, Bitwarden, Keeper and Enpass all store ID items and/or encrypted file attachments, and three (1Password Watchtower, NordPass Documents, Dashlane IDs) have some form of expiry alert. All the mainstream ones are account-based cloud-sync services with attachments behind a paid tier; only Enpass and SafeInCloud keep the vault off the vendor's servers, and none verified here offers on-device Q&A over the documents or OCR of an arbitrary document.

### Cited Findings

**1Password**
- Watchtower flags "credit cards, memberships, and driver's licenses" expiring within 2 months, API credentials within 3 months and passports within 10 months (fetched). — [1Password Support: Watchtower](https://support.1password.com/watchtower/)
- A custom date field can be given "Set expiry alert" so the item is surfaced in Watchtower; the page describes no push/email alert for expiring items (browser notifications are mentioned only for breached sites and weak passwords) (fetched). — [1Password Support: Watchtower](https://support.1password.com/watchtower/)
- Conflict: a search digest of the same support page reported the passport window as 9 months, with "an older version" at 10 months; my direct fetch returned 10 months. — [1Password Support: Watchtower](https://support.1password.com/watchtower/)
- A 1Password staffer says the default notice periods are not adjustable (search summary, community forum). — [1Password Community: Watchtower default warning periods](https://www.1password.community/discussions/1password/watchtower-default-warning-periods-/122441/replies/122442)
- Users have reported Watchtower expiry not firing for Driving Licence and Membership items while working for Passport and Credit Card (search summary; forum post, may be outdated). — [1Password Community](https://1password.community/discussion/comment/599118)
- File storage: 1 GB for individual accounts, 1 GB per person on Families, files up to 2 GB each (search summary of the official support page). — [1Password Support: Save important files](https://support.1password.com/files/)
- Staff state the 1 GB limit covers all file attachments and cannot be increased (search summary, forum). — [1Password Community: File storage management](https://www.1password.community/discussions/1password/file-storage-management/137604)
- No evidence was found that 1Password OCRs a passport/ID to fill item fields; community threads request it, and staff advice was to photograph the passport and attach the picture. A "Scan Document" capture option exists (a crop bug on it was reported). (search summary, forum) — [1Password Community: Feature request, text import of credit cards or passports](https://1password.community/discussion/143396/feature-request-textimport-of-creditcards-or-passports); [1Password Community: Scan Document crop bug](https://www.1password.community/discussions/1password/bug-scan-document-cannot-be-cropped-in-all-cases/98106)
- Price: raised from 27 March 2026; US annual rates reported as $47.88 Individual (was $35.88) and $71.88 Families (was $59.88) (search summary). — [MacRumors, 24 Feb 2026](https://www.macrumors.com/2026/02/24/1password-march-price-increase/); [AlternativeTo news](https://alternativeto.net/news/2026/2/1password-to-raise-subscription-prices-for-individual-and-family-plans-by-up-to-33-)
- Monthly billing reported as $4.99 Individual and $7.99 Families after the increase (search summary; the digest did not say which outlet carried the figure, the URL is one of the outlets covering the increase). — [MobileSyrup, 26 Feb 2026](https://mobilesyrup.com/2026/02/26/1password-plans-price-increase-march/)
- Conflict: one tracker dated October 2026 still lists Individual at $2.99/month and Families at $4.49/month (search summary). — [Dupple pricing tracker](https://dupple.com/pricing/1password)

**NordPass**
- "Documents" is a vault item type for digital copies of passports, IDs and driver's licences, on Premium and Family plans; up to 3 GB; files encrypted with XChaCha20 (search summary). — [NordPass blog: Introducing NordPass Documents](https://nordpass.com/blog/introducing-nordpass-documents/); [NordPass Documents feature page](https://nordpass.com/features/documents/)
- Per-document expiry reminder delivered by email and in-app notification; reminders can be edited or removed (search summary). — [NordPass Support: How to add and manage documents](https://support.nordpass.com/hc/en-us/articles/36113158693393-How-to-add-and-manage-documents-in-NordPass)
- Free users cannot upload attachments; after a downgrade, already-uploaded documents stay and reminders still fire (search summary). — [TechRadar](https://www.techradar.com/pro/security/nordpass-will-now-let-you-keep-all-your-most-vital-files-in-a-special-secure-vault); [NordPass Support](https://support.nordpass.com/hc/en-us/articles/36113158693393-How-to-add-and-manage-documents-in-NordPass)
- NordPass has an OCR scanner support article (title seen in results only; content not read). — [NordPass Support: How to use OCR scanner](https://support.nordpass.com/hc/en-us/articles/360004730258-How-to-use-OCR-scanner)
- Price (third-party, conflicting): $1.49/month Premium and $2.79/month Family in one article; about $1.43 and $2.68 on a 2-year term in another (search summary). — [WiFi HiFi](https://wifihifi.com/nordpass-store-documents-encrypted-vault/); [SafetyDetective (Italian)](https://it.safetydetective.com/best-password-managers/nordpass)

**Dashlane**
- Passports and driver's licences can be saved in the IDs section; the app shows "Expired" / "Expires soon" and sends a reminder three months before expiry (search summary of the support article). — [Dashlane Support](https://support.dashlane.com/hc/articles/202699401)
- 1 GB encrypted file storage listed for Premium in a third-party table; Premium price estimates range from about $4.07 to $5.42/month, with $4.99/month the common headline (search summary; not from Dashlane). — [Cybernews: Dashlane pricing](https://cybernews.com/password-managers/dashlane-review/dashlane-pricing/); [Security.org](https://www.security.org/password-manager/dashlane/)

**Proton Pass**
- Plans (fetched): Free $0 with file attachments "Not included"; Pass Plus $1.99/month for the first year ($23.88, then $35.88/year) with 10 GB; Pass Family $2.79/month first year ($33.48, then $59.88/year) with 50 GB; Proton Unlimited $6.49/month first year with 500 GB. — [Proton Pass pricing](https://proton.me/pass/pricing)
- Attachments work on Login, Alias, Card, Note and Identity items, paid plans only, up to 100 MB per file (search summary). — [It's FOSS: Proton Pass file attachments](https://itsfoss.com/news/proton-pass-file-attachments/)

**Bitwarden**
- Plans (fetched): Free ("Always free", attachments not listed); Premium $19.80/year ($1.65/month) with 5 GB encrypted file attachments; Families $47.88/year for up to 6 users with 5 GB personal + 5 GB family. Identity items are in every plan including free. Self-host options listed for Premium and Families. — [Bitwarden pricing](https://bitwarden.com/pricing/)
- Premium was raised from $9.99 to $19.80/year in January 2026, alongside 5x attachment storage (search summary). — [Thurrott](https://www.thurrott.com/?p=332249)

**Enpass**
- Plans (fetched): Free limited to 25 items in 1 vault; Premium $1.99/month billed annually; Family $3.99/month billed annually for up to 6 people. "Secure document storage" is listed as a feature. — [Enpass pricing](https://www.enpass.io/pricing/)
- The vault is stored in the user's own cloud (iCloud, Google Drive, OneDrive, Dropbox, Box, Nextcloud); Enpass says data is never stored on its servers (fetched). — [Enpass pricing](https://www.enpass.io/pricing/)

**Keeper**
- Identity and payment-card storage is part of the base paid plan; secure file storage is a paid add-on for the personal plan (10 GB at $9.99/year in one source, $13 in another, up to $100/year for 100 GB) and 10 GB is included in the Family plan (search summary; third-party). — [Cybernews: Keeper pricing](https://cybernews.com/password-managers/keeper-password-manager-review/keeper-pricing/); [All About Cookies: NordPass vs Keeper](https://allaboutcookies.org/nordpass-vs-keeper-password-manager)

**SafeInCloud 2**
- Data lives in an encrypted local database; sync is optional through the user's own cloud (Google Drive, Dropbox, OneDrive, Yandex Disk, NAS, ownCloud, WebDAV) (search summary). — [App Store: Password Manager SafeInCloud 2](https://apps.apple.com/us/app/passwords-safe-in-cloud/id895062927)
- Free download with in-app purchases; third-party "starting price" figures conflict ($3.99 vs $2.49/month) (search summary). — [Capterra](https://www.capterra.com/p/239925/Password-Manager-SafeInCloud/); [TrustRadius](https://www.trustradius.com/products/password-manager-safeincloud/pricing)

**Keepsafe (photo vault)**
- US App Store in-app purchases: premium $9.99/month, $23.99/year (search summary; listing snapshots dated 2025). — [App Price Lab: Keepsafe IAPs](https://apppricinglab.com/iap/apple/510873505)
- Premium adds private cloud storage/sync, trash recovery and a decoy "fake PIN" vault (search summary). — [Keepsafe Support: What does Keepsafe Premium include](https://support.getkeepsafe.com/hc/en-us/articles/209134106-What-does-Keepsafe-Premium-include)
- A competitor's comparison page (not neutral) says Keepsafe's free tier uses AES-256-GCM. — [Vaultaire vs Keepsafe](https://vaultaire.app/compare/vaultaire-vs-keepsafe/)

**Google Wallet (OS-level neighbour to Google Password Manager)**
- "Everything else" lets a user photograph a physical document (driver's licence, passport, residence permit, student ID and more in the US) and turn it into a pass; the pass is user-created and not an official ID (search summary). — [Android Authority](https://www.androidauthority.com/google-wallet-everything-else-pass-rolling-out-3593890/); [9to5Google](https://9to5google.com/2024/08/03/google-wallet-digital-pass-everything-else-rollout/)
- A separate verified "ID pass" can be created from a US passport by scanning the photo page, reading the chip and taking a selfie video; the physical passport is still needed for travel (search summary). — [Tom's Guide](https://www.tomsguide.com/tablets/android-tablets/you-can-now-save-your-us-passport-in-the-google-wallet-app-heres-how)

**What people say they use**
- Reddit users report keeping passport, IDs, insurance and medical records in 1Password, sometimes with a second offline copy of the scan files; others use a secure note or encrypted cloud storage (search summary of Reddit mirrors, anecdotal). — [Reddit snapshot mirror](https://reddit.sentinel-team.org/posts/1rbjjvf/snapshots/2026-02-23T02%3A57%3A19.141371Z)
- 1Password's own community answer recommends storing a passport scan as a Document item instead of a Secure Note (search summary). — [1Password Community](https://1password.community/discussion/99300/what-is-the-best-way-to-save-a-document-should-i-use-secure-notes-or-documents)

### Inferences
- Device-only by design: none of the mainstream managers. Closest are Enpass (own-cloud or local vault) and SafeInCloud (local database, optional own-cloud sync). 1Password, NordPass, Dashlane, Proton Pass, Keeper and hosted Bitwarden all require an account and sync through the vendor.
- Expiry coverage is narrow and passive: 1Password only checks fixed item types at fixed windows and surfaces them inside Watchtower; Dashlane has one fixed 3-month reminder; NordPass is the only one found with a user-set per-document reminder that is pushed out (email plus in-app).
- Attachment storage is a paywall line almost everywhere (Proton, Bitwarden, NordPass, Keeper add-on), so a free user of these products typically has ID fields but no scans.
- Typical cost to get documents plus attachments: roughly $20 to $60 per year (Bitwarden $19.80, Enpass about $24, Proton Pass $35.88 after year one, 1Password $47.88, Dashlane about $60).
- The document is treated as a field-set with a file bolted on. No verified product in this group reads the text of an arbitrary attached scan, searches inside it, or answers questions about it.

### Gaps
- Apple Passwords and Google Password Manager: no source was retrieved on document or attachment support. My understanding (unverified, from prior knowledge) is that neither stores document scans or ID items with files; this needs a check against Apple and Google support pages.
- 1Password's consumer pricing page returned only Enterprise content when fetched, so the post-increase prices rest on press coverage.
- Dashlane and Keeper official pricing pages and Dashlane's attachment rules for IDs were not opened; figures are third-party.
- NordLocker was not researched.
- Offline behaviour (read access without network) was not verified for any product; pricing pages do not mention it.
- SafeInCloud attachment/image support and ID templates, and its exact one-time or subscription price, were not confirmed.
- Keepsafe: no official source confirming a document/ID scanning feature or its encryption design.
- NordPass OCR scanner scope (cards only or also IDs) not read.

## 2. Scanner apps: on-device OCR, encryption, offline modes, smart naming, expiry detection, AI Q&A, pricing

### Takeaway
Scanner apps cover capture and searchable text well, and Genius Scan in particular is on-device and private by default, but none found treats a scan as a dated credential: no expiry detection or renewal reminders were found in any of them, and AI features, where present, run in the vendor's cloud. Microsoft Lens, a common free answer, has been withdrawn.

### Cited Findings

**Genius Scan (The Grizzly Labs)**
- Plans (fetched): Basic is free and "fully functional"; Ultra is $39.99/year and adds OCR and sync across devices; Teams $20 to $40 per licence per year. — [Genius Scan pricing](https://thegrizzlylabs.com/genius-scan/pricing)
- "On-device text recognition adds a text layer to your PDFs." and "Documents are processed and stored on your phone unless you explicitly decide to export them." (fetched) — [Genius Scan pricing](https://thegrizzlylabs.com/genius-scan/pricing)
- PDF encryption, smart document renaming and Face ID/Touch ID lock are listed as features, but the fetched page did not map them to a plan. — [Genius Scan pricing](https://thegrizzlylabs.com/genius-scan/pricing)
- Conflict on tiering: the help centre lists PDF password encryption and OCR under Basic, while the App Store listing marks them as premium (search summary). — [Grizzly Labs help: plan differences](https://help.thegrizzlylabs.com/article/30-what-is-the-difference-between-genius-scan-and-genius-scan); [App Store: Genius Scan](https://apps.apple.com/us/app/genius-scan-pdf-scanner-app/id377672876)

**Microsoft Lens (retired)**
- Retirement began 9 January 2026; removed from the App Store and Google Play and unsupported from 9 February 2026; scanning possible until 9 March 2026, after which no new scans can be created and old scans stay viewable only while the app remains installed (fetched). — [Microsoft Support: Retirement of Microsoft Lens](https://support.microsoft.com/en-us/lens/)
- Microsoft recommends the OneDrive app's scanner, and states "OneDrive does not support saving scans locally on your device." (fetched) — [Microsoft Support: Retirement of Microsoft Lens](https://support.microsoft.com/en-us/lens/)
- A Microsoft message-centre post also points users to the Microsoft 365 Copilot app (search summary). — [MC1131064 mirror](https://mc.merill.net/message/MC1131064)

**Adobe Scan**
- Premium raises the OCR limit from 5 pages to 100 pages and allows combining up to 20 files; premium features require signing in with an Adobe ID, and exporting needs an internet connection (search summary of Adobe help pages). — [Adobe Scan iOS docs: manage subscriptions](https://www.adobe.com/devnet-docs/adobescan/ios/en/managingsubscriptions.html)
- Acrobat AI Assistant as an individual add-on is reported at about $4.99/month on an annual plan and $7.99 monthly (third-party; search summary). — [Redress Compliance](https://redresscompliance.com/adobe-acrobat-pricing-ai-features-2026)

**SwiftScan**
- VIP tier includes OCR, automatic cloud upload and smart naming; the App Store description says document activity happens on the device or with the cloud provider the user chooses (search summary). — [App Store: SwiftScan](https://apps.apple.com/app/id834854351)
- Regional App Store prices seen: VIP annual 39.15 EUR, monthly 12.61 EUR; a reseller lists lifetime access at $41.99 to $59.99 (search summary; no USD list price found). — [App Store (CZ): SwiftScan](https://apps.apple.com/cz/app/mobile-scanner/id834854351); [StackSocial](https://www.stacksocial.com/sales/swiftscan-lifetime-subscription)

**Docutain**
- App Store listing describes local storage on the device with optional cloud integration; free with in-app purchases (search summary). — [App Store: Docutain](https://apps.apple.com/us/app/docutain-scan-pdf-ocr/id1416707024)
- A third-party blog says scanning and OCR run offline and locally on the device (secondary source). — [Best for Android](https://bestforandroid.com/docutain-document-scanner-app.md)
- A review says translation and summarisation run through Microsoft Azure (cloud), and puts premium at "approximately $90 per year" at minimum (search summary; conflicts with App Store snapshots topping out at $9.99 or $44.99). — [Neil Squire: Docutain](https://www.neilsquire.ca/docutain-organized-ocr-and-scanning/)

**CamScanner**
- Free tier includes up to 10 OCR recognitions; Premium allows 1,000 per month; US App Store Premium is $9.99/month or $59.99/year (search summary). — [App Store: CamScanner](https://apps.apple.com/us/app/-/id388624839)
- An older vendor team-pricing page lists $49.99/year. — [CamScanner pricing](https://v3.camscanner.com/team/price)

**Apple Notes scanner**
- "Scan Documents" in a note detects edges, straightens and enhances pages; text inside scanned documents is searchable (search summary). — [SlashGear](https://www.slashgear.com/2052346/things-you-didnt-know-apple-notes-can-do/); [App Store: Notes](https://apps.apple.com/app/notes/id1110145109)
- Apple's security guide describes locked ("secure") notes and says notes with unsupported attachment types cannot be encrypted (search summary). — [Apple Platform Security: Secure features in Notes](https://support.apple.com/guide/security/sec1782bcab1/web)
- A locked note's first line stays visible as its title and locked notes are excluded from search (search summary; the source is a competing vault vendor). — [Vaultaire: Notes lock vs a vault](https://vaultaire.app/guides/iphone-notes-lock-vs-vault/)

### Inferences
- The scanner category's job ends at "a clean searchable PDF in a folder". Organisation is folders/tags and smart file names; nothing found reads an expiry date out of the scan and schedules a reminder.
- Privacy posture splits in two: Genius Scan, SwiftScan and Docutain keep scans on the device by default, while Adobe Scan, OneDrive (the Lens successor) and CamScanner are sign-in and cloud oriented. OneDrive explicitly cannot save a scan locally.
- Encryption in this category means a password on an exported PDF or an app lock, not an encrypted-at-rest library with a device-held key; no scanner was found claiming the latter.
- The Lens retirement removes the main free, no-subscription scanner from both stores and pushes those users toward a cloud-only replacement, which is a useful opening for an offline-first product.
- Typical scanner subscription: about $40 to $60 per year (Genius Scan Ultra $39.99, CamScanner $59.99).

### Gaps
- Google Drive scanner: no source retrieved on OCR location, title suggestions or encryption.
- Adobe Scan: no 2026 list price for Scan Premium, and no statement on whether OCR runs on device or in the cloud; whether AI Assistant Q&A is available inside Scan itself was not confirmed.
- SwiftScan USD list prices and Docutain's current price not confirmed from a live US listing.
- No independent review (Wirecutter, PCMag, The Verge) was opened for this category.
- Absence of expiry detection in scanner apps is based on not finding it in any listing or pricing page read, not on a positive statement from the vendors.

## 3. Dedicated document-expiry reminder apps on both stores: features, ratings, pricing, encrypted image storage

### Takeaway
There is a long tail of small, recent expiry-tracker apps on both stores, many offline and account-free with on-device OCR of the expiry date, but almost all have too few ratings to show a score and most do not claim encryption of stored images. One iOS app (Document Expiry Reminder by MO NOUR) is a near feature-match on encryption, on-device OCR and encrypted backup files, minus folders/tags depth and on-device Q&A.

### Cited Findings

**iOS (App Store listings fetched unless noted)**
- Document Expiry Reminder (developer MO NOUR): 5.0 from 1 rating; free with Premium Lifetime $39.99 and Family $69.99; attaches scanned images/PDFs and states attachments are encrypted with AES-256-GCM on device; expiry dates read with on-device Apple Vision; no accounts, cloud sync or servers; works offline; creates encrypted backup files; privacy label "Data Not Collected". — [App Store](https://apps.apple.com/app/id6756968613)
- Expiro: Renewal Calendar (seller Dave Oakley / Stackcurious): not enough ratings to display; free with Pro Weekly $1.99, Pro Yearly $9.99, Lifetime $24.99; on-device reading of passport MRZ, licence barcodes and printed text, "Nothing is uploaded, and there is no account"; private iCloud sync; export/import backup file; privacy label lists purchase history, device ID and usage data for analytics (not linked). — [App Store](https://apps.apple.com/app/id6758278098)
- Conflict: an earlier search digest described Expiro as a $4.99 one-time purchase; the fetched listing shows free with the in-app prices above. — [App Store](https://apps.apple.com/app/id6758278098)
- Expiry Guard: Doc Reminder (ACKPlus Solutions): not enough ratings to display; free with "Remove Ads Forever" $9.99; attach a photo or PDF per document; camera scan detects type, expiry date and number; fully offline, files local, no cloud; ZIP export backup; app lock and number masking but no encryption claim; privacy label includes identifiers used for tracking and third-party advertising. — [App Store](https://apps.apple.com/app/id6777413276)
- Document & PDF Scanner: Toki (Malik Gabroun): not enough ratings to display; free with Pro Monthly $4.99, Annual $14.99, Lifetime $24.99; photo/PDF attachments in Pro (free tier keeps one); on-device OCR including passport field fill; scans stored locally; Face ID/passcode lock, no encryption claim; analytics usage and diagnostics data (not linked). — [App Store](https://apps.apple.com/us/app/id6758915615)
- RenewalKit (emonster Inc.): not enough ratings to display; free with Unlimited Monthly $4.99, Yearly $34.99, one-time Unlimited $59.99 and packs; on-device Apple Vision OCR and NFC import from ePassport chips; scan images are processed temporarily and not kept; optional iCloud (CloudKit) sync; no encryption claim. — [App Store](https://apps.apple.com/pg/app/id6758590671)
- Document Expiration RemindMe (Nelson Cruz): 4.3 from 3 ratings; free with Pro $3.99/month or $9.99/year; iCloud sync; explicitly "no images, no scans" (dates only). — [App Store](https://apps.apple.com/us/app/id6478255369)
- RenewAhead (Document Expiry Tracker): free; four-stage reminder schedule with suggested lead times such as 8 months for passports; Face ID lock; only minimal expiry metadata used for email reminders (search summary). — [App Store](https://apps.apple.com/us/app/-/id6765758523)
- Arkive: free; timeline views; on-device processing (search summary). — [App Store (AU)](https://apps.apple.com/au/app/arkive/id6747009867)

**Android (Google Play; search summaries of listings, not opened)**
- Expiry Guard Document Reminder: free; alerts 90/60/30/7/1 days before and on the day; stores everything offline; scan-based auto-fill. — [Google Play](https://play.google.com/store/apps/details?id=com.ackbiz.expiryguard&hl=en)
- ExpiryGuard: Document Reminder (different package): passports, visas, driving licences; local, no accounts; premium is a one-time purchase; family profiles; country templates for Germany and France. — [Google Play](https://play.google.com/store/apps/details?id=com.expiryguard&hl=en)
- Document Expiry Reminder (ilyasapps): "100% offline", front and back photo capture; monthly, yearly or lifetime purchase. — [Google Play](https://play.google.com/store/apps/details?id=com.ilyas.ilyasapps.documentexpiry&hl=en_US)
- Papira: Documents & Renewals: warns months ahead and stores the office, website and documents needed for each renewal; no accounts, no servers. — [Google Play](https://play.google.com/store/apps/details?id=com.toralle.papira)
- Expira: Expiry Date Tracker: category-specific timing, passports and visas at 180/90/30 days. — [Google Play](https://play.google.com/store/apps/details?id=com.expiraapp.app&hl=en_US)
- Expiry Date Reminder (jspsoft): passport option to remind 6 months ahead, calendar and backup. — [Google Play](https://play.google.com/store/apps/details?id=com.jspsoft.omnidue)
- DocXVault: AI/OCR date extraction with email and WhatsApp alerts. — [Google Play](https://play.google.com/store/apps/details?id=com.docxvault.app&hl=en)
- Expi: Expiry & Renewal Tracker: OCR date extraction, works offline. — [Google Play](https://play.google.com/store/apps/details?id=link.otnt.expi&hl=en_US)
- Expirations: a user review reports reminders did not fire. — [Google Play](https://play.google.com/store/apps/details?id=com.sari.expires&hl=en_US)

### Inferences
- Of 8 iOS apps examined, 4 fetched listings showed no displayable rating and the two with ratings had 1 and 3 ratings. The category is crowded with new, unproven indie apps and has no established leader a user would name.
- Many App Store IDs are in the 67xxxxxxxx range, which suggests most of these launched within roughly the last year; this is my reading of the IDs, not a stated launch date.
- "Offline, no account, on-device OCR of the expiry date" is already table stakes in this niche and is not a differentiator on its own. Encrypting the stored images is rare (only the MO NOUR app claims it among those read), and several apps avoid the question by storing no images at all (RemindMe, RenewalKit).
- Pricing clusters low: yearly $9.99 to $34.99, lifetime $24.99 to $59.99, with one ad-supported app at $9.99 to remove ads. A lifetime option is common here, unlike in the password-manager and life-admin categories.
- Reminder lead times of 6 to 8 months for passports appear in several apps (RenewAhead, Expira, jspsoft) and in 1Password's 10-month window, so a flat "30 days before" default would look weak next to them.
- None of the listings read mentions question answering over documents or an on-device language model.

### Gaps
- Google Play ratings, install counts, prices and data-safety sections were not retrieved for any Android app; the listings were not opened.
- Ratings for RenewAhead and Arkive not retrieved.
- Encryption claims are developer statements; none is independently verified, and the MO NOUR app's claim rests on its own listing.
- Whether any of these apps is the same product across stores (several share the "ExpiryGuard" name under different developers) was not established.

## 4. Family / household "life admin" organisers: cloud vs device, price

### Takeaway
Life-admin organisers are cloud services built around sharing, emergency access and estate planning, priced far above the other categories ($100 to $480 per year), with FidSafe the free exception. They overlap on "all family IDs in one place" and, in Trustworthy's case, on AI answers, but they are the opposite of device-only.

### Cited Findings
- Trustworthy plans (fetched; plan-to-storage mapping was garbled in the page text and is uncertain): Free "forever"; Silver $10/month billed annually; Gold $20/month billed annually, described with "AI answers"; Platinum $40/month billed annually with a dedicated concierge (3 hours included) and unlimited Family Archive. All plans list iOS and Android apps, "Mobile offline mode" and "Advanced security & privacy". Storage tiers appeared to be 2 GB, 10 GB, 100 GB and unlimited. — [Trustworthy pricing](https://www.trustworthy.com/pricing)
- Trustworthy's own blog puts its range at $120 to $480 per year (search summary). — [Trustworthy blog: Trustworthy vs Everplans](https://www.trustworthy.com/blog/trustworthy-vs-everplans)
- Trustworthy has a feature for adding IDs and memberships (page title seen; content not read). — [Trustworthy blog](https://trustworthy.com/blog/add-all-of-your-ids-and-memberships-to-trustworthy)
- Everplans: Premium $99.99/year and a free tier limited to 10 items (search summary of the official pricing page); aggregators still show an older $75/year. — [Everplans pricing](https://www.everplans.com/pricing); [Everplans help: How much does Everplans cost](https://help.everplans.com/hc/en-us/articles/215665778-How-much-does-Everplans-cost)
- Prisidio: Unlimited plan reported at $16/month or $12.50/month billed annually (checked 6 May 2026 by a tracker), versus $9.99/month billed yearly on another aggregator; a Starter vs Unlimited split exists; AARP Digital Vault is powered by Prisidio (search summary). — [xpay tracker](https://www.xpay.sh/saas-pricing/prisid-io/); [SpotSaaS](https://www.spotsaas.com/product/prisidio/pricing); [Prisidio help: Starter vs Unlimited](https://help.prisidio.com/en/articles/16042635-prisidio-starter-vs-unlimited-plan); [Trustworthy blog: vs AARP Digital Vault](https://www.trustworthy.com/blog/trustworthy-vs-aarp-digital-vault)
- FidSafe (Fidelity): free, 5 GB per user, 200 MB per file, no Fidelity account needed (search summary; sources are older blog reviews). — [My Money Blog: FidSafe review](https://www.mymoneyblog.com/fidsafe-review-fidelity.html); [The Finance Buff](https://thefinancebuff.com/fidsafe-online-safe-deposit-box-from-fidelity.html)
- Smaller "family vault" apps exist on the stores, for example SecureKeep: Family Vault with a free plan of 10 items, and My Family Vault, described by its developer as a one-time purchase although its listing shows in-app purchases (search summary). — [Google Play: SecureKeep](https://play.google.com/store/apps/details?id=app.securekeep); [App Store: My Family Vault](https://apps.apple.com/app/id6755207526)
- Quicken publishes a 2026 round-up of document and life-event records apps (title seen only). — [Quicken blog](https://www.quicken.com/blog/best-document-and-life-event-records-management-apps-2026/)

### Inferences
- These products sell a different promise (family continuity, shared access, a concierge) and price accordingly; someone paying $120+ per year for Trustworthy already has ID storage and AI answers, but in the vendor's cloud with an account.
- Trustworthy's "Mobile offline mode" means cached access to a cloud vault, not device-only storage; this is my reading of the pricing page, which does not describe the storage architecture.
- Trustworthy Gold's "AI answers" is the closest adjacent equivalent to "ask questions about my documents", and it sits at a $240/year tier, presumably cloud-processed.
- For a single person who only wants their own cards and IDs on their phone, this category is overbuilt and expensive, so it is a weak "I already use X" competitor except among families already subscribed.

### Gaps
- Nok Nok and LifeFile: searches returned no matching life-admin product (results were a parcel app and unrelated titles). I could not confirm these products or their pricing.
- Notion and Evernote as improvised document stores: not researched; no sources.
- Prisidio's and FidSafe's own pricing/feature pages were not opened; FidSafe's current status in 2026 is unverified (sources are old).
- Whether Trustworthy has expiry reminders: not mentioned on the pricing page; not confirmed either way.
- Encryption model (end-to-end or provider-held keys) not verified for any product here.

## 5. Per-category gaps relative to the product concept, and typical subscription prices

### Takeaway
No adjacent category combines device-only encrypted storage, no account, on-device OCR, proactive expiry reminders, encrypted backup files and on-device Q&A; each covers two or three of these. The realistic "I already use X" threats are 1Password/NordPass/Dashlane for people who already pay for them, and the MO NOUR expiry app as the nearest small-app feature match.

### Cited Findings

| Category | Covers | Missing relative to the concept | Typical price (USD) |
|---|---|---|---|
| Password managers | ID items, encrypted attachments, some expiry alerts | Account and vendor cloud required (except Enpass, SafeInCloud); attachments paywalled; no OCR of arbitrary scans; no Q&A | $19.80 to $60 per year |
| Scanner apps | Capture, OCR, searchable PDF, folders, smart naming | No expiry detection or reminders; library not encrypted at rest; AI features cloud-side | $40 to $60 per year; free tiers |
| Expiry reminder apps | Offline, no account, on-device date OCR, reminders | Images often not stored or not encrypted; unproven; no Q&A; thin organisation | $9.99 to $34.99 per year; lifetime $24.99 to $59.99 |
| Life-admin organisers | Family sharing, emergency access, AI answers (Trustworthy Gold) | Cloud and account by design; high price; not phone-first for one person | $100 to $480 per year; FidSafe free |

- Password-manager price points: Bitwarden Premium $19.80/year; Enpass Premium $1.99/month billed annually; Proton Pass Plus $35.88/year after the first year. — [Bitwarden pricing](https://bitwarden.com/pricing/); [Enpass pricing](https://www.enpass.io/pricing/); [Proton Pass pricing](https://proton.me/pass/pricing)
- 1Password Individual $47.88/year from 27 March 2026. — [MacRumors](https://www.macrumors.com/2026/02/24/1password-march-price-increase/)
- Attachments excluded from free tiers: Proton Pass free "Not included"; NordPass free users cannot upload attachments. — [Proton Pass pricing](https://proton.me/pass/pricing); [NordPass Support](https://support.nordpass.com/hc/en-us/articles/36113158693393-How-to-add-and-manage-documents-in-NordPass)
- Scanner price points: Genius Scan Ultra $39.99/year; CamScanner Premium $59.99/year. — [Genius Scan pricing](https://thegrizzlylabs.com/genius-scan/pricing); [App Store: CamScanner](https://apps.apple.com/us/app/-/id388624839)
- Lens successor cannot save locally. — [Microsoft Support](https://support.microsoft.com/en-us/lens/)
- Expiry-app price points: Expiro $9.99/year or $24.99 lifetime; RenewalKit $34.99/year or $59.99 one-time; MO NOUR app $39.99 lifetime. — [Expiro](https://apps.apple.com/app/id6758278098); [RenewalKit](https://apps.apple.com/pg/app/id6758590671); [Document Expiry Reminder](https://apps.apple.com/app/id6756968613)
- Life-admin price points: Trustworthy Silver $10/month and Platinum $40/month billed annually; Everplans $99.99/year. — [Trustworthy pricing](https://www.trustworthy.com/pricing); [Everplans pricing](https://www.everplans.com/pricing)

### Inferences
- The table's "Covers" and "Missing" columns are my synthesis of sections 1 to 4, not vendor statements.
- On-device question answering over one's own documents was not found in any adjacent product read; the only AI Q&A found (Trustworthy Gold "AI answers", Acrobat AI Assistant) is tied to cloud accounts. This is the clearest unclaimed feature, with the caveat that dedicated wallet apps and on-device LLM apps were out of my scope.
- Device-only encryption with no account is credible differentiation against password managers and life-admin tools, but not against the indie expiry trackers, which already advertise offline and no-account operation. Against those, the differentiators are encrypted image storage, encrypted backup files, real organisation and Q&A.
- A lifetime or low annual price fits the expectations set by the expiry-tracker niche; pricing near password-manager levels ($20 to $48 per year) would invite the comparison "my password manager already does this".
- Expiry reminders need long, document-aware lead times (months for passports) and a pushed notification to beat 1Password's passive Watchtower list and Dashlane's single 3-month reminder.

### Gaps
- No independent editorial reviews (Wirecutter, PCMag, The Verge, Android Authority) were opened to confirm which product reviewers recommend for ID storage.
- Market size or usage share per category (how many people actually keep IDs in a password manager) was not found.
- Apple Passwords, Google Password Manager, Google Drive scanner, NordLocker, Notion, Evernote, LifeFile and Nok Nok remain unverified, as listed above.
