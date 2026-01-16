
import { EntityId, UserRole } from '../../../types';
import { 
  S3Receipt, 
  S3ReceiptLine, 
  ReceiptState, 
  ItemTrackability, 
  ItemCategory 
} from './s3Types';

// --- Generators ---

export const makeReceiptCode = (sequence: number): string => {
  const year = new Date().getFullYear();
  const seqStr = sequence.toString().padStart(4, '0');
  return `GRN-${year}-${seqStr}`;
};

export const makeEnterpriseSerial = (prefix: string = 'BP', typeCode: string, sequence: number): string => {
  const seqStr = sequence.toString().padStart(7, '0');
  return `${prefix}-${typeCode}-${seqStr}`;
};

export const makeDemoReceipt = (): S3Receipt => {
  const now = new Date().toISOString();
  
  const line1: S3ReceiptLine = {
    id: `line-${Date.now()}-1`,
    receiptId: 'demo-receipt-01',
    itemName: 'Lithium Iron Phosphate Cell 50Ah',
    category: 'CELL',
    trackability: ItemTrackability.TRACKABLE,
    qtyExpected: 100,
    qtyReceived: 0,
    units: []
  };

  const line2: S3ReceiptLine = {
    id: `line-${Date.now()}-2`,
    receiptId: 'demo-receipt-01',
    itemName: 'Thermal Pad (Consumable)',
    category: 'MISC',
    trackability: ItemTrackability.NON_TRACKABLE,
    qtyExpected: 50,
    qtyReceived: 0,
    units: []
  };

  return {
    id: 'demo-receipt-01',
    code: makeReceiptCode(1),
    supplierId: 'sup-001', // Should match S2 supplier mock
    poId: 'PO-2026-8821', // Should match S2 PO mock
    invoiceNo: 'INV-SAMPLE-001',
    createdAt: now,
    createdByRole: UserRole.STORES,
    state: ReceiptState.DRAFT,
    lines: [line1, line2],
    audit: [{
      id: `evt-${Date.now()}`,
      ts: now,
      actorRole: UserRole.SYSTEM_ADMIN,
      actorLabel: 'System',
      eventType: 'INIT_DEMO',
      refType: 'RECEIPT',
      refId: 'demo-receipt-01',
      message: 'Demo receipt initialized'
    }]
  };
};
