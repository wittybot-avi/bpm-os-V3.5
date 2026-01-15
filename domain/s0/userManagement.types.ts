/**
 * User Management Domain Models (S0)
 * Defines internal user accounts and their hierarchical access scopes.
 * @version V3.5
 * @governance S0-ARCH-BP-06
 */

import type { EntityId, UserRole } from "../../types";
import type { CapabilityScope } from "./capability.types";

/**
 * Associates a user with a specific node in the topology.
 */
export interface UserScopeBinding {
  readonly scope: CapabilityScope;
  readonly scopeId: EntityId;
}

/**
 * AppUser: Represents an internal system user account managed via S0.
 */
export interface AppUser {
  readonly id: EntityId;
  readonly username: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly status: 'ACTIVE' | 'INACTIVE';
  readonly scopes: readonly UserScopeBinding[];
}