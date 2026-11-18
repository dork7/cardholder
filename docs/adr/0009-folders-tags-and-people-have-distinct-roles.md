# Folders, tags and people have distinct roles

Status: accepted, 2026-11-18. Resolves the choice in #32 and #37.

**Decision:** keep folders as one filing place per document, tags as multiple topics that cross folders and apply to documents and notes, and people as a separate owner of a document. A note may link to one document, but has no folder or person.

**Why:** converting a person's identity into a tag would make filtering ambiguous and could mix ownership with document type. Replacing folders with tags would erase the useful one-place filing rule and require a migration that guesses at users' intent. Separate concepts let a document be Sara's passport in the Travel folder with ID and Renewal tags.

**Consequences:** the existing folder controls are enabled again so the distinction is usable. People need their own encrypted names and backup entries. Existing documents and notes have no assigned person. Removing a person leaves their documents unassigned; removing a folder leaves documents outside folders. A tag remains in use while either a document or a note carries it.
