/**
 * Capability & Scope Taxonomy (S0)
 * Defines the functional flags and authorization scopes for the OS framework.
 * @version V3.5
 * @governance S0-ARCH-BP-02
 */

import type { EntityId, IsoDateTime } from "../../types";

/**
 * Hierarchical scope where a capability can be enforced or toggled.
 */
export type CapabilityScope = 'GLOBAL' | 'ENTERPRISE' | 'PLANT' | 'LINE' | 'STATION';

/**
 * Functional categories for grouping system capabilities.
 * Aligns with S0 Master Data tiles.
 */
export type CapabilityCategory = 
  | 'MANUFACTURING'  // e.g. Interlock Gating
  | 'QUALITY'        // e.g. AQL Sampling
  | 'TRACEABILITY'   // e.g. Serialization, IoT Binding
  | 'REGULATORY'     // e.g. Digital Passport, Battery Aadhaar
  | 'DEVICE'         // e.g. Protocol Support
  | 'DATA';          // e.g. Retention Policy

/**
 * CapabilityFlag: A specific functional feature toggle within the system.
 * Defines the global baseline.
 */
export interface CapabilityFlag {
  readonly id: string;               // unique machine name (e.g. "STRICT_GATING")
  readonly label: string;
  readonly description: string;      // Human-readable purpose
  readonly category: CapabilityCategory; 
  readonly defaultValue: boolean;    // Initial value for new nodes
}

/**
 * CapabilityOverride: A localized change to a capability flag at a specific scope.
 */
export interface CapabilityOverride {
  readonly flagId: string;
  readonly scope: CapabilityScope;
  readonly scopeId: EntityId;
  readonly value: boolean;
  readonly updatedAt: IsoDateTime;
  readonly updatedBy: string;
}

/**
 * Resolved view of a flag in a specific context.
 */
export interface EffectiveFlag extends CapabilityFlag {
  readonly effectiveValue: boolean;
  readonly sourceScope: CapabilityScope;
  readonly sourceId?: EntityId;
  readonly isOverridden: boolean;
}