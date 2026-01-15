# BPM-OS Frontend PATCHLOG

## V3.5 Active

| Patch ID | Patch Type | Intent | Status | Notes | Date |
|:---|:---|:---|:---|:---|:---|
| **V35-S0-CRUD-PP-13** | CRUD | Lines CRUD | **STABLE** | Enables full CRUD for Lines bound to Plant selection. Supported SKU types and Operations added to Line model. | 2026-01-29 21:00 (IST) |
| **V35-S0-CRUD-PP-12** | Wiring | Topology Cascade | **STABLE** | S0 topology cascade filters lines and stations by selection. Enables interactive navigation of the organizational hierarchy. | 2026-01-29 20:00 (IST) |
| **V35-S0-CRUD-PP-11** | CRUD | S0 Plant Management | **STABLE** | S0 Plants CRUD (Add/Edit/Suspend) via in-memory store. First functional Master Data management interface in S0. | 2026-01-29 19:00 (IST) |
| **V35-S0-CRUD-BP-10** | Foundation | S0 Manage Scaffold | **STABLE** | S0 manage-drawer scaffolding for all master-data categories. Implemented consistent side-drawer framework for future CRUD ops. | 2026-01-29 18:00 (IST) |
| **V35-S0-UI-PP-09** | UX Context | Scope Badges | **STABLE** | S0 scope badges on tiles. Visual clarity for Global, Plant, Line, Station, and Regulatory boundaries. | 2026-01-29 17:00 (IST) |
| **V35-S0-UI-PP-08** | UI Wiring | S0 Topology | **STABLE** | S0 binds to topology API (read-only context bar). Dynamic fetching of Enterprise, Plant, Line, and Station data via Option-B API. | 2026-01-29 16:00 (IST) |
| **V35-S0-BP-07** | Governance | S0 Design Freeze | **STABLE** | S0 hierarchy design freeze (V3.5 Phase-1). Authoritative contract for organizational topology and master data established. | 2026-01-29 15:00 (IST) |
| **V35-S0-BP-06** | UX-Context | Hierarchy UX | **STABLE** | Hierarchy-aware context cues in S0 UI. Added read-only breadcrumbs (Enterprise > Plant > Line) and scope badges (PLANT, LINE, STATION) to tiles. | 2026-01-29 14:00 (IST) |
| **V35-S0-BP-05** | Foundation | S0 Topology API | **STABLE** | Read-only API routes for S0 topology hierarchy (Enterprise, Plant, Line, Station). Option-B compliant. | 2026-01-29 13:00 (IST) |
| **V35-S0-BP-04** | Foundation | S0 Store | **STABLE** | In-memory topology store for S0 hierarchy. Seeded with singleton path (ENT -> PL -> LN -> STN). Read-only accessors provided. | 2026-01-29 12:00 (IST) |
| **V35-S0-BP-03** | Foundation | Compliance Taxonomy | **STABLE** | Regulatory & SOP context contracts for S0. Modeled frameworks, SOP profiles, and hierarchical bindings. Types only. | 2026-01-29 11:00 (IST) |
| **V35-S0-BP-02** | Foundation | Capability Taxonomy | **STABLE** | Capability scope & authorization taxonomy for S0. Defined categories and flags for hierarchical system control. Types only. | 2026-01-29 10:00 (IST) |
| **V35-S0-BP-01** | Foundation | S0 Topology | **STABLE** | Canonical Enterprise–Plant–Line–Station hierarchy contracts. ID-based relational model defined. Types only. | 2026-01-29 09:00 (IST) |
... (truncated for brevity) ...