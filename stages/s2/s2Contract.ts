
/**
 * S2 Commercial Procurement - Stage Contract
 * Imports definitions from s2Types.ts
 */

import { S2Context } from './contracts/s2Types';

export * from './contracts/s2Types';

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
        fulfillmentType: 'SERIALIZABLE',
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
    createdAt: '2026-01-16 11:45 IST',
    termSnapshots: []
  }
});
