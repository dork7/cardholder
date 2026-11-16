# Doc Keeper design prototypes

Eight throwaway, interactive design directions for the current app. All files stay in this folder; the production app is unchanged. The question is which hierarchy makes documents easiest to find, show and keep. No direction has been selected for implementation.

## Open

From the project root:

```sh
npm run prototypes
```

Open **http://127.0.0.1:4178/prototypes/doc-keeper/**. Requires Python 3. You can also double-click `index.html`; the prototype runs offline with no build step, dependencies, or remote assets.

| Direction | Open | Layout idea |
| --- | --- | --- |
| Apple · Fluid glass | [Apple](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=apple) | Visual document library, translucent floating navigation, soft depth and fluid motion |
| Swiss · Clear index | [Swiss](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=swiss) | Ruled document index, restrained monochrome, existing Public Sans type |
| Wallet · In your pocket | [Wallet](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=wallet) | Tactile pinned stack, quiet list, one-handed document presentation |
| Focus · Night desk | [Focus](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=focus) | Dark compact workspace, top navigation and metadata-rich rows |
| Guide · Everyday ease | [Guide](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=guide) | Task-led welcome, spacious controls, explicit next steps |
| Folio · Paper tabs | [Folio](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=folio) | Expandable tag drawers with tabbed paper surfaces |
| Agenda · Ahead of time | [Agenda](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=agenda) | Chronological expiry rail with renewal reminders |
| Glance · Ready to show | [Glance](http://127.0.0.1:4178/prototypes/doc-keeper/?variant=glance) | Large pinned shortcuts that open directly at the counter |

“Apple isomorphic” is interpreted as Apple-inspired materials and familiar native interaction patterns, adapted as a visual study for the existing Android app. The Swiss direction follows the current app’s identity; the other directions deliberately explore alternatives to its visual restrictions.

Switch directions with the floating arrow controls, the left navigation, or the keyboard’s left/right arrows. Keyboard shortcuts leave text inputs and dialogs alone. The current screen and direction stay in the URL (`?variant=apple&screen=document`). Sheets also keep their opening screen in `from` (for example, `?variant=swiss&screen=edit&from=document`). At phone widths, both screen and direction navigation scroll horizontally above the preview.

## Bottom-sheet study

Add/edit/shared document, note editing, tags, backup export/import, Unlimited, Privacy and Problems open as bottom sheets over their launching screen. Close them with the close control, Cancel where available, the backdrop or Escape. Long forms scroll inside the sheet while their action stays at the bottom. The inspector can open each sheet directly; it uses a representative launching screen for that link.

The main library, notes, folders, settings, document/PDF viewers, counter presentation, lock, loading, crash and recovery remain full-screen. These screens need room for reading, presenting or resolving an interruption. In the production app, the document editor and backup flows should be tested with the keyboard and small devices before adopting the sheet pattern; their length may justify full-screen routes.

## Screen coverage

Every direction provides these 22 screens/states:

| Screen key | Existing app surface |
| --- | --- |
| `home` | Document library, search, tag and expiry filters, pinned documents |
| `empty` | Empty library |
| `document` | Photo document, front/back, details, searchable document text |
| `pdf` | PDF page viewer, page navigation and cover selection |
| `present` | Show-at-counter presentation |
| `add` | New document editor, photo/PDF source, expiry, reminder, preview privacy |
| `edit` | Existing document editor and delete confirmation |
| `notes` | Searchable notes list |
| `note` | Note editor, pin and delete |
| `folders` | Folder management |
| `tags` | Tag management |
| `settings` | Security, display, backup, organisation and app updates |
| `export` | Backup passphrase and confirmation |
| `import` | Choose backup → unlock → merge/replace preview |
| `paywall` | Unlimited documents, price lookup and restore purchase |
| `privacy` | Privacy explanation |
| `lock` | App lock |
| `share` | Incoming shared-document editor |
| `problems` | Technical report preview and sharing |
| `crash` | Unexpected-close prompt |
| `boot` | Vault loading state |
| `recovery` | Missing-key recovery and start-fresh confirmation |

## Try the flows

- Open a document, flip it, inspect details, pin it, edit its name or show it at a counter.
- Search a name or tag, then try an unmatched query and clear it.
- Add a document with a sample front or PDF. Save it and find it in the library.
- Open Apartment contract to page through the sample PDF.
- In Folio, expand a tag drawer to find its documents.
- In Agenda, browse documents in expiry order; undated documents appear separately.
- In Glance, tap a pinned shortcut to open counter presentation directly.
- Add/edit/delete a note; create/rename/remove a tag or folder.
- Export: enter matching passphrases of at least eight characters to preview completion.
- Import: select the sample backup and use **`keeperdemo`** to unlock the merge/replace step.
- Reset demo returns all fixtures and settings to their original state.

## Boundaries

All identities and documents are fictional. State exists in memory and resets on reload. Prototype state is visible in the inspector’s expandable panel. Document and note edits are retained when switching directions for comparison.

Authentication, camera/file access, encryption, reminders, brightness, sharing, purchasing, updates and backups are simulated. A backup file is not produced. “Save document text” downloads a text file containing only the fictional sample data. No device settings, real documents or production data are accessed.

The prototypes use the repository’s bundled font and local HTML/CSS/JavaScript. Touch controls, visible keyboard focus, dialog focus handling and reduced-motion preferences are included. The standalone preview and design controls are outside Expo routing and are never imported by the app.

## Saved previews

Home-screen previews: [Apple](previews/apple.png), [Swiss](previews/swiss.png), [Wallet](previews/wallet.png), [Focus](previews/focus.png), [Guide](previews/guide.png), [Folio](previews/folio.png), [Agenda](previews/agenda.png), [Glance](previews/glance.png).

Verification: rendered all 176 screen/direction combinations at desktop and phone widths (352 renders), checked for browser errors and horizontal overflow, and exercised document flip/details/edit/add, search and empty results, note editing, cross-direction draft retention, tag creation, backup validation/import and reset. Reviewed all eight home-screen screenshots visually. Also checked tag drawer expansion, chronological ordering, direct-to-counter shortcuts and switcher wraparound across eight directions.
