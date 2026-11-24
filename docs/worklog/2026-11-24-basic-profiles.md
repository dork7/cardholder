# Work log: basic profiles (#77)

- Added a Medical profile to the sealed document payload. A Person can have at most one current profile, and its date of birth, blood group, and template round trip through the card store.
- Added Add profile to the shared Add sheet and Create/Open profile to People. The profile editor supports choosing a Person, date of birth, and blood group; it captures the Medical card as the document's front picture and thumbnail. Editing a profile redraws that picture.
- Profile documents use the existing Documents, Home, favorites, search, free limit, and Space paths. The details screen's Edit action opens the profile editor. The photo cropper can now be asked for a square crop.
- Updated the glossary's Document term and added Profile. Added `react-native-view-shot` at Expo SDK 58's bundled version (6.1.1); package metadata was updated in an isolated temporary directory because this worktree's node_modules is a symlink to the main checkout.
- Verified with profile store and screen tests, dependency guard, TypeScript typecheck, and full Jest suite.
