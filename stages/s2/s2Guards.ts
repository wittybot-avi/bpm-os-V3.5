
import { UserRole } from '../../types';
import { S2Context, S2ActionId } from './contracts/s2Types';

/**
 * Action State Interface
 */
export interface ActionState {
  enabled: boolean;
  reason?: string;
}

/**
 * S2 Action Guard
 * Determines if a specific action is allowed based on Role and Context.
 */
export const getS2ActionState = (role: UserRole, context: S2Context, action: S2ActionId): ActionState => {
  const isAdmin = role === UserRole.SYSTEM_ADMIN;
  const isProcurement = role === UserRole.PROCUREMENT || isAdmin;
  const isManagement = role === UserRole.MANAGEMENT || isAdmin;

  // Global dependency check
  if (context.blueprintDependency === 'BLOCKED' && action === 'CREATE_PO') {
    return { enabled: false, reason: 'S1 Blueprint Not Ready (Dependency)' };
  }

  // Operator / Viewer Lockout
  if (!isProcurement && !isManagement) {
    return { enabled: false, reason: `Role '${role}' has Read-Only access` };
  }

  switch (action) {
    case 'CREATE_PO':
      if (!isProcurement) return { enabled: false, reason: 'Requires Procurement Role' };
      if (
        context.procurementStatus === 'S2_WAITING_APPROVAL' || 
        context.procurementStatus === 'S2_APPROVED' || 
        context.procurementStatus === 'S2_PO_ISSUED' ||
        context.procurementStatus === 'S2_PO_ACKNOWLEDGED'
      ) {
         return { enabled: false, reason: 'Current PO is active in workflow' };
      }
      return { enabled: true };

    case 'SUBMIT_PO_FOR_APPROVAL':
      if (!isProcurement) return { enabled: false, reason: 'Requires Procurement Role' };
      if (
        context.procurementStatus !== 'S2_DRAFT' && 
        context.procurementStatus !== 'S2_RFQ_ISSUED' &&
        context.procurementStatus !== 'S2_VENDOR_RESPONSE_RECEIVED' &&
        context.procurementStatus !== 'S2_COMMERCIAL_EVALUATION'
      ) {
        return { enabled: false, reason: 'PO not in Draft/Evaluation state' };
      }
      return { enabled: true };

    case 'APPROVE_PO':
      if (!isManagement) return { enabled: false, reason: 'Requires Management/Finance Role' };
      if (context.procurementStatus !== 'S2_WAITING_APPROVAL') {
        return { enabled: false, reason: 'No PO pending approval' };
      }
      return { enabled: true };

    case 'ISSUE_PO_TO_VENDOR':
      if (!isProcurement) return { enabled: false, reason: 'Requires Procurement Role' };
      if (context.procurementStatus !== 'S2_APPROVED') {
        return { enabled: false, reason: 'PO not approved yet' };
      }
      return { enabled: true };

    case 'CLOSE_PROCUREMENT_CYCLE':
      if (!isManagement) return { enabled: false, reason: 'Requires Management Role' };
      if (
        context.procurementStatus !== 'S2_PO_ISSUED' && 
        context.procurementStatus !== 'S2_PO_ACKNOWLEDGED'
      ) {
        return { enabled: false, reason: 'PO Cycle incomplete (Wait for Ack)' };
      }
      return { enabled: true };
      
    default:
      return { enabled: false, reason: 'Unknown Action ID' };
  }
};
