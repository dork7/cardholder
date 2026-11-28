Implemented #81, #82, and #84 in order in the profiles worktree.

- **#81:** Added emergency contacts through a native system picker, with no contacts permission. Contacts are stored in the sealed profile, appear on the drawn profile and in Details search, and survive encrypted backup and restore.
- **#82:** Added a Personal template and field visibility choices. Existing Medical profiles keep their previous display.
- **#84:** Added a profile-only Show QR screen that generates the code offline from visible details.

Each issue has a worklog in [docs/worklog](/Users/hamza/Music/proj/cardHolder-s2-profiles/docs/worklog). Final checks passed: `npm run typecheck`, `npx jest --runInBand` (99 suites, 927 tests), and `git diff --check`.

GitHub was unreachable through `gh`, so I worked from the local docs and issue titles. The native picker still needs an iOS/Android device build. I left `node_modules` untouched; before `npm ci` or a build in a networked checkout, run `npm install react-native-qrcode-svg@^6.3.56 --save` to update the lockfile. No commit or push was made.