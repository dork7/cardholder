# Work log: remove Home Stack (#51)

- Home now offers List and Gallery. A saved Stack choice migrates to List; a saved Gallery choice stays in Gallery.
- Removed the Stack-only Settings switches, swipe tip and copy, animation component, geometry code, and their tests. Gallery search, filters, sort, selection, pinned strip, document details, and Full screen remain.
- Updated the Home decision in ADR 0008 and the design specification.
- Focused Home, Settings, and provider tests pass; TypeScript typecheck passes.
