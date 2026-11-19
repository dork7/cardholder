# Work log: two-stage document search (#52)

- Home search shows document title matches immediately, then asynchronously checks the generated Details (.md) for other matches after 500 ms without typing.
- Details are generated from encrypted document records in memory. The app does not keep persistent `detail.md` files; exported `.md` files exist only while the share sheet is open.
- New input cancels pending detail searches, clearing search restores every document immediately, and refreshed records cannot reuse stale results.
- Search now covers details metadata and scanned text, including keywords across fields and document numbers with different separators. The Home search accessibility label and design notes reflect the wider scope.
- Verified with focused document-search and Home screen tests plus TypeScript typecheck. Device verification remains outstanding.
