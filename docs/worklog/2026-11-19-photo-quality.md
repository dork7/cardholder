# Work log: photo quality warning (#55)

- The editor starts an on-device quality check when a new front or back photo is cropped or selected. Before Save, strong blur, glare, or cut-off signals offer Replace/Retake and Keep anyway; the warning never blocks the save.
- The Android OCR module samples image sharpness, contrast, and near-white area, and checks whether multiple recognized text lines touch an image edge. The TypeScript adapter uses conservative thresholds. Older builds and unsupported platforms skip the check.
- A kept image is not warned about again. Replacing a photo starts a new check; unchanged saved photos and PDFs are excluded.
- Focused editor and quality classification tests pass; TypeScript typecheck passes. Native compilation and calibration with representative Android IDs, including holograms, remain outstanding because no Android SDK/device is available in this workspace.
