# On-device AI document Q&A apps on phones (state as of November 2026)

Method note for the report writer: about 20 search/fetch calls. Pages marked **[fetched]** were read directly; everything else is **[snippet]**, meaning it comes from a search-result summary of the linked page and was not opened. Most app claims are self-reported store or marketing copy; no independent test of any app was found. Store listings rarely print the year in version history, so years below are inferred where marked.

## 1. Which shipping consumer apps do on-device "chat with your documents" on phones?

### Takeaway
On-device document chat on phones exists but is fragmented: a long tail of small indie apps (mostly iOS, mostly 2025-2026 launches, with few or no ratings) plus open-source Android RAG apps; the well-known local-LLM chat apps (Private LLM, PocketPal, Locally AI) were late or absent on document features. The mainstream scanner brands that answer questions about documents (Adobe Scan/Acrobat, CamScanner) do it in the cloud.

### Cited Findings

**On-device, document Q&A is the core feature (indie apps)**
- Sigmy (SIGMY GROUP PTY LTD; iPhone/iPad, iOS 17+): "Private on-device AI & PDFs"; "Runs a Google Gemma model locally on your device" (about 3.4 GB model bundled, 3.5 GB app); supports PDF, Word, text, Markdown, RTF, HTML, CSV and images "containing text (via on-device OCR)", with a document scanner; "every answer cites a tappable source passage"; free download, Pro $5.99/month, $39.99/year, $79.99 lifetime; privacy label "does not collect any data"; not enough ratings to display a score; versions 1.0 (May 7) to 1.0.4 (Jun 11), year not printed, presumably 2026 — [App Store listing, fetched](https://apps.apple.com/app/id6762498646)
- QuickIn Doc (BD2DB; iOS 26 / iPadOS 26 / macOS 26 / visionOS 26): "Private AI for your documents", "100% on-device with Apple Intelligence", "No data is sent to the cloud, ever"; quick actions (summarise, extract dates, translate) and analyses (suspicious email check, pseudonymisation, official letter decoding); needs Apple Intelligence devices ("iPhone 15 Pro+, iPad M1+, Mac Apple Silicon"); subscription listed as 7.99 EUR/year in the description and $6.99/year in IAP; "Data Not Collected"; no ratings yet; citations and OCR not stated — [App Store listing, fetched](https://apps.apple.com/app/id6755641190)
- RAG Bot (iOS, free): advertises 100% offline operation after the initial model download; PDF and DOCX — [App Store listing, snippet](https://apps.apple.com/us/app/id6752555846)
- Private AI: Document Chat (iOS): PDFs, spreadsheets and source code through local RAG, described as fully on-device — [mwm.ai listing, snippet](https://mwm.ai/apps/id/6757301317)
- LocalRAG! (iPhone; Android claimed as beta): chat with PDF, EPUB, DOCX, XLSX, PPTX, TXT, Markdown, CSV, RTF, HTML and images; can optionally switch to the Claude API for higher accuracy (so not strictly local-only) — [App Store listing, snippet](https://apps.apple.com/app/localrag/id6759317956); Android availability rests on a directory — [AlternativeTo, snippet](https://alternativeto.net/software/localrag-/about)
- LatentChat (iOS, $4.99): build a "knowledge center" from text or files (PDF, TXT, JSON, HTML) — [App Store listing, snippet](https://apps.apple.com/app/id6733216453)
- Noema (iOS): described as operating entirely offline with integration of your own documents — [appshunter listing, snippet](https://appshunter.io/ios/app/noemaai/id6751169935)
- Localresearch (iPhone): offline-first AI workspace with document-assisted work and local GGUF models — [App Store listing, snippet](https://apps.apple.com/us/app/localresearch/id6761330263)
- Pocket Models (iOS): lists "Local Document Intelligence (RAG)" — [App Store listing, snippet](https://apps.apple.com/us/app/pocket-models/id6759682487)
- Enclave AI (iOS and macOS): users can upload and chat with PDFs and text files, with document processing described as local — [mybesh directory, snippet](https://mybesh.com/tool/enclave-ai); [toolmage directory, snippet](https://www.toolmage.com/en/tool/enclave-ai/)

**General local-LLM chat apps (the named incumbents)**
- Private LLM: its FAQ says it "does not currently support reading documents or files" (RAG) — [Private LLM FAQ, snippet](https://privatellm.app/en/faq). A separate search snippet said "Private LLM 2" is in beta with tools, vision, document chat and web search; I could not tie that to a URL or confirm it shipped (see Gaps).
- PocketPal AI (iOS + Android, open source): document chat was a long-standing request — [issue #183](https://github.com/a-ghorbani/pocketpal-ai/issues/183), [issue #401](https://github.com/a-ghorbani/pocketpal-ai/issues/401); a pull request describes attaching PDFs and text files from the + menu, sending small files whole and searching larger ones with BM25, with excerpts carrying page citations — [PR #1010, snippet](https://github.com/a-ghorbani/pocketpal-ai/pull/1010). Merge/release status not confirmed; the latest release snippet seen (v1.21.4, Oct 28) did not mention documents — [releases, snippet](https://github.com/a-ghorbani/pocketpal-ai/releases)
- Locally AI (now "Locally AI by LM Studio", iPhone/iPad/Mac): release notes mention Apple Foundation Models support including vision; no file or document feature found — [App Store listing, snippet](https://apps.apple.com/us/app/locally-ai-by-lm-studio/id6741426692)
- Google AI Edge Gallery (Play Store and App Store, free): runs Gemma 4 E2B/E4B locally; "Ask Image" answers about a camera or gallery photo; needs Android 12+ or iOS 17+; listing says all inference happens on device. This is single-image Q&A, not a document library or RAG — [Android Authority, snippet](https://www.androidauthority.com/gemma-4-ai-edge-gallery-3656199/); [App Store listing, snippet](https://apps.apple.com/app/id6749645337); [PromptQuorum review, snippet](https://www.promptquorum.com/power-local-llm/google-ai-edge-gallery-review)
- Off Grid (Android via GitHub releases, iOS App Store; open source): "projects" support RAG over attached "PDFs, code files, CSVs, text files"; documents are "processed and indexed locally on your phone"; the answer names the document it used; the on-device "2B model handles simple lookups and short summaries well", and the app can hand off to a larger model on the user's own Ollama/LM Studio machine on the local network. Article is written by the vendor's team and gives no benchmarks — [dev.to article, fetched](https://dev.to/alichherawalla/how-to-build-a-private-knowledge-base-on-your-phone-with-local-ai-no-cloud-no-api-keys-5d2c); [GitHub repo](https://github.com/alichherawalla/off-grid-mobile-ai)

**Android open-source / indie on-device RAG**
- ToolNeuron: free, MIT-licensed Android app running GGUF models on device through llama.cpp, with document RAG including PDF — [PromptQuorum review, snippet](https://www.promptquorum.com/power-local-llm/toolneuron-review)
- AnythingLLM Mobile: free, MIT-licensed Android app from Mintplex Labs running a small on-device model for offline document chat — [PromptQuorum review, snippet](https://www.promptquorum.com/power-local-llm/anythingllm-mobile-review)
- LocalAI (ApexCreator), closed source: document chat over PDF, Word, Excel, CSV, parsed and chunked locally — [PromptQuorum review, snippet](https://www.promptquorum.com/power-local-llm/localai-apexcreator-review)
- Android-Document-QA (Apache-2.0 sample app): RAG pipeline for multi-document QA from PDF/DOCX; the author notes an on-device LLM is possible "at the expense of a large app size (>1GB) and compute requirements" — [GitHub](https://github.com/shubham0204/Android-Document-QA)
- NativeLM: open-source, fully on-device document RAG pipeline for Android running Gemma 4 via LiteRT-LM — [dev.to, snippet](https://dev.to/sagar_gupta_35066c051032b/i-built-nativelm-for-android-and-bypassed-oem-ram-lies-to-do-it-27lg)
- PocketSage: offline Android RAG assistant; import a PDF, ask questions, streaming answers from Gemma 4 E2B — [dev.to, snippet](https://dev.to/umarpazir11/your-pdfs-never-leave-your-pocket-building-a-100-offline-rag-app-with-gemma-4-litert-lm-340)

**Platform features**
- Pixel Screenshots: answers natural-language questions from information stored in screenshots, described as running on device with Gemini Nano and working offline — [MakeUseOf, snippet](https://www.makeuseof.com/these-pixel-ai-features-run-completely-on-phone-and-dont-use-cloud/); [Android Police guide, snippet](https://www.androidpolice.com/google-pixel-screenshots-guide/). Scope is screenshots, not a document vault.
- Genius Scan + Siri (iOS 27): the developer says users can find or share scans with natural-language requests through "Siri AI"; the app's new AI chat assistant answers product-support questions and points to help docs (it is a help assistant, not Q&A over the user's documents) — [Grizzly Labs blog, Oct 2026, snippet](https://blog.thegrizzlylabs.com/2026/10/genius-scan-and-ios27.html); listing cites on-device document processing — [App Store, snippet](https://apps.apple.com/us/app/scanner-app-genius-scan/id377672876)

**Cloud (for contrast)**
- Adobe Scan: AI Assistant introduced May 2025, answers questions about scans with citations on the phone — [Adobe Scan Android release notes, snippet](https://www.adobe.com/devnet-docs/adobescan/android/en/releasenotes.html); generative summary feature — [Adobe help, snippet](https://helpx.adobe.com/acrobat/using/generative-summary-adobe-scan.html)
- Adobe states that "the use of generative AI features in Acrobat involves cloud processing of documents"; request counts are limited by plan — [Adobe generative AI usage policy, snippet](https://helpx.adobe.com/acrobat/using/acrobat-gen-ai-usage-policy.html); AI Assistant is tied to Scan Premium / Acrobat Pro — [Adobe subscriptions page, snippet](https://www.adobe.com/devnet-docs/adobescan/android/en/managingsubscriptions.html); data flow starts with the user signing in to Adobe — [Adobe security fact sheet, Aug 2025, snippet](https://prod-b2b.insight.com/content/dam/global/na/us/pdfs/adobe/adobe-acrobat-ai-assistant.pdf)
- CamScanner: AI can read the text of a whole scan and answer questions about the document, plus summarise/extract — [Zapier scanner roundup, snippet](https://zapier.com/blog/best-mobile-scanning-ocr-apps/). Processing location not documented in what I found.
- SwiftScan: AI summaries, "in-depth reports", translation and AI file names; no chat assistant found — [Zapier, snippet](https://zapier.com/blog/best-mobile-scanning-ocr-apps/); [App Store, snippet](https://apps.apple.com/br/app/scanpro-app-docs-pdf-e-ocr/id834854351)

### Inferences
- The closest shipping analogue to the concept's answer-with-source behaviour is Sigmy (on-device Gemma, OCR, tappable source passage), but it bundles a 3.4 GB model, has no visible ratings, and is a document chat app, not an ID/card wallet.
- No app found uses a tiered "built-in model first, small downloaded model otherwise" design. Apps pick one path: Apple Intelligence only (QuickIn Doc), a bundled/downloaded open model only (Sigmy, Off Grid, ToolNeuron), or local with a cloud escape hatch (LocalRAG! to Claude, Off Grid to a LAN server).
- No app found advertises sub-1B models (Gemma 3 270M, Qwen 0.5-0.6B) for document Q&A; the on-device models named are 2B-class and up (Gemma 4 E2B, "a 2B model", a 3.4 GB Gemma).
- "Cites the source" is claimed by a minority (Sigmy, Off Grid at document level, PocketPal's PR at page level, Adobe in the cloud). A check that suppresses the answer when no line supports it was not advertised by any app found.

### Gaps
- Not researched within budget: Apollo, MLC Chat, LLM Farm, Layla document features (a snippet gave Layla as closed source at $19.99 one-time, no URL tied), Docutain AI, Microsoft Lens/Copilot, NotebookLM mobile, Samsung Galaxy AI document features, Pixel Recorder, Google Files, Paperless-ngx AI add-ons and mobile clients. Treat these as unverified, not as absent.
- No evidence found of document Q&A in Apple's own Files, Notes or Wallet apps; the searches returned nothing either way.
- Private LLM 2 beta "document chat" claim is from an untraceable snippet; unverified.
- PocketPal PR #1010 ship status unverified.
- Ratings, download counts and independent reviews for the indie apps were not found; most are too new to show a rating.
- lmsa.app (Android "chat with PDFs" using a local/remote model) could not be fetched (DNS failure).

## 2. Per-app attributes (inference location, model, OCR, citations, grounding, platforms, price, maturity)

### Takeaway
Among the apps with enough detail to fill a row, only Sigmy claims the full set of on-device model + OCR of images + passage-level citation; nobody documents a grounding or hallucination check, and maturity is low across the on-device group.

### Cited Findings

| App | Inference | Model | OCR on images | Cites source | Grounding check | Platforms | Price | Maturity | Source |
|---|---|---|---|---|---|---|---|---|---|
| Sigmy | On-device | Google Gemma, ~3.4 GB bundled | Yes (on-device OCR, scanner) | Yes, tappable passage | Not stated | iOS/iPadOS 17+ | Free; $5.99/mo, $39.99/yr, $79.99 lifetime | v1.0.4, no rating shown | [fetched](https://apps.apple.com/app/id6762498646) |
| QuickIn Doc | On-device | Apple Intelligence (Foundation Models) | Not stated | Not stated | Not stated | iOS/iPadOS/macOS/visionOS 26, Apple Intelligence devices | ~$6.99/yr | v2.2.0, no rating shown | [fetched](https://apps.apple.com/app/id6755641190) |
| Off Grid | On-device, optional LAN server | "2B model" on phone; user's Ollama/LM Studio models remotely | Not mentioned | Names source document | Not stated | Android, iOS | Not stated (open source) | Active repo | [fetched](https://dev.to/alichherawalla/how-to-build-a-private-knowledge-base-on-your-phone-with-local-ai-no-cloud-no-api-keys-5d2c) |
| PocketPal AI (PR) | On-device | User-chosen GGUF | Not stated | Page citations on excerpts | Not stated | iOS, Android | Free, open source | Ship status unverified | [snippet](https://github.com/a-ghorbani/pocketpal-ai/pull/1010) |
| LocalRAG! | On-device, optional Claude API | Not stated | Images accepted | Not stated | Not stated | iPhone; Android beta claimed | Not found | New | [snippet](https://apps.apple.com/app/localrag/id6759317956) |
| AI Edge Gallery | On-device | Gemma 4 E2B / E4B | Single image Q&A | No | No | Android 12+, iOS 17+ | Free | Google demo app | [snippet](https://www.androidauthority.com/gemma-4-ai-edge-gallery-3656199/) |
| ToolNeuron | On-device (llama.cpp) | User GGUF | Not stated | Not stated | Not stated | Android | Free, MIT | Not assessed | [snippet](https://www.promptquorum.com/power-local-llm/toolneuron-review) |
| Private LLM | On-device | Open models | n/a | n/a | n/a | iPhone/iPad/Mac | Paid | FAQ: no document reading | [snippet](https://privatellm.app/en/faq) |
| Adobe Scan AI Assistant | Cloud | Not stated | Yes (scans) | Yes | Not stated | iOS, Android | Scan Premium / Acrobat Pro, request limits | Mature | [snippet](https://helpx.adobe.com/acrobat/using/acrobat-gen-ai-usage-policy.html) |
| Pixel Screenshots | On-device | Gemini Nano | Screenshots | Not stated | Not stated | Pixel 9 and later | Free, preinstalled | Shipping | [snippet](https://www.makeuseof.com/these-pixel-ai-features-run-completely-on-phone-and-dont-use-cloud/) |

- Nutrient (formerly PSPDFKit) iOS SDK, a building block that other document apps can ship: its on-device AI Assistant answers questions about a document using Apple's Foundation Models, with an on-device RAG pipeline so "the context window doesn't limit document size"; needs iOS 26+ and Apple Intelligence enabled; from iOS 27 a custom model conforming to the `LanguageModel` protocol can be used. Listed limits: may fail to find information that exists, no multi-document questions, "doesn't support navigation to the document part where it found the answer", no password-protected documents, not for summarising large documents, may favour English, "can make mistakes" — [Nutrient guide, fetched](https://www.nutrient.io/guides/ios/ai-assistant/on-device.md)

### Inferences
- Even a commercial PDF SDK vendor does not offer source navigation or multi-document questions on the Apple on-device model; picking candidate documents from an index and showing the supporting line would go beyond what that SDK documents.
- "Pixel 9 and later" in the table follows from the Prompt API device list plus conflicting reports on Pixel 8 (see section 4); the cited article itself does not give that cutoff.

### Gaps
- Device RAM requirements, token speeds and context sizes are not published by any of the consumer apps reviewed (Sigmy only says "sufficient RAM for on-device AI").
- Model identities for RAG Bot, Private AI: Document Chat, LatentChat, Noema, Pocket Models, Enclave were not captured.

## 3. Do document wallet / ID vault / scanner apps combine secure storage with on-device Q&A?

### Takeaway
A few 2025-2026 indie iOS apps market "vault + scanner + AI" and claim local processing, but I could not confirm any established wallet/vault app that does on-device Q&A with a source line over IDs, policies and cards, and none of the candidates has enough reviews to judge quality.

### Cited Findings
- VaultScan AI (iOS): scanning and storage, says everything is processed on device, encrypted locally and protected by Face ID; the listing seen does not clearly describe document Q&A — [AppGoblin listing, snippet](https://appgoblin.info/apps/6762499332)
- ScanOnce (iOS): on-device OCR text extraction and the ability to ask questions; listing does not say whether the AI model runs on device — [App Store, snippet](https://apps.apple.com/us/app/scanonce/id6759916701)
- DocuIntelli AI (iOS): AI document chat; says it never trains AI on your documents (a policy claim, not an on-device claim) — [App Store, snippet](https://apps.apple.com/us/app/docuintelli-ai/id6770092258)
- PaperAI (iOS): AI document chat; on-device status not stated — [App Store, snippet](https://apps.apple.com/ml/app/paperai/id6751439216)
- Sigmy and QuickIn Doc (section 1) are on-device document assistants with scanner/OCR or Apple Intelligence, but are positioned as document chat/analysis tools, not as ID or card wallets — [Sigmy](https://apps.apple.com/app/id6762498646); [QuickIn Doc](https://apps.apple.com/app/id6755641190)
- Adobe Scan stores scans in Adobe cloud storage by default and its Q&A is cloud-processed — [Adobe Scan docs, snippet](https://www.adobe.com/devnet-docs/adobescan/android/en/scan.html); [usage policy, snippet](https://helpx.adobe.com/acrobat/using/acrobat-gen-ai-usage-policy.html)
- Unchecked leads that surfaced with matching titles only (content not read, claims unverified): "SecureDoc - Document Vault AI" — [App Store](https://apps.apple.com/app/id6748312274); "Document Scanner Offline Vault" — [App Store](https://apps.apple.com/hn/app/document-scanner-offline-vault/id6752974531); a doc-chat scanner site titled "100% On-Device Storage" — [site](https://doc-chat-scanner.pages.dev/); VaultAI, titled "100% Local Processing" — [site](https://egecolpan.github.io/vaultai-website/index.html); "DocuMind: Offline File Analysis" — [Product Hunt](https://www.producthunt.com/products/documind-offline-file-analysis/alternatives); PrivateDoc, a hackathon project on ExecuTorch — [lablab.ai](https://lablab.ai/ai-hackathons/qualcomm-x-meta-executorch-hackathon/edge-faithful/privatedoc)

### Inferences
- The specific combination in the concept (encrypted wallet for IDs/cards/policies + on-device Q&A + answer shown only when a document line backs it + Android and iOS) appears unoccupied by any established product in the sources found. The nearest are new, single-platform (iOS) indie apps with unproven quality.
- All candidates found are iOS; no Android wallet/vault app with on-device Q&A surfaced, though the search was not exhaustive for Play Store listings.

### Gaps
- No user reviews or ratings were obtained for any vault-plus-AI app, so "how good are they per reviews" cannot be answered; the fetched listings show "not enough ratings".
- Established vault/wallet apps (password-manager document vaults, Docutain, Folio-type ID wallets) were not individually checked for AI Q&A.
- Play Store was not searched directly.

## 4. Availability of built-in models to third-party apps (2025-2026) and adoption for document features

### Takeaway
Both platforms now expose their built-in model to third-party apps, but only on recent flagship-class hardware and with tight limits (about 4,000 input tokens on both; foreground-only and per-app quotas on Android), so a downloaded-model fallback is necessary for broad reach. Adoption for document Q&A specifically is thin: a PDF SDK (Nutrient) and small indie apps, while Apple's showcased adopters are mostly fitness, journaling and task apps.

### Cited Findings

**Android: Gemini Nano via ML Kit GenAI / AICore**
- The Prompt API was announced as an alpha in October 2025 — [Android Developers Blog, snippet](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html); docs snapshots reference `genai-prompt` 1.0.0-beta1 and beta4, so it had reached beta — [Prompt API get-started, snippet](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- Current device list for the Prompt API (`GenerativeModel`) and `AgentRunner`, by model generation — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai):
  - Gemini Nano 2: POCO F7 Ultra, F8 Pro, F8 Ultra, X7 Pro, X8 Pro; realme GT 7; Redmi Turbo 5; vivo T4 Ultra, X200 FE; Xiaomi Leitzphone, 15, 15T, 15 Ultra, 17, 17T, 17 Ultra.
  - Gemini Nano 3: Google Pixel 9, 9 Pro, 9 Pro XL, 9 Pro Fold; OPPO Reno 14 Pro 5G, Reno 15 Pro / Pro Mini / Pro Max 5G, Reno 16 Pro 5G; realme GT 7T; several "Googlebook" laptops (Acer, ASUS, Dell, HP, Lenovo).
  - Gemini Nano 4: Google Pixel 10 and 11 series; Honor 600 Pro, Magic 7/8 series, Magic V5/V6; iQOO 13, 15; Motorola Edge 70 Pro/Pro+, Razr 60 Ultra, Razr Ultra 2025, Razr Fold, Signature; OnePlus 13, 13s, 15, 15R, Pad 3; OPPO Find N5/N6, Find X8 to X10 Pro Max; POCO F9 Pro, X8 Pro Max; realme GT 7 Pro, GT 8 Pro; Samsung Galaxy S25, S26, Z Flip/Fold series, Tab S12, Z TriFold; Sharp AQUOS R11; Sony Xperia 1 VIII; vivo X200, X300, X500 Pro/Pro Max, X Fold3 Pro/Fold5/Fold6; Xiaomi 15T Pro, 17T Pro, Pad Mini; some Lenovo tablets.
- "Model availability and version may vary depending on the device's RAM configuration, OS version, and AICore update status." — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai)
- "GenAI API inference is permitted only when the app is the top foreground application"; a foreground service also gets `ErrorCode.BACKGROUND_USE_BLOCKED` — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai)
- "AICore enforces an inference quota per app"; `ErrorCode.BUSY` on too many requests, and `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` when a long-duration (such as daily) quota is exceeded — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai)
- Different Gemini Nano versions may produce different output for the same prompt; `getBaseModelName()` reports the version on the device — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai)
- Feature APIs beyond prompting: summarization, proofreading, rewriting, image description (separate device list), speech recognition/translation, text to speech, embeddings, and agentic workflows — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai)
- Limits in the Prompt API guide: input must be under 4,000 tokens (about 3,000 English words), and use cases needing long output (more than 256 tokens) should be avoided. Seen in localized copies of the guide; current English wording not confirmed — [Prompt API guide, snippet](https://developers.google.com/ml-kit/genai/prompt/android)
- Google said the Prompt API performed best on the Pixel 10 series running the newest Nano at the time — [Android Developers blog, snippet](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences)

**iOS: Apple Foundation Models framework**
- "Apple's on-device foundation model has a context window of 4096 tokens per language model session"; instructions, all prompts, tool schemas/inputs/outputs, `Generable` schemas and all responses count toward it — [Apple TN3193, fetched](https://developer.apple.com/tutorials/data/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window.md)
- Roughly three to four characters per token in English; about one character per token in Chinese, Japanese and Korean — [Apple TN3193, fetched](https://developer.apple.com/tutorials/data/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window.md)
- Overflow throws `.exceededContextWindowSize` and "the session won't be able to respond"; Apple recommends splitting work across sessions, shorter prompts, and RAG to "pass only the snippets to the model"; `tokenCount(for:)` measures usage; the technote was updated 2026-03-31 for API added in iOS 26.4 — [Apple TN3193, fetched](https://developer.apple.com/tutorials/data/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window.md)
- Availability requires an Apple Intelligence-compatible device with Apple Intelligence enabled, on iOS 26 or later — [Nutrient guide, fetched](https://www.nutrient.io/guides/ios/ai-assistant/on-device.md); an app listing states this as "iPhone 15 Pro+, iPad M1+, Mac Apple Silicon" — [QuickIn Doc listing, fetched](https://apps.apple.com/app/id6755641190)
- iOS 27 (WWDC 2026) opened the framework to other providers through a `LanguageModel` protocol, allowing local or cloud models behind the same API — [dev.to WWDC 2026 write-up, snippet](https://dev.to/arshtechpro/wwdc-2026-apple-just-opened-the-foundation-models-framework-to-any-llm-provider-5ejn); corroborated by Nutrient's note that from iOS 27 a custom `LanguageModel` (for example MLX-hosted) can be configured — [Nutrient guide, fetched](https://www.nutrient.io/guides/ios/ai-assistant/on-device.md)
- Secondary sources say iOS 27 adds image input for the on-device model and a server model on Private Cloud Compute — [ChatForest builder guide, snippet](https://chatforest.com/builders-log/apple-foundation-models-ios-27-on-device-llm-api-builder-guide/) (third-party; not confirmed against Apple docs)
- Developer discussion of limits and versioning — [Apple Developer Forums: max tokens](https://developer.apple.com/forums/thread/790736); [on-device model capabilities, limits, versioning](https://developer.apple.com/forums/thread/833642); [InfoQ, Mar 2026, on context management](https://infoq.com/news/2026/03/apple-foundation-models-context)

**Adoption**
- Apple's showcased adopters include SmartGym, Stoic, CellWalk, Streaks, Stuff, Agenda and OmniFocus — [MacStories, snippet](https://www.macstories.net/news/apple-highlights-apps-using-its-foundation-models-framework/); further examples in [TechCrunch, Oct 2025, snippet](https://www.techcrunch.com/2025/10/03/how-developers-are-using-apples-local-ai-models-with-ios-26/)
- Document-specific adopters found: Nutrient's PDF SDK AI Assistant — [Nutrient guide, fetched](https://www.nutrient.io/guides/ios/ai-assistant/on-device.md); QuickIn Doc — [listing, fetched](https://apps.apple.com/app/id6755641190); Locally AI exposes Apple Foundation Models as a chat model — [listing, snippet](https://apps.apple.com/us/app/locally-ai-by-lm-studio/id6741426692)
- A developer write-up on why Foundation Models features work in demos but break in shipped apps — [drobinin.com, snippet, not read](https://drobinin.com/consulting/foundation-models-apple-intelligence/putting-apple-foundation-models-in-a-real-app/)

### Inferences
- On both platforms the built-in model gives roughly 3,000 English words of total budget per call, so any document longer than about a page or two must be read in parts or retrieved by passage. This matches the concept's "pick candidates from an index, read in parts" approach and Apple's own guidance.
- Android's foreground-only rule and per-app battery quota mean indexing or pre-reading documents in the background with Gemini Nano is not possible; that work would need the downloaded model or non-LLM indexing.
- Gemini Nano coverage is now wide across 2025-2026 flagships from most OEMs, but mid-range and older phones are excluded; and three model generations with differing outputs means the same prompt has to be validated per generation.
- The iOS 27 `LanguageModel` protocol makes the "built-in first, downloaded model otherwise" tiering a first-class pattern on iOS.
- No notable Android third-party app using the Prompt API for document Q&A was found.

### Gaps
- No official Apple hardware list was retrieved; the iPhone 15 Pro cutoff comes from app listings and third-party blogs.
- A claim that the newest devices get an 8,192-token context on iOS 27 appeared in one unattributed secondary snippet; unverified, and Apple's technote still says 4096.
- Whether the Prompt API is GA as of November 2026 was not stated on the page read.
- The 4,000-token / 256-token Android figures were seen only in localized doc copies tied to beta versions; they may have changed.
- Pixel 8-series Prompt API status is conflicting in secondary sources and absent from the fetched device list.
- Google's adoption showcase for ML Kit GenAI was not located.

## 5. Known limits of small on-device models for document Q&A

### Takeaway
Reported limits cluster around three things: tiny context budgets (about 4k tokens on built-in models), noticeably higher hallucination at the 1B scale even when the right context is supplied, and memory/app-size cost; practitioners respond with retrieval, splitting work into small steps, and deterministic checks on the output instead of trusting the model.

### Cited Findings
- Context: Apple's model has 4096 tokens per session covering input and output, and overflow is a hard error — [Apple TN3193, fetched](https://developer.apple.com/tutorials/data/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window.md); Gemini Nano Prompt API input under 4,000 tokens, long outputs (over 256 tokens) discouraged — [Prompt API guide, snippet](https://developers.google.com/ml-kit/genai/prompt/android)
- Apple warns that long instructions "may lower the quality of the responses" and that hard response caps can yield truncated output such as "A cat is a small." — [Apple TN3193, fetched](https://developer.apple.com/tutorials/data/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window.md)
- A vendor shipping document Q&A on Apple's on-device model says it "may fail to find information that exists in the document", should not be used to summarise large documents, works better for finding specific facts, and that users should verify important answers — [Nutrient guide, fetched](https://www.nutrient.io/guides/ios/ai-assistant/on-device.md)
- In a study of RAG-fine-tuned models, the smallest (1B) model "hallucinates significantly more than its larger counterparts" (task was structured workflow output, not document Q&A) — [arXiv 2404.08189, snippet](https://arxiv.org/html/2404.08189v1)
- "Even with a prompt containing suitable context, there is no guarantee that the responses will be free of hallucinations" — [arXiv 2506.22486, Hallucination Detection with Small Language Models, snippet](https://arxiv.org/pdf/2506.22486)
- An evaluation found retrieved knowledge "in some cases, misleads the model and results in higher hallucination rates" for small models — [OnionEval, arXiv 2501.12975, snippet](https://arxiv.org/pdf/2501.12975)
- A practitioner running Gemma 3 1B (INT4, LiteRT-LM) in an Android finance app reports fluent answers that use correct data but draw false conclusions; the fix was a harness that supplies typed, verified facts, treats model output as a candidate, checks it with deterministic rules "instead of using a second LLM judge", and falls back to verified data when validation fails. Also notes that a timeout can expire while native inference is still running, so a second inference may start on a busy runtime; "No prompt change fixes this." Rules cannot catch every wrong phrasing — [daily.dev summary, fetched](https://daily.dev/posts/why-a-1b-on-device-llm-needs-a-harness-xa1gvet8e) of [ProAndroidDev original, not fetched](https://proandroiddev.com/why-a-1b-on-device-llm-needs-a-harness-4068cf22e818)
- Memory is the main constraint for llama.cpp RAG on Android; phones typically have 4-12 GB RAM, and recent 12-16 GB+ phones can run 1-3B models — [deepsense.ai, snippet](https://deepsense.ai/blog/implementing-small-language-models-slms-with-rag-on-embedded-devices-leading-to-cost-reduction-data-privacy-and-offline-use/)
- Gemma 3 1B is 529 MB and can process about a page of content in under a second on a mobile GPU, per Google — [Google Developers Blog, snippet](https://developers.googleblog.com/google-ai-edge-small-language-models-multimodality-rag-function-calling/)
- App-size cost: an on-device LLM in an Android document-QA app means ">1GB" app size plus compute requirements — [Android-Document-QA README](https://github.com/shubham0204/Android-Document-QA); Sigmy's listing is 3.5 GB because the model is bundled — [App Store, fetched](https://apps.apple.com/app/id6762498646)
- Off Grid's vendor says its on-device 2B model "handles simple lookups and short summaries well", with larger remote models needed for reasoning and synthesis — [dev.to, fetched](https://dev.to/alichherawalla/how-to-build-a-private-knowledge-base-on-your-phone-with-local-ai-no-cloud-no-api-keys-5d2c)
- A secondary comparison guide rates Gemma 3 1B as suited to focused single-document RAG and Llama 3.2 1B as best for fine-tuning among small models (source quality uncertain) — [Medium guide, snippet](https://lalatenduswain.medium.com/choosing-the-right-small-language-model-for-rag-a-comprehensive-comparison-guide-6e60044441ac)
- Different Gemini Nano generations can give different output for the same prompt — [ML Kit GenAI overview, fetched](https://developers.google.com/ml-kit/genai)

### Inferences
- The concept's "show an answer only if a line of the document backs it" is the same class of mitigation practitioners report needing at 1B scale (deterministic verification of model output against known data), and it is not something existing consumer apps advertise.
- Lookup-style questions (policy number, expiry date, deductible) fit the documented strengths of small models (specific-fact retrieval); summarising or reasoning across documents is where vendors themselves warn of failure.
- Sub-1B models (Gemma 3 270M, Qwen2.5 0.5B, Qwen3 0.6B) are below the size of anything the cited studies or apps evaluated for document Q&A; expect the 1B findings to be a lower bound on error rates, but this is extrapolation.

### Gaps
- No measured accuracy numbers for document Q&A on phones (per model, per question type) were found; the cited studies are on other tasks.
- No r/LocalLLaMA or Hacker News threads were retrieved, so community reports on phone token speeds, thermal throttling and battery drain are missing.
- No developer reports specific to Gemma 3 270M, Qwen2.5 0.5B, Qwen3 0.6B or Llama 3.2 1B on OCR text from IDs/cards were found.
- OCR error effects on small-model answers were not covered by any source found.
