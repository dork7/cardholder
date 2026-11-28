# Issue texts (copied by Claude; Codex sandbox cannot reach GitHub)

## #76 Profile documents: personal and emergency details card with QR and lock-screen view
## Problem Statement

The user keeps their family's important documents in Doc Keeper, but the personal details that matter most in an emergency — who someone is, their blood group, allergies, conditions, medications and who to call — are not kept anywhere in the app. When the user needs to hand these details to a doctor, a school or a new contact they retype them, and if the user (or a family member) is found unconscious, a helper cannot reach any of it: the phone is locked, and Doc Keeper keeps everything behind its own lock as well.

## Solution

The user can create a **profile** for any Person (themself, a child, a parent). A profile is a new kind of Document: it holds a photo, the person's date of birth, blood group, medical details, contact details and up to three emergency contacts, and Doc Keeper draws it as a card from a template the user picks. Like any document it can be pinned, tagged, put in a Space, searched, shared and backed up.

From the profile the user can show a QR code that hands its details to another phone as a contact (vCard), entirely offline.

The user can also choose, per profile and per field, what an emergency helper may see on the lock screen. On Android a quiet lock-screen notification opens a read-only emergency screen over the lock screen without unlocking, with buttons to call the emergency contacts. On iOS (a later release) a lock-screen widget shows a short summary. This is off until the user turns it on, and it is the one deliberate exception to "nothing is readable without unlocking", recorded in a new ADR.

## User Stories

### Creating and owning a profile

1. As a user, I want to add a profile from the shared Add sheet, so that I can create one the same way I add a document or write a note.
2. As a user, I want each Person on the People screen to offer Create profile or Open profile, so that I can reach a family member's profile from where I manage family members.
3. As a user, I want to create a profile for someone who is not yet a Person, so that I do not have to visit People first; the Person is created with the name I type.
4. As a user, I want each Person to have at most one profile, so that there is never doubt which profile is current.
5. As a user, I want adding a profile for a Person who already has one to open their existing profile, so that I do not create a duplicate by mistake.
6. As a user, I want the profile's name to be its Person's name, so that renaming the Person renames the profile and redraws its card.
7. As a user, I want deleting a Person to also delete their profile after I confirm, so that no orphaned medical details remain.
8. As a user, I want a profile created from inside a Space to start in that Space, so that a family profile lands in Family when I create it there.
9. As a user, I want a profile to count towards my free documents like any other document, so that the free limit is easy to understand.
10. As a user at the free limit, I want Add profile to open the paywall as Add document does, so that I know why I cannot add another.

### Profile fields

11. As a user, I want to add a profile photo by taking or choosing a picture, so that a helper can recognise the person.
12. As a user, I want to crop the photo to a square that is shown as a circle, so that it looks right on every template.
13. As a user, I want to remove or replace the profile photo, so that I can keep it current.
14. As a user, I want to enter a date of birth with a date picker, so that it is entered unambiguously.
15. As a user, I want the card to show the person's age worked out from the date of birth, so that a helper does not have to calculate it.
16. As a user, I want to choose a blood group from A+, A−, B+, B−, AB+, AB−, O+, O− or Unknown, so that it cannot be mistyped.
17. As a user, I want to list Conditions as separate short entries, so that each one is clear on the card.
18. As a user, I want to list Allergies as separate short entries, so that a helper can see them at a glance.
19. As a user, I want to list Medications as separate short entries, so that a doctor knows what the person takes.
20. As a user, I want a free-text medical Notes field, so that I can add anything that does not fit a list.
21. As a user, I want to enter a mobile number, email and address, so that the profile also works as a contact card.
22. As a user, I want every field to be optional except the name, so that I can save a partial profile and finish it later.

### Emergency contacts

