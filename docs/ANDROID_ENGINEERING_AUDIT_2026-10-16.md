# 90 PDF — Android engineering audit (phase 1, 2026-10-16)

**Status: Phase 1 partial audit; remediation NOT yet verified.** This document is a reproducible issue register, not a claim of line-by-line review of all 606 relevant repository files or of on-device test execution.

## Scope and reviewed source files
Inspected the repository tree (1,779 blobs, 606 under `src/`, `src-tauri/src/`, `src-tauri/capabilities/`, and `.github/workflows/`), and directly read these files (whole-file fetches; targeted lines inspected):
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src/lib/tauri-bridge.ts`
- `src/__tests__/lib/tauri-bridge.test.ts`
- `src/components/studio/PDFStudio.tsx`
- `src/components/studio/studio-processors.ts`
- `src/components/studio/StudioToolDrawer.tsx`
- `src/components/studio/StudioLeftRail.tsx`
- `src/components/layout/MobileMenu.tsx`
- `src/components/layout/Header.tsx`
- `src/components/workflow/WorkflowEditor.tsx`
- `src/config/tools.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/[locale]/layout.tsx`
- `.github/workflows/android.yml`
- `.github/workflows/validate-android-saf.yml`

## Confirmed findings (from source inspection)
| ID | Priority | File:line | Finding | Required acceptance test |
|---|---|---|---|---|
| AND-001 | P0 | `src/components/studio/PDFStudio.tsx:318-345` | Export result exists only in a local variable before saving; cancelled/failed save does not retain a retriable result in UI state. | Cancel Android picker, reopen result panel, save same output without rerunning processor. |
| AND-002 | P0 | `src/components/studio/PDFStudio.tsx:327-332` | Cancelled export is labelled as success and asks to retry, but no retry UI or persisted pending result exists. | No success toast on cancellation; pending output remains available. |
| AND-003 | P0 | `src/components/studio/studio-processors.ts:561-565,702-710` | Array processor outputs are collapsed to first element; additional outputs can be lost. | Multi-file split/extract yields correct file count and bytes. |
| AND-004 | P1 | `src/components/studio/PDFStudio.tsx:444-452` | ZIP export ignores boolean result of `saveBlobFile` and announces success even after user cancels. | Cancel picker; no saved-success message. |
| AND-005 | P1 | `src/lib/tauri-bridge.ts:222-230` | SAF write and post-write length verification share a single failure path; inability to verify can be misreported as failed write. | Distinguish write failure, length mismatch, and unavailable verification on Android. |
| AND-006 | P1 | `src/components/studio/studio-processors.ts:178-190,543-544,688-689` | All catalog tools are exposed in Studio while dispatcher supports explicit subsets; unsupported tools can throw at execution. | Machine-readable tool-to-processor capability matrix, Android smoke test for every visible tool. |
| AND-007 | P1 | `src/components/studio/PDFStudio.tsx:299-303,449-451`; `src/components/workflow/WorkflowEditor.tsx:592` | Chinese strings remain in Arabic/English UI and errors. | Arabic/English string coverage and no Chinese runtime UI strings. |
| AND-008 | P1 | `src/components/layout/MobileMenu.tsx:165-172`; `src/components/studio/PDFStudio.tsx:882-934` | Independent mobile drawer and Studio left rail/right options panel have inconsistent navigation conventions. | Unified mobile navigation; consistent RTL/LTR; hardware Back navigation. |
| AND-009 | P1 | `src/components/studio/PDFStudio.tsx:118-120,168-176,1002-1014` | Debug log lives only in Studio React state and disappears on remount; no cross-module durable log. | Log survives restart; copy/export/redact; workflow + save events. |
| AND-010 | P1 | `src-tauri/tauri.conf.json` CSP | Broad script/network policies include unsafe-eval; needs a dependency-by-dependency least-privilege review. | Restrict CSP without breaking PDF.js/OCR/WASM; verify no unrequested network upload. |
| AND-011 | P1 | `src/app/globals.css`; `src/components/studio/PDFStudio.tsx:1002-1035` | CSS safe-area changes are partial; not all fixed dialogs, navigation, and keyboard interactions have been tested with Android WindowInsets. | Physical/emulator tests: gesture/3-button nav, landscape, keyboard, small phone. |
| AND-012 | P2 | `src/components/studio/StudioToolDrawer.tsx` (~2260 lines); `src/components/workflow/WorkflowEditor.tsx` (~1389 lines) | Large UI components combine state, presentation, and execution, raising regression risk. | Incremental component extraction with unchanged behavior and regression tests. |
| AND-013 | P2 | `src-tauri/tauri.conf.json`; `.github/workflows/android.yml:75-83` | Source config identifies PDFCraft, while CI rewrites Android identity to 90 PDF; review signing and update compatibility before any ID changes. | Verify installed package identity, signing certificate, and upgrade from previous APK. |
| AND-014 | P1 | `src/__tests__/lib/tauri-bridge.test.ts`; `.github/workflows/validate-android-saf.yml` | Browser/jsdom tests exist but do not exercise real Android SAF provider behavior. | Instrumented/emulator tests for picker, URI, write, read-back, cancellation, permissions, storage full. |

## CI observation
At audit time, `Validate 90 PDF` succeeded on commit `0cb89bf9c16d614333571c04378af79eb0ce63a2`; Android APK job was pending. This does **not** establish on-device feature correctness.

## Ordered remediation gates
1. **P0 storage and outputs**: pending-results store, cancellation handling, multi-result export, save/preview/retry, SAF verification semantics. Unit + Android device tests mandatory.
2. **Diagnostics**: persistent privacy-safe cross-module log, export/share, typed error stages.
3. **Navigation**: one mobile navigation system; safe areas, WindowInsets, keyboard, portrait/landscape; RTL/LTR.
4. **Tools**: automated coverage matrix for every visible tool; actual PDF output assertions and Android smoke tests.
5. **Security/performance**: CSP hardening, memory, blob URL cleanup, cancellation.
6. **Release**: typecheck, lint, unit/integration, Android instrumentation, ARM64 APK install and test.

## Test and change policy
- Keep all existing tools; do not claim a tool works because its processor class exists.
- Changes to `main` only after verifying the specific patch, in small commits; no PR unless requested.
- Report unrun tests as **not run**, not passing.
- No real Android device or emulator test was run during this audit.
- This file is phase-1 evidence and backlog; phase 1 remains **incomplete** until remaining source files and per-tool paths are reviewed.
