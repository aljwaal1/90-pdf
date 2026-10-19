# 90 PDF: Open-source reuse architecture

This plan documents upstream inspirations; no upstream source code is copied by this document.

## Technology constraints

90 PDF currently uses Next.js/React/TypeScript plus Tauri for Android. Existing dependencies include pdf-lib, pdfjs-dist and tesseract.js. Prefer exercising and improving these before adding duplicate engines. Existing Android storage capabilities require device-level verification.

## Upstream projects and decisions

| Project | Source | Proposed use | Gate |
|---|---|---|---|
| Stirling PDF | https://github.com/Stirling-Tools/Stirling-PDF | Workflow and feature UX reference, not verbatim code | Open-core licensing; inspect exact files and license before any reuse |
| PDF Arranger | https://github.com/pdfarranger/pdfarranger | Thumbnail organization, drag/drop and crop UX reference | GPL-3.0; do not copy into differently licensed distributed app without review |
| Mozilla PDF.js | https://github.com/mozilla/pdf.js | Existing rendering/search path | Verify worker bundling, memory consumption and mobile tests |
| pdf-lib | https://github.com/Hopding/pdf-lib | Existing editing engine | Build tests against application adapters and serialization |
| PdfBox-Android | https://github.com/TomRoush/PdfBox-Android | Only for proven Android-native PDF gaps | Confirm Android/Tauri integration, maintenance, licensing, size and performance |

## Prioritized integration backlog

1. Android launch and routing: verify first frame, asset extraction, JavaScript startup and offline behavior; collect logs for white screen failures.
2. Storage Access Framework: content:// open/import, persist permissions where supported, save/export and share with real devices.
3. PDF editor adapters: merge, split, reorder, delete, rotation and watermarks. Add app-level tests beyond direct pdf-lib checks.
4. Mobile page organizer: responsive thumbnail grid, selection, accessible drag/drop alternative and undo.
5. OCR Arabic/English: local language data readiness, worker lifecycle, memory caps, cancellation and searchable output tests.
6. Conversion/batch workflows: fidelity, progress, cancellation, error recovery and tests on large documents.
7. APK gate: build, signature verification, installation and representative end-to-end device tests.

## Acceptance criteria

- No regression to currently working tools.
- Unit tests are discovered and run in CI.
- Real Android open/edit/save works with content URIs, without granting broad storage permissions.
- Arabic UI and generated Arabic PDFs remain readable; RTL and text shaping are tested.
- No upstream code copied without verified compatible permissions and attribution.
- APK delivery only when an actual, verified build artifact exists.

## Current status

Research and first pdf-lib regression tests are in PR #4. CI success and Android device validation have not yet been verified. This document is a roadmap, not a claim of implemented features.
