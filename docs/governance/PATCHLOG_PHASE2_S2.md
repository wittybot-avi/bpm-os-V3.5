
# BPM-OS Phase 2 (S2/S3) Patch Log

> **NOTE:** This is the active patch log for Phase-2 micro-prompts.
> It exists to reduce edit contention on the master `PATCHLOG.md`.
> At the end of Phase 2, this content will be merged into the master log.

## Active

| Patch ID | Patch Type | Intent | Status | Notes | Date |
|:---|:---|:---|:---|:---|:---|
| **V35-S2-PP-16to18-MERGED** | Feature/UX | S2 Completion Pack | **STABLE** | Merged 3 planned patches into one safe deployment: <br>1. **Commercial Variance:** Added Price/Lead-time trend indicators. <br>2. **Operational Gates:** Implemented interactive Preconditions Drawer. Gates now block actions. <br>3. **Scrollable Layout:** Enabled vertical scroll and Section Focus mode. | 2026-02-01 23:15 (IST) |
| **V35-S2-PP-15** | Governance | Snapshot commercial terms at PO issue | **STABLE** | Implemented logic to freeze commercial terms into the Order Context upon PO Issuance. Added "Snapshot" view in Terms tab when PO is locked, preventing edits to historical agreements. | 2026-02-01 21:30 (IST) |
| **PP-S2-STABILIZE-01** | Stabilization | Consolidate S2 Types | **STABLE** | Created `stages/s2/contracts/s2Types.ts` as Single Source of Truth for Supplier, CommercialTerm, and Order interfaces. Refactored `Procurement.tsx`, `s2Contract.ts`, and `s2Guards.ts` to use shared types. Fixed ErrorBoundary structure. | 2026-02-01 21:00 (IST) |
| **V35-S2-PP-14** | Governance | Versioning of commercial terms | **STABLE** | Implemented version control for Commercial Terms. Updates to Active terms now create a new Draft version (V+1), preserving history. Added Version History drawer to view past revisions. | 2026-02-01 20:45 (IST) |
| **V35-S2-PP-13** | Feature | Commercial terms CRUD per SKU–Supplier | **STABLE** | Implemented CRUD functionality for Commercial Terms in S2. Added Term Editor with fields for SKU, Supplier, Price, MOQ, Lead Time, and Validity. Included attachment simulation (mock upload). Replaced static terms list with dynamic state. | 2026-02-01 20:15 (IST) |
| **V35-S2-PP-12** | Governance | Block PO if supplier not eligible | **STABLE** | Implemented validation logic to block PO issuance (Submit/Approve/Issue) if supplier status is 'Pending' or 'Rejected'. Added 'Rejected' status to data model. Enhanced button tooltips to show specific blocking reason. | 2026-02-01 19:30 (IST) |
| **V35-S2-HOTFIX-PP-11A** | Hotfix (Process) | Phase-2 Patchlog split to prevent AI Studio patchlog write failures | **STABLE** | No functional/UI changes; only documentation/process. Introduced `PATCHLOG_PHASE2_S2.md` to avoid large file edits. | 2026-02-01 18:45 (IST) |