23. As a user, I want to add up to three emergency contacts, so that a helper has someone to call if the first does not answer.
24. As a user, I want to pick an emergency contact from my phone's contacts with the system picker, so that I do not retype a number I already have.
25. As a user, I want picking a contact not to ask for access to all my contacts, so that Doc Keeper only ever sees the one person I chose.
26. As a user, I want to choose which of a contact's numbers to use when they have several, so that the right number is saved.
27. As a user, I want the picked name and number copied into the profile and editable there, so that the profile still works if the contact changes or is deleted.
28. As a user, I want to type an emergency contact by hand, so that I can add someone who is not in my contacts.
29. As a user, I want to give each emergency contact a relationship such as "Wife" or "Father", so that a helper knows who they are calling.
30. As a user, I want to put emergency contacts in priority order, so that the most important one is shown first.

### Templates and the card

31. As a user, I want to choose from Medical, Contact, Compact wallet and Full templates, so that the card suits how I will use it.
32. As a user, I want each template to lead with the details that matter for it (Medical: blood group, allergies and conditions; Contact: phone, email and address), so that the card reads well at a glance.
33. As a user, I want to turn individual fields on or off for the card, so that I share only what I am comfortable sharing.
34. As a user, I want a preview of the card while I choose a template and fields, so that I see the result before saving.
35. As a user, I want to change the template from the profile's details screen, so that I can switch without opening the editor.
36. As a user, I want the card redrawn whenever I edit the profile, rename its Person or change its template, so that the card is never out of date.
37. As a user, I want the card to be the profile's picture in Documents, Home, favorites and Spaces, so that profiles look like the cards they are.
38. As a user, I want the card to follow the app's Showcase look in light and dark mode, so that it feels part of Doc Keeper.
39. As a user, I want the card readable with large text settings, so that the details stay legible.

### Profile as a Document

40. As a user, I want profiles to appear in the Documents list with my other documents, so that everything I keep is in one place.
41. As a user, I want search to find a profile by its name, conditions, allergies, medications or other text, so that I can find it quickly.
42. As a user, I want to pin a profile so that it appears in My favorites on Home, so that it is one tap away.
43. As a user, I want to tag a profile and filter by its tags and Person, so that it behaves like my other documents.
44. As a user, I want a profile to have no expiry date and no expiry reminders, so that I am not asked for dates that do not apply.
45. As a user, I want a deleted profile to go to Recently deleted and be restorable exactly as it was, so that a mistaken delete is not permanent.
46. As a user, I want batch actions (pin, tag, share, delete) to work on profiles in a selection, so that they behave like other documents.

### Profile details screen

47. As a user, I want a profile's details screen to show its card full width, so that I can read or show it to someone.
48. As a user, I want Edit to open the profile form rather than the photo editor, so that I edit fields, not pictures.
49. As a user, I want to share the card as an image or a PDF through the system share sheet, so that I can send it to a school or doctor.
50. As a user, I want sharing a profile to warn me first, as sharing an ID does, so that I do not send medical details without thinking.
51. As a user, I want Delete to sit apart from Edit, so that I do not delete a profile by mistake.

### QR code

52. As a user, I want a Show QR button on the profile, so that the QR code is only shown when I ask for it.
53. As a user, I want Show QR to fill the screen at full brightness, so that another phone can scan it easily.
54. As a user, I want the QR code to hold the same fields the card shows, so that I control what it shares in one place.
55. As a person scanning the QR code, I want my phone to offer to add a contact with the name, phone, email and address, so that I can save the details in one tap.
56. As a person scanning the QR code, I want the medical details and emergency contacts in the contact's notes, so that they travel with the contact.
57. As a user, I want the QR code to work with no internet connection and no server, so that nothing about the profile leaves my phone except through the scan.
58. As a user, I want the QR code never to include the photo, so that it stays small and scannable.
59. As a user, I want to be told when the chosen fields are too long for a scannable QR code, and which fields to shorten or turn off, so that nothing is cut silently.

### Lock screen (Android)

