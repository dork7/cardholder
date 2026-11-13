# Backup branch

**Name:** `backup/main-2026-11-11`

| | |
|---|---|
| Backup of | `main` |
| Taken on | 2026-11-11 |
| Points at | `c1fe320` (`c1fe32026001bd3fabf3745950abaa11fb40cee6`) |
| Commits | 128 |
| Where | local only, not pushed to `origin` |

## What is in it

Everything committed on `main` up to and including:

```
c1fe320 2026-11-11 feat(tags): tags replace categories as the way to group documents
06cbc59 2026-11-11 feat(ai): model downloads carry on with the app closed or the phone locked (Android)
ce18909 2026-11-10 Merge branch 'feat/local-model-menu'
ea73ade 2026-11-10 fix(strings): Meta's licence is called the Llama 3.2 Community License
2a3f699 2026-11-10 Merge branch 'feat/local-model-menu'
b5fe787 2026-11-10 fix: model menu review fixes for Settings, wording, the bench and docs
2c17fce 2026-11-10 feat(ask): read long documents in parts, and keep only answers one line backs
c5bce3f 2026-11-10 fix(ai): review fixes for the model menu
```

## What is not in it

Work that was not committed when the backup was taken:

- `src/ui/AskSheet.tsx` — touching outside the Ask window no longer closes it (modified, uncommitted)
- `docs/research/reports/`, `docs/research/research_notes/` — untracked
- `imp.md` — this file

## Using it

```sh
git diff backup/main-2026-11-11            # what has changed since the backup
git checkout backup/main-2026-11-11        # look at the backup
git reset --hard backup/main-2026-11-11    # put main back to the backup (drops later commits and uncommitted work)
git push origin backup/main-2026-11-11     # keep a copy on GitHub
```

An earlier backup also exists: `backup/main-before-v1.5.0`.
