/**
 * SKU Flow Contract (FLOW-001)
 * Canonical definitions for SKU Creation & Blueprint Approval lifecycle.
 * @foundation V34-S1-FLOW-001-BP-01
 * @updated V35-S1-WIZ-SPEC-FIX-06 (Data Integrity Partitioning)
 */

import type { ApiResult, EntityId, IsoDateTime } from "../../types";
import type { SkuType } from "../../stages/s1/s1Contract";

export type SkuFlowState = "Draft" | "Review" | "Approved" | "Active" | "Rejected";

export type SkuFlowRole = "Maker" | "Checker" | "Approver";

/**
 * Technical Specification Partition
 * Dynamic bucket for SKU-type specific technical parameters.
 */
export interface SkuTechnicalSpecs {
  [key: string]: any;
}

export interface SkuDraft {
  // Base Metadata
  skuCode: string;
  skuName: string;
  skuType?: SkuType;
  isRevision: boolean;
  notes?: string;

  // V3.5-SPEC-FIX-06: Partitioned Specifications
  // Ensures data for different types (CELL vs PACK) never collide in the buffer.
  specifications?: Record<string, SkuTechnicalSpecs>;

  // Legacy flat fields maintained for backward compatibility with existing Dossiers
  // during transition, though the Wizard will now drive the 'specifications' object.
  chemistry?: string;
  formFactor?: string;
  nominalVoltage?: number;
  capacityAh?: number;
  energyKwh?: number;
  seriesConfig?: number;
  parallelConfig?: number;
  cellCount?: number;
  moduleCount?: number;
  hwVersion?: string;
  fwBaseline?: string;
  protocol?: string;
  commsType?: string;
  coolingType?: string;
  voltageMin?: number;
  voltageMax?: number;
  cellTypeRef?: string;
  powerSource?: string;
  allowedModuleSkus?: string;
  requiredBmsSku?: string;
  chipset?: string;
  supportedChemistries?: string;
  firmwarePolicy?: string;
  telemetrySchemaVersion?: string;
}

export interface BlueprintRef {
  blueprintId: EntityId;
  blueprintName: string;
  version?: string;
}

export interface SkuFlowInstance {
  flowId: "FLOW-001";
  instanceId: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  state: SkuFlowState;

  // business fields
  draft: SkuDraft;
  blueprint?: BlueprintRef;

  // workflow/audit fields
  submittedBy?: string;
  submittedAt?: IsoDateTime;
  reviewedBy?: string;
  reviewedAt?: IsoDateTime;
  approvedBy?: string;
  approvedAt?: IsoDateTime;
  rejectedBy?: string;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;
}

// API Contracts
export interface CreateSkuFlowReq {
  draft: SkuDraft;
}
export type CreateSkuFlowRes = ApiResult<SkuFlowInstance>;

export interface SubmitSkuForReviewReq {
  instanceId: EntityId;
  comment?: string;
}
export type SubmitSkuForReviewRes = ApiResult<SkuFlowInstance>;

export interface ReviewSkuReq {
  instanceId: EntityId;
  decision: "SEND_BACK" | "FORWARD";
  comment?: string;
}
export type ReviewSkuRes = ApiResult<SkuFlowInstance>;

export interface ApproveSkuReq {
  instanceId: EntityId;
  decision: "APPROVE" | "REJECT";
  comment?: string;
  reason?: string;
}
export type ApproveSkuRes = ApiResult<SkuFlowInstance>;

export const SKU_FLOW_ENDPOINTS = {
  create: "/api/flows/sku/create",
  submit: "/api/flows/sku/submit",
  review: "/api/flows/sku/review",
  approve: "/api/flows/sku/approve",
  get: "/api/flows/sku/get",
  list: "/api/flows/sku/list",
} as const;