/**
 * SKU Flow Wizard Model
 * Defines local state shape for the FLOW-001 step-wizard.
 * @foundation V34-S1-FLOW-001-PP-03
 * @updated V35-S1-WIZ-FIX-01 (Step Registry & Path Resolution)
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
 * Path Resolution Registry
 * Determines valid step sequences based on Intent and SKU Type.
 */
export const WIZARD_STEP_REGISTRY: Record<string, Record<string, WizardStepId[]>> = {
  GREENFIELD: {
    DEFAULT: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    CELL: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    MODULE: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    PACK: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    BMS: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    IOT: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
  },
  REVISION: {
    DEFAULT: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    CELL: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    MODULE: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    PACK: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    BMS: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
    IOT: ["INIT", "GENERAL", "TECHNICAL", "REVIEW", "APPROVE", "PUBLISH"],
  }
};

/**
 * Resolves the full sequence for current context.
 */
export function getStepSequence(isRevision: boolean, skuType?: string): WizardStepId[] {
  const intent = isRevision ? 'REVISION' : 'GREENFIELD';
  const typeKey = skuType || 'DEFAULT';
  const sequence = WIZARD_STEP_REGISTRY[intent][typeKey] || WIZARD_STEP_REGISTRY[intent]['DEFAULT'];
  console.log(`[WIZARD-REGISTRY] Resolved sequence for ${intent}:${typeKey} ->`, sequence);
  return sequence;
}

/**
 * Resolves next step ID from registry.
 */
export function getNextStepId(current: WizardStepId, isRevision: boolean, skuType?: string): WizardStepId {
  const sequence = getStepSequence(isRevision, skuType);
  const currentIndex = sequence.indexOf(current);
  if (currentIndex === -1 || currentIndex === sequence.length - 1) return current;
  return sequence[currentIndex + 1];
}

/**
 * Resolves previous step ID from registry.
 */
export function getPrevStepId(current: WizardStepId, isRevision: boolean, skuType?: string): WizardStepId {
  const sequence = getStepSequence(isRevision, skuType);
  const currentIndex = sequence.indexOf(current);
  if (currentIndex <= 0) return current;
  return sequence[currentIndex - 1];
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