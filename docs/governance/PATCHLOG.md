# BPM-OS Frontend PATCHLOG

## V3.5 Active

| Patch ID | Patch Type | Intent | Status | Notes | Date |
|:---|:---|:---|:---|:---|:---|
| **V35-S1-WIZ-SPEC-FIX-05** | UX Correctness | Render Logic | **STABLE** | Enforced strict attribute isolation in SKU Wizard. Added `handleTypeChange` to clear specification buffers when switching taxonomy. Hardened `Summary` panel to hide irrelevant attributes (e.g., electrochemistry for IoT). | 2026-01-28 20:00 (IST) |
| **V35-S1-WIZ-SPEC-FIX-04** | Schema Enablement | Field Definitions | **STABLE** | Defined minimum required fields for CELL, MODULE, PACK, BMS, and IOT in `SKU_SPEC_REGISTRY`. Enabled dynamic input rendering and buffer saving in `SkuFlowWizard`. | 2026-01-28 19:30 (IST) |
| **V35-S1-WIZ-SPEC-FIX-03** | UX Scaffolding | Dynamic Sections | **STABLE** | Implemented dynamic rendering of technical sections in `SKU_SPECIFICATIONS` step using `SKU_SPEC_REGISTRY`. Added placeholders for future input fields. | 2026-01-28 19:00 (IST) |
| **V35-S1-WIZ-SPEC-FIX-02** | Architecture | Step Splitting | **STABLE** | Formalized split between `BASE_SKU_METADATA` and dynamic `SKU_SPECIFICATIONS`. Consolidated technical input rendering into a single registry-driven step. | 2026-01-28 18:30 (IST) |
| **V35-S1-WIZ-SPEC-FIX-01** | Architecture | Spec Registry | **STABLE** | Introduced `SKU_SPEC_REGISTRY` mapping SKU Types to technical sections. Prepared scaffolding for dynamic blueprint fields. No UI changes. | 2026-01-28 18:00 (IST) |
| **V35-S1-WIZ-FIX-06** | UX Stabilization | Focused Wizard Paths | **STABLE** | Pruned redundant generic TECHNICAL step from all SKU paths. Merged missing capacity/cell count fields into type-specific steps. Ensured clean, focused wizard sequences per SKU type. | 2026-01-28 17:30 (IST) |
| **V35-S1-WIZ-FIX-05** | Stabilization | Schema Completion | **STABLE** | Implemented minimal technical fields per SKU type (CELL, MODULE, PACK, BMS, IOT). Replaced scaffolds with functional inputs and updated contract. | 2026-01-28 17:00 (IST) |
| **V35-S1-WIZ-FIX-04** | Bugfix | Navigation Hardening | **STABLE** | Hardened S1 Wizard navigation to ensure intent (Greenfield/Revision) and SKU type are strictly coupled. Fixed path resolution fallbacks. | 2026-01-28 16:30 (IST) |
| **V35-S1-WIZ-FIX-03** | Stabilization | Technical Scaffolding | **STABLE** | Added empty placeholder steps for all SKU-specific technical blueprints (CELL, MODULE, PACK, BMS, IOT). Updated Registry to support branching paths. | 2026-01-28 16:00 (IST) |
| **V35-S1-WIZ-FIX-02** | Stabilization | Step Reclassification | **STABLE** | Internally reclassified "General Identifiers" as `BASE_SKU_METADATA` step. Enforced index mapping in registry for future modularity. No UI changes. | 2026-01-28 15:30 (IST) |
| **V35-S1-WIZ-FIX-01** | Stabilization | Wizard Step Registry | **STABLE** | Introduced a central Step Registry for S1 Wizard. Resolved paths now depend on Intent (Greenfield/Revision) and SKU Type. Hardened navigation helpers. | 2026-01-28 15:00 (IST) |
| **V35-S1-DOC-PP-08** | Documentation | S1 Master Data SoT | **STABLE** | Established S1 as authoritative Product Master Data source. Documented bindings to S2/S4 and enforced Wizard-only mutation path. | 2026-01-28 14:30 (IST) |
| **V35-S1-WIZ-PP-07** | UX / RBAC | Refined Approval UX | **STABLE** | Enforced "One Primary Action" UI pattern. Added task directive bar to SKU Wizard. Restricted footer actions strictly to authorized roles per state. | 2026-01-28 14:00 (IST) |
| **V35-S1-WIZ-PP-06** | Governance | Operational Preconditions | **STABLE** | Implemented precondition gating in SKU Wizard. Added hard gates for ECR/PLM and soft warnings for Regulatory DB link. Progress blocked on hard failures. | 2026-01-28 13:30 (IST) |
| **V35-S1-WIZ-PP-05** | Wizard UX | Dynamic Blueprint Steps | **STABLE** | Implemented multi-phase definition (General -> Technical). Dynamic form rendering based on SKU type with inline validation. | 2026-01-28 13:00 (IST) |
| **V35-S1-WIZ-PP-04** | Wizard UX | S1 Mandatory Step 0 | **STABLE** | Added mandatory initial step to SKU Flow Wizard to capture engineering intent (New vs Revision) and SKU taxonomy type. | 2026-01-28 12:30 (IST) |
| **V35-S1-UX-PP-03** | UX Convergence | S1 Blueprint Dossier Refactor | **STABLE** | Refactored legacy SKU detail forms into a read-only "Blueprint Dossier". Grouped by Technical, Regulatory, and Readiness dimensions. Removed inline editing in favor of Flow Wizards. | 2026-01-28 12:00 (IST) |
| **V35-S1-UX-PP-02** | UX Convergence | SKU Flow Home Convergence | **STABLE** | Refactored S1 to prioritize SKU Flow instances. Unified creation path into a single primary CTA "Start SKU Flow Wizard". | 2026-01-28 11:30 (IST) |
| **V35-S1-ARCH-BP-01** | Architecture | SKU Taxonomy & Blueprint Schema | **STABLE** | Introduced discriminated union for SKU types (CELL, MODULE, PACK, BMS, IOT). Defined revision models and approval lifecycle. | 2026-01-28 10:00 (IST) |
| **V35-S0-DOC-PP-05** | Documentation | S0 Master Data Source of Truth | **STABLE** | Formally documented S0 definitional scope, prohibitions, and read-only contracts. Added to Registry. | 2026-01-28 07:30 (IST) |
| **V35-S0-UX-PP-04** | UX / Capability | System Capability Flags | **STABLE** | Centralized feature toggles (Serialization, IoT, Deep Trace) with scoping (Global/Plant/Line) in S0. | 2026-01-28 07:00 (IST) |
| **V35-S0-UX-PP-03** | UX Structure | Capability-Centric S0Organization | **STABLE** | Reorganized System Setup around Plant, Line, Workstation, and Device capabilities. Removed operational instance references. | 2026-01-28 06:30 (IST) |
| **V35-S0-UX-PP-02** | UX Convergence | S0 Master Data Alignment | **STABLE** | Neutralized S0 language. Replaced operational CTAs with "Provisioning" and "Definition" terminology. | 2026-01-28 06:00 (IST) |
| **V35-S0-ARCH-BP-01** | Architecture | S0 Master Data Contract | **STABLE** | Formally codified S0 as Master Data layer. Added invariants and detailed entities. | 2026-01-28 05:30 (IST) |
| **V35-MD-NAV-BP-01** | Foundation | Rename System Setup to Master Data | **STABLE** | Sidebar taxonomy update only. S0 and S1 screens grouped under new heading. | 2026-01-28 05:00 (IST) |

## V3.4 Active
... (truncated for brevity) ...