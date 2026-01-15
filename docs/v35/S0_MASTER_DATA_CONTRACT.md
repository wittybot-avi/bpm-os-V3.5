# S0: System Setup — Master Data Contract

**Status:** ARCHITECTURE FROZEN
**Scope:** Stage S0 Configuration
**Version:** V3.5-S0-ARCH

## 1. Definition of Master Data
In BPM-OS, Stage S0 represents the **Master Data** layer. Unlike operational stages (S1-S17), S0 does not track moving assets. Instead, it defines the static framework within which the factory operates.

### Entities within S0:
1.  **Plant:** The highest physical hierarchy node.
2.  **Manufacturing Line:** A collection of stations performing a specific functional sequence.
3.  **Workstation:** A discrete physical location for a task.
4.  **Device Class:** Functional capability definitions for hardware (Scanners, Scales).
5.  **User Role:** Permission-granting categories (defined globally in `types.ts`).

## 2. Fundamental Invariants
The following rules are non-negotiable for S0 implementation:

- **Immutable by Operations:** No action in stages S1-S17 can modify S0 state. S1+ can only read from S0 to validate their own transitions.
- **No Transactional Logic:** S0 cannot create SKUs, Batches, Materials, or Serialized items. It creates the *capability* to have them.
- **Slow-Changing:** Changes to S0 (e.g. adding a new production line) are structural events that typically require `SYSTEM_ADMIN` authorization and a maintenance window.
- **Reference-Only:** Data in S0 is used as foreign-key references for all downstream operational events.

## 3. Implementation in V3.5
As of `V35-S0-ARCH-BP-01`, the `S0Context` has been expanded to include nested `PlantMasterData` and `LineMasterData`. 

The UI for S0 remains a "System Overview", but the underlying data models now enforce the distinction between **Configuration** (S0) and **Definition** (S1).

## 4. Operational Guardrails
- If a workstation required in a Batch Plan (S4) does not exist in the S0 Master Data, the plan is invalid.
- If a required Device Class (e.g. Hi-Pot Tester) is not configured for a station in S0, the SOP execution in S7 will be blocked.
