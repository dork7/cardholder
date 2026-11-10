# Model bench

A development-only screen for comparing the downloaded models (`src/ai/catalog.ts`, ADR 0006) on a
real phone: download and pick a model, pick a context size, and **Run all** the fixed test set. Each
run adds a row to a Markdown table you can select and copy into the results below.

- Code: `app/dev/models.tsx` (the screen), `src/ai/eval/` (test set, runner, scores),
  `src/analysis/localModel.ts` (runs the model with `llama.rn`).
- The screen only exists in development builds; release builds redirect it to home.
- Open it with `adb shell am start -a android.intent.action.VIEW -d cardholder://dev/models com.hamza.cardholder`.

## What a run measures

| Column | Meaning |
|---|---|
| Runs on | GPU or CPU, as the model actually loaded (`onGpu()`). |
| Valid JSON | Card readings whose output parsed as JSON. |
| Card fields | Expected name / expiry / category values read exactly. |
| Answers | Questions over five made-up documents answered with the expected value. |
| Slowest card | The longest single card reading: card reading's time limit (`readTimeoutMs`) is set to 1.5× this on the Pixel, rounded up to a second. |
| Median first reply | How long the first model call of a question takes (reading the lookup table): most of the wait before an answer. |

The test set (`src/ai/eval/cases.ts`) is made-up text only. To add cases from the sample documents in
`dataSet/`, add one in a development build, copy the recognised text from its Details (.md), and write
the expected values from the document itself.

## The decision rules (ADR 0006)

1. Run every model at its own context (4,096), on a Snapdragon 8 Gen 1 or later phone (GPU) and on a
   Pixel (CPU).
2. Also run Qwen2.5 0.5B and Llama 3.2 1B at 8,192. Keep 8,192 for a model only if it answers more
   questions **and** the Pixel's median first reply stays under about 30 s.
3. A model that doesn't beat Gemma 3 270M on card fields and answers is proposed for removal from the
   menu. The owner decides.

## Results

Not run yet. Paste each phone's table here, with the date and the phone's model.

## Copying a model in by hand

Without a network, put the file into the app's documents folder (Android):

```sh
adb push qwen2.5-0.5b-instruct-q6_k.gguf /data/local/tmp/
adb shell run-as com.hamza.cardholder mkdir -p files/models
adb shell run-as com.hamza.cardholder cp /data/local/tmp/qwen2.5-0.5b-instruct-q6_k.gguf files/models/
adb shell rm /data/local/tmp/qwen2.5-0.5b-instruct-q6_k.gguf
```

The file name must match the catalogue entry exactly. On iOS, use Xcode's Devices window to add it
under `Documents/models/`.

## Notes

- `llama.rn` downloads its prebuilt native libraries in `postinstall`. If install scripts were skipped,
  run `node node_modules/llama.rn/install/download-native-artifacts.js`.
