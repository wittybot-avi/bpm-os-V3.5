
# Patch Logging Discipline (Phase 2)

**Goal:** Prevent "Internal Error" during AI Studio file updates by keeping write targets small.

## Rules
1.  **Phase-2 Split:** During Phase-2 (S2/S3), append patch entries **ONLY** to `docs/governance/PATCHLOG_PHASE2_S2.md`.
2.  **Master Log Frozen:** Do not modify `docs/governance/PATCHLOG.md` during this phase unless absolutely necessary (e.g. Phase Closure).
3.  **Append Only:** Do not reformat the entire table. Prepend the new entry at the top of the "Active" table in the Phase-2 log.
4.  **Merge Strategy:** At Phase 2 closure, the content of the Phase-2 log will be manually merged into the master log.
