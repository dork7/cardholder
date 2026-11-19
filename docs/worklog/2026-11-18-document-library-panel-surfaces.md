# Work log: consistent document library panels (#28)

- The supplied screenshot identifies pale rectangular patches inside the pinned document panel and All documents list on Home.
- Both panels were translucent (`glassStrong`) over the page gradient. They now use the theme's opaque document surface in light and dark, while their border, shape and shadow stay in place.
- A focused component test verifies both panels use the opaque surface in light and dark. Home and surface tests pass; Android device screenshot verification remains outstanding.
- Follow-up screenshot showed rectangular white bands remained in the pinned panel and document rows. The shared `Panel` still applied an iOS blur overlay and Android elevation even after its background was overridden. Library panels now opt into an opaque `Panel` mode that removes both effects and the soft shadow, leaving one solid surface and border. A focused regression test checks both panels have no elevation in light and dark. Device screenshot verification is still needed.
