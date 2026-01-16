
import { EntityId, UserRole } from '../../../types';
import { 
  S3Receipt, 
  S3ReceiptLine, 
  ReceiptState, 
  ItemTrackability, 
  ItemCategory,
  S3SerializedUnit,
  UnitState 
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

export const generateS3Units = (
  lineId: string,
  category: ItemCategory,
  count: number,
  startSequence: number,
  mode: 'RANGE' | 'POOL' = 'RANGE'
): S3SerializedUnit[] => {
  const units: S3SerializedUnit[] = [];
  const typeCode = mapCategoryToSerialCode(category);
  
  // Simulate Pool random access if POOL mode, else sequential
  const baseSeq = mode === 'POOL' ? startSequence + 5000 : startSequence;

  for (let i = 0; i < count; i++) {
    const seq = baseSeq + i;
    const serial = makeEnterpriseSerial('BP', typeCode, seq);
    
    units.push({
      id: `unit-${Date.now()}-${i}`,
      enterpriseSerial: serial,
      lineId,
      state: UnitState.CREATED,
      printedCount: 0
    });
  }
  return units;
};

const mapCategoryToSerialCode = (cat: ItemCategory): string => {
  switch (cat) {
    case 'CELL': return 'CEL';
    case 'BMS': return 'BMS';
    case 'IOT': return 'IOT';
    case 'MODULE': return 'MOD';
    case 'PACK': return 'PCK';
    default: return 'MAT';
  }
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
    attachments: [],
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
