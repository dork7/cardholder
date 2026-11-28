# Profile templates and field choice (#82)

- Added Medical, Contact, Compact wallet and Full choices with different lead fields and field order. The older Personal template remains readable but is not offered for new choices. Medical remains the default.
- Added selectable fields for the card front. The form keeps all entered values; the selection controls what the drawn card and its accessibility summary reveal. Personal starts with date of birth, mobile, email and address; Medical starts with every field.
- Saved template and field selection in the sealed profile payload. The backup reader validates and restores both, including older profiles without a field selection.
- The profile Details action sheet can change template directly and redraws the document front. Renaming a Person also redraws the front. Both retain the profile photo. Card detail text scales with accessibility text size; the capture measures its rendered height.
- Added screen tests for the four choices, field visibility, direct template change and Person rename redraw, plus store and encrypted backup round trips. No template prints a QR code.
- Round 2 verification: `npm run typecheck` passed; `npx jest --runInBand` passed (100 suites, 934 tests). Native view capture and large-text appearance still need device checks.