60. As a user, I want the lock-screen view off until I turn it on, so that nothing becomes visible without my say-so.
61. As a user, I want to choose which profiles appear on the lock screen, so that I can include my children but not others.
62. As a user, I want to choose, for each profile, which fields appear on the lock screen, separately from the card, so that I can be stricter there.
63. As a user, I want sensible suggested lock-screen fields (name, blood group, allergies, conditions, first emergency contact) with date of birth, address and email off, so that turning it on is quick and safe.
64. As a user, I want a preview of exactly what will be visible without unlocking before I turn it on, so that I understand what I am exposing.
65. As a user, I want to be told plainly that these details will be readable by anyone holding my phone, so that I make an informed choice.
66. As an emergency helper, I want a quiet "Emergency info" notification on the locked phone, so that I know medical details are available.
67. As an emergency helper, I want tapping that notification to show the emergency screen without unlocking the phone, so that I can help someone who cannot unlock it.
68. As an emergency helper, I want the emergency screen to list each chosen profile by name and blood group, so that I can find the right person.
69. As an emergency helper, I want to tap a profile to see its allowed details in full, so that I can tell paramedics what matters.
70. As an emergency helper, I want a Call button for each emergency contact, so that I can reach family quickly.
71. As a user, I want the emergency screen to be read-only with no way into the rest of Doc Keeper, so that my documents stay protected.
72. As an emergency helper, I want Back to return me to the lock screen, so that I am not left in an unfamiliar app.
73. As a user, I want the lock-screen details updated whenever I save a profile, so that they are never stale.
74. As a user, I want turning the lock-screen view off (or deleting a profile, or removing it from the lock-screen list) to erase its details from the lock screen immediately, so that nothing lingers.
75. As a user, I want the lock-screen view to keep working after the phone restarts, so that it is there when it is needed.
76. As a user who turned off notifications, I want to be told the lock-screen view needs them and how to allow them, so that I am not left believing it works.
77. As a user, I want Doc Keeper's own app lock to stay in force for everything except the emergency screen, so that turning this on does not weaken anything else.

### Lock screen (iOS, later release)

78. As an iPhone user, I want a lock-screen widget showing a chosen profile's name, blood group and first emergency contact, so that a helper sees the essentials.
79. As an iPhone user, I want tapping the widget to ask for unlock as usual, so that nothing more is exposed than the widget shows.

### Backup and upgrade

80. As a user, I want profiles, their photos and all their fields included in my encrypted backup, so that I never lose them.
81. As a user, I want restoring or merging a backup to bring back profiles exactly, including template, field choices and lock-screen choices, so that a new phone is set up as before.
82. As a user, I want a merge never to give a Person two profiles, so that restoring an older backup does not create duplicates.
83. As a user, I want older backups without profiles to restore as before, so that upgrading changes nothing I had.
84. As a user, I want a profile opened by an older version of Doc Keeper (or exported) to still appear as a normal document showing its card, so that nothing breaks for that version.
85. As a user, I want lock-screen details not to come back from a backup until I turn the lock-screen view on again on the new phone, so that restoring a backup never exposes anything by itself.

### Accessibility

86. As a screen-reader user, I want every profile field, list entry and emergency contact labelled, so that I can fill the form without seeing it.
87. As a screen-reader user, I want the card read as its details in a sensible order, so that the picture is not a dead end.
88. As a screen-reader user, I want the emergency screen and its Call buttons announced clearly, so that a helper using accessibility features can act.
89. As a user who prefers reduced motion, I want the QR and emergency screens to open without animation, so that they respect my setting.

## Implementation Decisions

