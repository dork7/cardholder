# Work log: wallet fan app icon

- Replaced the pixel-art paper icon with a fan of four stacked wallet cards on near-black (`#16161D`): indigo `#3442E6`, `#6B77F0`, `#A7B3FF`, and a white front card with two text lines.
- Rewrote `scripts/make-icons.mjs`: the mark is now rounded rectangles in a 400x400 design space, rasterised with 4x4 supersampling (no image tools needed). Same six outputs as before.
- iOS/store icon is full-bleed near-black; Android adaptive foreground stays inside the 66/108 safe circle, the background is flat near-black, and `app.json`'s adaptive `backgroundColor` changed from white to `#16161D`.
- Themed (monochrome) icon: white cards separated by transparent gaps, with the text lines cut out, since only alpha is used.
- Splash icon is the whole icon on a rounded plate so it reads on any splash background.
- Verification: rendered all outputs and inspected them; no device check yet (launcher masks and Material You theming need a build on a device).
