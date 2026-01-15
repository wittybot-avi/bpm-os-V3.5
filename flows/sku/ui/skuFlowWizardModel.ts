/**
 * SKU Flow Wizard Model
 * Defines local state shape for the FLOW-001 step-wizard.
 * @foundation V34-S1-FLOW-001-PP-03
 * @updated V35-S1-WIZ-FIX-06 (Step Pruning & UX Focus)
 */

import type { SkuDraft, SkuFlowState, SkuFlowRole } from "../skuFlowContract";

export type WizardStepId = 
  | "INIT" 
  | "BASE_SKU_METADATA" 
  | "TECH_CELL_SCAFFOLD"
  | "TECH_MODULE_SCAFFOLD"
  | "TECH_PACK_SCAFFOLD"
  | "TECH_BMS_SCAFFOLD"
  | "TECH_IOT_SCAFFOLD"
  | "TECHNICAL" 
  | "REVIEW" 
  | "APPROVE" 
  | "PUBLISH";

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
 * Pruned redundant TECHNICAL step to ensure focused UX per type.
 */
export const WIZARD_STEP_REGISTRY: Record<string, Record<string, WizardStepId[]>> = {
  GREENFIELD: {
    DEFAULT: ["INIT", "BASE_SKU_METADATA", "REVIEW", "APPROVE", "PUBLISH"],
    CELL:    ["INIT", "BASE_SKU_METADATA", "TECH_CELL_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    MODULE:  ["INIT", "BASE_SKU_METADATA", "TECH_MODULE_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    PACK:    ["INIT", "BASE_SKU_METADATA", "TECH_PACK_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    BMS:     ["INIT", "BASE_SKU_METADATA", "TECH_BMS_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    IOT:     ["INIT", "BASE_SKU_METADATA", "TECH_IOT_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
  },
  REVISION: {
    DEFAULT: ["INIT", "BASE_SKU_METADATA", "REVIEW", "APPROVE", "PUBLISH"],
    CELL:    ["INIT", "BASE_SKU_METADATA", "TECH_CELL_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    MODULE:  ["INIT", "BASE_SKU_METADATA", "TECH_MODULE_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    PACK:    ["INIT", "BASE_SKU_METADATA", "TECH_PACK_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    BMS:     ["INIT", "BASE_SKU_METADATA", "TECH_BMS_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
    IOT:     ["INIT", "BASE_SKU_METADATA", "TECH_IOT_SCAFFOLD", "REVIEW", "APPROVE", "PUBLISH"],
  }
};

/**
 * Resolves the full sequence for current context.
 */
export function getStepSequence(isRevision: boolean, skuType?: string): WizardStepId[] {
  const intentKey = isRevision ? 'REVISION' : 'GREENFIELD';
  const typeKey = skuType || 'DEFAULT';
  
  const intentGroup = WIZARD_STEP_REGISTRY[intentKey];
  if (!intentGroup) {
    console.error(`[WIZARD-REGISTRY] Intent group ${intentKey} not found.`);
    return WIZARD_STEP_REGISTRY.GREENFIELD.DEFAULT;
  }

  const sequence = intentGroup[typeKey] || intentGroup.DEFAULT;
  
  console.debug(`[WIZARD-REGISTRY] Resolved Path -> [${intentKey}:${typeKey}]`, sequence);
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
      return "BASE_SKU_METADATA";
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