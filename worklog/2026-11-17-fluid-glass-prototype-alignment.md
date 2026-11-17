# Worklog: align the app with the Apple · Fluid glass prototype (2026-11-17)

- Review: compared prototypes/doc-keeper ?variant=apple with the home screen; filed #25, #26, #27 (and linked #24).
- #25 (13482f8): FloatingTabBar (Documents, Notes, Settings; Folders when FOLDERS_ENABLED), round Fab, header view button; HomeActionBar removed.
- #26 (a750e6c): library list as default home view (pinned panels, all-documents rows, counts, flat results while filtering), stack and gallery as alternatives, subtitle, chips under search. Decision recorded by the user: "List default, stack optional".
- #27 (22aba43, codex): button radius and highlight, 31 pt title, panel shadow, ActionFooter, screen entrance motion.
- #1: closed as not reproducible (edit-screen tests pass on main).
- #24 (codex): Add, Edit, document details and Delete as bottom sheets (RouteSheet, DeleteSheet); 699 tests pass; swipe, keyboard and large text unverified on device. See comms/2026-11-17-issue-24-bottom-sheets.md.
- Branch `fluid-glass-tabbar` holds #25-#27 and passes 695 tests; not merged to main (user has uncommitted work there).
