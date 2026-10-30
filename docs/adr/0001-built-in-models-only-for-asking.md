# Asking uses only the phone's built-in model, never the cloud

Questions about the user's documents are answered by the model that comes with the phone — Apple
Foundation Models on iPhone, Gemini Nano (ML Kit GenAI) on Android — and nothing else: no cloud model,
even on request, and for now no downloaded model on phones without a built-in one, which simply don't
offer asking. These are birth certificates and IDs, and "nothing leaves your phone" is the product's
promise; the built-in models are stronger than anything we could ship and cost the user no download.

## Considered Options

- **Gemma everywhere (downloaded, via llama.rn):** one model and the same answers on every phone, but
  an ~800 MB download for a weaker model. Kept in reserve as the fallback for phones without a
  built-in model, if users ask for one.
- **Cloud Gemini or similar:** the best answers and every phone, but documents would leave the device.
  Rejected outright.

## Consequences

- Fewer phones can ask: recent iPhones with Apple Intelligence on, and the Android phones that ship
  Gemini Nano.
- Two native code paths to build and test, and the same question can be answered differently on
  iPhone and Android.
- The built-in models read only a few thousand tokens at once, so each question is answered from a
  handful of documents picked by word matching, not from everything the user keeps.
- On phones with a built-in model it also takes over suggesting a new document's name, expiry and
  category, replacing the downloaded Gemma 270M there.
