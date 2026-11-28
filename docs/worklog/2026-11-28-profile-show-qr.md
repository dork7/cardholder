# Profile Show QR (#84)

- Added Show QR to the profile document's action sheet, opening a dedicated display screen.
- The code is made on device as a vCard 3.0. Enabled name, phone, email, address and birthday use contact fields; enabled blood group, medical details and emergency contacts go in NOTE. Hidden fields and the photo are excluded. The screen warns that a scanner can read the displayed details.
- Added `react-native-qrcode-svg` `^6.3.56` to package dependencies. It uses the existing `react-native-svg` and runs offline.
- The Show QR screen uses the existing maximum-brightness hook. App navigation and the Screen component already suppress entrance animation with Reduce Motion. A payload over 1500 UTF-8 bytes draws no QR and names the longest fields to shorten or turn off; no data is truncated. Screen tests assert exact vCard text and the oversize message.
- A fresh native development build is needed for the contact picker added in #81; the QR package itself uses the existing SVG native module.
- Round 2 verification: `npm run typecheck` passed; `npx jest --runInBand` passed (100 suites, 934 tests). `package-lock.json` remains unchanged because the standing rules prohibit installing through the shared `node_modules` symlink. In a networked checkout run `npm install react-native-qrcode-svg@^6.3.56 --save` before `npm ci` or a new build.
