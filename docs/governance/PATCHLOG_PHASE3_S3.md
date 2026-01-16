
# BPM-OS Phase 3 (S3 Inbound) Patch Log

> **NOTE:** This is the active patch log for Phase-3 micro-prompts focusing on S3 Inbound Logistics.
> At the end of Phase 3, this content will be merged into the master `PATCHLOG.md`.

## Active

| Patch ID | Patch Type | Intent | Status | Notes | Date |
|:---|:---|:---|:---|:---|:---|
| **V35-S3-PP-12** | Feature | S3 Supplier Serial Entry | **STABLE** | Implemented interactive modal for scanning/entering supplier serial numbers. Added bulk paste functionality and strict duplicate validation across receipt lines. Updates unit records with `supplierSerialRef`. | 2026-02-02 15:30 (IST) |
| **V35-S3-PP-11** | Feature | S3 Serial Generation | **STABLE** | Implemented Enterprise Serial generation logic for Trackable lines. Added "Generate Serials" action in line item UI with Range/Pool mode selection (Range default). Updates unit array and logs audit event. | 2026-02-02 15:00 (IST) |
| **V35-S3-PP-10** | Feature | S3 Lane Separation | **STABLE** | Implemented visual separation of Trackable vs Bulk items in Receipt Lines view. Added visual badges for categories and trackability status. Enabled System Admin to toggle trackability with audit logging. | 2026-02-02 14:30 (IST) |
| **V35-S3-PP-09** | Governance | S3 Validation Rules | **STABLE** | Implemented validation engine for Receipts. Checks supplier, line counts, qty bounds, and lot references. Gated state transition with validation logic and added UI feedback for errors. | 2026-02-02 14:00 (IST) |
| **V35-S3-PP-08** | Feature | S3 Evidence & Lot Mgmt | **STABLE** | Implemented detailed evidence capture (Invoice, Packing List) and Lot/Batch tracking for S3 Receipts. Added Attachments simulation and per-line Lot updates with audit logging. | 2026-02-02 13:30 (IST) |
| **V35-S3-PP-07** | Feature/Governance | S3 Manual Receipt | **STABLE** | Added "Manual Receipt" mode to S3 Intake Panel. Allows Stores/Admin to create receipts without PO, enforcing reason logging and supervisor acknowledgement (if not Admin). | 2026-02-02 13:00 (IST) |
| **V35-S3-PP-06** | Feature | S3 PO Linkage | **STABLE** | Implemented PO intake adapter (`s3S2Adapter`) and "Procurement Intake" panel in S3. Allows loading mock S2 Open Orders into S3 Receipts with automatic line item generation and trackability assignment. | 2026-02-02 12:30 (IST) |
| **V35-S3-PP-05** | Foundation | S3 Page Shell | **STABLE** | Implemented basic S3 Inbound Receipt page shell in `components/InboundReceipt.tsx`. Connected to S3 Sim Store. Removed legacy wizard from `S3InboundScreen.tsx` to align with new architecture. | 2026-02-02 12:00 (IST) |
| **V35-S3-PP-04** | Foundation | S3 RBAC Policy | **STABLE** | Added `s3Rbac.ts` with `canS3()` helper to centralize permission logic for Inbound Operators vs QA vs Viewers. Mapped global UserRoles to S3-specific contexts. | 2026-02-02 11:30 (IST) |
| **V35-S3-PP-03** | Foundation | S3 Sim Store | **STABLE** | Implemented persistent simulation store for S3 Receipts (`sim/api/s3/s3Inbound.store.ts`) with seed data and localStorage support. Added API-like handler wrappers. | 2026-02-02 11:00 (IST) |
| **V35-S3-PP-02** | Foundation | S3 State Machine | **STABLE** | Implemented pure functional state machine for Receipt transitions (Draft -> Closed). Added `transitionReceipt` reducer and updated guards. | 2026-02-02 10:30 (IST) |
| **V35-S3-PP-01** | Foundation | S3 Type System | **STABLE** | Created foundational contracts for Receipts, Lines, and Units in `stages/s3/contracts`. Added default generators and guard placeholders. No UI impact. | 2026-02-02 10:00 (IST) |
