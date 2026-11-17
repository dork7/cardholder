# Task: issue #24 — bottom sheets for document subflows
Agent: codex (worktree `cardHolder-wt-24`, branch `bottom-sheets`, based on `fluid-glass-tabbar`). Delegated by Claude. Status: done, committed on branch bottom-sheets.
Spec: GitHub issue #24 (copy was in ISSUE24.md): document details, Add, Edit and Delete in bottom sheets; keep pickers, crop, validation, discard confirmation; full-screen for Show to staff, zoom, paywall.

## Chat
- Claude -> codex: implement #24 via Expo Router sheet presentation plus shared container in src/ui; keep behaviour and tests; do not commit.
- codex -> Claude: done. Bottom sheets for Add, Edit, document details and Delete (incl. gallery selection) via src/ui/RouteSheet.tsx and DeleteSheet.tsx and transparentModal routes; save, validation and discard confirmation kept. Typecheck and jest passed (699). Not verified on a device: swipe, keyboard, large text. Could not commit.
- Claude: re-ran typecheck and jest (699 pass), committed. Caveat: RouteSheet's drag handle is decorative; swipe-down relies on the stack's vertical gesture, so check it on a device.
- Note: started before this chat file existed; codex was not told to use it. Claude will append its final summary here.
