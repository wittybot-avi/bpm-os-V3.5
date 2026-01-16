
/**
 * S2 Commercial Procurement - Stage Contract
 * Defines the data shape for the Procurement context.
 */

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

export type OrderItemType = 'SKU' | 'MANUAL';

export interface ActiveOrderItem {
  itemId: string; // Unique ID for the line item
  itemType: OrderItemType;
  name: string; // Display Name (SKU Name or Manual Name)
  skuCode?: string; // Required if itemType === 'SKU'
  category?: string; // e.g., 'MRO', 'Consumable' (mainly for Manual)
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

/**
 * Returns deterministic mock data for S2 context.
 * Used for frontend development and vibe coding.
 */
export const getMockS2Context = (): S2Context => ({
  activePoCount: 5,
  pendingApprovalsCount: 2,
  vendorCatalogCount: 14,
  lastPoCreatedAt: '2026-01-16 11:45 IST',
  procurementStatus: 'S2_WAITING_APPROVAL',
  blueprintDependency: 'OK',
  activeOrder: {
    orderId: 'PO-2026-8821',
    plantId: 'FAC-WB-01',
    activeSupplierId: 'sup-001',
    selectedItems: [
      { 
        itemId: 'item-001',
        itemType: 'SKU',
        skuCode: 'BP-LFP-48V-2.5K', 
        name: '48V LFP Pack Standard',
        uom: 'Units',
        quantity: 500, 
        deliveryDate: '2026-02-15', 
        notes: 'Urgent batch for Q1' 
      }
    ],
    currentState: 'S2_WAITING_APPROVAL',
    createdBy: 'Procurement Manager',
    createdAt: '2026-01-16 11:45 IST'
  }
});
