/**
 * System Topology Domain Models (S0)
 * Canonical definitions for Enterprise, Plant, Line, and Station hierarchy.
 * @version V3.5
 * @governance S0-ARCH-BP-01
 */

import type { EntityId, IsoDateTime } from "../../types";

/**
 * Lifecycle status of a topology entity within the organizational framework.
 */
export type TopologyStatus = 'ACTIVE' | 'SUSPENDED' | 'RETIRED';

/**
 * Audit trail record for immutable tracking of entity management actions.
 */
export interface TopologyAudit {
  readonly createdBy: string;
  readonly createdAt: IsoDateTime;
  readonly approvedBy?: string;
  readonly approvedAt?: IsoDateTime;
}

/**
 * Base properties shared by all organizational topology entities.
 * Defines the common schema for identity, lifecycle, and audit.
 */
export interface BaseTopologyEntity {
  readonly id: EntityId;
  readonly code: string;
  readonly displayName: string;
  readonly status: TopologyStatus;
  readonly effectiveFrom: IsoDateTime;
  readonly effectiveTo?: IsoDateTime;
  readonly audit: TopologyAudit;
}

/**
 * Enterprise: The top-level organizational node.
 * Acts as the root for the multi-facility plant hierarchy.
 */
export interface Enterprise extends BaseTopologyEntity {
  readonly plantIds: readonly EntityId[];
  readonly timezone?: string; // V35-S0-CRUD-PP-15
}

/**
 * Plant: A physical manufacturing facility containing multiple Lines.
 * Anchored to a specific geographic region and regulatory context.
 */
export interface Plant extends BaseTopologyEntity {
  readonly enterpriseId: EntityId;
  readonly lineIds: readonly EntityId[];
}

/**
 * Line: A logical grouping of Stations performing a specific functional sequence.
 * Represents a discrete manufacturing capability path.
 */
export interface Line extends BaseTopologyEntity {
  readonly plantId: EntityId;
  readonly stationIds: readonly EntityId[];
  readonly supportedOperations: readonly string[]; // V35-S0-CRUD-PP-13
  readonly supportedSkuTypes: readonly string[];    // V35-S0-CRUD-PP-13
}

/**
 * Station: A discrete physical workspace node on a production line.
 * The terminal node in the organization topology hierarchy.
 */
export interface Station extends BaseTopologyEntity {
  readonly lineId: EntityId;
  readonly stationType: string;
  readonly supportedOperations: readonly string[];
  readonly deviceBindings: readonly EntityId[]; // List of unique physical device IDs bound to this node
}