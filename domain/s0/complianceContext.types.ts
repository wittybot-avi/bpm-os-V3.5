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
  readonly code: string;         // Human readable identifier
  readonly name: string;
  readonly jurisdiction: string; // e.g., "INDIA", "EU", "GLOBAL"
  readonly mandatory: boolean;
  readonly status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
  readonly description?: string;
  readonly referenceId?: string; // External legal reference
}

/**
 * SOPProfile: A specific Standard Operating Procedure set versioned for execution.
 * Governs the runbook steps and evidence requirements.
 */
export interface SOPProfile {
  readonly id: EntityId;
  readonly code: string;
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

/**
 * Resolved view of compliance requirements for a specific node.
 */
export interface EffectiveCompliance {
  readonly frameworks: readonly RegulatoryFramework[];
  readonly sopProfiles: readonly SOPProfile[];
  readonly sourceScope: CapabilityScope;
  readonly sourceId: EntityId;
  readonly isOverridden: boolean;
}