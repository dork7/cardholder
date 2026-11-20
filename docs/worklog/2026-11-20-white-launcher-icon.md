# Work log: white launcher icon (#53)

- Repaired the icon generator's source: the earlier `PixelLogo.tsx` was removed, so the generator now owns the 16×16 mark it draws.
- Changed the background to white and the mark to dark ink, warm paper, grey lines, and the app's blue ornament. Updated Android's adaptive background colour in `app.json`.
- Regenerated the iOS/store icon, Android adaptive foreground/background, splash, and favicon. The themed monochrome mask remains the same shape.
- Visually inspected the full icon and adaptive foreground; the mark remains centred in the launcher safe area.