- **Domain**: a profile is a Document that belongs to exactly one Person; a Person has at most one profile. The glossary's Document becomes "photos, a PDF, or a profile", and Profile is added as a term (Emergency info / lock-screen view too, with what it may contain).
- **Storage**: the profile's details live inside the document's sealed payload (ADR 0003), never in plaintext columns. The presence of profile details on a document is what makes it a profile. Shape (in prose): date of birth (calendar date), blood group (one of eight groups or unknown), lists of conditions, allergies and medications, medical notes, mobile, email, address, up to three ordered emergency contacts (name, relationship, phone), chosen template, fields enabled on the card, and the lock-screen settings (shown or not, and its enabled fields).
- **Photo**: the profile photo is a sealed blob alongside the document's images, cropped square by the existing cropper with a fixed square aspect.
- **Card picture**: the drawn card is saved as the document's front image (and thumbnail), so every existing list, favorite, Space, share and older app version shows it without knowing about profiles. It is redrawn after any profile edit, template change or rename of its Person. Drawing uses an off-screen render of the template view captured to an image — a new native dependency for view capture.
- **Search**: the profile's text (name, medical lists and notes, contact details, emergency contact names) is fed into the document's searchable text so the existing in-memory search finds it.
- **Free limit**: profiles count as documents; the existing limit checks apply unchanged.
- **Expiry**: profiles have no expiry date and are skipped by expiry reminders and the Expiring soon filter.
- **Person deletion**: deleting a Person that has a profile asks first and then moves the profile to Recently deleted along with clearing the Person, instead of only unassigning it.
- **Templates**: Medical, Contact, Compact wallet and Full, each a fixed layout with its own field order, styled with the Showcase tokens in light and dark. The QR code is never printed on any template.
- **QR**: generated on device by a new QR library on top of the existing SVG library; no network (ADR 0005). Content is a vCard 3.0 built from the fields the card shows: name, phone, email and address as contact fields; date of birth as birthday; blood group, conditions, allergies, medications, notes and emergency contacts in the note. Never the photo. If the encoded text exceeds a scannable size, Show QR is replaced by a message naming the longest fields to shorten or turn off; nothing is truncated.
- **Show QR**: full-screen, maximum brightness using the existing Show-mode brightness hook, no animation under Reduce Motion.
- **Contact picker**: the system single-contact picker that needs no contacts permission, via a new native dependency; the chosen name and number are copied and editable. No contacts permission is added to the app.
- **Sharing**: reuses the existing document share (card as image, or PDF), with the ID-style confirmation before sending.
- **Entry points**: the shared Add sheet gains Add profile; People gains Create/Open profile per Person; Add profile from within a Space preselects it, as Add document does.
- **Lock screen (Android)**: a new native module, beside the existing home-widget and photo-capture modules, provides (a) an ongoing low-importance notification visible on the lock screen and (b) a read-only activity allowed to show over the lock screen, outside the app's own lock gate. It reads a separate unencrypted copy of only the enabled profiles' enabled fields, kept in device-protected storage so it works after a restart before first unlock. The app rewrites this copy and re-posts the notification on every profile save, rename, delete, restore, and settings change, and erases both when the feature is off or no profiles are enabled. Call buttons hand off to the dialer.
- **Lock screen (iOS, later)**: a WidgetKit lock-screen widget extension reading the same kind of minimal copy from a shared app group; tapping opens the app behind the usual unlock.
- **Backup**: profiles travel inside the existing encrypted backup as documents with their extra payload and photo blob; parsing treats profile details as optional so older backups restore unchanged, and unknown or malformed profile details are dropped rather than failing the import. Merge never creates a second profile for a Person. The lock-screen copy is never part of a backup, and lock-screen visibility is restored switched off.
- **ADR**: a new ADR records the lock-screen view as the single, opt-in exception to ADRs 0002 and 0003: what may be stored unencrypted, where, when it is erased, and that nothing else in the app is reachable from it.
- **Reminder and shortcut titles**: unchanged, but a profile's name is treated like any document name.

## Testing Decisions

- Good tests exercise behaviour through the app's existing seams and assert what a user (or a scanning phone, or the lock screen) would observe — stored and restored fields, what a screen shows, what is handed to a native boundary — never internal helpers or storage layout.
- **Document store with the in-memory database** (as the card store and note store tests do): creating, updating and reading a profile; fields sealed and round-tripped; one profile per Person; deleting a Person with a profile; profiles counting towards the free limit; search finding profile text; profiles skipped by expiry.
- **Backup round trip** (as the backup service tests do): export, merge, replace and restore with profiles and photos; old backups without profiles; malformed profile details dropped; merge not duplicating a Person's profile; lock-screen visibility restored off.
- **Screen tests with a mocked app context** (as the edit screen, notes screens, Home and Documents tests do): the profile editor (every field, blood group choices, date of birth, list entries, up to three emergency contacts and their order, unsaved-changes guard); Add profile from the Add sheet and from inside a Space; Create/Open profile on People; the details screen (template change, Edit, Share with confirmation, Delete apart from Edit); Show QR, asserting the vCard text handed to the QR component and the too-long message; the lock-screen settings (choosing profiles and fields, preview, warning).
- **Native boundaries mocked as the app already mocks them** (photo pickers, notifications, sharing): the contact picker returns a chosen contact; view capture returns an image; the lock-screen module is asserted to receive exactly the enabled fields on save and an erase when turned off or when a profile is deleted.
- The Android emergency activity over the lock screen and the iOS widget are verified on devices, with the same device checklist approach as #74.

