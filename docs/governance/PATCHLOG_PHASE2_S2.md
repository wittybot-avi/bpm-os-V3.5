
# BPM-OS Phase 2 (S2/S3) Patch Log

> **NOTE:** This is the active patch log for Phase-2 micro-prompts.
> It exists to reduce edit contention on the master `PATCHLOG.md`.
> At the end of Phase 2, this content will be merged into the master log.

## Active

| Patch ID | Patch Type | Intent | Status | Notes | Date |
|:---|:---|:---|:---|:---|:---|
| **V35-S2-PP-13** | Feature | Commercial terms CRUD per SKU–Supplier | **STABLE** | Implemented CRUD functionality for Commercial Terms in S2. Added Term Editor with fields for SKU, Supplier, Price, MOQ, Lead Time, and Validity. Included attachment simulation (mock upload). Replaced static terms list with dynamic state. | 2026-02-01 20:15 (IST) |
| **V35-S2-PP-12** | Governance | Block PO if supplier not eligible | **STABLE** | Implemented validation logic to block PO issuance (Submit/Approve/Issue) if supplier status is 'Pending' or 'Rejected'. Added 'Rejected' status to data model. Enhanced button tooltips to show specific blocking reason. | 2026-02-01 19:30 (IST) |
| **V35-S2-HOTFIX-PP-11A** | Hotfix (Process) | Phase-2 Patchlog split to prevent AI Studio patchlog write failures | **STABLE** | No functional/UI changes; only documentation/process. Introduced `PATCHLOG_PHASE2_S2.md` to avoid large file edits. | 2026-02-01 18:45 (IST) |
