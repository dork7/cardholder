# Work log: new documents start unpinned (#49)

- Changed the shared document creation path to save photo and PDF documents unpinned. Android shared imports use this same path.
- New documents now enter the ordinary document list and stay out of pinned views, quick actions, and the widget until explicitly pinned.
- Updated store and Home screen tests for the new default, manual pin ordering, and preserving a pinned document through restore. Existing records and imported backup pin states are unchanged.
- Updated the design and E2E flow description.
- Verified with TypeScript typecheck and the full Jest suite (98 suites, 925 tests).
