# Platform wallets, government digital-ID / document wallets, and market signals for private document storage apps (state as of November 2026)

Verification legend used throughout:
- **[fetched]** = I opened the page and read the content.
- **[snippet]** = taken from a search-result summary of the linked page; the page itself was not opened, so wording and context are less certain.
- **[unverified]** = single weak source, conflicting sources, or a claim I could not confirm.

Research date: 11 November 2026.

---

## 1. Apple Wallet / Google Wallet / Samsung Wallet in 2025-2026: document types, countries, expiry notifications, exclusions, AI features

### Takeaway
All three platform wallets are still built around *issuer-verified* credentials (state mDLs, a US-passport-derived Digital ID, national ID passes) in a short list of jurisdictions, and none is a general document store. Google Wallet is the only one with a free-form "photograph any pass" path ("Everything else") and the only one with a shipped assistant that answers questions over wallet contents (Gemini Personal Intelligence, US-only, opt-in, cloud-based); neither covers contracts, policies or multi-page PDFs.

### Cited Findings

**Apple Wallet**
- State driver's licence / state ID in Apple Wallet is available in 16 US states plus Puerto Rico: Arizona, Arkansas, California, Colorado, Georgia, Hawaii, Illinois, Iowa, Maryland, Montana, New Mexico, North Dakota, Ohio, Oklahoma, Virginia, West Virginia and Puerto Rico; the page says "more on the way" without naming states. [fetched, November 2026] — [Apple, learn.wallet.apple/id](https://learn.wallet.apple/id)
- For comparison of pace: 12 states plus Puerto Rico were supported in November 2025, and about 13 states in February 2026 when Apple said seven more states planned support. [snippet] — [Biometric Update, Nov 2025](https://www.biometricupdate.com/202511/apple-launches-digital-ids-based-on-us-passports-to-wallet); [TechRepublic, Feb 2026](https://www.techrepublic.com/de/article/news-apple-iphone-drivers-licenses-seven-states/)
- Digital ID created from a US passport launched in November 2025 with iOS 26.1. It is US-only, needs an unexpired US passport and iPhone 11 or later (or Apple Watch Series 6 or later), and is set up by scanning the photo page and reading the passport chip. [fetched] — [Apple, learn.wallet.apple/id](https://learn.wallet.apple/id); launch date per [MacRumors, 13 Nov 2025](https://www.macrumors.com/2025/11/13/apple-launches-iphone-passport-feature/)
- Limits of Digital ID: accepted only at select US TSA checkpoints for domestic travel; it is not a passport replacement and cannot be used for international travel or border crossing. [fetched] — [Apple, learn.wallet.apple/id](https://learn.wallet.apple/id)
- ID in Wallet can be presented in person (select businesses, venues, TSA), in apps ("Verify with Apple Wallet"), and online in Safari; a physical ID "may still be required", e.g. for law enforcement. Apple's support page was last published 26 October 2026 and still describes availability only as "select U.S. states and territories". [fetched] — [Apple Support 118237](https://support.apple.com/en-us/118237)
- Outside the US, the only national ID I found in Apple Wallet at platform level is Japan's My Number Card. [snippet] — [Biometric Update, Nov 2025](https://www.biometricupdate.com/202511/apple-launches-digital-ids-based-on-us-passports-to-wallet)
- iOS 26 Wallet changes (autumn 2025) were: an AutoFill section storing full card number/expiry/security code, and order tracking extended to purchases not made with Apple Pay; order tracking is described as Apple Intelligence-powered. [snippet] — [9to5Mac, 13 Nov 2025](https://9to5mac.com/2025/11/13/apple-wallet-got-two-feature-upgrades-it-really-needed-in-ios-26/); [iGeeksBlog](https://www.igeeksblog.com/ios-26-wallet-app-new-features/)
- Insurance cards in Apple Wallet exist only where an insurer issues a pass. Example: Australian health insurers (Bupa, Medibank, nib, GU Health) since July 2021, usable at HICAPS terminals. This is issuer-driven, not a user scan feature. [snippet] — [MacRumors, 27 Jul 2021](https://www.macrumors.com/2021/07/27/australian-insurances-companies-apple-wallet/)

**Google Wallet**
- "Everything else" lets a user photograph a physical ID or pass and turn it into a Wallet item; launched in the US in August 2024 and by 3 September 2025 was expanding to other markets. Google's support page at that time excluded Australia, India and Japan from the photo-import instructions, though the article reports it was rolling out in India anyway. [fetched] — [Android Authority, 3 Sep 2025](https://www.androidauthority.com/google-wallet-everything-else-pass-rolling-out-3593890/)
- The feature recognises pass categories including passports, residence permits, library cards and health insurance cards. [snippet] — [TechRadar](https://techradar.com/phones/android/google-wallet-now-lets-you-add-passports-library-cards-and-health-insurance-thanks-to-ai)
- Verified "ID pass" (a separate, issuer/government-backed feature) has launched in Brazil, India, Singapore, Taiwan and the United Kingdom, in addition to the US. [snippet] — [ID Tech Wire](https://idtechwire.com/google-wallet-expands-digital-id-support-to-india-singapore-taiwan-and-brazil/)
- Google said it would bring ID passes to Spain, Italy, France, Ireland and Estonia as a first EU wave, targeted for the end of summer 2026. [snippet; I did not confirm the launch actually happened] — [FTN News](https://ftnnews.com/travel-news/technology/google-wallet-to-bring-digital-id-passes-to-spain-italy-france-ireland-and-estonia-this-summer/); [eMarketer](https://www.emarketer.com/content/google-wallet-roll-id-passes-eu-users)
- Gemini integration: Google Wallet can be connected to Gemini (Settings > Personal Intelligence > Connected Apps), giving the assistant access to boarding passes, event tickets, loyalty cards and other saved passes, and it can answer questions about them. It is opt-in and US-only. [snippet] — [TalkAndroid](https://www.talkandroid.com/532195-gemini-now-pulls-google-wallet-passes-and-spending-into-one-view/)
- The same integration lets users link financial accounts via Plaid so Gemini can review transactions; users must be 18+ with Gemini Apps Activity on; Gemini is read-only and cannot make payments. [snippet] — [Beebom](https://gadgets.beebom.com/news/google-gemini-can-track-your-spending-through-google-wallet); [Fastweb Plus](https://www.fastweb.it/fastweb-plus/intelligenza-artificiale/gemini-arriva-su-google-wallet-puo-trovare-documenti-e-analizzare-spese/)

**Samsung Wallet**
- California added Samsung Wallet to its mobile driver's licence programme on 28 April 2026. [snippet] — [Office of the Governor of California, 28 Apr 2026](https://www.gov.ca.gov/2026/04/28/california-expands-mobile-drivers-license-to-samsung-wallet-continuing-dmvs-digital-transformation/); [IDEMIA, 30 Apr 2026](https://na.idemia.com/2026/04/30/idemia-public-security-supports-samsung-wallet-launch-of-california-mobile-id/)
- Other Samsung Wallet mDL states reported: Arizona, Iowa and West Virginia (via IDEMIA's platform) and Arkansas (October 2025). [snippet] — [Biometric Update, May 2026](https://www.biometricupdate.com/202605/idemia-ps-enables-californians-to-add-mdls-state-id-to-samsung-wallet); [SamMobile, 14 Oct 2025](https://www.sammobile.com/news/arkansas-residents-can-now-save-their-digital-id-in-samsung-wallet/)
- The Samsung Wallet mDL "is currently only valid at select TSA checkpoints and does not replace physical license or identification card". [snippet] — [IDEMIA, 30 Apr 2026](https://na.idemia.com/2026/04/30/idemia-public-security-supports-samsung-wallet-launch-of-california-mobile-id/)
- More than 20 US states offer some form of smartphone credential through at least one wallet. [snippet] — [Mobile ID World](https://www.mobileidworld.com/california-brings-mobile-drivers-license-to-samsung-wallet-expanding-smartphone-credential-options/)

**UAE documents in platform wallets** (see also section 2)
- As of 20 October 2026: Apple Wallet can hold the Emirates ID (via the UAEICP app), Dubai driving licence and Mulkiya vehicle registration (via the RTA Dubai app); Samsung Wallet can hold Emirates ID, Dubai driving licence, Mulkiya and a digital nol card; Huawei Wallet only a virtual nol card. Google Wallet is not covered in the article. Acceptance "depends on the authority, service provider or transaction". [fetched] — [Gulf News, updated 20 Oct 2026](https://gulfnews.com/living-in-uae/ask-us/uae-digital-id-documents-phone-wallet-1.500717155)

### Inferences
- The platform wallets grew by adding issuers, not by widening what a user may store. Apple went from 12 to 16 states in a year; outside the US and Japan, Apple relies on government apps pushing passes (as in the UAE). A resident of an unsupported country gets payment cards, tickets and loyalty passes, and nothing for identity documents unless a local authority integrates.
- Google's "Everything else" is the closest platform feature to a private document wallet, but it is a single-card image-to-pass conversion, tied to a Google account, and its country availability is inconsistently documented.
- The only shipped "ask questions about my wallet" feature (Gemini + Wallet) is US-only, account-level and server-side. I found no on-device question-answering over stored documents from any of the three platform wallets, which leaves offline Q&A as an uncontested capability.
- None of the three stores contracts, policies, certificates or multi-page PDFs as Wallet items; the general-purpose file apps (Files, Drive) are where those go, without document-aware structure.

### Gaps
- **Expiry notifications:** I found no authoritative statement on whether Apple, Google or Samsung Wallet notify users before an ID, passport-derived Digital ID or photographed pass expires. Not addressed in the Apple pages I fetched or the Android Authority article.
- **"Everything else" details:** Google's help page URL I tried returned 404, so I could not confirm the current country list, the "private pass" classification for sensitive items (health/ID), whether Gemini is used for the classification, or where images are stored.
- **Gemini + Wallet scope:** the primary Android Authority article returned 403. I could not confirm the launch date, or whether private "Everything else" passes and ID passes are excluded from Gemini access.
- **Google ID pass EU wave:** announced for end of summer 2026; launch not confirmed.
- **Samsung Wallet:** no complete, current state list found; Samsung's own page appeared out of date. A reported California pilot cap (15% of licence holders, pilot to 30 June 2026) came from a weak source and is [unverified].
- **Apple insurance cards / iOS 27:** no evidence of a native insurance-card or scan-a-document feature in iOS 26; nothing found on iOS 27 Wallet features. One Apple Community anecdote of a missing "Add to Wallet" option for a health insurance card on iOS 26.1 is [unverified] — [Apple Community thread](https://discussions-cn-prz.apple.com/thread/256183255).
- **Apple Wallet non-US IDs beyond Japan:** not checked against a primary Apple list.

---

## 2. Government and national wallets: UAE Pass and Gulf apps, DigiLocker, EU Digital Identity Wallet

### Takeaway
Government wallets are large and heavily used (UAE Pass 12M+ users, DigiLocker 724M users, Absher wallet ~175M document views in six months) but they hold *issuer-pushed official documents* that a user requests from an authority. Only DigiLocker has a documented self-upload drive (about 1 GB, with no legal standing for uploads); the EU wallet is due by 24 December 2026 and most member states are expected to be late or partial.

### Cited Findings

**UAE: UAE Pass, UAE Verify, ICP, DubaiNow**
- UAE Pass (launched at GITEX 2018) lets users "store and share digital documents through the digital vault", request digital versions of official documents, and digitally sign uploaded documents; the vault "is powered by blockchain technology". The page does not state who may register. Page last updated 30 December 2024. [fetched] — [u.ae, The UAE Pass app](https://u.ae/en/about-the-uae/digital-uae/digital-transformation/platforms-and-apps/the-uae-pass-app)
- Documents are added by tapping "Add Documents" / "Request a document"; the document is issued by the authority and appears in the vault with a QR code for verification. Up to 40 document types from 16 government departments were available at the time of the guide. [snippet; guide may predate current UI] — [Gulf News](https://gulfnews.com/living-in-uae/telephone-internet/uae-residents-tired-of-looking-for-documents-keep-everything-handy-on-your-phone-1.1720101299275)
- UAE Pass has more than 12 million registered users (Digital Dubai, 21 July 2026, tied to World Economic Forum recognition). [snippet] — [WAM](https://www.wam.ae/en/article/c1betiw-world-economic-forum-recognises-uae-pass-global); [GCC Business News](https://www.gccbusinessnews.com/wef-uae-pass-as-global-govtech-model/)
- Earlier TDRA-linked figures (2025): 11M+ users, 15,000+ services across 350+ government and private entities; 17 million document shares; more than 16 million verified documents exchanged in 2024. [snippet] — [Biometric Update, Jun 2025](https://www.biometricupdate.com/202506/uae-pass-streamlines-access-to-over-5k-digital-services-as-transactions-surge); [Economy Middle East](https://economymiddleeast.com/uae-pass-registration-and-benefits)
- UAE Verify has issued more than 42.9 million trusted digital documents since its 2022 launch (reported November 2026). [snippet; WAM page did not render when fetched] — [WAM](https://www.wam.ae/en/article/17ifi5u-uae-verify-platform-issues-over-429-million); [HiDubai Focus](https://focus.hidubai.com/uae-verify-issues-more-than-42-9-million-trusted-digital-documents-since-2022/)
- December 2025: TDRA added five digital trade-licence documents to the UAE Pass digital wallet, shareable with accredited providers such as banks. [snippet] — [Gulf News](https://gulfnews.com/business/uae-expands-digital-trade-services-with-launch-of-new-business-documents-on-uae-pass-1.500376486)
- Emirates ID reaches Apple/Samsung Wallet through the UAEICP app (login with UAE Pass); driving licence and Mulkiya through the RTA Dubai app. [fetched] — [Gulf News, updated 20 Oct 2026](https://gulfnews.com/living-in-uae/ask-us/uae-digital-id-documents-phone-wallet-1.500717155)
- DubaiNow has a "Documents" feature for official records such as Emirates ID, driving licence and residency permit. On 2 November 2026 Dubai Land Department launched an enhanced Ejari service in DubaiNow to register, renew and cancel tenancy contracts, signed with UAE Pass; a valid Emirates ID is required. [snippet] — [Gulf News](https://gulfnews.com/business/property/dubai-tenants-can-now-register-renew-cancel-ejari-pay-dewa-on-dubainow-app-1.500732665); [WAM](https://www.wam.ae/en/article/c31xcpb-dubai-land-department-launches-enhanced-ejari); [Dubai Land Department](https://dubailand.gov.ae/en/eservices/register-renew-terminate-tenancy-contract/)
- DubaiNow processed 5.7 million payments in 2025 and added 70 services. [snippet] — [Gulf News](https://gulfnews.com/business/banking/dubainow-hits-57-million-payments-in-2025-as-70-new-services-added-1.500450120)

**Saudi Arabia: Absher and Tawakkalna**
- Absher handled 240,268,250 electronic transactions in H1 2026; Absher Individuals accounted for 225,360,865, of which 174,906,632 were document views through its digital document wallet. [snippet] — [MEA Tech Watch](https://meatechwatch.com/?p=57113); [MENA Startup Digest](https://menastartupdigest.com/?p=50562)
- In June 2026 alone: 46,113,483 Absher Individuals transactions, including 38,026,828 wallet document views. [snippet] — [Zawya](https://www.zawya.com/en/business/saudi-absher-processes-nearly-49mln-digital-transactions-in-june-404630)
- Tawakkalna acts as a digital identity wallet presenting national ID, driving licences, vehicle registrations, health records and other official documents. [snippet; secondary analysis] — [vision2030.ai](https://vision2030.ai/sectors/technology/e-government/)
- The Saudi Central Bank rulebook contains circulars on accepting the digital ID and the family register from Absher and Tawakkalna, i.e. regulated financial firms are directed to accept them. [snippet; titles only read] — [SAMA Rulebook, digital ID](https://rulebook.sama.gov.sa/en/node/3365); [SAMA Rulebook, family register](https://rulebook.sama.gov.sa/en/node/3244/revisions/92541/view)

**India: DigiLocker**
- DigiLocker had more than 72.43 crore (724.3 million) registered users as of 31 July 2026, reported to the Rajya Sabha on 12 August 2026. [snippet] — [Free Press Journal](https://www.freepressjournal.in/business/digilocker-crosses-7243-crore-users-umang-records-1166-crore-registrations-govt-informs-rajya-sabha); [IANS](https://ianslive.in/digilocker-reaches-more-than-7243-crore-registered-users-umang-at-over-1166-crore-users--20260812153558)
- The platform holds on the order of 936 crore (9.36 billion) digitally issued documents from 2,822 organisations. [snippet; date unclear, and an older March 2025 figure of 943.36 crore is higher, so definitions may differ] — [IBEF](https://www.ibef.org/news/government-expands-citizen-centric-digital-public-service-delivery-through-umang-and-digilocker)
- Users can upload their own scans to a DigiLocker drive with about 1 GB of storage (PDF, JPG, PNG); issued documents do not count toward the limit because they are links to the issuer's database. [snippet; finance-site guides, not digilocker.gov.in] — [Bajaj Finserv, 22 Jun 2026](https://www.bajajfinserv.in/how-to-upload-documents-in-digilocker); [Kotak](https://www.kotak.bank.in/en/stories-in-focus/accounts-deposits/savings-account/what-is-digilocker.html)
- Self-uploaded scans are for personal storage and do not carry the legal validity of an issued document. [snippet] — [Stable Money](https://stablemoney.in/blog/how-to-upload-documents-in-digilocker)
- Google Wallet supports Aadhaar verifiable credentials and ID passes in India (2026). [snippet] — [ID Tech Wire](https://idtechwire.com/google-wallet-expands-digital-id-support-to-india-singapore-taiwan-and-brazil/)

**EU Digital Identity Wallet (EUDI Wallet)**
- Legal deadline: each member state must offer at least one EUDI Wallet by 24 December 2026; regulated private-sector acceptance (banks, insurers, telecoms, energy, large platforms) follows roughly a year later, around late 2027. [snippet] — [Trinsic](https://www.trinsic.id/blog/europe-s-digital-identity-deadline-is-real.-but-the-rollout-won-t-be-uniform); [Corbado](https://www.corbado.com/blog/eudi-wallet-2026-deadline-rollout-eic-2026.md)
- Readiness: a Politecnico di Milano observatory found fewer than one third of member states meeting the readiness benchmark; a Namirial Q1 2026 review rated 3 countries almost certain, 5 very likely, 8 likely, 7 "might" and 4 unlikely. [snippet] — [Namirial](https://www.namirial.com/en/blog/stories/status-check-eudi-wallet/)
- Euronews (15 September 2026) names Italy, France and Finland as leaders and quotes an expert expecting some countries to launch wallets that are not fully functional or interoperable at first. [snippet] — [Euronews, 15 Sep 2026](https://www.euronews.com/2026/09/15/would-you-trust-one-app-with-all-your-digital-identity)
- Status snapshot of 2 September 2026 [fetched] — [eID Easy](https://www.eideasy.com/blog/eu-digital-identity-wallets-september-2026):
  - Existing national app with EUDI upgrade confirmed (11): Austria (eAusweise), Belgium (MyGov.be), Croatia (Certilia), Greece (Gov.gr Wallet), Hungary (DAP), Liechtenstein (eID.li), Luxembourg (GouvID, in development), Poland (mObywatel), Portugal (gov.pt app), Slovakia (eDOKLADY), Ukraine (Diia).
  - Announced with public sandbox (7): Denmark (AltID), France (France Identite), Germany (state EUDI Wallet), Italy (IT-Wallet), Moldova (EVO), Norway, Switzerland (Swiyu; not an EU obligation).
  - Announced with developer repository (4): Bulgaria, Finland (Suomi.fi Wallet), Netherlands (NL Wallet), Romania (RO Wallet).
  - Announced, no public sandbox (14): includes Czechia, Estonia, Ireland, Latvia, Lithuania, Malta, Slovenia, Spain (Cartera Digital), Sweden (Sverige-ID), Iceland and four Western Balkan states.
  - The source's caveat: "A live national wallet app is useful, but at this stage it is not a certified EUDI Wallet."

### Inferences
- Every government wallet examined is *pull-from-issuer*: the user requests a credential from an authority that already holds the record. That makes them authoritative and verifiable, and it also means they cannot hold anything the state did not issue. DigiLocker's upload drive is the one exception and is explicitly second-class.
- Access is tied to national identity: UAE Pass flows hinge on an Emirates ID (DubaiNow Ejari explicitly requires one), DigiLocker on Aadhaar, EUDI wallets on a member-state PID. Visitors, new arrivals between visa states, and documents from a previous country of residence fall outside. For UAE expatriates, home-country passports, degrees and foreign insurance are structurally out of scope.
- These wallets are online services first. I found no source describing offline access guarantees for UAE Pass, Absher or DigiLocker documents (see Gaps), which leaves offline availability as a differentiator claim that needs testing rather than citing.
- The EUDI deadline falls six weeks after this research date and most states will be partial. For a private app, the EU wallet is neither a 2026 competitor for private documents nor (yet) a usable integration target.
- The scale numbers (175M Absher wallet views in six months; 724M DigiLocker users) show that people in these markets are already habituated to showing documents from a phone. That habit is favourable to an adjacent private wallet for everything the government app omits.

### Gaps
- **Expiry reminders in UAE Pass / ICP / DubaiNow:** no source found stating that these apps notify users before a document expires. The only expiry-reminder product surfaced was a third-party app, "Dubai Reminder - UAE Renewals", whose App Store listing claims alerts 90/60/30/7/1 days before expiry, Ejari tracking and family members; self-reported and [unverified] — [App Store listing](https://apps.apple.com/us/app/-/id6756177345).
- **UAE Pass eligibility and self-upload:** the u.ae page does not state eligibility (citizens/residents/visitors) and I found no source confirming whether users can store their own arbitrary scans in the vault (upload is documented only for signing). Needs checking in-app or on TDRA's site.
- **Current count of UAE Pass document types/issuers:** the "40 types from 16 departments" figure is from an older guide; no 2026 figure found.
- **Offline access:** no source found on whether UAE Pass, Absher, Tawakkalna or DigiLocker documents are viewable without connectivity.
- **Tawakkalna figures:** "1.3 billion views for 350+ digital cards" appeared in a snippet with no clear date or linked source; [unverified]. Legal equivalence of digital driving licences in Saudi Arabia came from a third-party guide; [unverified].
- **Absher/Tawakkalna user-added documents and family members' documents:** not determined (SAMA circular titles suggest the family register is available, but I did not read the text).
- **DigiLocker:** upload limits (1 GB total, 10 MB per file) come from bank/fintech guides, not an official page. The 936 vs 943 crore issued-document discrepancy is unresolved.
- **EUDI Wallet:** which credential types each national app supports, and whether any allows self-uploaded private documents, was not covered by the sources read. No source from November 2026 found; the newest is early/mid September 2026.

---

## 3. Do platform or government wallets cover private documents (tenancy contracts, insurance policies, membership cards, family members' documents, PDFs)? Where is the gap?

### Takeaway
Coverage is good for a person's own, currently valid, government-issued credentials from their country of residence, and thin to absent for everything else: private contracts, insurance policies, foreign documents, family members' papers, and anything in PDF form. No wallet surveyed answers questions about document content offline.

### Cited Findings
- Apple Wallet identity features are limited to state IDs in 16 US states plus Puerto Rico and a US-passport Digital ID usable only at TSA domestic checkpoints. — [Apple, learn.wallet.apple/id](https://learn.wallet.apple/id)
- Google Wallet's photo-based "Everything else" converts a single physical card or pass (passport, residence permit, library card, health insurance card) into a Wallet item; country availability is uneven. — [Android Authority, 3 Sep 2025](https://www.androidauthority.com/google-wallet-everything-else-pass-rolling-out-3593890/); [TechRadar](https://techradar.com/phones/android/google-wallet-now-lets-you-add-passports-library-cards-and-health-insurance-thanks-to-ai)
- Insurance cards reach Apple Wallet only when the insurer issues a pass (Australian insurers, 2021). — [MacRumors](https://www.macrumors.com/2021/07/27/australian-insurances-companies-apple-wallet/)
- UAE Pass documents are requested from government issuers and land in the vault; the catalogue has been extended with trade licences (December 2025), i.e. still issuer-side. — [u.ae](https://u.ae/en/about-the-uae/digital-uae/digital-transformation/platforms-and-apps/the-uae-pass-app); [Gulf News](https://gulfnews.com/business/uae-expands-digital-trade-services-with-launch-of-new-business-documents-on-uae-pass-1.500376486)
- Tenancy contracts in Dubai are handled as an Ejari *service* in DubaiNow (register/renew/cancel, from 2 November 2026), tied to Emirates ID and UAE Pass. — [WAM](https://www.wam.ae/en/article/c31xcpb-dubai-land-department-launches-enhanced-ejari); [Dubai Land Department](https://dubailand.gov.ae/en/eservices/register-renew-terminate-tenancy-contract/)
- UAE wallet passes are not universally accepted: acceptance "depends on the authority, service provider or transaction", and features depend on device, software version and app compatibility. — [Gulf News, updated 20 Oct 2026](https://gulfnews.com/living-in-uae/ask-us/uae-digital-id-documents-phone-wallet-1.500717155)
- DigiLocker allows self-upload (about 1 GB) but uploaded scans have no legal validity as issued documents. — [Stable Money](https://stablemoney.in/blog/how-to-upload-documents-in-digilocker); [Bajaj Finserv](https://www.bajajfinserv.in/how-to-upload-documents-in-digilocker)
- Gemini's Wallet access covers passes (boarding passes, tickets, loyalty cards, saved passes) and linked spending data, US-only and opt-in. — [TalkAndroid](https://www.talkandroid.com/532195-gemini-now-pulls-google-wallet-passes-and-spending-into-one-view/)
- A third-party UAE renewals-reminder app markets exactly the missing features (expiry alerts, Ejari, family members), which is weak evidence of unmet demand. [self-reported listing] — [App Store: Dubai Reminder - UAE Renewals](https://apps.apple.com/us/app/-/id6756177345)

### Inferences
Gap map (my synthesis of the findings above; "not found" means no source showed the capability, not proof of absence):

| Need | Apple Wallet | Google Wallet | Samsung Wallet | UAE Pass / DubaiNow | DigiLocker | EUDI Wallet |
|---|---|---|---|---|---|---|
| Own government ID from country of residence | 16 US states + PR, Japan; UAE via ICP app | US + BR, IN, SG, TW, UK; EU wave announced | Handful of US states; UAE | Yes | Yes | Due 24 Dec 2026, uneven |
| Passport | US only, TSA domestic only | Photo copy via "Everything else"; ID pass in some countries | Not found | Issuer documents only | Issuer documents only | Planned as credentials |
| Foreign / home-country documents for expatriates | No | Photo of a card only | No | No | No (Aadhaar-bound) | No |
| Insurance policy (the document, not a card) | No | No | No | Not found | Upload as plain file | Not found |
| Tenancy contract | No | No | No | Ejari as a service (Dubai) | Upload as plain file | Not found |
| Family members' documents | No | Not found | No | Not found | Not found | Not found |
| Arbitrary multi-page PDF / scan | No | No | No | Upload for signing only (storage unconfirmed) | Yes, 1 GB, no legal standing | Not found |
| Expiry reminders across all documents | Not found | Not found | Not found | Not found | Not found | Not found |
| Ask questions about document content | No | Gemini over passes, US, cloud | No | No | No | No |
| Works fully offline / no account | N/A (device passes) | Account-bound | Account-bound | Not found | Not found | Not found |

What an independent offline-first wallet with on-device Q&A is not replaced by:
- **Scope of documents:** anything not issued by the user's current state of residence. In the UAE, where most residents are expatriates holding documents from two or more countries, this is the bulk of a household's paperwork. (The expatriate share itself is my background knowledge, not sourced here.)
- **Household view:** spouse, children, parents, domestic workers' documents in one place. No surveyed wallet documents this.
- **Content understanding:** questions like "when does my tenancy end" or "what is my policy excess" require reading the document body. The only assistant feature found reads passes, not documents, and runs in Google's cloud for US accounts.
- **Independence from identity status:** government wallets depend on a valid national ID; a private wallet keeps working during visa changes, relocation, or loss of account access.
- **Privacy posture:** see section 4. ID scans are a proven breach target when held server-side.

What an independent wallet cannot replace, and should not claim to:
- **Verifiable presentation.** A scan in a private app is a copy. Government and platform wallets issue cryptographically verifiable credentials accepted at TSA, banks (SAMA circulars) and government counters. The private wallet is a reference and reminder tool that complements them.

### Gaps
- The table's "Not found" cells are absences in the sources I read, not confirmed product limitations. UAE Pass arbitrary-document storage, family/dependant documents in UAE Pass, ICP and Absher, and offline behaviour all need hands-on verification.
- I did not find any survey quantifying how many documents a typical household holds outside government wallets.

---

## 4. Market signals: downloads/revenue, launches, funding, acquisitions, shutdowns; privacy sentiment; breaches of document-storage or ID-scan services

### Takeaway
Hard market-size data for consumer document wallets was not obtainable from open sources; the clearest signals are indirect: investment is flowing to B2B wallet infrastructure rather than consumer vaults, public distrust of companies' data handling in the AI era is high (71% of Americans expect AI to make personal data less secure), and 2025-2026 produced a run of large breaches of server-stored ID scans, including a reported 153 million driver's licences.

### Cited Findings

**Breach incidents involving stored ID scans**
- IDScan.net (September 2026): the identity-verification company confirmed attackers accessed customer data on its cloud platform. A dark-web marketplace reportedly offered access to more than 153 million driver's licences, 10 million ID cards, 3 million travel documents and 579,000 medical cards from the US and Canada. The FBI's New Orleans office opened an investigation on 1 September 2026. [snippet] — [Help Net Security, 11 Sep 2026](https://www.helpnetsecurity.com/2026/09/11/idscan-net-data-breach-153-million-drivers-licenses/); [BleepingComputer](https://bleepingcomputer.com/news/security/idscan-confirms-breach-tied-to-153-million-stolen-drivers-licenses); [Engadget](https://engadget.com/2249522/digital-scans-of-153-million-drivers-licenses-leaked-to-the-dark-web/)
- Caveat on IDScan: the company's notice describes names and ID numbers; whether document *images* were taken, as the listing advertised, was unresolved in the coverage. Nine class actions were filed between 2 and 4 September 2026. [snippet; the class-action count is from a vendor blog] — [Zyphe](https://www.zyphe.com/resources/news/idscan-data-breach-class-actions-september-2026)
- Nefos / PuffPal (2026): the Irish vendor behind a cannabis-club age and membership verification platform left nearly one million passport and driving-licence scans on servers reachable by anyone with the link. [snippet] — [State of Surveillance](https://stateofsurveillance.org/news/cannabis-id-vendor-nefos-million-passports-exposed-2026/)
- Duc money-transfer app (April 2026): more than 360,000 identity documents including passports reportedly exposed in an unauthenticated cloud storage bucket; a Canadian regulator is investigating. [snippet; aggregator source] — [Pulse](https://www.pulse.bot/fintech/news/money-transfer-app-duc-exposed-thousands-of-drivers-licenses-and-passports-to-the-open-web-f951b650-a4a2-4fd3-bde2-44f5f0ac934d)

**Privacy sentiment**
- Pew "Americans and AI 2026" (reported 17 June 2026; 5,119 US adults): 59% distrust companies and 67% distrust government regulation of AI. [snippet; secondary coverage] — [The Next Web, 17 Jun 2026](https://thenextweb.com/news/pew-research-americans-ai-chatbot-skepticism-regulation-distrust-2026)
- Same Pew body of work: 71% think wider AI use will make their personal information less secure; about 3% think more secure. [snippet; secondary blog, check against Pew] — [LavX News](https://news.lavx.hu/article/pew-americans-use-ai-more-and-trust-it-less)
- Pew 2023: 70% of those who had heard of AI had little or no trust in companies to use it responsibly; about four in five expected AI to lead to personal information being used in unintended ways. [snippet] — [Tech Brew, 20 Oct 2023](https://www.techbrew.com/stories/2023/10/20/americans-ai-data-privacy-pew)
- Cisco 2024 Consumer Privacy Survey (2,600+ consumers, 12 countries): over 75% would avoid buying from companies they do not trust with their data; 53% aware of their country's privacy laws. [snippet] — [Cisco](https://www.cisco.com/c/en/us/about/trust-center/consumer-privacy-survey.html?no_head=1)
- Morning Consult (May 2025, 2,208 US adults): 48% of AI sceptics say corporate AI adoption makes them trust businesses less with personal information. [snippet] — [Morning Consult Pro](https://pro.morningconsult.com/analysis/consumer-research-artificial-intelligence-skeptics)

**Funding and corporate activity (2025-2026)**
- Capital is going to wallet *infrastructure* for banks and businesses, driven by eIDAS 2.0: Lissi (Germany) raised EUR 3.5M led by Ventech for EUDI wallet connectors inside banking apps, with 90% of customers in finance. [snippet] — [ID Tech Wire](https://idtechwire.com/lissi-raises-3-5-million-euros-to-put-eu-identity-wallets-inside-banking-apps/); [Pulse 2.0](https://pulse2.com/lissi-raises-e3-5-million-to-expand-eudi-wallet-infrastructure-for-europes-financial-sector/amp/)
- Wultra (Czechia) raised a EUR 6.8M Series A for digital identity wallet work, expanding into the Middle East and US. [snippet] — [Pulse 2.0](https://pulse2.com/wultra-raises-e6-8-million-series-a-to-expand-post-quantum-digital-identity-solutions/amp/)
- Badge raised a USD 17.1M Series A for a platform helping businesses issue passes into Apple and Google Wallets. [snippet] — [Pulse 2.0](https://pulse2.com/badge-17-1-million-series-a-raised-for-wallet-infrastructure-platform)
- Didit closed a USD 7.5M seed (May 2026) for identity infrastructure; Gataca raised capital and reported 750,000+ wallet transactions in 2025. [snippet] — [VC Access Online](https://www.vcaonline.com/news/2026052604/didit-closes-7-5m-seed-round-to-build-identity-infrastructure-for-the-ai-era/); [Gataca](https://gataca.io/resources/blog/gataca-funding-round-digital-identity)

**Download / revenue estimates**
- The only figures surfaced were unsourced estimates from a single aggregator: scanner-type app categories averaging roughly USD 260,000 to 400,000 monthly revenue per app and CamScanner at about USD 5M per month. Methodology undisclosed; treat as [unverified] and indicative at best. — [ScreensDesign, document management apps](https://screensdesign.com/categories/document-management-apps/); [ScreensDesign, document scanner apps](https://screensdesign.com/categories/document-scanner-apps/)

**Adjacent demand signals (from sections 1-2)**
- Absher's document wallet drew ~175M document views in H1 2026, the largest share of Absher Individuals activity. — [MEA Tech Watch](https://meatechwatch.com/?p=57113)
- DigiLocker added nearly 18 crore (180M) users in a year to reach 724M. [snippet] — [IBEF](https://www.ibef.org/news/government-expands-citizen-centric-digital-public-service-delivery-through-umang-and-digilocker)

### Inferences
- The breach pattern is consistent: ID images held server-side by a third party, often a vendor the end user never chose, in misconfigured or compromised cloud storage. An architecture where scans never leave the device removes this class of exposure entirely, and the IDScan event gives that claim a current, widely reported reference point.
- Sentiment data supports the *positioning* (distrust of companies with personal data, AI seen as a privacy risk) but none of it measures willingness to pay for a private document wallet, and all of it is US or multi-country rather than Gulf-specific. It justifies the message, not a revenue forecast.
- Venture money is ignoring consumer vaults and funding B2B credential plumbing. That reads two ways: little funded competition for an independent consumer app, and also no investor-validated consumer business model. Scanner apps (subscription utilities) are the closest proven revenue analogue, with the caveat that the only numbers found are unreliable.
- Opportunity sizing therefore has to be argued bottom-up (expatriate households, document counts, renewal frequency) by the report writer; the sources here do not support a top-down market number.

### Gaps
- **No Sensor Tower, AppMagic or data.ai figures** for document wallet, ID vault or scanner apps were found; one search returned only an unsourced aggregator. No market-size figure for the category.
- **No consumer document-vault acquisitions or shutdowns (2024-2026)** surfaced in the one search run; absence here reflects limited searching, not evidence that none occurred.
- **No Cisco consumer privacy survey for 2025 or 2026** found; the 2026 Cisco study is an enterprise benchmark.
- **No survey specifically about storing ID scans in cloud apps**, and none on consumer attitudes to on-device vs cloud AI. No Gulf/UAE or India privacy-sentiment data found.
- **Other incidents mentioned without a usable source:** a Discord vendor breach (October 2025) said to expose about 70,000 government ID photos, and a Roomster exposure of about 320,000 passports and licences, appeared in a search summary without a clearly attributable link or date. Both [unverified].
- Pew percentages are from secondary coverage; the original Pew reports were not opened.

---

## 5. App-store policy and regulatory constraints for apps storing ID documents (Apple, Google, GDPR, UAE PDPL)

### Takeaway
Nothing found prohibits an app from letting users store their own ID documents; the constraints are about not appearing government-endorsed, minimising and disclosing data collection, and, if any data leaves the device, cross-border and AI-consent rules. A design where documents and inference stay on-device sidesteps most of them, and the UAE PDPL's implementing regulations still appear unpublished.

### Cited Findings
- Google Play requires apps that communicate government information to complete a Government apps declaration in Play Console (in force since 31 January 2023); apps performing government processes such as ID validation may be asked for proof of authorisation, and completing the declaration is what makes an app eligible for an official-endorsement badge. [snippet of official page] — [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/9514050?hl=en)
- Apple treats data minimisation as a core part of App Review guideline 5.1.1 (Apple tech talk on the guideline). [snippet] — [Apple Developer tech talk 110352](https://developer.apple.com/videos/play/tech-talks/110352/?time=418)
- Guideline 5.1.1 is summarised by third parties as covering: privacy policy (i), consent (ii), data minimisation (iii), respecting permissions (iv), account sign-in and deletion (v), and no hidden password harvesting (vi). [snippet; third-party summary, official text not opened] — [ConductAtlas](https://conductatlas.com/platform/apple/apple-app-store-review-guidelines/provision/CA-P-019060/apps-must-practice-data-minimization/)
- Apple's AI-consent rule under 5.1.2(i) (sharing personal data with third-party AI) is reported not to apply to on-device processing with Core ML / Foundation Models where data never leaves the device. [snippet; third-party guide, May 2026] — [Stora](https://stora.sh/blog/2026-05-06-apple-ai-consent-rule-5-1-2-i-implementation-guide)
- UAE PDPL (Federal Decree-Law No. 45 of 2021): as of June 2026 the implementing/executive regulations had still not been issued, according to Morgan Lewis, which also reports the UAE established a federal authority for artificial intelligence and data. [snippet] — [Morgan Lewis, Jun 2026](https://www.morganlewis.com/pubs/2026/06/uae-establishes-federal-authority-for-artificial-intelligence-and-data)
- Other 2026 sources agree the regulations remain unpublished (February and August 2026), and one notes that decision numbers quoted online contradict each other with no traceable primary publication. [snippet] — [Kayrouz & Associates](https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026); [Business Dubai](https://www.businessdubai.ae/blogs/uae-pdpl-data-protection); contradicted by [Reconn](https://orbit.reconn.io/uae-pdpl-complete-guide/), which says they were published as Cabinet Decision No. 111/2023 [unverified]
- PDPL Articles 22-23 govern cross-border transfers (adequacy or safeguards); health data generally must remain in the UAE absent approval; UAE mainland is not on the DIFC adequacy list. [snippet] — [Kayrouz & Associates](https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026); [Chambers TMT 2026, UAE](https://practiceguides.chambers.com/practice-guides/tmt-2026/uae/trends-and-developments)
- EU context: under eIDAS 2.0, member states must offer a wallet by 24 December 2026 and regulated private parties must accept it about a year later. This obliges relying parties, not independent document apps. [snippet] — [Trinsic](https://www.trinsic.id/blog/europe-s-digital-identity-deadline-is-real.-but-the-rollout-won-t-be-uniform)

### Inferences
- The practical store-review risk for a private document wallet is *impersonation of officialdom*: naming, iconography or copy that implies government endorsement or that stored scans are valid ID. Clear "personal copies, not official credentials" wording addresses both the Google government-apps policy and the product's real limitation noted in section 3.
- Offline-first is a compliance simplifier as well as a selling point: no server copy means no cross-border transfer question under PDPL Articles 22-23, a minimal privacy-label footprint on both stores, and no third-party-AI consent flow under Apple's 5.1.2(i).
- Any optional cloud backup or sync would reintroduce the issues: health-related documents (insurance, medical cards) fall under the stricter UAE health-data localisation position, and ID scans in the cloud are the exact asset breached in section 4.
- With the PDPL regulations unpublished, UAE obligations remain principle-level; the report should avoid stating detailed PDPL procedural requirements as settled.

### Gaps
- **GDPR:** I ran no dedicated search. Statements about GDPR (e.g. whether purely on-device storage by the user falls under the household exemption, or how national ID numbers are treated under Article 87) are not sourced here and should not be asserted from these notes.
- **Apple's official App Review Guidelines text** was not opened; the 5.1.1 breakdown and the on-device exemption under 5.1.2(i) rest on third-party summaries.
- **Google Play policies** on user data / sensitive permissions (Data safety form, photo and file access, fake-ID app prohibitions) were not read in detail; a secondary report that Google enforces developer ID verification with removal for non-compliance is [unverified].
- **PDPL sensitive-personal-data rules** and whether government ID numbers count as sensitive: no clear source found.
- **Saudi PDPL and India's DPDP Act** were not researched.
