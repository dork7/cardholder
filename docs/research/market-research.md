# CardHolder — Market Research

Researched 2026-10-19 for the v1 design in [`docs/design.md`](../design.md).

**How to read this**

- **Fact**: stated by the source that owns it, such as a store listing, a company filing or press release, or Apple/Google docs. Linked inline.
- **Estimate (3rd-party)**: a number from a tracker or analyst, not from the company. Labelled as an estimate.
- **Inference**: my own reasoning from the facts. Always labelled *Inference*.
- **Store numbers** were observed on **2026-10-19**. They come from the **US storefront** unless marked otherwise.
  - App Store figures come from Apple's own iTunes Search/Lookup API and the apps.apple.com listing.
  - Google Play figures come from the play.google.com listing (`hl=en&gl=us`).
  - Play shows only install *bands* (for example "1M+"). App Store publishes no download counts at all, so rating counts are the only public scale signal on iOS.

---

## TL;DR

1. **The gap is closing, but not closed.**
   - **Apple:** iOS 27 (fall 2026) adds **Create a Pass** in Wallet. Photo-to-pass needs a **barcode/QR code** and an Apple Intelligence iPhone (15 Pro or later). There is also a manual, text-only template path ([Apple Support](https://support.apple.com/guide/iphone/create-passes-el8l5r9jnhyv/ios)).
   - **Google:** Google Wallet's **"Everything Else"** turns a photo of *any* pass into a Wallet pass. That includes IDs and health-insurance cards, stored as "private passes". It is not available in India ([Google Wallet Help](https://support.google.com/wallet/answer/12060038?hl=en)).
   - *Inference:* on Android, Google already covers much of CardHolder's core "photo of a barcode-less card" use case. On iOS, Apple still does not show an **image** of a no-barcode card at the counter.
2. **There are near-clones of CardHolder already, but they are tiny.**
   - **"ID Card Wallet: Document Vault" (LazyByte Labs, Android)** has almost the same pitch and model as CardHolder. It is offline with no account, AES-256, a password-encrypted backup file and expiry reminders. Its free tier is **4 ID cards** and Premium is a **one-time purchase**. It has **1K+ installs** ([Play](https://play.google.com/store/apps/details?id=com.lazybyte.wallet)).
   - **Catima** (free, open source, Android-only) has front/back card photos, no Internet permission and password-protected exports, with **100K+ installs** ([Play](https://play.google.com/store/apps/details?id=me.hackerchick.catima), [changelog](https://github.com/CatimaLoyalty/Android/blob/main/CHANGELOG.md)).
3. **Money in this category comes from scale plus ads/data or a parent business, not unlock fees.**
   - The only hard financial data point is Klarna's purchase of Stocard (2021). The price was **never officially disclosed**; press reports say **~€110–113M**.
   - Klarna's SEC filing confirms the deal's goodwill. It also says Stocard users were migrated into the Klarna app ([Klarna F-1/A](https://www.sec.gov/Archives/edgar/data/2003292/000200329225000036/klarnagroupplcf-1a4.htm)).
   - No public revenue figures exist for any paid-unlock card-wallet app I checked. Third-party tracker estimates (Sensor Tower, Appfigures, AppMagic) are behind logins and could not be retrieved.
4. **$2.99 one-time is in line, at the low end.**
   - Comparable one-time unlocks: Pass2U Pro **$2.99**, LazyByte Premium **$1.99**, ID Card Wallet (Magnetic Lab) **$3.49**, Barcodes Lifetime **$14.99**.
   - Many ID-wallet apps instead charge **subscriptions** of $5.99/month or $44.99/year.
   - On the UAE App Store, two apps that sell at $2.99 in the US show **AED 12.99**. **AED 10.99** is therefore slightly *below* that local equivalent.
5. **The UAE is a thin market for a third-party card wallet.**
   - **Emirates ID** is already digital via the UAEICP app and UAE PASS, and can be added to Apple Wallet through UAEICP (per Gulf News).
   - Health insurance is largely tied to the Emirates ID, and insurers such as Daman ship digital cards in their own apps.
   - Third-party wallets have tiny UAE rating counts: SuperCards **45**, Pass2U **58**, Folio **55** ratings in the AE store.
6. **Name risk:** the App Store already has "**Card Holder: Store Card Wallet**" and "**Cardholder**". Google Play has "**ID Card Wallet - Card Holder**" (100K+ installs).

---

## Comparison table

Store data observed 2026-10-19, US storefront.

**Column key**
- **Ratings (count)** comes from the App Store (iOS) and Google Play.
- **Installs** is the Google Play band.
- **Model** codes:
  - **B** = barcode-centric
  - **I** = stores card images
  - **Off** = works offline / no account required
  - **Acct** = account / cloud

| App | Platforms | Model | Pricing (US) | iOS ratings | Play rating · ratings | Play installs |
|---|---|---|---|---|---|---|
| **Apple Wallet** (built-in) | iOS | B; text-only manual passes (iOS 27) | Free | 4.77 · 7,499,339 ([AS](https://apps.apple.com/us/app/id1160481993)) | — | — |
| **Google Wallet** | Android | B + I (Everything Else, photo kept) | Free | — | 4.33 · 2,255,276 ([Play](https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel)) | 1B+ |
| **Klarna** (absorbed Stocard) | iOS, Android | B, Acct (Klarna account required) | Free (BNPL/ads business) | 4.86 · 2,466,191 ([AS](https://apps.apple.com/us/app/id1115120118)) | 4.81 · 2,073,602 ([Play](https://play.google.com/store/apps/details?id=com.myklarnamobile)) | 50M+ |
| Stocard (legacy) | — | — | Delisted on Play ([404](https://play.google.com/store/apps/details?id=de.stocard.stocard)) | — | — | — |
| **SuperCards** (ex-Stocard team) | iOS, Android, watch | B, Off, optional account | Free; Play lists IAP $19.99 | 4.80 · 1,752 ([AS](https://apps.apple.com/us/app/id6482576688)) | 4.68 · 105,376 ([Play](https://play.google.com/store/apps/details?id=de.superapps.supercards)) | 1M+ |
| **Key Ring** (inMarket) | iOS, Android | B, Acct (cloud backup), ads | Free; Play IAP $5.99–$99 | 4.58 · 20,102 ([AS](https://apps.apple.com/us/app/id372547556)) | 4.45 · 44,900 ([Play](https://play.google.com/store/apps/details?id=com.froogloid.kring.google.zxing.client.android)) | 5M+ |
| **Pass2U Wallet** | iOS, Android | B → Apple/Google Wallet passes; ads | Free + **Pro $2.99** one-time | 4.25 · 2,895 ([AS](https://apps.apple.com/us/app/id1142473931)) | 3.80 · 18,627 ([Play](https://play.google.com/store/apps/details?id=com.passesalliance.wallet)) | 5M+ |
| **WalletPasses** | Android | B (.pkpass), cloud sync, ads | Free; IAP $0.99–$99.99 | — | 4.50 · 178,292 ([Play](https://play.google.com/store/apps/details?id=io.walletpasses.android)) | 10M+ |
| **PassWallet** (Passcreator) | Android | B (.pkpass), ads | Free; IAP $0.99 | — | 4.57 · 44,815 ([Play](https://play.google.com/store/apps/details?id=com.attidomobile.passwallet)) | 5M+ |
| **Catima** | Android (+F-Droid) | B + **I (front/back photos)**, **Off, no Internet permission** | **Free**, open source (GPLv3+) | — | 4.83 · 1,854 ([Play](https://play.google.com/store/apps/details?id=me.hackerchick.catima)) | 100K+ |
| **FidMe** | iOS, Android | B, Acct, ads/cashback | Free; Play IAP $1.99–$999.99 | 4.61 · 443 ([AS](https://apps.apple.com/us/app/id391329324)) | 4.50 · 94,604 ([Play](https://play.google.com/store/apps/details?id=fr.snapp.fidme)) | 1M+ |
| **mobile-pocket** | iOS, Android | B, offline display | Free | 4.75 · 11,193 ([AS](https://apps.apple.com/us/app/id384619059)) | 4.64 · 44,556 ([Play](https://play.google.com/store/apps/details?id=at.bluesource.mobilepocket)) | 1M+ |
| **ONEWallet** | Android | B, ads | Free; IAP $19.99 | — | 4.53 · 42,191 ([Play](https://play.google.com/store/apps/details?id=com.kmshack.onewallet)) | 1M+ |
| **Barcodes: Loyalty Card Wallet** | iOS, watch | B (+ import from screenshot), iCloud | $1.99/mo · $7.99/yr · **$14.99 lifetime** | 4.76 · 1,180 ([AS](https://apps.apple.com/us/app/id1610894014)) | — | — |
| **Folio** | iOS, Android | **I (IDs, passports, insurance)**, **Acct/cloud**, AES-256, SOC 2 | Free on iOS; Play lists IAP $19.99–$999 | 4.71 · 6,915 ([AS](https://apps.apple.com/us/app/id1266382717)) | 4.61 · 6,556 ([Play](https://play.google.com/store/apps/details?id=com.folioltd)) | 500K+ |
| **ID Card Wallet: Document Vault** (LazyByte) | Android | **I, Off, AES-256, password backup file, reminders, 4 free ID cards** | Free + **one-time Premium ($1.99 IAP)** | — | no rating yet ([Play](https://play.google.com/store/apps/details?id=com.lazybyte.wallet)) | 1K+ |
| **ID Card Wallet - Card Holder** (Magnetic Lab) | Android | I (front/back), Off, PIN, ads | Free; IAP $3.49 | — | 4.30 · 1,654 ([Play](https://play.google.com/store/apps/details?id=com.crunch.idcardwallet)) | 100K+ |
| **Card-Safe** | iOS | I (auto-crop), passcode/Face ID, **Data Not Collected** | Free, no IAP | 4.65 · 104 ([AS](https://apps.apple.com/us/app/id1455090837)) | — | — |
| **DigWallet: ID and Card Keeper** | iOS | I (IDs, health cards) | $5.99/mo · $24.99/6mo · $44.99/yr | 4.51 · 87 ([AS](https://apps.apple.com/us/app/id1636833006)) | — | — |
| **Card Holder: Store Card Wallet** (Toropkin) | iOS | B, PIN, iCloud | Weekly to yearly subs ($4.99/wk … $39.99) | 4.58 · 43 ([AS](https://apps.apple.com/us/app/id1618760047)) | — | — |
| **Insurance Card** (YMMV LLC) | iOS | Insurance card storage | **$1.99 paid up front** (AED 7.99) | 5.0 · 1 ([AS](https://apps.apple.com/us/app/id6743356524)) | — | — |
| **1Password** | all | Identity items + attachments, Acct | Individual $2.99/mo promo ($3.99 regular), billed yearly ([pricing](https://1password.com/pricing/password-manager)) | 4.67 · 43,369 ([AS](https://apps.apple.com/us/app/id1511601750)) | 4.60 · 26,318 ([Play](https://play.google.com/store/apps/details?id=com.onepassword.android)) | 1M+ |
| **Bitwarden** | all | Identity items free; attachments Premium | Free; Premium $19.80/yr ([pricing](https://bitwarden.com/pricing/)) | 4.76 · 34,409 ([AS](https://apps.apple.com/us/app/id1137397744)) | 4.73 · 183,596 ([Play](https://play.google.com/store/apps/details?id=com.x8bit.bitwarden)) | 5M+ |

I found no app named **"Cardy"** in either store's search on 2026-10-19 (App Store API, Play search). The closest "Card Wallet"-style apps are in the table.

---

## 1. Competitors in detail

### 1a. Platform wallets (the real competition)

**Apple Wallet**

- **iOS 27 Create a Pass.** Apple's guide says you can "make your own passes from a physical card, photo, or screenshot—useful for membership and loyalty cards that have a barcode or QR code but no digital pass" ([Apple Support: Create passes in Wallet](https://support.apple.com/guide/iphone/create-passes-el8l5r9jnhyv/ios)).
  - **Photo path:** "With Apple Intelligence, you can create a pass with a barcode or QR code."
  - It requires an Apple Intelligence-enabled **iPhone 15 Pro / 15 Pro Max / iPhone 16 or later**. Apple Intelligence "is not available in all languages or regions".
  - The supported-language list on that page does **not** include Arabic.
  - The original photo is kept ("View Original Photo").
  - **Manual path:** "Create Pass Manually, then choose a template". This is text fields plus colours, with no photo of the card.
- **Siri mode in Camera** saves barcodes or QR codes as passes. "Codes that rotate and expire won't work" ([Apple Support 127821](https://support.apple.com/en-sg/127821)).
- **Apple Newsroom, June 2026:** users can "create and store passes in Apple Wallet from physical cards, like loyalty or membership cards… point their iPhone at any physical card with a barcode" ([Apple Newsroom](https://www.apple.com/newsroom/2026/06/apple-unveils-innovative-features-and-intelligence-experiences-across-services/)).
- **IDs:**
  - Driver's licences and state IDs work in **16 US states + Puerto Rico**.
  - **Digital ID** from a US passport works in the **United States only** ([learn.wallet.apple/id](https://learn.wallet.apple/id)).
  - Digital ID launched on 2025-11-12, for TSA checkpoints at 250+ US airports. It is "not a replacement for a physical passport". Japan's My Number Card was the first international ID ([Apple Newsroom](https://www.apple.com/newsroom/2025/11/apple-introduces-digital-id-a-new-way-to-create-and-present-an-id-in-apple-wallet/)).
- **No UAE/GCC ID** appears on Apple's ID page ([learn.wallet.apple/id](https://learn.wallet.apple/id)). The UAE Emirates ID route goes through ICP's own app instead (see §4).
- *Inference:* Apple now covers barcode loyalty and membership cards natively on recent iPhones. It still has **no way to show a photo of a barcode-less card** (a membership card with only a name and number, or an insurance card) as an image on any iPhone. That is CardHolder's remaining iOS gap. It is narrower than a year ago.

**Google Wallet**

- **"Everything Else"** (not available in India): "take or upload a photo of a pass or barcode". You must accept consent terms. "If you don't accept it, you can only create passes from images with barcodes" ([Google Wallet Help: Manage items](https://support.google.com/wallet/answer/12060038?hl=en)).
- **Private passes:** IDs and health insurance cards are named as private passes. They are not visible on the Google Wallet website (same page).
- **Older "Photo" option:** "If your pass has a barcode or QR code, you can save it" ([Google Wallet Help: Add from images](https://support.google.com/wallet/answer/14188766?hl=en)).
- **Secondary coverage (not Google's own pages):**
  - Everything Else launched US-only in Aug 2024. Pass types include Health insurance, ID card, Driver's licence, Passport, Library card, Loyalty card and Other.
  - Private passes "don't sync to other devices" and require authentication ([9to5Google](https://9to5google.com/2024/08/12/google-wallet-everything-else/)).
  - I could **not** confirm on a Google page whether Everything Else is available in the **UAE** today.
- **Scale:** 1B+ installs, 2.26M ratings ([Play](https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel)).
- *Inference:* where Everything Else is available, it is the **single closest substitute** for CardHolder on Android. It is free and preinstalled, handles no-barcode IDs and insurance cards, and keeps the photo. CardHolder's counter view (max brightness, flip, zoom), no account and offline-only design are its differentiators against it.

### 1b. Loyalty and pass wallets (barcode-first)

**Stocard → Klarna**

- Klarna bought Stocard in 2021.
- Klarna's June 2022 release put Stocard at "over 48 million" users and added loyalty cards to the Klarna app in 18 regions. Users can "manually type in their membership number" when there's no barcode ([Klarna press, 2022-06-22](https://www.klarna.com/international/press/klarna-app-is-enhanced-with-digital-wallet-for-easy-access-to-loyalty-cards/)).
- Stocard's own FAQ says the Stocard app "will be shut down" and cards move to the Klarna app. That requires a Klarna account with a verified phone number and email ([Stocard contact/FAQ](https://stocardapp.com/en/us/contact)).
- The Play listing `de.stocard.stocard` now returns *Not Found* (observed 2026-10-19).

**SuperCards (Super Apps Studio GmbH, Berlin)**

- It is built by former Stocard staff, and co-founder David Handlos co-founded Stocard ([Trending Topics, 2026-10-07](https://www.trendingtopics.eu/superplan-stocard-founders-shopping-list-app/)).
- The listing says "Free and trusted by more than 3 million users… No ads. Works offline… No signup required". It offers one-click migration from Stocard/Klarna via screenshot, an "anonymous mode" with cards "encrypted on your device", and an account-free QR-based backup ([Play listing](https://play.google.com/store/apps/details?id=de.superapps.supercards)).
- Trending Topics reports about **4M users** (same article).
- Its iOS privacy label shows "Data Not Linked to You" ([AS](https://apps.apple.com/us/app/id6482576688)).

**Key Ring (inMarket)**

- Barcode loyalty, with cloud backup via a free Key Ring account. The iOS privacy label includes "Data Used to Track You" ([AS](https://apps.apple.com/us/app/id372547556)). Play: "Contains ads" ([Play](https://play.google.com/store/apps/details?id=com.froogloid.kring.google.zxing.client.android)).
- inMarket bought it from Vericast in Dec 2020 with undisclosed terms. At the time it had 14M+ downloads and 60M+ loyalty cards stored ([press release via SalesTechStar](https://salestechstar.com/sales-engagement/inmarket-acquires-key-ring-expanding-its-data-driven-marketing-and-insights-suite/)).

**Pass2U Wallet (MicroMacro Mobile)**

- Converts barcodes or photos into Apple/Google Wallet passes.
- Pro Version is **$2.99** ("Separate specific passes and remove ads"), shown as **AED 12.99** on the UAE store.
- The privacy label shows tracking for third-party advertising ([AS US](https://apps.apple.com/us/app/id1142473931), [AS AE](https://apps.apple.com/ae/app/id1142473931)).

**WalletPasses / PassWallet**

- Android readers for .pkpass files.
- WalletPasses has "Cloud sync" and ads, with 10M+ installs ([Play](https://play.google.com/store/apps/details?id=io.walletpasses.android)). PassWallet has 5M+ installs ([Play](https://play.google.com/store/apps/details?id=com.attidomobile.passwallet)).

**Catima**

- Copylefted open source with "No Internet access and no ads", backup/transfer, and "Gratis" ([Play](https://play.google.com/store/apps/details?id=me.hackerchick.catima)). Android 6+ via Play, F-Droid, IzzyOnDroid ([GitHub](https://github.com/CatimaLoyalty/Android)).
- Its changelog shows **front/back card images, a zoomable image viewer, cropping, creating a card by sharing an image, and password-protected exports** ([CHANGELOG](https://github.com/CatimaLoyalty/Android/blob/main/CHANGELOG.md)).
- There is no iOS app; the App Store search for "catima" returned none.
- *Inference:* on Android, Catima is a free, privacy-maximal app that already does most of CardHolder v1, though as a barcode-first app.

**FidMe, mobile-pocket, ONEWallet, Barcodes**

- All are barcode-first.
- FidMe has an 18+ age rating on iOS for "Contests/Gambling/Advertising" ([AS](https://apps.apple.com/us/app/id391329324)).
- Barcodes is the only one with a clear lifetime price: **$14.99**, shown as **AED 29.99** in the UAE ([AS US](https://apps.apple.com/us/app/id1610894014), [AS AE](https://apps.apple.com/ae/app/id1610894014)).

### 1c. Photo-of-card, ID and insurance storage apps (CardHolder's direct category)

**Folio (Folio Technologies)**

- The best-known image-based ID wallet.
- It stores "IDs, passport, driver's license, gift cards, loyalty cards…", with "AES 256-bit encryption" and SOC 2 certification. It has an **account/cloud** backup ("Set up an account to access your documents from another device") and renewal reminders ([Play](https://play.google.com/store/apps/details?id=com.folioltd), [AS](https://apps.apple.com/us/app/id1266382717)).
- Free on iOS with no IAP listed. Play lists IAP $19.99–$999 per item (product not named).
- Scale: 500K+ Play installs; 6,915 US iOS ratings; only **55 ratings in the UAE store** (AE iTunes API).

**ID Card Wallet: Document Vault (LazyByte Labs)**

- The closest match to CardHolder found ([Play](https://play.google.com/store/apps/details?id=com.lazybyte.wallet)):
  - "Nothing you save leaves your device. There is no account… no cloud".
  - AES-256 via SQLCipher, with biometric unlock.
  - "one encrypted file protected by a password you choose".
  - Reminders "before… the policy expires".
  - "The free version covers four ID cards and two bank cards… Premium is a one-time purchase".
- Play IAP **$1.99**. 1K+ installs, last updated 2026-07-30. Android only.

**ID Card Wallet - Card Holder (Magnetic Lab)**

- "100% Offline", front and back image capture, PIN lock, ads ([Play](https://play.google.com/store/apps/details?id=com.crunch.idcardwallet)).
- 100K+ installs, IAP $3.49, India-oriented (Aadhaar, PAN).

**Card-Safe (iOS)**

- Photographs "any kind of card" with auto edge detection and a passcode/Face ID lock. Free, "Data Not Collected" ([AS](https://apps.apple.com/us/app/id1455090837)).
- A review on the listing says card images are stored **unencrypted**. That is a user claim, but it is the exact weakness CardHolder's encryption at rest addresses.

**Subscription-priced ID wallets (iOS)**

- DigWallet ($5.99/mo, $44.99/yr) ([AS](https://apps.apple.com/us/app/id1636833006)).
- ID Cards Wallet – Card Keeper (same price ladder) ([AS](https://apps.apple.com/us/app/id1644695297)).
- "All Cards" Wallet by Sunmare ($5.99–$7.99/week, $99.99 lifetime) ([AS](https://apps.apple.com/us/app/id6747915830)).
- All have small rating counts (34–485).

### 1d. Password managers (brief)

- **Bitwarden** stores "identities" on the Free plan. Encrypted **file attachments** (for card photos) need Premium at **$19.80/yr** ([pricing](https://bitwarden.com/pricing/)).
- **1Password** Individual costs **$2.99/mo promo ($3.99 regular), billed yearly**, with a 14-day trial ([pricing](https://1password.com/pricing/password-manager)).
- *Inference:* both store ID data well, but neither is built for a fast full-screen display at a counter. They are a substitute only for people who already pay for them.

---

## 2. Earnings: what the evidence actually shows

| Company / app | Evidence | Type |
|---|---|---|
| **Stocard → Klarna** | Acquisition price **not officially disclosed**. Press reports: **~€110M** ([EU-Startups](https://www.eu-startups.com/2021/07/swedish-fintech-giant-klarna-acquires-german-startup-stocard-for-about-e110-million/), "neither firm has confirmed"), **€113M** (≈$133M, attributed to Handelsblatt) ([The Paypers](https://thepaypers.com/payments/news/klarna-reportedly-buys-stocard-for-eur-113-mln)), **€140M** ([FoundersNetwork](https://foundersnetwork.com/from-0-to-70-million-users-to-exit-building-europes-leading-mobile-wallet-with-bjorn-gos-of-stocard/)). | Press reports (unconfirmed) |
| Stocard in Klarna's SEC F-1/A (2025-09-08) | Goodwill "primarily related to… acquisitions in 2021 and 2022, including PriceRunner Group AB, Stocard GmbH and Sofort GmbH". The "transition of Stocard customers" drove growth in active consumers (111M as of 2025-06-30) and caused a "year-over-year decrease in our ARPAC". No separate Stocard revenue is disclosed ([F-1/A](https://www.sec.gov/Archives/edgar/data/2003292/000200329225000036/klarnagroupplcf-1a4.htm)). | Fact (filing) |
| **Key Ring → inMarket** | Bought from Vericast, Dec 2020, terms undisclosed. 14M+ downloads. Monetised via retailer/CPG marketing (ads, tracking label) ([press release](https://salestechstar.com/sales-engagement/inmarket-acquires-key-ring-expanding-its-data-driven-marketing-and-insights-suite/)). | Fact (release); revenue unknown |
| **SuperCards** | ~3–4M users (listing; [Trending Topics](https://www.trendingtopics.eu/superplan-stocard-founders-shopping-list-app/)). Revenue and funding "not disclosed". Sister app SuperPlan uses an optional subscription (€1.99/wk, €29.99/yr). | Fact (users); revenue unknown |
| Pass2U, WalletPasses, PassWallet, FidMe, ONEWallet, Folio, Catima, LazyByte, Magnetic Lab, Card-Safe, DigWallet | **No public revenue data found.** Only install bands and rating counts (table above). | — |
| Third-party trackers (Sensor Tower, Appfigures, AppMagic) | App pages exist, but download/revenue figures sit behind a login: fetches returned no figures or HTTP 403 ([Sensor Tower](https://app.sensortower.com/overview/372547556?country=US), [AppMagic](https://appmagic.rocks/iphone/pass2u-wallet-add-store-card/1142473931), [Appfigures](https://appfigures.com/apps/ios/1142473931)). **I obtained no estimates, so none are given.** | — |

**Inference** (no third-party numbers used):

- **What sells:** the large players (Stocard, Key Ring, FidMe, WalletPasses) earn through **ads, retailer marketing or a parent business (BNPL)**, not through unlock fees. The paid-unlock and subscription ID wallets all have **small rating counts (tens to low thousands)**, consistent with small revenue.
- **Unit economics:**
  - Apple's [Small Business Program](https://developer.apple.com/app-store/small-business-program/) and Google Play's [service fee](https://support.google.com/googleplay/android-developer/answer/112622) both take **15%** on the first $1M per year for qualifying developers.
  - At that rate a $2.99 unlock nets about **$2.54** before taxes the store handles. That is roughly **$2.5k per 1,000 paying users**.
  - *Inference:* at the install scale of the closest image-wallet clones (1K–100K installs) and a typical low single-digit conversion, the realistic outcome is **hundreds to low thousands of dollars per year**, not a business. That is fine if CardHolder is a portfolio or utility app, but it should not carry heavy paid acquisition.

---

## 3. Market size and trend

**Demand signals (facts)**

- **Platform wallets are used at massive scale.** Google Wallet has 1B+ Play installs. The Apple Wallet App Store listing has 7.5M US ratings (table).
- **Stocard alone had 48M users** in 2022 ([Klarna](https://www.klarna.com/international/press/klarna-app-is-enhanced-with-digital-wallet-for-easy-access-to-loyalty-cards/)).
- **Key Ring had 14M+ downloads** by 2020 ([release](https://salestechstar.com/sales-engagement/inmarket-acquires-key-ring-expanding-its-data-driven-marketing-and-insights-suite/)).
- **Klarna's F-1/A** says digital wallets "to store various payment methods and manage loyalty cards" are "expected to drive 20% annual growth in their use through 2027". It cites a "Market Opportunity Study", which is a study prepared for Klarna's IPO, so this is an **estimate** ([F-1/A](https://www.sec.gov/Archives/edgar/data/2003292/000200329225000036/klarnagroupplcf-1a4.htm)).
- **Estimate (Juniper Research, 2022 forecast):** digital wallet users exceed **5.2B by 2026**, and spend exceeds **$12tn in 2026** ([NFCW summary](https://www.nfcw.com/?p=78379)). This covers payment wallets, not card-storage apps.

**The category is consolidating into platforms (facts)**

- Stocard was absorbed into Klarna and delisted.
- Apple added Create a Pass (iOS 27).
- Google added Everything Else, including private ID and insurance passes.

**Are Apple and Google closing the no-barcode gap?**

| Need | Apple Wallet (iOS 27) | Google Wallet | Status for CardHolder |
|---|---|---|---|
| Barcode loyalty/membership card | Yes, photo → pass (Apple Intelligence iPhones) | Yes | **Closed.** Don't compete here. |
| No-barcode membership card (name + number) | Manual **text** template, no image | Everything Else from photo; image kept | **Mostly closed on Android; half-open on iOS.** |
| Insurance card (show the front/back image) | No image-based pass; manual text only | Yes, as a private pass from photo | **Open on iOS; closed where Everything Else is available.** |
| Government ID (official) | US states + US passport Digital ID; Japan | Issuer-provisioned IDs (region-dependent) | Official IDs are moving to issuer-backed credentials. A photo copy is a convenience, not an ID. |
| Works on any phone, offline, no account | Photo path needs iPhone 15 Pro+ and supported language/region | Needs Google account; consent for AI extraction | **CardHolder's differentiator.** |

Sources: [Apple Create passes](https://support.apple.com/guide/iphone/create-passes-el8l5r9jnhyv/ios), [Apple Newsroom 2026-06](https://www.apple.com/newsroom/2026/06/apple-unveils-innovative-features-and-intelligence-experiences-across-services/), [learn.wallet.apple/id](https://learn.wallet.apple/id), [Google Wallet Help 12060038](https://support.google.com/wallet/answer/12060038?hl=en), [Google Wallet Help 14188766](https://support.google.com/wallet/answer/14188766?hl=en). The "Needs Google account" entry is *Inference* from Google Wallet requiring sign-in. I did not verify it on a Google page.

*Inference (trend):* the window is closing year by year. Apple's next logical step is image or no-barcode passes. If that ships, CardHolder's iOS pitch shrinks to "offline, no account, works on older iPhones, counter view".

---

## 4. UAE / GCC angle

**Emirates ID is already digital (facts)**

- ICP's FAQ: "After the ID card is issued, the customer can view the electronic version in the 'ICP UAE' application… The digital ID can also be used through the 'UAE Pass' application" ([ICP FAQ](https://icp.gov.ae/en/faq/)).
- The UAEICP app offers "A digital wallet for official documents" ([ICP app page](https://icp.gov.ae/en/uaeicp-mobile-smart-app/)).
- UAEICP has **191,926 ratings** in the AE App Store (AE iTunes API, [listing](https://apps.apple.com/ae/app/id1374301965)).

**Emirates ID in Apple Wallet**

- Gulf News reports the UAEICP app lets iPhone users "Add to Apple Wallet" for their Emirates ID, including sponsored family members (updated 2024-07-05) ([Gulf News](https://gulfnews.com/living-in-uae/visa-immigration/never-forget-your-emirates-id-again-add-it-to-apple-wallet-in-three-easy-steps-1.1720191272567)).
- I found **no ICP primary page** confirming this. Treat it as a reported fact, and note it is **iOS only**: no Google Wallet equivalent was found.

**UAE PASS**

- National digital identity: "Request for your official documents", "Avail services through sharing the digital documents" ([AS AE](https://apps.apple.com/ae/app/id1377158818)).
- 10M+ Play installs, 3.72★ from 38,432 ratings ([Play](https://play.google.com/store/apps/details?id=ae.uaepass.mainapp)). The digital vault is described on [u.ae](https://u.ae/en/about-the-uae/digital-uae/digital-transformation/platforms-and-apps/the-uae-pass-app).

**Insurance cards**

- Daman's app lets members "View and download digital insurance cards". It has 6.9k AE ratings ([AS AE](https://apps.apple.com/ae/app/id645829737)).
- UAE health insurance is linked to the Emirates ID, and clinics read coverage from it. Reports also note cases where a clinic could not read the policy, so an e-card is advised ([Gulf News](https://gulfnews.com/uae/health/dubai-clinics-accepting-emirates-id-1.1989400)). These are secondary sources, mostly 2017–2024.

**Third-party card wallets barely register in the UAE (AE storefront rating counts, 2026-10-19)**

- SuperCards 45, Pass2U 58, Folio 55, mobile-pocket 549, MyCardWallet 24. Apple Wallet has 115,326.
- No dedicated UAE-built photo-card wallet was found.
- "My Card Wallet: Secure Notes" (seller **highglossy FZE**; FZE is a UAE free-zone company suffix, *inference*) is a bank-card and secure-notes app with subscriptions. It is not an image card wallet ([AS AE](https://apps.apple.com/ae/app/id1259742455)).

**AED pricing norms (UAE App Store)**

| App | US price | AE price |
|---|---|---|
| Pass2U Pro (one-time) | $2.99 | **AED 12.99** |
| highglossy "3 cups" tip | $2.99 | **AED 12.99** |
| Insurance Card (paid app) | $1.99 | **AED 7.99** |
| Barcodes Lifetime | $14.99 | AED 29.99 (developer-set lower) |

Sources: [Pass2U AE](https://apps.apple.com/ae/app/id1142473931), [highglossy AE](https://apps.apple.com/ae/app/id1259742455), [Insurance Card lookup AE](https://itunes.apple.com/lookup?id=6743356524&country=ae), [Barcodes AE](https://apps.apple.com/ae/app/id1610894014).

*Inference:*
- Apple's auto-equalised UAE price for a $2.99 product appears to be **AED 12.99**. **AED 10.99** is a deliberate ~15% local discount and must be set manually per storefront.
- Either price is a common UAE impulse price point.

*Inference (UAE positioning):* in the UAE, CardHolder's best use cases are **not** Emirates ID or primary health insurance, which are already digital via government and insurer apps. They are **everything else that's physical and barcode-less**:
- gym, club and community memberships
- secondary or travel insurance
- home-country IDs for expats
- residence-related cards from other countries
- kids' school IDs
- loyalty cards that only print a number

The expat-heavy population (multiple countries' cards per person) is the strongest local angle.

---

## 5. Implications for CardHolder

### Is $2.99 one-time in line?

**Yes, at the low-to-middle of one-time unlocks.**

| Benchmark | Price |
|---|---|
| Pass2U Pro | $2.99 |
| LazyByte Premium | $1.99 |
| Magnetic Lab | $3.49 |
| Barcodes Lifetime | $14.99 |
| Insurance Card (paid up front) | $1.99 |
| Subscription ID wallets | $24.99–$44.99/yr |
| Password managers | $19.80–$47.88/yr |

Sources are in the table above.

- *Inference:* $2.99 is credible and avoids the "weekly subscription" stigma common in this category.
- There is room to test **$3.99–$4.99**, since the target user is protecting IDs and insurance, not saving coupons.
- On iOS, AED 12.99 would match Apple's own equivalence. AED 10.99 is fine as a deliberate local discount.
- **"4 free cards" is the same as LazyByte's free tier.** Expect comparison if both are discovered.

### Strongest differentiators

All of these are *Inference*, grounded in the facts above.

1. **Counter view.** Full-screen image, max brightness, flip, pinch zoom, ≤2 taps. No competitor reviewed advertises this as the core feature. Platform wallets show barcodes or text, and image wallets (Folio, Card-Safe) are organisers, not presenters.
2. **Image-first for barcode-less cards on iOS.** Apple has no image-based pass. Folio, the main iOS image wallet, needs an account and cloud.
3. **Truly offline, no account, "Data Not Collected", encrypted at rest.**
   - Folio uses the cloud.
   - Key Ring, Pass2U and FidMe track or show ads.
   - Card-Safe is reportedly unencrypted.
   - Google Everything Else requires accepting AI consent terms.
4. **Works on every supported phone.** Apple's photo-to-pass needs iPhone 15 Pro+ and Apple Intelligence (which does not support Arabic), and Google Everything Else is region-limited.
5. **Cross-platform with a portable encrypted backup file.** A move between iOS and Android is a real expat or phone-switch scenario, and platform wallets can't do it.

### Biggest risks

1. **Platform absorption.**
   - Google Everything Else already does photo-to-pass for IDs and insurance (where available).
   - Apple shipped barcode Create a Pass in iOS 27 and could add image passes next.
   - *Inference:* high probability that the iOS gap narrows within 1–2 OS cycles.
2. **Free, privacy-maximal Android rival.** Catima is free, open source, offline, with front/back images and encrypted export. Paying $2.99 on Android is a hard sell to the privacy-conscious users CardHolder targets.
3. **Near-identical clone exists.** LazyByte has a matching model and is Android-only today, but it may ship on iOS.
4. **Name collision.** "Card Holder: Store Card Wallet" and "Cardholder" are on the App Store, and "ID Card Wallet - Card Holder" (100K+) is on Play. The design already flags a name check; the evidence says **pick a more distinctive name** or a strong subtitle.
5. **Discovery and revenue ceiling.** Category search is dominated by Apple/Google Wallet, Klarna and multi-million-install apps. Image-ID wallets sit at 1K–100K installs with small rating counts. *Inference:* expect small revenue, as in §2.
6. **UAE-specific substitution.** Emirates ID is in UAEICP/UAE PASS (and Apple Wallet via ICP), and health insurance is tied to the Emirates ID or insurer apps. That removes the two highest-value UAE cards from CardHolder's pitch.
7. **Data-loss support burden.** "Passphrase file is the only backup" means lost phones or forgotten passphrases become one-star reviews. Competitors offer cloud (Folio, Key Ring) or QR backup (SuperCards).
   - *Inference:* the export nudge in the design is necessary.
   - An optional user-chosen location reminder ("save to Files/Drive") would mitigate this without adding a network.

### Suggested positioning

This is *Inference*.

- **Positioning line:** "Show any card, fast — even the ones without a barcode. Offline, no account."
- **Lead the store screenshots with the counter view, using an insurance card or a membership card with no barcode.** Don't lead with loyalty barcodes, where Apple, Google, SuperCards and Catima are strong and free.
- **In the UAE, market to expats:** home-country IDs, gym and club cards, travel insurance.

---

## Sources

All accessed 2026-10-19.

**Apple**
- Apple Support: Create passes in Wallet on iPhone (iOS 27) — https://support.apple.com/guide/iphone/create-passes-el8l5r9jnhyv/ios
- Apple Support: Create a pass using Siri Mode in Apple Wallet — https://support.apple.com/en-sg/127821
- Apple Newsroom (2026-06): services features incl. Wallet passes — https://www.apple.com/newsroom/2026/06/apple-unveils-innovative-features-and-intelligence-experiences-across-services/
- Apple Newsroom (2025-11-12): Digital ID — https://www.apple.com/newsroom/2025/11/apple-introduces-digital-id-a-new-way-to-create-and-present-an-id-in-apple-wallet/
- ID in Wallet (states/countries) — https://learn.wallet.apple/id
- Apple Small Business Program — https://developer.apple.com/app-store/small-business-program/
- iTunes Search/Lookup API (ratings, prices; US & AE storefronts) — https://itunes.apple.com/search , https://itunes.apple.com/lookup

**Google**
- Google Wallet Help: Manage items (Everything Else, private passes) — https://support.google.com/wallet/answer/12060038?hl=en
- Google Wallet Help: Add other passes and cards from images — https://support.google.com/wallet/answer/14188766?hl=en
- Google Play service fees — https://support.google.com/googleplay/android-developer/answer/112622
- 9to5Google (secondary, Aug 2024 launch details) — https://9to5google.com/2024/08/12/google-wallet-everything-else/

**Klarna / Stocard**
- Klarna Group plc F-1/A (SEC, 2025-09-08) — https://www.sec.gov/Archives/edgar/data/2003292/000200329225000036/klarnagroupplcf-1a4.htm
- Klarna press (2022-06-22): loyalty cards in Klarna app — https://www.klarna.com/international/press/klarna-app-is-enhanced-with-digital-wallet-for-easy-access-to-loyalty-cards/
- Stocard contact/FAQ (shutdown, migration) — https://stocardapp.com/en/us/contact
- EU-Startups (2021, ~€110M, unconfirmed) — https://www.eu-startups.com/2021/07/swedish-fintech-giant-klarna-acquires-german-startup-stocard-for-about-e110-million/
- The Paypers (2021, €113M reported) — https://thepaypers.com/payments/news/klarna-reportedly-buys-stocard-for-eur-113-mln
- FoundersNetwork (€140M claim) — https://foundersnetwork.com/from-0-to-70-million-users-to-exit-building-europes-leading-mobile-wallet-with-bjorn-gos-of-stocard/

**Other companies**
- Trending Topics (2026-10-07): Super Apps Studio / SuperCards — https://www.trendingtopics.eu/superplan-stocard-founders-shopping-list-app/
- inMarket acquires Key Ring (press release reprint, 2020-12-11) — https://salestechstar.com/sales-engagement/inmarket-acquires-key-ring-expanding-its-data-driven-marketing-and-insights-suite/
- Catima GitHub README & CHANGELOG — https://github.com/CatimaLoyalty/Android , https://github.com/CatimaLoyalty/Android/blob/main/CHANGELOG.md
- Bitwarden pricing — https://bitwarden.com/pricing/
- 1Password pricing — https://1password.com/pricing/password-manager

**App Store listings (US unless noted)**
- Apple Wallet https://apps.apple.com/us/app/id1160481993
- Klarna https://apps.apple.com/us/app/id1115120118
- SuperCards https://apps.apple.com/us/app/id6482576688
- Key Ring https://apps.apple.com/us/app/id372547556
- Pass2U https://apps.apple.com/us/app/id1142473931 ([AE](https://apps.apple.com/ae/app/id1142473931))
- FidMe https://apps.apple.com/us/app/id391329324
- mobile-pocket https://apps.apple.com/us/app/id384619059
- Barcodes https://apps.apple.com/us/app/id1610894014 ([AE](https://apps.apple.com/ae/app/id1610894014))
- Folio https://apps.apple.com/us/app/id1266382717
- Card-Safe https://apps.apple.com/us/app/id1455090837
- DigWallet https://apps.apple.com/us/app/id1636833006
- ID Cards Wallet – Card Keeper https://apps.apple.com/us/app/id1644695297
- All Cards Wallet https://apps.apple.com/us/app/id6747915830
- Card Holder: Store Card Wallet https://apps.apple.com/us/app/id1618760047
- Insurance Card https://apps.apple.com/us/app/id6743356524
- 1Password https://apps.apple.com/us/app/id1511601750
- Bitwarden https://apps.apple.com/us/app/id1137397744
- My Card Wallet (highglossy FZE, AE) https://apps.apple.com/ae/app/id1259742455
- UAEICP (AE) https://apps.apple.com/ae/app/id1374301965
- UAE PASS (AE) https://apps.apple.com/ae/app/id1377158818
- Daman Health (AE) https://apps.apple.com/ae/app/id645829737

**Google Play listings (US)**
- Google Wallet https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel
- Klarna https://play.google.com/store/apps/details?id=com.myklarnamobile
- Stocard (Not Found) https://play.google.com/store/apps/details?id=de.stocard.stocard
- SuperCards https://play.google.com/store/apps/details?id=de.superapps.supercards
- Key Ring https://play.google.com/store/apps/details?id=com.froogloid.kring.google.zxing.client.android
- Pass2U https://play.google.com/store/apps/details?id=com.passesalliance.wallet
- WalletPasses https://play.google.com/store/apps/details?id=io.walletpasses.android
- PassWallet https://play.google.com/store/apps/details?id=com.attidomobile.passwallet
- Catima https://play.google.com/store/apps/details?id=me.hackerchick.catima
- FidMe https://play.google.com/store/apps/details?id=fr.snapp.fidme
- mobile-pocket https://play.google.com/store/apps/details?id=at.bluesource.mobilepocket
- ONEWallet https://play.google.com/store/apps/details?id=com.kmshack.onewallet
- Folio https://play.google.com/store/apps/details?id=com.folioltd
- LazyByte ID Card Wallet https://play.google.com/store/apps/details?id=com.lazybyte.wallet
- Magnetic Lab ID Card Wallet https://play.google.com/store/apps/details?id=com.crunch.idcardwallet
- 1Password https://play.google.com/store/apps/details?id=com.onepassword.android
- Bitwarden https://play.google.com/store/apps/details?id=com.x8bit.bitwarden
- UAE PASS https://play.google.com/store/apps/details?id=ae.uaepass.mainapp

**UAE government / local**
- ICP FAQ (electronic Emirates ID) — https://icp.gov.ae/en/faq/
- ICP UAEICP smart app page — https://icp.gov.ae/en/uaeicp-mobile-smart-app/
- u.ae: The UAE Pass — https://u.ae/en/about-the-uae/digital-uae/digital-transformation/platforms-and-apps/the-uae-pass-app
- Gulf News (2024-07-05): Emirates ID in Apple Wallet via UAEICP (secondary) — https://gulfnews.com/living-in-uae/visa-immigration/never-forget-your-emirates-id-again-add-it-to-apple-wallet-in-three-easy-steps-1.1720191272567
- Gulf News: Dubai clinics accepting Emirates ID (secondary) — https://gulfnews.com/uae/health/dubai-clinics-accepting-emirates-id-1.1989400

**Estimates (third-party)**
- Juniper Research digital wallet forecast, via NFCW — https://www.nfcw.com/?p=78379
- Sensor Tower / AppMagic / Appfigures app pages (figures gated; none used) — https://app.sensortower.com/overview/372547556?country=US , https://appmagic.rocks/iphone/pass2u-wallet-add-store-card/1142473931 , https://appfigures.com/apps/ios/1142473931
