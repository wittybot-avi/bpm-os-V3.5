# S1: Product Master — Technical Blueprint Contract

**Status:** ARCHITECTURE FROZEN
**Scope:** Stage S1 Product Definitions
**Version:** V3.5-S1-ARCH
**Patch ID:** V35-S1-ARCH-BP-01

## 1. SKU Taxonomy
BPM-OS V3.5 enforces a strict taxonomy for all system entities. Every SKU must belong to one of the following canonical types:

| Type | Definition | Key Attributes |
|:---|:---|:---|
| **CELL** | Basic chemical energy unit. | Chemistry, Form Factor, Ah. |
| **MODULE** | Grouped cells with busbars. | Cell Count, Configuration (S/P). |
| **PACK** | Integrated battery assembly. | Energy (kWh), Voltage, Market. |
| **BMS** | Battery Management System controller. | Processor, Protocol. |
| **IOT** | Telemetry and tracking hardware. | Comms (4G/5G), GPS. |

## 2. Blueprint Schema (Discriminated Union)
To ensure type-safety in downstream stages (S2–S17), the SKU Master Data is implemented as a discriminated union.

### Common Metadata
Every blueprint contains:
- `skuId`: Global UUID.
- `skuCode`: Human-readable identifier.
- `revision`: Structured model (ID, ChangeLog, Lock status).
- `status`: Approval lifecycle stage.
- `preconditions`: Required operational flags for MES automation.

### Type-Specific Profiles
Attributes specific to the physical nature of the SKU (e.g. `chemistry` for cells, `processorType` for BMS) are isolated to their respective union members.

## 3. Revision Control Model
- **Locking:** Once a revision is marked `isLocked: true`, it cannot be modified.
- **Iteration:** Any change to a locked technical constant requires a new Revision ID (e.g. A.1 -> A.2).
- **History:** The registry maintains all historical revisions for forensic trace integrity.

## 4. Approval Stages
1. **DRAFT:** Work in progress by Engineering.
2. **ENGINEERING_REVIEW:** Internal technical validation.
3. **QUALITY_SIGNOFF:** Compliance and safety verification.
4. **APPROVED:** Released for Procurement (S2) and Production (S4).
5. **OBSOLETE:** End-of-life; cannot be used in new batches.

## 5. Downstream Impact
- **S4 (Planning):** Validates batch configuration against the `PackBlueprint`.
- **S10 (BMS Prov):** Injects `BmsBlueprint` firmware parameters.
- **S17 (Audit):** Compares physical unit data against the `preconditions` defined in the Blueprint.