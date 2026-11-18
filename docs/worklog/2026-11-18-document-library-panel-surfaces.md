# Work log: consistent document library panels (#28)

- The supplied screenshot identifies pale rectangular patches inside the pinned document panel and All documents list on Home.
- Both panels were translucent (`glassStrong`) over the page gradient. They now use the theme's opaque document surface in light and dark, while their border, shape and shadow stay in place.
- A focused component test verifies that both panels use the opaque light surface. Home and surface tests pass; Android device screenshot verification remains outstanding.
