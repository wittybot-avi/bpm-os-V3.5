/**
 * SKU Flow Wizard Model
 * Defines local state shape for the FLOW-001 step-wizard.
 * @foundation V34-S1-FLOW-001-PP-03
 * @updated V35-S1-WIZ-PP-05 (Dynamic Steps)
 */

import type { SkuDraft, SkuFlowState, SkuFlowRole } from "../skuFlowContract";

export type WizardStepId = "INIT" | "GENERAL" | "TECHNICAL" | "REVIEW" | "APPROVE" | "PUBLISH";

export interface WizardModel {
  role: SkuFlowRole;
  state: SkuFlowState;
  step: WizardStepId;
  draft: SkuDraft;
  comment?: string;
  rejectionReason?: string;
}

/**
 * Initial defaults for a new SKU creation flow.
 */
export function createDefaultWizardModel(): WizardModel {
  return {
    role: "Maker",
    state: "Draft",
    step: "INIT",
    draft: { 
      skuCode: "", 
      skuName: "", 
      isRevision: false,
      notes: "" 
    }
  };
}

/**
 * Maps flow state to the appropriate UI wizard step.
 */
export function resolveStepFromState(state: SkuFlowState): WizardStepId {
  switch (state) {
    case "Draft":
    case "Rejected":
      // Re-entry to Draft always starts at General info for clarity
      return "GENERAL";
    case "Review":
      return "REVIEW";
    case "Approved":
      return "APPROVE";
    case "Active":
      return "PUBLISH";
    default:
      return "INIT";
  }
}