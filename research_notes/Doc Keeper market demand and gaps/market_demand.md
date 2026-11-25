# Market demand for personal document-vault / ID-and-card-wallet apps (Doc Keeper)

Research date: 21 Nov 2026. Store figures were pulled directly from Google Play listing HTML (US locale) and the Apple iTunes Search API (US storefront) on that date unless otherwise noted. Play install figures are Google's coarse bands (e.g. "100K+"), not exact counts. App Store "ratings" is the US-storefront rating count only (not downloads).

## 1. Download / rating counts for leading apps in the category

### Takeaway
The pure "store photos of my IDs/documents" category is real but small and fragmented. The biggest dedicated apps reach roughly 100K–1M+ Play installs; the category leader, Folio, has about 500K+ Play installs plus about 7K US iOS ratings. Volume at the 1M–10M+ level goes to loyalty/card wallets (Cards, PassWallet, SuperCards), password managers that also store documents (Keeper, Bitwarden, 1Password), and government wallets (DigiLocker, UAE PASS, Google/Apple Wallet). There is a long tail of 2025–2026 entrants with near-zero traction. This is a niche with proven but modest demand, and a crowded long tail.

### Cited Findings

**Dedicated ID / document wallet apps (closest competitors), Google Play, as of 21 Nov 2026**
| App (package) | Developer | Installs | Rating | Reviews | Monetization signal |
|---|---|---|---|---|---|
| Folio: Digital Wallet App (com.folioltd) | Folio Technologies | 500K+ | 4.6 | 6.6K | In-app purchases; listing shows $9.99–$99.99 per item (parse may include an adjacent block; verify) |
| Wallet - Digital Cards & IDs (com.walletapp.digitalcards.ids) | EKTA VIRANI (per iOS listing) | 500K+ | 4.6 | 2.65K | IAP $0.99–$99.99 per item |
| Wallet - Digital Wallet Card (com.cards.wallet.cardsapp) | SUNMARE Digital (Turkey) | 1M+ | 4.2 | 20.5K | IAP $9.99–$99.99 per item |
| MyDocs: Documents Organizer (work.opale.mydocs) | Opale Mobile | 100K+ | 4.7 | 3.5K | IAP $2.99 + ads |
| ID Card Wallet - Card Holder (com.crunch.idcardwallet) | Crunch | 100K+ | 4.3 | 1.66K | IAP $3.49 (looks like a one-time unlock) |
| Passport.app (com.travizory.passport.wallet) | Travizory Border Security | 100K+ | 4.8 | 1.88K | Free (B2G travel-document app) |
| ID Card Wallet: Card Holder (com.brainappsvilles.idcardswallts) | Brainappsvilles | 50K+ | 3.2 | 506 | — |
| Document & ID Card Wallet (com.fairappsstore.idcardswallet) | Fair Apps Store | 10K+ | 4.0 | 439 | IAP + ads |
| Wallet - ID & Card Storage (com.cards.docs.wallet) | — | 10K+ | 3.9 | — | — |
| DocVault - Document Manager (com.infopriks.doc_vault) | InfoPriks | 10K+ | 3.9 | — | IAP |
| Secure Document Wallet (com.jedy.secure.document.wallet.files) | spp infotech | 10K+ | 4.4 | — | IAP + ads |
| Document Locker: ID Card Vault (com.pygaa.document_locker) | Pygaa | 10K+ | 4.2 | 128 | — |
| Card Wallet – Mobile Wallet (com.golemapps.cardwallet) | UtilitySoft Labs | 10K+ | 4.9 | 192 | IAP |
| OSS Card Wallet, PDF & OCR (com.akylas.cardwallet) | Akylas (open source) | 1K+ | 5.0 | 35 | — |
| Kosh: ID & Document Wallet; Family Ledger: Document Wallet; Secure Document Vault (digidockerpro); OfflineDocs; Document Vault: Secure IDs (Kawaii); Document Wallet (linhnh285) | various | 0+ to 50+ | — | — | Mostly new 2026 entrants |

