/**
 * S1 Product Master Data - Stage Contract
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. S1 is the authoritative source for PRODUCT MASTER DATA (Blueprints & Specs).
 * 2. Discriminated union schema enforces type-safety across S1-S17.
 * 3. SKU technical profiles are immutable once "APPROVED".
 * 4. Changes to a published SKU require a new Revision ID.
 * 
 * @foundation V35-S1-ARCH-BP-01
 */

import { EntityId, IsoDateTime } from '../../types';

export type SkuType = 'CELL' | 'MODULE' | 'PACK' | 'BMS' | 'IOT';

/**
 * Approval Lifecycle Stages
 */
export type BlueprintApprovalStatus = 
  | 'DRAFT' 
  | 'ENGINEERING_REVIEW' 
  | 'QUALITY_SIGNOFF' 
  | 'APPROVED' 
  | 'OBSOLETE'
  | 'REVIEW';

/**
 * Revision Model
 */
export interface RevisionMetadata {
  id: string; // e.g. "A.1"
  effectiveDate: IsoDateTime;
  changeLog: string;
  isLocked: boolean;
}

/**
 * Base Blueprint Schema
 */
export interface BaseSkuBlueprint {
  skuId: EntityId;
  skuCode: string;
  name: string;
  type: SkuType;
  status: BlueprintApprovalStatus;
  revision: RevisionMetadata;
  preconditions: string[]; // List of operational requirements (e.g. "HV_TEST_REQUIRED")
  // Fix: Added technicalProfile and complianceProfile to support standardized UI rendering
  technicalProfile: {
    chemistry?: string;
    nominalVoltage?: number;
    nominalCapacity?: number;
    formFactor?: string;
    configuration?: string;
  };
  complianceProfile: {
    requiresBatteryAadhaar: boolean;
    requiresEuPassport: boolean;
    requiresBisCertification: boolean;
  };
}

/**
 * Type-Specific Profiles
 */
export interface CellBlueprint extends BaseSkuBlueprint {
  type: 'CELL';
}

export interface ModuleBlueprint extends BaseSkuBlueprint {
  type: 'MODULE';
  cellSkuCode?: string;
  cellCount?: number;
}

export interface PackBlueprint extends BaseSkuBlueprint {
  type: 'PACK';
  moduleSkuCode?: string;
  moduleCount?: number;
}

export interface BmsBlueprint extends BaseSkuBlueprint {
  type: 'BMS';
  processorType?: string;
  protocol?: 'CAN' | 'RS485' | 'BTLE';
}

export interface IotBlueprint extends BaseSkuBlueprint {
  type: 'IOT';
  commsType?: '4G' | '5G' | 'NB_IOT' | 'WIFI';
  hasGps?: boolean;
}

/**
 * SKU Master Data Discriminated Union
 */
export type SkuMasterData = 
  | CellBlueprint 
  | ModuleBlueprint 
  | PackBlueprint 
  | BmsBlueprint 
  | IotBlueprint;

/**
 * S1 Global Context
 */
export interface S1Context {
  activeCatalogId: string;
  // Fix: Added missing fields used by SKUBlueprint component and s1Guards
  activeRevision: string;
  approvalStatus: string;
  lastUpdated: IsoDateTime;
  skus: SkuMasterData[];
  totalSkus: number;
  pendingReviewsCount: number;
  engineeringSignoff: string;
}

/**
 * Returns deterministic mock data for S1 context.
 */
export const getMockS1Context = (): S1Context => {
  const commonRev: RevisionMetadata = {
    id: 'A.3',
    effectiveDate: '2026-01-20T00:00:00Z',
    changeLog: 'Initial production release baseline.',
    isLocked: true
  };

  const cell: CellBlueprint = {
    skuId: 'SKU-CELL-01',
    skuCode: 'C-LFP-21700-50',
    name: '50Ah LFP Cylindrical Cell',
    type: 'CELL',
    status: 'APPROVED',
    revision: commonRev,
    preconditions: ['OCV_SAMPLING_REQUIRED'],
    technicalProfile: {
      chemistry: 'LFP',
      nominalVoltage: 3.2,
      nominalCapacity: 50,
      formFactor: 'CYLINDRICAL'
    },
    complianceProfile: {
      requiresBatteryAadhaar: true,
      requiresEuPassport: false,
      requiresBisCertification: true
    }
  };

  const pack: PackBlueprint = {
    skuId: 'SKU-PACK-01',
    skuCode: 'BP-LFP-48V-2.5K',
    name: 'E-Scooter Standard Pack',
    type: 'PACK',
    status: 'APPROVED',
    revision: commonRev,
    preconditions: ['HV_INSULATION_TEST', 'BMS_BIND_REQUIRED'],
    technicalProfile: {
      chemistry: 'LFP',
      nominalVoltage: 48,
      nominalCapacity: 50,
      formFactor: 'PACK',
      configuration: '16S1P'
    },
    complianceProfile: {
      requiresBatteryAadhaar: true,
      requiresEuPassport: true,
      requiresBisCertification: true
    }
  };

  const bms: BmsBlueprint = {
    skuId: 'SKU-BMS-01',
    skuCode: 'BMS-LV-V1',
    name: 'Standard LV BMS Master',
    type: 'BMS',
    status: 'APPROVED',
    revision: commonRev,
    preconditions: ['FIRMWARE_VERIFY_REQUIRED'],
    technicalProfile: {
      configuration: 'N/A'
    },
    complianceProfile: {
      requiresBatteryAadhaar: false,
      requiresEuPassport: false,
      requiresBisCertification: false
    }
  };

  return {
    activeCatalogId: 'V3.5-CATALOG-2026-01',
    activeRevision: 'A.3',
    approvalStatus: 'APPROVED',
    lastUpdated: '2026-01-28T09:30:00Z',
    skus: [cell, pack, bms],
    totalSkus: 3,
    pendingReviewsCount: 0,
    engineeringSignoff: 'Dr. Sarah Chen'
  };
};