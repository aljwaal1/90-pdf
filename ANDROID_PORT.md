# 90 PDF Android port
Original upstream: https://github.com/PDFCraftTool/pdfcraft
Licensing: AGPL-3.0; preserve LICENSE and notices.
Objective: all 90+ original tools, not a limited subset.
This repository imports the real original source and uses Tauri 2 mobile as a packaging route.
Android feature parity must be verified on a device; some WASM/worker/LibreOffice functions may need adaptation.
Android test builds are not production-ready until the compatibility matrix passes.

CI finding (2026-10-12): The ARM64 release APK produced by Gradle is named app-universal-release-unsigned.apk and is not directly installable. The debug APK is signed for development. Do not distribute the unsigned release APK as an installable build; production releases require a stable private signing key and verification with apksigner.
