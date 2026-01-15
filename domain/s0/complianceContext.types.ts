/**
 * Compliance Context Domain Models (S0)
 * Defines regulatory frameworks and SOP bindings for the organizational hierarchy.
 * @version V3.5
 * @governance S0-ARCH-BP-03
 */

import type { EntityId } from "../../types";
import type { CapabilityScope } from "./capability.types";

/**
 * RegulatoryFramework: A legal or industry standard that governs manufacturing operations.
 * Examples: AIS-156, EU Battery Passport, UN38.3.
 */
export interface RegulatoryFramework {
  readonly id: EntityId;
  readonly name: string;
  readonly jurisdiction: string; // e.g., "INDIA", "EU", "GLOBAL"
  readonly mandatory: boolean;
}

/**
 * SOPProfile: A specific Standard Operating Procedure set versioned for execution.
 * Governs the runbook steps and evidence requirements.
 */
export interface SOPProfile {
  readonly id: EntityId;
  readonly name: string;
  readonly version: string;
  readonly applicableScopes: readonly CapabilityScope[];
}

/**
 * ComplianceBinding: Associates specific nodes in the topology with 
 * regulatory requirements and procedural standards.
 */
export interface ComplianceBinding {
  readonly scope: CapabilityScope;
  readonly scopeId: EntityId; // Reference to EnterpriseId, PlantId, LineId, or StationId
  readonly regulatoryFrameworkIds: readonly EntityId[];
  readonly sopProfileIds: readonly EntityId[];
}
