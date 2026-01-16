
import { S3Receipt, S3ReceiptLine } from './s3Types';
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
