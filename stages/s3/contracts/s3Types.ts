
import { EntityId, IsoDateTime, UserRole } from '../../../types';

// --- State Enums ---

export enum ReceiptState {
  DRAFT = 'DRAFT',
  RECEIVING = 'RECEIVING',
  SERIALIZATION_IN_PROGRESS = 'SERIALIZATION_IN_PROGRESS',
  QC_PENDING = 'QC_PENDING',
  ACCEPTED = 'ACCEPTED',
  PARTIAL_ACCEPTED = 'PARTIAL_ACCEPTED',
  REJECTED = 'REJECTED',
  PUTAWAY_IN_PROGRESS = 'PUTAWAY_IN_PROGRESS',
  PUTAWAY_COMPLETE = 'PUTAWAY_COMPLETE',
  CLOSED = 'CLOSED'
}

export enum UnitState {
  CREATED = 'CREATED',
  LABELED = 'LABELED',
  SCANNED = 'SCANNED',
  VERIFIED = 'VERIFIED',
  QC_HOLD = 'QC_HOLD',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export enum ItemTrackability {
  TRACKABLE = 'TRACKABLE',
  NON_TRACKABLE = 'NON_TRACKABLE'
}

export type ItemCategory = 'CELL' | 'BMS' | 'IOT' | 'MODULE' | 'PACK' | 'MISC';

export type AttachmentType = 'INVOICE' | 'PACKING_LIST' | 'COA' | 'TEST_REPORT' | 'PHOTO' | 'OTHER';

// --- Interfaces ---

export interface S3Attachment {
  id: string;
  type: AttachmentType;
  filename: string;
  notes?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface S3SerializedUnit {
  id: EntityId;
  enterpriseSerial: string; // e.g. "BP-CELL-2026-0001"
  supplierSerialRef?: string; // Vendor's barcode if scanned
  lineId: EntityId; // Reference to parent line
  state: UnitState;
  printedCount: number;
  verifiedAt?: IsoDateTime;
  qcDecision?: 'ACCEPT' | 'HOLD' | 'REJECT';
  qcReason?: string;
  putaway?: {
    warehouse?: string;
    zone?: string;
    bin?: string;
  };
}

export interface S3ReceiptLine {
  id: EntityId;
  receiptId: EntityId;
  skuId?: EntityId; // Link to S1
  itemName: string;
  category: ItemCategory;
  trackability: ItemTrackability;
  
  // Lot / Batch Info
  lotRef?: string; // Supplier Batch/Lot
  mfgDate?: string; // ISO Date YYYY-MM-DD
  expDate?: string; // ISO Date YYYY-MM-DD
  
  qtyExpected?: number;
  qtyReceived: number;
  units?: S3SerializedUnit[];
}

export interface S3AuditEvent {
  id: string;
  ts: IsoDateTime;
  actorRole: UserRole | string;
  actorLabel: string;
  eventType: string; // e.g. 'CREATED', 'SCAN', 'QC_DECISION'
  refType: 'RECEIPT' | 'LINE' | 'UNIT';
  refId: string;
  message: string;
  meta?: Record<string, any>;
}

export interface S3Receipt {
  id: EntityId;
  code: string; // e.g. "GRN-2026-001"
  supplierId?: string; // Link to S2 Supplier
  poId?: string; // Link to S2 PO
  
  // Evidence
  invoiceNo?: string;
  invoiceDate?: string; // ISO Date YYYY-MM-DD
  packingListRef?: string;
  transportDocRef?: string;
  attachments: S3Attachment[];
  
  createdAt: IsoDateTime;
  createdByRole: string;
  state: ReceiptState;
  notes?: string;
  lines: S3ReceiptLine[];
  audit: S3AuditEvent[];
}
