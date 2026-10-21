# Gemma 3 270M sample

A development-only test bench for phase 5 of the [on-device AI plan](superpowers/plans/2026-10-21-on-device-ai.md): paste the text a card shows (as OCR would read it), and Gemma 3 270M suggests the card's name, expiry date and category, on the phone.

- Code: `src/analysis/smartExtract.ts` (prompt, JSON schema, validation), `src/analysis/gemma.ts` (runs the model with `llama.rn`), `app/dev/gemma.tsx` (the screen).
- Output is constrained to a JSON schema, then validated: a name's words and an expiry date's year must appear in the card text, or the field is dropped.
- The screen only exists in development builds; release builds redirect it to home.

## Run it

1. Get the model (about 290 MB). Gemma is under the [Gemma Terms of Use](https://ai.google.dev/gemma/terms).

   ```sh
   curl -L -o gemma-3-270m-it-Q8_0.gguf \
     https://huggingface.co/ggml-org/gemma-3-270m-it-GGUF/resolve/main/gemma-3-270m-it-Q8_0.gguf
   ```

2. Build and install the dev client (`npm run android`), since `llama.rn` is a native module.

3. Copy the model into the app's documents folder (Android):

   ```sh
   adb push gemma-3-270m-it-Q8_0.gguf /data/local/tmp/
   adb shell run-as com.hamza.cardholder mkdir -p files/models
   adb shell run-as com.hamza.cardholder cp /data/local/tmp/gemma-3-270m-it-Q8_0.gguf files/models/
   adb shell rm /data/local/tmp/gemma-3-270m-it-Q8_0.gguf
   ```

   On iOS, use Xcode's Devices window to add it to the app container under `Documents/models/`.

4. Open the bench: `adb shell am start -a android.intent.action.VIEW -d cardholder://dev/gemma com.hamza.cardholder`.

## Notes

- `llama.rn` downloads its prebuilt native libraries in `postinstall`. If install scripts were skipped, run `node node_modules/llama.rn/install/download-native-artifacts.js`.
- The model is not fine-tuned. The plan's next step is a LoRA fine-tune on the phase 0 test set (OCR text → expected JSON).
