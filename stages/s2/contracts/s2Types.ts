
import { EntityId, IsoDateTime } from '../../../types';

// --- State Enums ---

export type S2State =
  | 'S2_DRAFT'
  | 'S2_RFQ_ISSUED'
  | 'S2_VENDOR_RESPONSE_RECEIVED'
  | 'S2_COMMERCIAL_EVALUATION'
  | 'S2_WAITING_APPROVAL'
  | 'S2_APPROVED'
  | 'S2_PO_ISSUED'
  | 'S2_PO_ACKNOWLEDGED'
  | 'S2_LOCKED';

export type S2ActionId = 
  | 'CREATE_PO'
  | 'SUBMIT_PO_FOR_APPROVAL'
  | 'APPROVE_PO'
  | 'ISSUE_PO_TO_VENDOR'
  | 'CLOSE_PROCUREMENT_CYCLE';

// --- Data Models ---

export type OrderItemType = 'SKU' | 'MANUAL';
export type FulfillmentType = 'SERIALIZABLE' | 'NON_SERIALIZABLE';

export interface Supplier {
  id: string;
  name: string;
  type: 'Cells' | 'BMS' | 'Mechanical' | 'Thermal';
  status: 'Approved' | 'Conditional' | 'Pending' | 'Rejected';
  region: string;
  rating: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  certificates: string[];
  contactPerson: string;
  lastAudit: string;
  performanceScore: number;
  source: 'ERP_MANAGED' | 'MANUAL';
}

export interface CommercialTerm {
  id: string;
  masterId: string;
  version: number;
  skuRef: string;
  supplierId: string;
  moq: string;
  leadTime: string;
  priceBand: string;
  validFrom: string;
  validTo: string;
  contractStatus: 'Active' | 'Draft' | 'Expired' | 'Archived';
  attachments: string[];
}

export interface ActiveOrderItem {
  itemId: string;
  itemType: OrderItemType;
  fulfillmentType: FulfillmentType;
  name: string;
  skuCode?: string;
  category?: string;
  uom: string;
  quantity: number;
  deliveryDate?: string;
  notes?: string;
}

export interface ActiveOrderContext {
  orderId: string;
  plantId: string;
  activeSupplierId: string | null;
  selectedItems: ActiveOrderItem[];
  currentState: S2State;
  createdBy: string;
  createdAt: string;
  termSnapshots?: CommercialTerm[];
}

export interface S2Gate {
  id: string;
  label: string;
  description: string;
  status: 'MET' | 'PENDING' | 'BLOCKED';
  requiredFor: S2ActionId[];
  evidenceRefs: string[];
  lastUpdated: string;
}

export interface S2Context {
  activePoCount: number;
  pendingApprovalsCount: number;
  vendorCatalogCount: number;
  lastPoCreatedAt: string;
  procurementStatus: S2State;
  blueprintDependency: 'OK' | 'BLOCKED';
  activeOrder?: ActiveOrderContext | null;
}
