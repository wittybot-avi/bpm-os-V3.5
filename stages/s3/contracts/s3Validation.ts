
import { S3Receipt, S3ReceiptLine, ItemTrackability, LabelStatus, UnitState } from './s3Types';
import { UserRole } from '../../../types';

export interface ValidationError {
  level: 'RECEIPT' | 'LINE';
  refId?: string; // Line ID if level is LINE
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export const validateUnitUniqueness = (receipt: S3Receipt): ValidationError[] => {
    const errors: ValidationError[] = [];
    const enterpriseSerials = new Set<string>();
    const supplierSerials = new Set<string>();
    
    receipt.lines.forEach(line => {
        if (!line.units) return;
        line.units.forEach(unit => {
            // Enterprise Serial Uniqueness
            if (enterpriseSerials.has(unit.enterpriseSerial)) {
                errors.push({
                    level: 'LINE',
                    refId: line.id,
                    code: 'DUPLICATE_ENT_SERIAL',
                    message: `Duplicate Enterprise Serial found: ${unit.enterpriseSerial}`
                });
            } else {
                enterpriseSerials.add(unit.enterpriseSerial);
            }

            // Supplier Serial Uniqueness (if present)
            if (unit.supplierSerialRef) {
                if (supplierSerials.has(unit.supplierSerialRef)) {
                    errors.push({
                        level: 'LINE',
                        refId: line.id,
                        code: 'DUPLICATE_SUP_SERIAL',
                        message: `Duplicate Supplier Serial found: ${unit.supplierSerialRef}`
                    });
                } else {
                    supplierSerials.add(unit.supplierSerialRef);
                }
            }
        });
    });
    
    return errors;
};

export const validateReceipt = (receipt: S3Receipt, userRole: string): ValidationResult => {
  const errors: ValidationError[] = [];

  // 1. Receipt Level Checks
  if (!receipt.supplierId) {
    errors.push({ 
        level: 'RECEIPT', 
        code: 'MISSING_SUPPLIER', 
        message: 'Supplier is required.' 
    });
  }

  if (receipt.poId && receipt.lines.length === 0) {
    errors.push({ 
        level: 'RECEIPT', 
        code: 'EMPTY_PO_RECEIPT', 
        message: 'PO-linked receipt must have at least one line item.' 
    });
  }

  // 2. Line Level Checks
  receipt.lines.forEach(line => {
    // Basic fields
    if (!line.itemName) {
      errors.push({ 
          level: 'LINE', 
          refId: line.id, 
          code: 'MISSING_NAME', 
          message: 'Item name is required.' 
      });
    }

    // Quantity Logic
    if (line.qtyReceived < 0) {
        errors.push({ 
            level: 'LINE', 
            refId: line.id, 
            code: 'NEGATIVE_QTY', 
            message: 'Received quantity cannot be negative.' 
        });
    }

    if (line.qtyExpected && line.qtyReceived > line.qtyExpected) {
        // Only System Admin can override over-receipt
        if (userRole !== UserRole.SYSTEM_ADMIN) {
            errors.push({ 
                level: 'LINE', 
                refId: line.id, 
                code: 'OVER_RECEIPT', 
                message: `Over-receipt (${line.qtyReceived}/${line.qtyExpected}) requires SYSTEM_ADMIN.` 
            });
        }
    }

    // Category Specifics: CELL requires Lot Ref
    if (line.category === 'CELL' && (!line.lotRef || line.lotRef.trim() === '')) {
        errors.push({ 
            level: 'LINE', 
            refId: line.id, 
            code: 'MISSING_LOT', 
            message: 'Lot/Batch Reference is required for CELL category.' 
        });
    }

    // Trackability
    if (!line.trackability) {
        errors.push({ 
            level: 'LINE', 
            refId: line.id, 
            code: 'MISSING_TRACKABILITY', 
            message: 'Trackability setting is missing.' 
        });
    }
  });

  // 3. Uniqueness Checks
  const uniqueErrors = validateUnitUniqueness(receipt);
  errors.push(...uniqueErrors);

  return {
    ok: errors.length === 0,
    errors
  };
};

/**
 * Validates if a receipt is ready to be CLOSED.
 * Checks for labels, QC dispositions, and putaway assignments.
 */
export const validateClosure = (receipt: S3Receipt): ValidationResult => {
    const errors: ValidationError[] = [];
    
    receipt.lines.forEach(line => {
        if (line.trackability === ItemTrackability.TRACKABLE && line.units) {
            
            // Check for unprinted labels
            const unprinted = line.units.filter(u => u.labelStatus === LabelStatus.NOT_PRINTED);
            if (unprinted.length > 0) {
                 errors.push({
                     level: 'LINE',
                     refId: line.id,
                     code: 'LABEL_PENDING',
                     message: `${unprinted.length} units in line '${line.itemName}' have labels pending.`
                 });
            }

            // Check for missing QC decisions
            const undispositioned = line.units.filter(u => !u.qcDecision);
            if (undispositioned.length > 0) {
                 errors.push({
                     level: 'LINE',
                     refId: line.id,
                     code: 'QC_PENDING',
                     message: `${undispositioned.length} units in line '${line.itemName}' have no QC disposition.`
                 });
            }

            // Check for missing Putaway assignment
            // All units (Accepted/Hold/Rejected) must have a location recorded before closure.
            const unassigned = line.units.filter(u => !u.putaway?.bin && !u.putaway?.warehouse);
            if (unassigned.length > 0) {
                 errors.push({
                     level: 'LINE',
                     refId: line.id,
                     code: 'NO_PUTAWAY',
                     message: `${unassigned.length} units in line '${line.itemName}' not assigned to a storage location.`
                 });
            }
        }
    });

    return {
        ok: errors.length === 0,
        errors
    };
};
