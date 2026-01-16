
import { ReceiptState } from './s3Types';
import { UserRole } from '../../../types';

/**
 * Domain-specific roles for S3 Inbound context.
 */
export type S3Role = 
  | 'SYSTEM_ADMIN' 
  | 'INBOUND_OPERATOR' 
  | 'QUALITY' 
  | 'PROCUREMENT' 
  | 'FINANCE' 
  | 'VIEWER';

/**
 * Discrete actions available in S3.
 */
export type S3Action = 
  | 'CREATE_RECEIPT' 
  | 'EDIT_RECEIPT' 
  | 'ASSIGN_SERIALS' 
  | 'PRINT_LABELS' 
  | 'QC_DECIDE' 
  | 'PUTAWAY' 
  | 'CLOSE_RECEIPT';

/**
 * Maps global UserRole to local S3Role context.
 */
export const mapUserRoleToS3Role = (role: string): S3Role => {
  switch (role) {
    case UserRole.SYSTEM_ADMIN: return 'SYSTEM_ADMIN';
    case UserRole.STORES: return 'INBOUND_OPERATOR';
    case UserRole.QA_ENGINEER: return 'QUALITY';
    case UserRole.PROCUREMENT: return 'PROCUREMENT';
    case UserRole.MANAGEMENT: return 'FINANCE'; // Management acts as Finance/Oversight here
    default: return 'VIEWER';
  }
};

/**
 * Evaluates permission for a specific S3 action.
 * 
 * @param userRole - The global role of the user (from UserContext)
 * @param action - The specific S3 action attempted
 * @param receiptState - (Optional) Current state of the receipt, used for state-based locking
 */
export const canS3 = (userRole: string, action: S3Action, receiptState?: ReceiptState): boolean => {
  const role = mapUserRoleToS3Role(userRole);

  // 1. Superuser Override
  if (role === 'SYSTEM_ADMIN') return true;

  // 2. Global Lock: If receipt is CLOSED, most mutations are forbidden for non-admins
  // Exception: Printing labels might still be allowed? For now, lock strict.
  if (receiptState === ReceiptState.CLOSED) {
    return false; // Immutable once closed for standard operators
  }

  // 3. Role-Action Policy
  switch (action) {
    case 'CREATE_RECEIPT':
      return role === 'INBOUND_OPERATOR';

    case 'EDIT_RECEIPT':
      // Only operators can edit details, usually only in early stages
      return role === 'INBOUND_OPERATOR';

    case 'ASSIGN_SERIALS':
      return role === 'INBOUND_OPERATOR';

    case 'PRINT_LABELS':
      return role === 'INBOUND_OPERATOR';

    case 'QC_DECIDE':
      // Only Quality can make QC decisions
      // Usually valid during QC_PENDING, but we allow it if passed as arg or broadly for role check
      return role === 'QUALITY';

    case 'PUTAWAY':
      return role === 'INBOUND_OPERATOR';

    case 'CLOSE_RECEIPT':
      return role === 'INBOUND_OPERATOR';

    default:
      return false;
  }
};
