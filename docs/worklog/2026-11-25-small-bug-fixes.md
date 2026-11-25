# Small bug fixes — 2026-11-25

Read `AGENTS.md`, `GLOSSARY.md`, and the root ADRs before editing. Attempted `gh issue view` for #93, #94, #96, #59, #60, #46, and #48; every call failed because this sandbox could not reach `api.github.com`. The public issue pages also could not be fetched. Work below follows the issue titles supplied in the task, local code, and existing design docs; issue-body details could not be verified.

| Issue | Finding and change |
| --- | --- |
| #93 | Settings used `Constants.expoConfig.version`, which can differ from the installed binary. It now uses `expo-application.nativeApplicationVersion`; the package is declared directly. |
| #94 | Restore errors showed the generic purchase failure text. Restore now has its own state and retry wording. |
| #96 | The share API reports only that the sheet closed. Removed the misleading “Backup sent” alert; sharing still does not record a completed backup. |
| #59 | The new tag text input capped typing at 24 characters, hiding invalid input. It now accepts the full typed value and lets existing validation show the 24-character error. |
| #60 | Creating a new tag bypassed the edit screen's eight-tag guard. It now rejects a ninth tag on submission and keeps the typed name visible. |
| #46 | The Documents library counted only unpinned rows under “All documents”, yielding zero when the only document was pinned. The count now includes pinned documents; the empty-results line is omitted when a pinned document is visible. |
| #48 | Notes search rendered both a label and matching placeholder. Removed the duplicate visual label while retaining the accessible name. Tightened editor spacing from 24 to 16 pt and made the note detail native header say “Notes”. The exact issue-body layout requests could not be checked. |

Regression coverage was added at existing screen tests for installed version, restore failure text, share-sheet closure, long tag names, the ninth tag, pinned document count, and Notes search. Native share-sheet delivery cannot be observed by the app; the #96 fix deliberately avoids a success claim.

Validation results are recorded in the chat log after the final run. No commits or pushes were made. The pre-existing `node_modules` symlink was left untouched.
