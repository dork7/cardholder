---
name: emulator-test
description: End-to-end test Doc Keeper on the Android emulator against the full case catalogue, then show a screenshot report. Use when asked to test the app on the emulator or simulator, run the e2e/smoke checklist, or check every screen still works. Takes optional scope: area letters or case ids (e.g. "H D-11").
---

# Emulator test

Run the app on the Android emulator, walk every case in [CASES.md](CASES.md), record a verdict and screenshot for each, then open a report for the user. The run is a **tester's** job: observe and record. Code changes wait until the report is in.

Scripts sit beside this file. `SKILL` below means this folder (`.claude/skills/emulator-test`).

- [`ui.mjs`](ui.mjs) drives the device: deep links, tap/wait by testID, content-desc or text, typing, swipes, screenshots. Its header lists the commands. `node SKILL/ui.mjs screen` prints every labelled node, so start there whenever a selector misses.
- [`report.mjs`](report.mjs) turns the results into `index.html` and lists cases with no result.

## 1. Scope

The arguments are area letters (`E A H D N F R S B X L P C`) or case ids. With no arguments, run every case. Write the scope into the run folder:

```bash
run=.e2e-runs/$(date +%Y%m%d-%H%M); mkdir -p "$run/shots"
echo '{"scope":["H","D-11"],"device":"Pixel_9_Pro","commit":"'$(git rev-parse --short HEAD)'","started":"'$(date '+%F %R')'"}' > "$run/run.json"
```

Use `"scope":[]` for a full run. `.e2e-runs/` is git-ignored; if it isn't, add it to `.gitignore` first.

## 2. Device, build and sample files

1. **Emulator.** `adb` is at `~/Library/Android/sdk/platform-tools/adb`. If `adb devices` shows no emulator, run `android emulator start Pixel_9_Pro`. This is the only AVD. Every command here targets an emulator. If a real phone is attached, set `ANDROID_SERIAL` to the emulator, because step 3 wipes app data.
2. **Build.** Run `npx expo run:android` in the background; it builds, installs, and keeps Metro serving JS. You're done when `node SKILL/ui.mjs wait id:tab-documents 120000` succeeds, or `id:empty-state` for a fresh install. A debug build loads JS from Metro, so keep Metro running for the whole run.
3. **Sample files.** Cases use the git-ignored `dataSet/`, which needs:
   - an ID card front and back photo
   - a blurry photo
   - a PDF of 3+ pages with a distinctive word only on page 3
   - a password-protected PDF
   - a PDF over 10 MB

   If any are missing, ask the user for them, then run `npm run test-files -- android --clean`. Record the cases that need a missing file as `blocked`, and keep going with the rest.

## 3. Fresh state

```bash
adb shell pm clear com.hamza.cardholder
adb shell pm grant com.hamza.cardholder android.permission.POST_NOTIFICATIONS
node SKILL/ui.mjs link ""
```

Clear state once at the start of a full run. For a scoped run, set up only what the scope's cases need, using the prerequisite notes at the top of each CASES.md section.

## 4. Run the cases

Work through CASES.md **in file order**. For each case in scope:

1. Do what the case says: `link` to reach the screen, then `tap`, `type`, `swipe`.
2. Wait for the expected result with `wait`/`gone`. Never use fixed sleeps. These only see what is on screen, so run `scrollto` first for anything below the fold. `tap` scrolls by itself.
3. Take a screenshot at the moment of the expected result with `node SKILL/ui.mjs shot $run <ID>`. Take one before and one after when the case is about a change.
4. Append one line to `$run/results.jsonl`:

```json
{"id":"H-06","status":"pass","note":"typed 'pass' → only Passport row","shots":["shots/H-06.png"]}
```

Statuses:

- **pass**: the expected result was seen and screenshotted.
- **fail**: something else happened. Note what was expected and what was seen, and always attach a screenshot.
- **blocked**: a precondition could not be met (missing file, earlier failure, no Play Store). Note why.
- **manual**: the case is marked `[manual]` and stays undriven. Note the exact steps a human should take.

A failed case is a finding, not a stopping point. Record it, get the app back to a known screen (`key back`, or `link ""` for home), and continue. Run system dialogs (permission prompts, pickers, share sheets, biometric prompts) by visible text from `ui.mjs screen`. Leave a share sheet with `key back`; nothing should actually be sent.

If the app crashes, run `adb logcat -d -t 200 *:E ReactNativeJS:V > $run/crash-<ID>.txt`, mark the case `fail`, and relaunch.

When a case's wording no longer matches the app, for example a renamed label, test what the app actually does. Mark the case `fail` if the behaviour is wrong; otherwise mark it `pass`, note the drift, and fix the line in CASES.md after the run.

**Done** when `node SKILL/report.mjs $run` exits 0. That means every case in scope has exactly one result line. Exit 2 prints the missing ids; go back and run them.

## 5. Show the user

1. Run `open $run/index.html`. The report stays on this machine because the screenshots show real documents, so don't upload or publish it.
2. In chat, give:
   - the counts per status
   - each `fail`, with its id, what was seen, and the likeliest source at `file:line` (look it up now)
   - the `manual` steps left for a human
   - any CASES.md drift you fixed
3. Offer to fix the failures. That is a separate task, and it starts after the report.