## Out of Scope

- A separate app for profiles (decided: it stays in Doc Keeper).
- Any server, link or online sharing for the QR code.
- Reading or syncing with Apple Health's Medical ID or Android's built-in Emergency information.
- Keeping emergency contacts linked to the phone's contacts after they are picked.
- More than one profile per Person, and profiles for anything other than a Person.
- Extra fields such as nationality, insurance numbers, organ donor status or doctor details.
- Scanning QR codes inside Doc Keeper.
- Printing support beyond sharing an image or PDF.
- The iOS lock-screen widget in the first release (planned for a later release).

## Further Notes

- The design was settled in a grilling session; the user chose the medical-plus-contact purpose, profiles per Person, emergency contacts from the contact list, QR on request only, the profile as a Document, an Android lock-screen notification opening a read-only emergency screen, user-selected profiles and fields for the lock screen, and keeping the feature in Doc Keeper.
- Suggested slicing for follow-up issues: (1) profile document, storage and backup; (2) profile editor and contact picker; (3) templates and card drawing; (4) QR; (5) Android lock-screen view and its ADR; (6) iOS lock-screen widget (later).
- New native dependencies (QR generation, view capture, system contact picker, the Android lock-screen module) need a development build and should be checked against the dependency test that guards the app's package list.


## #81 Profiles: emergency contacts
## Parent

#76

## What to build

The user adds up to three emergency contacts, each with name, relationship (e.g. "Wife") and phone number, in priority order. A contact can be picked with the system contact picker, which asks for no contacts permission; the chosen name and number are copied in and stay editable. Contacts can also be typed by hand. They are drawn on the card.

## Acceptance criteria

- [ ] Up to three contacts; adding a fourth is not offered
- [ ] Pick from the system single-contact picker without adding a contacts permission; choose a number when the contact has several
- [ ] Picked details are copied and editable; typing a contact by hand also works
- [ ] Contacts can be reordered
- [ ] The card shows the contacts in order
- [ ] Contact picker mocked at the native boundary


## #82 Profiles: templates and field choice
## Parent

#76

## What to build

The user chooses between **Medical**, **Contact**, **Compact wallet** and **Full** templates, each with its own layout and lead fields, and turns individual fields on or off for the card, with a live preview. The details screen offers **Change template**. The card is redrawn after any edit, template change or rename of its Person. No template ever prints the QR code.

## Acceptance criteria

- [ ] Four templates, in light and dark, legible with large text
- [ ] Per-field on/off for the card, with preview before saving
- [ ] Change template from the details screen
- [ ] Renaming the Person redraws the profile's card
- [ ] Screen tests for template and field choice


## #84 Profiles: Show QR
## Parent

#76

## What to build

A **Show QR** button opens a full-screen QR code at maximum brightness (the existing Show-mode brightness). The QR code is an offline vCard of exactly the fields the card shows: name, phone, email and address as contact fields, date of birth as birthday, and blood group, medical details and emergency contacts in the note. Never the photo, and no network (ADR 0005). If the chosen fields are too long to scan reliably, the user is told which fields to shorten or turn off instead of seeing a cut-down code.

## Acceptance criteria

- [ ] The QR code appears only on request
- [ ] vCard content matches the card's enabled fields
- [ ] Too-long content shows a message naming the fields to shorten; nothing is truncated
- [ ] No animation under Reduce Motion
- [ ] Screen test asserts the vCard text handed to the QR component; adds the QR dependency

