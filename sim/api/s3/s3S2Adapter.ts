
import { ItemCategory } from "../../../stages/s3/contracts/s3Types";

export interface S3MockOrderItem {
    itemId: string; // PO Line ID
    skuId: string;
    itemName: string;
    category: ItemCategory;
    qtyOrdered: number;
}

export interface S3MockOrder {
    poId: string;
    poCode: string;
    supplierId: string;
    supplierName: string;
    plantId: string;
    items: S3MockOrderItem[];
}

export interface S3Supplier {
    id: string;
    name: string;
}

/**
 * Simulates fetching "Approved & Issued" POs from S2 that are ready for receiving.
 * In a real backend, this would query the S2 Order Service.
 */
export const s3ListOpenOrdersFromS2 = (): S3MockOrder[] => {
    return [
        {
            poId: 'PO-2026-8821',
            poCode: 'PO-2026-8821',
            supplierId: 'sup-001',
            supplierName: 'CellGlobal Dynamics',
            plantId: 'FAC-WB-01',
            items: [
                { 
                    itemId: 'pol-8821-01', 
                    skuId: 'SKU-CELL-01', 
                    itemName: 'LFP Cell 21700-50Ah (Grade A)', 
                    category: 'CELL', 
                    qtyOrdered: 5000 
                },
                { 
                    itemId: 'pol-8821-02', 
                    skuId: 'SKU-PAD-04', 
                    itemName: 'Thermal Pad T4-2mm', 
                    category: 'MISC', 
                    qtyOrdered: 200 
                }
            ]
        },
        {
            poId: 'PO-2026-8825',
            poCode: 'PO-2026-8825',
            supplierId: 'sup-002',
            supplierName: 'Orion BMS Systems',
            plantId: 'FAC-WB-01',
            items: [
                { 
                    itemId: 'pol-8825-01', 
                    skuId: 'SKU-BMS-01', 
                    itemName: 'BMS Master Unit V2 (CAN-BUS)', 
                    category: 'BMS', 
                    qtyOrdered: 150 
                }
            ]
        },
        {
            poId: 'PO-2026-8830',
            poCode: 'PO-2026-8830',
            supplierId: 'sup-004',
            supplierName: 'Precision Casings Ltd',
            plantId: 'FAC-WB-01',
            items: [
                {
                    itemId: 'pol-8830-01',
                    skuId: 'SKU-ENC-01',
                    itemName: 'Aluminium Enclosure Base (48V)',
                    category: 'MISC', // Mechanicals might be trackable in future, for now MISC
                    qtyOrdered: 100
                },
                {
                    itemId: 'pol-8830-02',
                    skuId: 'SKU-LID-01',
                    itemName: 'Enclosure Lid (IP67 Seal)',
                    category: 'MISC',
                    qtyOrdered: 100
                }
            ]
        }
    ];
};

/**
 * Returns a list of suppliers for Manual Receipt creation.
 */
export const s3ListSuppliers = (): S3Supplier[] => {
    return [
        { id: 'sup-001', name: 'CellGlobal Dynamics' },
        { id: 'sup-002', name: 'Orion BMS Systems' },
        { id: 'sup-003', name: 'ThermalWrap Inc' },
        { id: 'sup-004', name: 'Precision Casings Ltd' },
        { id: 'sup-005', name: 'Volt-X Recycled' }
    ];
};
