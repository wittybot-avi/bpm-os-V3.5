/**
 * SKU Flow Contract (FLOW-001)
 * Canonical definitions for SKU Creation & Blueprint Approval lifecycle.
 * @foundation V34-S1-FLOW-001-BP-01
 * @updated V35-S1-WIZ-FIX-05 (Schema Completion)
 */

import type { ApiResult, EntityId, IsoDateTime } from "../../types";
import type { SkuType } from "../../stages/s1/s1Contract";

export type SkuFlowState = "Draft" | "Review" | "Approved" | "Active" | "Rejected";

export type SkuFlowRole = "Maker" | "Checker" | "Approver";

export interface SkuDraft {
  skuCode: string;
  skuName: string;
  skuType?: SkuType;
  isRevision: boolean;
  notes?: string;

  // Technical Blueprint - Common & Type Specific
  chemistry?: string;           // CELL, MODULE, PACK, BMS
  formFactor?: string;          // CELL, PACK
  nominalVoltage?: number;      // CELL, MODULE, PACK
  capacityAh?: number;          // CELL, MODULE, PACK
  energyKwh?: number;           // PACK
  seriesConfig?: number;        // MODULE, PACK
  parallelConfig?: number;      // MODULE, PACK
  cellCount?: number;           // MODULE
  moduleCount?: number;         // PACK
  
  // Hardware/Software Specific
  hwVersion?: string;           // BMS, IOT
  fwBaseline?: string;          // BMS, IOT
  protocol?: string;            // BMS
  commsType?: string;           // IOT
  
  // V3.5 Schema Completion Fields
  coolingType?: string;         // PACK (e.g. Air, Liquid, Phase-Change)
  voltageMin?: number;          // BMS, PACK
  voltageMax?: number;          // BMS, PACK
  cellTypeRef?: string;         // MODULE (Link to S1 Cell SKU)
  powerSource?: string;         // IOT (e.g. Internal, Bus-Powered)
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