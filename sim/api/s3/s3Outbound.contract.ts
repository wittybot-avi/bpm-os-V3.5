
/**
 * S3 Outbound Contract
 * Defines the data payload unlocked for S4 (Production) upon S3 Receipt Closure.
 * 
 * @foundation V35-S3-PP-19
 */

import { EntityId, IsoDateTime } from '../../../types';
import { S3Receipt, S3SerializedUnit, UnitState } from '../../../stages/s3/contracts';

// Defined subset of unit data required for S4
export interface S3OutputUnit {
    unitId: EntityId;
    enterpriseSerial: string;
    skuId?: string;
    category: string;
    putaway: {
        warehouse?: string;
        zone?: string;
        bin?: string;
    };
}

export interface S3OutputContract {
    receiptId: EntityId;
    receiptCode: string;
    plantId: string; // Derived context
    acceptedUnits: S3OutputUnit[];
    qcHoldUnits: S3OutputUnit[];
    rejectedUnits: S3OutputUnit[];
    totalUnits: number;
    source: 'S3';
    closedAt: IsoDateTime;
}

const STORAGE_KEY = 'bpmos_s3_outbound_v1';

/**
 * Persist the S3 Output Contract to the simulated store (localStorage).
 * This makes the inventory "Available" for S4 Batch Planning.
 */
export const saveS3Output = (receipt: S3Receipt, plantId: string = 'FAC-WB-01'): S3OutputContract => {
    const mapUnit = (u: S3SerializedUnit): S3OutputUnit => ({
        unitId: u.id,
        enterpriseSerial: u.enterpriseSerial,
        skuId: 'UNKNOWN', // Ideally mapped from Line -> SKU
        category: 'UNKNOWN', // Ideally mapped from Line -> Category
        putaway: u.putaway || {}
    });

    // Helper to enrich unit with line-level data since Unit object doesn't have it directly in some models
    // In our S3SerializedUnit, we have lineId, so we can lookup if needed, but for now we trust the receipt structure
    const allUnits: S3SerializedUnit[] = [];
    receipt.lines.forEach(line => {
        if (line.units) {
             line.units.forEach(u => {
                 // Inject line metadata temporarily for mapping if needed, 
                 // but here we just map what we have.
                 // Ideally we'd merge skuId from line to unit here.
                 const mapped = mapUnit(u);
                 mapped.skuId = line.skuId;
                 mapped.category = line.category;
                 // Push to flat list with enriched data logic if we were returning flat list
             });
             allUnits.push(...line.units);
        }
    });

    const acceptedUnits = allUnits
        .filter(u => u.state === UnitState.ACCEPTED)
        .map(u => {
             const line = receipt.lines.find(l => l.id === u.lineId);
             return {
                 unitId: u.id,
                 enterpriseSerial: u.enterpriseSerial,
                 skuId: line?.skuId,
                 category: line?.category || 'MISC',
                 putaway: u.putaway || {}
             };
        });

    const qcHoldUnits = allUnits
        .filter(u => u.state === UnitState.QC_HOLD)
        .map(u => {
             const line = receipt.lines.find(l => l.id === u.lineId);
             return {
                 unitId: u.id,
                 enterpriseSerial: u.enterpriseSerial,
                 skuId: line?.skuId,
                 category: line?.category || 'MISC',
                 putaway: u.putaway || {}
             };
        });

    const rejectedUnits = allUnits
        .filter(u => u.state === UnitState.REJECTED)
        .map(u => {
             const line = receipt.lines.find(l => l.id === u.lineId);
             return {
                 unitId: u.id,
                 enterpriseSerial: u.enterpriseSerial,
                 skuId: line?.skuId,
                 category: line?.category || 'MISC',
                 putaway: u.putaway || {}
             };
        });

    const output: S3OutputContract = {
        receiptId: receipt.id,
        receiptCode: receipt.code,
        plantId,
        acceptedUnits,
        qcHoldUnits,
        rejectedUnits,
        totalUnits: allUnits.length,
        source: 'S3',
        closedAt: new Date().toISOString()
    };

    // Append to existing list of outputs
    try {
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        const existing: S3OutputContract[] = existingRaw ? JSON.parse(existingRaw) : [];
        // Remove old entry for this receipt if exists (overwrite)
        const filtered = existing.filter(e => e.receiptId !== receipt.id);
        filtered.push(output);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        console.log(`[S3-OUTBOUND] Emitted contract for ${receipt.code}`, output);
    } catch (e) {
        console.error('[S3-OUTBOUND] Failed to save contract', e);
    }

    return output;
};

export const getS3Outputs = (): S3OutputContract[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};
