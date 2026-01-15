# S0: Master Data — System Source of Truth

**Status:** ARCHITECTURAL GOVERNANCE LOCKED
**Baseline:** V3.5
**Reference:** V35-S0-DOC-PP-05

## 1. Authority Statement
Stage S0 (System Setup) is the authoritative Source of Truth (SoT) for the physical and functional topology of the manufacturing environment. No downstream stage (S1–S17) may alter the definitions established here.

## 2. Definitional Scope
S0 is responsible for defining the **framework** of the factory:
- **Facility Hierarchy:** Plant identity, location, and regional regulatory context.
- **Manufacturing Topology:** Production lines, workstation nodes, and physical grouping.
- **Hardware Capability Matrix:** Device classes (e.g., Torque Tools, Scanners) and their allowed protocols.
- **System Capabilities:** Feature flags (e.g., Serialization, IoT binding) that toggle OS-wide logic.
- **Role Permissions:** Functional access scopes for all system users.

## 3. The "NEVER" List (Strict Prohibitions)
S0 is a configuration layer. To maintain data integrity, S0 must **NEVER**:
1. **Define Products:** SKU definitions and technical battery blueprints belong to S1.
2. **Execute Logistics:** S0 defines the dock capability; S3 manages the material receipt.
3. **Schedule Production:** S0 defines the line capacity; S4 creates the batch instances.
4. **Track Serial Assets:** No physical battery ID or component serial is ever created or tracked within S0.
5. **Modify History:** S0 defines the present framework; it is not a ledger for past operational events.

## 4. Downstream Read-Only Contract
The `S0Context` is shared across the platform as an immutable reference:
- **Consumption:** Stages S1–S17 query S0 to validate their own state (e.g., S7 checking if a workstation is "Gated").
- **Immutability:** No API endpoint outside the `/api/s0/*` namespace is permitted to write to S0 tables.
- **Validation:** If a resource (Line, Station, User) is not defined in S0, it is considered non-existent by the OS.

## 5. Backward Compatibility Guarantees
To ensure stable integration with legacy V3.3/V3.4 logic:
- Standard root fields (`plantName`, `plantId`, `region`) in `S0Context` are maintained as aliases for the new structured `PlantMasterData`.
- Entity ID formats (e.g., `FAC-IND-*`) must remain consistent across versions to prevent reference breakage.
- Transition from "System Setup" to "Master Data" taxonomy in the UI is visual only; the underlying state identifiers remain mapped to the `S0` namespace.