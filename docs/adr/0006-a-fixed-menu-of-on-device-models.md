---
status: superseded 2026-11-11 by ADR 0007 (no language model in the app)
---

# A fixed menu of on-device models, GPU first

Gemma 3 270M, the one downloadable model, misses answers a bigger model finds. The owner wants
~0.5B models and a choice. Settings → AI models now offers four, each downloaded once only when the
user picks it, pinned to one Hugging Face revision and checked against its SHA-256
(`src/ai/catalog.ts`):

| Model | File | Size | Runs on |
|---|---|---|---|
| Gemma 3 270M | Q8_0, the file people already have | 292 MB | CPU |
| Qwen2.5 0.5B (recommended) | Q6_K | 650 MB | GPU, then CPU |
| Qwen3 0.6B, thinking off | Q6_K | 495 MB | GPU, then CPU |
| Llama 3.2 1B | Q6_K | 1,022 MB | GPU, then CPU |

- Several can be downloaded, one at a time; one is **in use** and does both jobs: suggesting a new
  document's fields and answering questions. Choices live in `models/prefs.json` beside the files.
- **GPU first:** the model loads with every layer on the GPU (OpenCL, `llama.rn`). If that throws or
  reports no GPU, it loads on the CPU; a run that fails on the GPU is retried once on the CPU. Either
  way the model is remembered as CPU-only on that phone (`src/ai/loadWithFallback.ts`). Settings says
  which it runs on.
- **Asking** still uses the phone's built-in model first (ADR 0001, amended); "Answer questions with"
  in Settings lets the user pick the downloaded one instead.
- **Context** is set per model, 4,096 tokens to start. The bench (`docs/model-bench.md`) decides
  whether Qwen2.5 and Llama get 8,192. Card reading's time limit is per model too.
- Every model stays listed; a phone with less than 3× the file in RAM gets a warning.

## Considered Options

- **A catalogue fetched from the internet:** new models without an app update, but a network call the
  user didn't start (ADR 0005) and files that could change under the app. Rejected.
- **Q4_0 files:** about 30% smaller and faster, but at 0.5B they misread dates, numbers and names.
- **Q8_0 files:** best quality, but `llama.rn`'s OpenCL path runs only Q4_0 and Q6_K. Gemma keeps
  its Q8_0 file so nobody downloads it again; it runs on the CPU.
- **Phi or Mistral:** their smallest models are 3B or more, too big and slow for a phone's CPU.
- **Gemma for card reading, a bigger model for asking:** two downloads. Rejected.

## Consequences

- The Android APK keeps `llama.rn`'s OpenCL engine (about +6 MB, estimated; see the build commit).
- Only Snapdragon 8 Gen 1 and later phones (Adreno GPU plus Hexagon) get the GPU. Pixels, Exynos and
  MediaTek phones always run on the CPU, so the CPU path is the common one.
- iOS is unchanged in spirit: the same menu, on the CPU. Metal can come later.
- Four licences: Gemma Terms of Use, Apache 2.0 (both Qwen), the Llama 3.2 Community License ("Built
  with Llama"). Settings shows the one for the model in use.
- Before release, the bench must be run on a Snapdragon and a Pixel; a model that doesn't beat Gemma
  is proposed for removal.