Source for all rows: Google Play listings, e.g. [Folio](https://play.google.com/store/apps/details?id=com.folioltd&hl=en_US), [Wallet - Digital Cards & IDs](https://play.google.com/store/apps/details?id=com.walletapp.digitalcards.ids&hl=en_US), [Wallet - Digital Wallet Card](https://play.google.com/store/apps/details?id=com.cards.wallet.cardsapp&hl=en_US), [MyDocs](https://play.google.com/store/apps/details?id=work.opale.mydocs&hl=en_US), [ID Card Wallet - Card Holder](https://play.google.com/store/apps/details?id=com.crunch.idcardwallet&hl=en_US), [Passport.app](https://play.google.com/store/apps/details?id=com.travizory.passport.wallet&hl=en_US), [Document Locker](https://play.google.com/store/apps/details?id=com.pygaa.document_locker&hl=en_US), [OSS Card Wallet](https://play.google.com/store/apps/details?id=com.akylas.cardwallet&hl=en_US), [Kosh](https://play.google.com/store/apps/details?id=com.nexivaservices.kosh&hl=en_US)

**Expiry-reminder-only apps (Play):** every one I checked has under 1K installs. Examples: DocuAlert (500+), Document & Vehicle Expiry (100+), Document Expiry Reminder (50+), Expiry & Renewal Reminder (10+) — [DocuAlert](https://play.google.com/store/apps/details?id=com.docualert.documents_expiry_reminder&hl=en_US), [Document & Vehicle Expiry](https://play.google.com/store/apps/details?id=com.ilyas.ilyasapps.documentexpiry&hl=en_US). Play search for "document expiry reminder" returned about 30 apps, mostly small or new, such as ExpiryGuard, ExpiryKeeper and ExpiryPilot — [Play search](https://play.google.com/store/search?q=document+expiry+reminder&c=apps).

**Apple App Store (US) rating counts, from the iTunes Search API, 21 Nov 2026**
- Folio: Digital Wallet App — 6,950 ratings, 4.71, free, released 2017 — [App Store](https://apps.apple.com/app/id1266382717)
- ID123 Digital ID Card App — 6,951 ratings, 4.84. This is mostly an institution-issued student/member ID, so it is not a direct competitor — [iTunes search](https://itunes.apple.com/search?term=id+card+wallet&entity=software&country=us)
- Card Manager: Digital Wallet (Astrum Computing) — 2,020 ratings, 4.73; COZY Wallet — 2,596 ratings; Passport.app — 953 ratings — same source
- DigWallet: ID and Card Keeper — 90; ID Cards Wallet - Card Keeper — 36; digiID: Document Wallet — 39; Document Expiry (SPARC) — 24 — same source
- At least 10 document-wallet or document-expiry apps released Jan–Oct 2026 have 0–3 US ratings. Examples: VaultKeep, Dokus, Expiro, Docmind, Renewo, EverPass, Vencio, "Expiry - Document Vault", Lockey, "Safe: Secure Document Vault" by Spruce Systems — [iTunes search "document expiry"](https://itunes.apple.com/search?term=document+expiry&entity=software&country=us), ["document wallet"](https://itunes.apple.com/search?term=document+wallet&entity=software&country=us)
- A third-party tracker estimates Folio at 552K+ iOS downloads — [mwm.ai](https://mwm.ai/apps/folio-digital-wallet-app/1266382717). This is an estimate of unknown quality.
- Folio itself claims "over a million documents" stored, by users in more than 120 countries — [folio.id/about](https://folio.id/en/about/) (undated, self-reported)

**Adjacent categories (Play installs, 21 Nov 2026)**
- Loyalty/card wallets: Cards - Mobile Wallet 10M+ (345K reviews); PassWallet 5M+ (45.3K); SuperCards 1M+ (110K); mobile-pocket 1M+ (44.6K); ONEWallet 1M+ (42.7K); Catima (FOSS) 100K+ (1.89K) — [Cards](https://play.google.com/store/apps/details?id=com.cardsapp.android&hl=en_US), [PassWallet](https://play.google.com/store/apps/details?id=com.attidomobile.passwallet&hl=en_US), [SuperCards](https://play.google.com/store/apps/details?id=de.superapps.supercards&hl=en_US), [Catima](https://play.google.com/store/apps/details?id=me.hackerchick.catima&hl=en_US)
- Password managers that also store documents: Keeper 10M+ (112K reviews, 4.7); Bitwarden 5M+ (191K, 4.7); 1Password 1M+ (27.7K, 4.7) — [Keeper](https://play.google.com/store/apps/details?id=com.callpod.android_apps.keeper&hl=en_US), [Bitwarden](https://play.google.com/store/apps/details?id=com.x8bit.bitwarden&hl=en_US), [1Password](https://play.google.com/store/apps/details?id=com.onepassword.android&hl=en_US). Keeper also has 232,590 US iOS ratings — [iTunes search](https://itunes.apple.com/search?term=secure+documents&entity=software&country=us).
- Google Wallet: 1B+ installs, 2.28M reviews — [Play](https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel&hl=en_US). Apple Wallet: 7.58M US ratings — iTunes API.
- Stocard: the Play listing com.stocard.stocard now returns "Not Found". Stocard's loyalty cards were migrated into Klarna, and users reported failed transfers (one moved only 6 of 40+ cards) — [MacRumors forum thread](https://forums.macrumors.com/threads/stocard-replacement.2434874), [Klarna press release, 6 Apr 2022](https://www.klarna.com/international/press/stocard-joins-klarna-and-gets-smoooth-with-an-all-new-brand-identity/). SuperCards is described as Stocard's "natural successor", built by the original Stocard team — [Packing Light Travel, Nov 2025](https://packinglighttravel.com/travel-tech/best-loyalty-card-wallet-app/).

### Inferences
- **Realistic ceiling.** A good dedicated document-wallet app reaches the 100K–1M install band on Play over several years. Folio needed about 9 years (iOS launch 2017) to reach 500K+ on Play.
- **Demand is broad but shallow.** Loyalty-card wallets are 10x larger than ID/document wallets. People want "cards on phone" far more than "documents on phone", and Doc Keeper's documents-first positioning targets the smaller pool.
- **Expiry reminders don't stand alone.** Standalone expiry apps have almost no traction, so reminders work as a feature, not a product.
- **The long tail keeps growing.** 10+ new iOS and several new Play entrants in 2026 have near-zero ratings. Discovery and ASO, not the existence of demand, will be the binding constraint for a new app.
- **Privacy demand exists.** Catima (FOSS, offline) reached 100K+ and an open-source OCR card wallet (Akylas) exists, so there is a privacy-conscious, offline niche. Several listings use "100% offline" as a headline claim (crunch.idcardwallet, cards.docs.wallet), so offline is a common claim, not a unique one.

### Gaps
- Exact download numbers (as opposed to Play bands) and DAU/retention for any competitor. Sensor Tower and Appfigures pages require login.
- The "Keepy-type", "Pocket Docs" and "Documents Organizer" names in the brief did not resolve to identifiable large apps. Keepy is a kids' memories app, not a document wallet. No app with a material install base was found under those names.
- Country-level splits (UAE, India) for competitor installs were not available.

## 2. Search-demand signals (Google Trends / keyword volume)

### Takeaway
I found no reliable public keyword-volume figures for "document wallet app", "store ID on phone", "passport expiry reminder" or "digital wallet for documents". Google Trends is not retrievable as data from this environment. Search demand is unquantified here.

### Cited Findings
- Third-party tools estimate the adjacent term "document sharing app" at about 2.4K US monthly searches. This is a different product, so it is a loose proxy only — [MicroSaaSHQ](https://microsaashq.com/keyword-research/document-sharing-app)
- "Document wallets" on Amazon UK gets about 313K searches per year, but for the physical stationery product. It is not an app-demand signal — [Flapen](https://flapen.com/research/uk/stationery-office-supplies/document-wallets)
- An indirect store-side signal: Play search results for "document wallet", "id card wallet", "passport wallet", "document expiry reminder" and "secure document vault" each return 13–31 distinct apps, and many are 2025–2026 entrants — [Play search "document wallet"](https://play.google.com/store/search?q=document+wallet&c=apps)

### Inferences
- The volume of new indie entrants suggests developers see demand in this space, or see it as an easy app to build. It is not evidence of user search volume.

### Gaps
- Google Trends interest-over-time and by-region (UAE, India), and Google Keyword Planner volumes. These need manual checks in Trends, Keyword Planner, AppTweak or Appfigures ASO tools. The brief's keyword list should be checked there before investing in ASO.

## 3. Market-size reports

### Takeaway
Analyst reports size the "digital ID wallet" market at about USD 11.6B in 2024, growing about 17%/yr, and password management at about USD 2.5–4.2B in 2025, growing about 12–20%/yr. These figures are dominated by government/enterprise identity and B2B security spend and say little about a consumer offline document-vault app. Treat them as low-relevance, low-reliability context. I found no report sizing a "personal document management app" segment.

### Cited Findings
- Digital ID wallet market: USD 11.62B (2024) → USD 13.57B (2025) → USD 29.88B (2030), CAGR 17.03% (360iResearch via GII) — [GII](https://www.gii.co.jp/report/ires1718462-digital-id-wallet-market-by-technology-type-device.html)
- Digital identity solutions: USD 44.20B (2025) → USD 132.14B (2031), CAGR 20.0% — [MarketsandMarkets](https://www.marketsandmarkets.com/Market-Reports/digital-identity-solution-market-247527694.html). P&S Intelligence: USD 40.1B (2024) → USD 117.42B (2030), CAGR 19.6% — [P&S](https://www.psmarketresearch.com/market-analysis/digital-identity-solutions-market)
- Password management estimates disagree widely:
  - DIResearch: USD 2.47B (2025) → 7.39B (2032), CAGR 16.96% — [MarketResearch.com](https://www.marketresearch.com/Deep-Insights-Research-Co-DIR-v4285/Global-Password-Management-Research-Competitive-41704005)
  - USD 3.8B (2025) → 13.3B (2032), CAGR 19.6% — [MarketResearch.com / Market Glass](https://www.marketresearch.com/Market-Glass-Inc-v1039/Password-Management-44881639/)
  - Fortune Business Insights: USD 3.79B (2026) → 10.63B (2034), CAGR 13.77% — [FBI](https://www.fortunebusinessinsights.com/password-management-Industry-103753)
  - IMARC: USD 4.17B (2025) — [MarketResearch.com / IMARC](https://www.marketresearch.com/IMARC-v3797/Password-Management-44558241/)
  - Markets and Data: USD 2.46B (2024) → 5.90B (2032), CAGR 11.56% — [Markets and Data](https://www.marketsandata.com/industry-reports/password-management-market)
- Source quality: all of these are paywalled commercial market-research summaries with opaque methods. The spread between them (2x in base year, 11–26% CAGR) shows definitional inconsistency.

### Inferences
- The macro trend toward digital identity and secure-vault tools is clearly upward, but the addressable pool for a paid, offline, consumer document vault is a sliver of these numbers. Bottom-up store data (section 1) is the more honest sizing basis.

### Gaps
- No credible report on "personal document management apps" or "ID wallet apps (consumer, non-government)". None found.

## 4. Government digital ID wallets: adoption, and growth vs cannibalization

### Takeaway
Government wallets are big and growing fast: DigiLocker has 72.4 crore (724M) registered users, UAE PASS has 12M+, Apple Wallet IDs are in about 16+ US states plus passport-derived IDs, and the EUDI Wallet is due by Dec 2026 but most states are late. They normalize "my ID lives on my phone". They cannibalize the core ID/licence use case where they exist, especially in India and the UAE. They don't cover cross-border passports, foreign residents' home-country documents, insurance cards, certificates, family members' documents, or expiry tracking across issuers. The leftover niche is "everything the government wallet doesn't hold".

### Cited Findings
- **India / DigiLocker:**
  - 72.43 crore (about 724M) registered users as of 31 Jul 2026 (government reply to Rajya Sabha), with about 72.86 crore document-access transactions over the previous three years — [Free Press Journal, Aug 2026](https://www.freepressjournal.in/business/digilocker-crosses-7243-crore-users-umang-records-1166-crore-registrations-govt-informs-rajya-sabha), [IANS](https://ianslive.in/digilocker-reaches-more-than-7243-crore-registered-users-umang-at-over-1166-crore-users--20260812153558)
  - Over 62 crore as of Feb 2026, per a PIB document — [PIB PDF](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/mar/doc202638814801.pdf). A Lok Sabha release said about 18 crore users joined in the past year — [GKToday](https://www.gktoday.in/digilocker-crosses-72-crore-users-umang-reaches-11-crore/)
  - Play: DigiLocker 100M+ installs, 4.0 stars, 636K reviews (21 Nov 2026) — [Play](https://play.google.com/store/apps/details?id=com.digilocker.android&hl=en_US)
- **UAE / UAE PASS:**
  - 12M+ registered users (WAM, 20 Jul 2026), up from 11M+ (Sept 2025) and 7.2M (2023) — [WAM](https://www.wam.ae/en/article/c1betiw-world-economic-forum-recognises-uae-pass-global)
  - Gives access to 6,000+ government and private services — [Khaleej Times](https://www.khaleejtimes.com/uae/government/access-to-over-6000-govt-services-why-uae-pass-is-a-must-have-app)
  - Play: 10M+ installs, 3.7 stars, 39.2K reviews — [Play](https://play.google.com/store/apps/details?id=ae.uaepass.mainapp&hl=en_US)
- **US / Apple Wallet:**
  - Apple launched passport-based Digital ID in Apple Wallet with iOS 26.1 (Nov 2025). It is usable at TSA checkpoints for domestic travel, but not for international travel or as a passport replacement — [Apple Newsroom, Nov 2025](https://www.apple.com/newsroom/2025/11/apple-introduces-digital-id-a-new-way-to-create-and-present-an-id-in-apple-wallet/)
  - State driver's licences: 13 states + Puerto Rico (Jan 2026) — [MacRumors](https://www.macrumors.com/2026/01/16/iphone-drivers-licenses-2026/). Arkansas was added in May 2026 as the 14th state — [MacRumors](https://www.macrumors.com/2026/05/27/apple-wallet-ids-14th-state/). More states were announced Jul–Aug 2026 — [MacRumors](https://www.macrumors.com/2026/08/17/apple-wallet-ids-expanding-to-four-more-states)
  - Most states still say a digital ID does not replace the physical card — same sources
  - Google Wallet supports state IDs in some states (e.g. Arkansas). I found no confirmation of Google Wallet passport-based ID — [MacRumors](https://www.macrumors.com/2026/05/27/apple-wallet-ids-14th-state/)
- **EU / EUDI Wallet:** the legal deadline is 24 Dec 2026, but 24 of 27 member states were expected to miss it (Sept 2026). Italy leads with almost 8M monthly users (IT-Wallet); Germany is targeting Jan 2027; the Netherlands postponed to late 2027 after a pilot had only 57 users. Use is voluntary and paper documents stay valid — [Euronews, 16 Sep 2026](https://www.euronews.com/2026/09/16/eu-digital-wallet-24-of-27-members-will-miss-the-deadline), [eID Easy snapshot, Sep 2026](https://www.eideasy.com/blog/eu-digital-identity-wallets-september-2026)

### Inferences
- **Cannibalization risk is highest for:**
  - US driver's licences, in states with Apple/Google Wallet support
  - Indian national documents: Aadhaar, PAN, DL, RC and marksheets are all in DigiLocker
  - UAE Emirates ID and visa, via UAE PASS and ICP apps
- **Complement opportunity is highest for:**
  - Expats and migrants. The UAE population is about 88% expatriate (general knowledge, not sourced here). Their home-country passports, licences and certificates are not in UAE PASS, and DigiLocker serves Indians at home, not foreign documents. This fits Doc Keeper's "family persons" plus expiry-reminder angle, e.g. tracking residence visas, passports and Emirates IDs for a whole household.
  - Insurance cards, vaccination records, warranties and certificates
  - Multi-person family management
  - Offline access while travelling
- **Behaviour normalization.** Government wallets train users to trust phone-held IDs, which probably helps rather than hurts the "photo vault" behaviour for non-government documents. I found no study measuring this either way.
- **DigiLocker's growth (about 18 crore/yr) proves massive South Asian appetite for phone-stored documents.** It also means an Indian user's core IDs are already covered for free by the government.

### Gaps
- No data on whether document-wallet app installs fell where government wallets launched (no before/after study found).
- No user count for the Apple/Google Wallet ID feature itself.
- I did not check whether the 24 Dec 2026 EUDI deadline was met; it is after the research date.

## 5. Monetization evidence (pricing, revenue)

### Takeaway
Competitors mostly use freemium with in-app purchases. Listed IAP ranges ($9.99–$99.99) imply subscriptions or tiered plans at the larger apps (Folio, Cards wallet). Smaller utilities use a single $2.99–$3.49 unlock, close to Doc Keeper's planned one-time purchase. I found no public revenue estimates for any dedicated document-wallet app.

### Cited Findings
- **Folio:**
  - Free to download; Play shows IAP up to $99.99 per item (parse picked up "$19.99 per item" and "$9.99–$99.99"; verify on device) — [Play](https://play.google.com/store/apps/details?id=com.folioltd&hl=en_US)
  - Its Product Hunt launch said "totally free at the moment… in the future, we will integrate a subscription model", with basic features staying free — [Product Hunt](https://www.producthunt.com/posts/folio-wallet-app) (undated)
  - G2 lists no pricing — [G2](https://www.g2.com/products/folio-wallet/pricing)
- **Other dedicated apps, from Play IAP ranges (21 Nov 2026):**
  - Wallet - Digital Cards & IDs: $0.99–$99.99 per item
  - Wallet - Digital Wallet Card (SUNMARE, 1M+): $9.99–$99.99, i.e. subscription tiers
  - MyDocs: $2.99, plus ads
  - ID Card Wallet - Card Holder: $3.49 (single unlock)
  - Sources: [Play listings as cited in section 1]
- **Loyalty wallet Cards - Mobile Wallet (10M+):** IAP $0.99–$99.99, plus ads — [Play](https://play.google.com/store/apps/details?id=com.cardsapp.android&hl=en_US)
- **Password managers (subscription benchmark):** Keeper, Bitwarden and 1Password are all subscription products that include secure file/document storage. Their install bases are in the earlier table; current prices were not verified in this pass.
- **Revenue:** none of the results reported revenue, funding or income for Folio, and I found no other public revenue estimate for a dedicated document-wallet app — [folio.id](https://folio.id/en/about/), [mwm.ai](https://mwm.ai/apps/folio-digital-wallet-app/1266382717). Sensor Tower and Appfigures revenue pages need login.

### Inferences
- **Model mix.** The market shows both models. Larger players lean toward subscriptions with high-ceiling tiers; small offline utilities use a cheap one-time unlock. Doc Keeper's "10 free docs then one-time purchase" sits with the small offline utilities, and "no subscription" can be a differentiator against Folio-style tiers and password-manager subscriptions.
- **Revenue ceiling.** At 100K installs and a typical 1–3% paid conversion (an industry rule of thumb, not sourced here), a $3–$10 one-time price yields roughly low-to-mid five figures USD lifetime. This is side-project scale unless distribution is unusually strong.

### Gaps
- Actual subscription prices and plan names for Folio, the SUNMARE Wallet app, Keeper, 1Password and Bitwarden. These need a device-side check or the vendors' pricing pages.
- Revenue and download estimates from Sensor Tower or Appfigures; there are no public snippets for these apps.
- Conversion rates for freemium document-vault apps.
