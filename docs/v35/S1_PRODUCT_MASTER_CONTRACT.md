# S1: Product Master — Technical Blueprint Contract

**Status:** ARCHITECTURE FROZEN
**Scope:** Stage S1 Product Definitions
**Version:** V3.5-S1-ARCH

## 1. Definition of Product Master
In BPM-OS, Stage S1 manages the **Product Master Data**. It defines the technical "DNA" of the battery packs that the factory (defined in S0) is capable of producing.

### Entities within S1:
1.  **SKU:** The root commercial and technical identifier.
2.  **Technical Profile:** Electrical (V, Ah), chemical (LFP/NMC), and mechanical (Config) constants.
3.  **Compliance Profile:** Regulatory requirements (Aadhaar, EU Passport, BIS) specific to the SKU.
4.  **BOM Blueprint:** Linkages to required raw materials and component classes.

## 2. Invariants & Guardrails
- **Cross-Stage Validation:** S1 SKUs must be validated against S0 Facility Capabilities. (e.g. An 800V pack cannot be released if S0 defines no HV_TESTING capability).
- **Revision Control:** Any change to a technical constant (e.g. increasing capacity from 50Ah to 52Ah) requires a formal Revision bump.
- **Blueprint Lock:** Once a SKU is used in a Batch Plan (S4), its technical master record is locked to prevent retrospective data drift.

## 3. Implementation in V3.5
As of `V35-S1-ARCH-BP-01`, the S1 context has been refactored from simple counters to structured `SkuMasterData` objects. The UI now prioritizes **Technical Profiles** and **Compliance Matrix** visibility.

## 4. Downstream Impact
- **S2 (Procurement):** Uses S1 SKU codes to bind Purchase Orders.
- **S9 (Registry):** Uses S1 Blueprints as the schema for the Digital Twin.
- **S17 (Audit):** Uses S1 Compliance Profiles to verify that all required evidence (Aadhaar IDs, Test Logs) exists for every unit.
