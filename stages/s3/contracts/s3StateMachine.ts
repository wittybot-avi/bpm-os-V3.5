
import { S3Receipt, S3AuditEvent, ReceiptState, S3SerializedUnit, UnitState } from './s3Types';
import { UserRole } from '../../../types';

/**
 * Standard progression order for "Happy Path".
 * Used for progress bar visualization.
 */
export const receiptStateOrder: ReceiptState[] = [
  ReceiptState.DRAFT,
  ReceiptState.RECEIVING,
  ReceiptState.SERIALIZATION_IN_PROGRESS,
  ReceiptState.QC_PENDING,
  ReceiptState.ACCEPTED, // Fork point for Partial/Reject
  ReceiptState.PUTAWAY_IN_PROGRESS,
  ReceiptState.PUTAWAY_COMPLETE,
  ReceiptState.CLOSED
];

/**
 * Allowed transitions mapping.
 * Enforces the strict unidirectional flow of the inbound process.
 */
export const allowedReceiptTransitions: Record<ReceiptState, ReceiptState[]> = {
  [ReceiptState.DRAFT]: [ReceiptState.RECEIVING],
  [ReceiptState.RECEIVING]: [ReceiptState.SERIALIZATION_IN_PROGRESS],
  [ReceiptState.SERIALIZATION_IN_PROGRESS]: [ReceiptState.QC_PENDING],
  [ReceiptState.QC_PENDING]: [ReceiptState.ACCEPTED, ReceiptState.PARTIAL_ACCEPTED, ReceiptState.REJECTED],
  [ReceiptState.ACCEPTED]: [ReceiptState.PUTAWAY_IN_PROGRESS],
  [ReceiptState.PARTIAL_ACCEPTED]: [ReceiptState.PUTAWAY_IN_PROGRESS],
  [ReceiptState.REJECTED]: [ReceiptState.CLOSED],
  [ReceiptState.PUTAWAY_IN_PROGRESS]: [ReceiptState.PUTAWAY_COMPLETE],
  [ReceiptState.PUTAWAY_COMPLETE]: [ReceiptState.CLOSED],
  [ReceiptState.CLOSED]: [] // Terminal state
};

/**
 * Unit State Machine
 */
export const allowedUnitTransitions: Record<UnitState, UnitState[]> = {
  [UnitState.CREATED]: [UnitState.LABELED],
  [UnitState.LABELED]: [UnitState.SCANNED],
  [UnitState.SCANNED]: [UnitState.VERIFIED],
  [UnitState.VERIFIED]: [UnitState.ACCEPTED, UnitState.QC_HOLD, UnitState.REJECTED],
  [UnitState.QC_HOLD]: [UnitState.ACCEPTED, UnitState.REJECTED],
  [UnitState.ACCEPTED]: [],
  [UnitState.REJECTED]: []
};

export const canTransitionUnit = (from: UnitState, to: UnitState): boolean => {
  return allowedUnitTransitions[from]?.includes(to) ?? false;
};

export const getNextUnitState = (current: UnitState): UnitState | null => {
    // Helper for linear progression buttons
    const map: Partial<Record<UnitState, UnitState>> = {
        [UnitState.CREATED]: UnitState.LABELED,
        [UnitState.LABELED]: UnitState.SCANNED,
        [UnitState.SCANNED]: UnitState.VERIFIED
    };
    return map[current] || null;
};

export interface UnitTransitionResult {
    unit: S3SerializedUnit;
    auditEvent: S3AuditEvent;
}

export const transitionUnit = (
    unit: S3SerializedUnit,
    to: UnitState,
    actorRole: string,
    receiptId: string,
    reason?: string
): UnitTransitionResult => {
    if (!canTransitionUnit(unit.state, to)) {
        throw new Error(`Invalid unit transition from ${unit.state} to ${to}`);
    }

    const now = new Date().toISOString();
    const updatedUnit: S3SerializedUnit = { ...unit, state: to };

    // Update timestamps based on state
    if (to === UnitState.VERIFIED) {
        updatedUnit.verifiedAt = now;
    }

    // QC Decision Mapping
    if (to === UnitState.ACCEPTED) {
        updatedUnit.qcDecision = 'ACCEPT';
        updatedUnit.qcReason = reason; // Optional note
    } else if (to === UnitState.QC_HOLD) {
        updatedUnit.qcDecision = 'HOLD';
        updatedUnit.qcReason = reason;
    } else if (to === UnitState.REJECTED) {
        updatedUnit.qcDecision = 'REJECT';
        updatedUnit.qcReason = reason;
    }

    const auditEvent: S3AuditEvent = {
        id: `audit-u-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        ts: now,
        actorRole,
        actorLabel: 'User',
        eventType: 'UNIT_STATE_CHANGED',
        refType: 'UNIT',
        refId: unit.id,
        message: `Unit ${unit.enterpriseSerial} transitioned to ${to}${reason ? ` (Reason: ${reason})` : ''}`
    };

    return { unit: updatedUnit, auditEvent };
};


/**
 * Returns a short, human-readable label for the next primary action button.
 */
export const getReceiptNextActions = (state: ReceiptState): string => {
  switch (state) {
    case ReceiptState.DRAFT: return 'Start Receiving';
    case ReceiptState.RECEIVING: return 'Begin Serialization';
    case ReceiptState.SERIALIZATION_IN_PROGRESS: return 'Submit for QC';
    case ReceiptState.QC_PENDING: return 'Record Decision';
    case ReceiptState.ACCEPTED: return 'Start Putaway';
    case ReceiptState.PARTIAL_ACCEPTED: return 'Start Putaway';
    case ReceiptState.REJECTED: return 'Close & Return';
    case ReceiptState.PUTAWAY_IN_PROGRESS: return 'Complete Putaway';
    case ReceiptState.PUTAWAY_COMPLETE: return 'Close Receipt';
    case ReceiptState.CLOSED: return 'Archived';
    default: return '';
  }
};

/**
 * Check if a transition is valid.
 */
export const canTransitionReceipt = (from: ReceiptState, to: ReceiptState): boolean => {
  const allowed = allowedReceiptTransitions[from];
  return allowed ? allowed.includes(to) : false;
};

/**
 * Pure State Transition Function.
 * Returns a new S3Receipt object with updated state and appended audit log.
 * Does NOT mutate the input object.
 */
export const transitionReceipt = (
  receipt: S3Receipt, 
  to: ReceiptState, 
  actorRole: UserRole | string, 
  actorLabel: string = 'User',
  note?: string
): S3Receipt => {
  if (!canTransitionReceipt(receipt.state, to)) {
    throw new Error(`Invalid transition from ${receipt.state} to ${to}`);
  }

  const now = new Date().toISOString();
  
  const auditEvent: S3AuditEvent = {
    id: `audit-${Date.now()}`,
    ts: now,
    actorRole,
    actorLabel,
    eventType: 'STATE_CHANGE',
    refType: 'RECEIPT',
    refId: receipt.id as string,
    message: `Transitioned from ${receipt.state} to ${to}${note ? `: ${note}` : ''}`
  };

  return {
    ...receipt,
    state: to,
    audit: [auditEvent, ...receipt.audit]
  };
};
