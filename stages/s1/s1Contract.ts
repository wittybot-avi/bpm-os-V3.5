/**
 * S1 Product Master Data - Stage Contract
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. S1 is the authoritative source for PRODUCT MASTER DATA (Blueprints & Specs).
 * 2. S1 definitions must be compatible with facility capabilities defined in S0.
 * 3. SKU technical profiles are immutable once "APPROVED".
 * 4. Changes to a published SKU require a new Revision ID.
 * 
 * @foundation V35-S1-ARCH-BP-01
 */

import { EntityId, IsoDateTime } from '../../types';

/**
 * SKU Technical Profile
 * Core electrical and chemical specifications.
 */
export interface SkuTechnicalProfile {
  chemistry: 'LFP' | 'NMC' | 'LTO' | 'SODIUM_ION';
  formFactor: 'PRISMATIC' | 'CYLINDRICAL' | 'POUCH';
  nominalVoltage: number; // Volts
  nominalCapacity: number; // Ah
  energyDensity?: number; // Wh/kg
  configuration: string; // e.g. "16S1P"
}

/**
 * SKU Compliance Profile
 * Regulatory tracking requirements for a product line.
 */
export interface SkuComplianceProfile {
  requiresBatteryAadhaar: boolean;
  requiresEuPassport: boolean;
  requiresBisCertification: boolean;
  un383Certified: boolean;
  targetMarket: 'DOMESTIC' | 'EXPORT' | 'GLOBAL';
}

/**
 * SKU Master Data
 * Root entity for a product definition.
 */
export interface SkuMasterData {
  skuId: EntityId;
  skuCode: string;
  name: string;
  revision: string;
  technicalProfile: SkuTechnicalProfile;
  complianceProfile: SkuComplianceProfile;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'OBSOLETE';
}

/**
 * S1 Global Context
 * Root aggregate for Product Master Data.
 */
export interface S1Context {
  // Metadata
  activeRevision: string;
  lastBlueprintUpdate: IsoDateTime;
  approvalStatus: 'DRAFT' | 'REVIEW' | 'APPROVED';
  
  // Master Entities
  skus: SkuMasterData[];
  
  // Stats (Reference only)
  totalSkus: number;
  complianceReady: boolean;
  engineeringSignoff: string;
}

/**
 * Returns deterministic mock data for S1 context as Product Master Data.
 */
export const getMockS1Context = (): S1Context => {
  const defaultSku: SkuMasterData = {
    skuId: 'SKU-LFP-48V-STD',
    skuCode: 'BP-LFP-48V-2.5K',
    name: 'E-Scooter Standard Pack',
    revision: 'A.3',
    status: 'APPROVED',
    technicalProfile: {
      chemistry: 'LFP',
      formFactor: 'CYLINDRICAL',
      nominalVoltage: 48,
      nominalCapacity: 50,
      configuration: '16S1P'
    },
    complianceProfile: {
      requiresBatteryAadhaar: true,
      requiresEuPassport: false,
      requiresBisCertification: true,
      un383Certified: true,
      targetMarket: 'DOMESTIC'
    }
  };

  const performanceSku: SkuMasterData = {
    skuId: 'SKU-NMC-800V-HV',
    skuCode: 'BP-NMC-800V-75K',
    name: 'EV High Performance Pack',
    revision: 'B.1',
    status: 'DRAFT',
    technicalProfile: {
      chemistry: 'NMC',
      formFactor: 'PRISMATIC',
      nominalVoltage: 800,
      nominalCapacity: 94,
      configuration: '192S1P'
    },
    complianceProfile: {
      requiresBatteryAadhaar: true,
      requiresEuPassport: true,
      requiresBisCertification: false,
      un383Certified: false,
      targetMarket: 'EXPORT'
    }
  };

  return {
    totalSkus: 2,
    activeRevision: 'V3.5-CATALOG-01',
    lastBlueprintUpdate: '2026-01-28 09:00 IST',
    approvalStatus: 'APPROVED',
    complianceReady: true,
    engineeringSignoff: 'ENG-LEAD-SR-01',
    skus: [defaultSku, performanceSku]
  };
};
