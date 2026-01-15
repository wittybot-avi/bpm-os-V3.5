# S1: Product Master — Definitive Source of Truth

**Status:** ARCHITECTURAL GOVERNANCE LOCKED
**Baseline:** V3.5
**Reference:** V35-S1-DOC-PP-08

## 1. Authority Statement
Stage S1 (Product Master) is the authoritative Source of Truth (SoT) for all battery pack technical blueprints, component specifications, and regulatory profiles. Every physical unit manufactured within the BPM-OS ecosystem must derive its technical DNA from an "Approved" S1 SKU record.

## 2. SKU Governance
To maintain engineering integrity, S1 enforces a strict object model:
- **Taxonomy:** Every record must be typed as CELL, MODULE, PACK, BMS, or IOT.
- **Revisions:** Blueprints are versioned. Once a revision is "Approved," it becomes immutable.
- **Lifecycle Gates:** Transition from DRAFT to ACTIVE requires Technical Verification (Checker) and Management Authorization (Approver).

## 3. Downstream Bindings (Operational Interlocks)
The definitions in S1 are not merely descriptive; they are functional constraints for the MES:

### A. Procurement Binding (S2)
- **Constraint:** Purchase Orders (POs) in S2 cannot be raised against non-existent or "Draft" SKUs.
- **Validation:** The procurement system fetches the "Preferred Supplier" and "Material Code" directly from the S1 registry.

### B. Manufacturing Binding (S4, S5, S7, S10)
- **Planning (S4):** Batch quantities and line assignments are validated against the SKU's physical complexity defined in S1.
- **Assembly (S5/S7):** Digital SOPs and torque limits are derived from the SKU's technical profile.
- **Provisioning (S10):** Firmware baselines and communication protocols for the BMS are bound to the unit based on its S1 SKU type.

## 4. Mutation Path Control
To prevent "Shadow Engineering" or unauthorized changes to the production baseline:
- **Sole Path:** The **SKU Flow Wizard (FLOW-001)** is the EXCLUSIVE authorized path for creating or iterating on product master data.
- **Prohibition:** Inline editing of SKU details is strictly forbidden. 
- **Auditability:** Every change through the Wizard is recorded in the System Logs (S17) with dual-signature evidence (Maker/Approver).

## 5. Data Sovereignty
In a multi-plant deployment, S1 records are typically "Global Master Data." A SKU defined at the corporate level is synchronized to local S0 facility frameworks for execution.