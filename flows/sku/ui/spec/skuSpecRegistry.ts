/**
 * SKU Specification Registry
 * Central authority for mapping SKU Types to Technical Blueprint sections.
 * @foundation V35-S1-WIZ-SPEC-FIX-01
 */

import type { SkuType } from "../../../stages/s1/s1Contract";

export interface SkuSpecSection {
  sectionId: string;
  sectionTitle: string;
  fields: any[]; // Fields are empty for initial stabilization phase
}

/**
 * The Registry: Maps canonical SKU Types to an array of Technical Sections.
 */
export const SKU_SPEC_REGISTRY: Record<string, SkuSpecSection[]> = {
  CELL: [
    { sectionId: "CELL_TECHNICAL", sectionTitle: "Cell Technical Specification", fields: [] }
  ],
  MODULE: [
    { sectionId: "MODULE_TECHNICAL", sectionTitle: "Module Technical Specification", fields: [] }
  ],
  PACK: [
    { sectionId: "PACK_TECHNICAL", sectionTitle: "Pack Technical Specification", fields: [] }
  ],
  BMS: [
    { sectionId: "BMS_TECHNICAL", sectionTitle: "BMS Technical Specification", fields: [] }
  ],
  IOT: [
    { sectionId: "IOT_TECHNICAL", sectionTitle: "IoT Technical Specification", fields: [] }
  ]
};

/**
 * Logic helper to resolve the specification schema for a given SKU type.
 */
export function resolveSpecSchema(skuType?: string): SkuSpecSection[] {
  if (!skuType) return [];
  const schema = SKU_SPEC_REGISTRY[skuType] || [];
  console.log(`[SPEC-REGISTRY] Resolved sections for ${skuType}:`, schema);
  return schema;
}