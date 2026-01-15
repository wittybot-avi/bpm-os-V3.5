import { UserRole } from '../types';

/**
 * Permission Constants
 * Centralized list of functional capability keys.
 * @version V35-S0-HOTFIX-PP-25
 */
export const PERMISSIONS = {
  S0_MANAGE_MASTER_DATA: 'S0_MANAGE_MASTER_DATA',
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  EXECUTE_FLOWS: 'EXECUTE_FLOWS',
  APPROVE_FLOWS: 'APPROVE_FLOWS'
} as const;

/**
 * Role Permission Mapping
 * Defines which functional roles possess which capability keys.
 */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  [UserRole.SYSTEM_ADMIN]: [
    PERMISSIONS.S0_MANAGE_MASTER_DATA,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.EXECUTE_FLOWS,
    PERMISSIONS.APPROVE_FLOWS
  ],
  [UserRole.MANAGEMENT]: [
    PERMISSIONS.S0_MANAGE_MASTER_DATA,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.APPROVE_FLOWS
  ],
  [UserRole.COMPLIANCE]: [
    PERMISSIONS.S0_MANAGE_MASTER_DATA,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.APPROVE_FLOWS
  ],
  [UserRole.OPERATOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.EXECUTE_FLOWS
  ],
  [UserRole.SUPERVISOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.EXECUTE_FLOWS,
    PERMISSIONS.APPROVE_FLOWS
  ]
};

/**
 * Role Normalization Helper
 * Handles variations in role string representations to ensure lookup stability.
 */
export const normalizeRole = (role: string | UserRole): string => {
  const r = String(role).toUpperCase().replace(/\s+/g, '_');
  // Map friendly labels or internal keys to canonical enum keys if needed
  if (r === 'SYSTEM_ADMIN' || r === 'SYSTEM_ADMIN_USER' || role === UserRole.SYSTEM_ADMIN) return UserRole.SYSTEM_ADMIN;
  return role as string;
};

/**
 * RBAC Guard Utility
 * 
 * Determines if a specific role has access to a feature or permission key.
 * @param role The user's current role
 * @param permissionId The permission key to check (e.g. S0_MANAGE_MASTER_DATA)
 * @returns boolean
 */
export const canAccess = (role: UserRole, permissionId: string): boolean => {
  const normalized = normalizeRole(role);
  const allowedPermissions = ROLE_PERMISSION_MAP[normalized] || [];
  
  // SYSTEM_ADMIN is the super-user and bypasses specific checks if logic allows,
  // but here we adhere to the map for strict RBAC discipline.
  if (allowedPermissions.includes(permissionId)) {
    return true;
  }

  // Fallback for legacy feature IDs that might not be in the new map yet
  const legacyWhiteslist = ['dashboard', 'control_tower', 'system_setup', 'documentation'];
  if (legacyWhiteslist.includes(permissionId)) return true;

  return false;
};