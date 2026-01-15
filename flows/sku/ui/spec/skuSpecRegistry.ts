/**
 * SKU Specification Registry
 * Central authority for mapping SKU Types to Technical Blueprint sections and fields.
 * @foundation V35-S1-WIZ-SPEC-FIX-01
 * @updated V35-S1-WIZ-SPEC-FIX-04 (Field Definitions)
 */

import { 
  FlaskConical, 
  BoxSelect, 
  Zap, 
  Battery, 
  Link2, 
  Layers, 
  Wind, 
  Cpu, 
  Cable, 
  Radio, 
  FileCode,
  Box
} from 'lucide-react';
import type { SkuDraft } from '../../skuFlowContract';

export interface SkuSpecField {
  id: keyof SkuDraft;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
  icon: any;
  required?: boolean;
}

export interface SkuSpecSection {
  sectionId: string;
  sectionTitle: string;
  fields: SkuSpecField[];
}

/**
 * The Registry: Maps canonical SKU Types to an array of Technical Sections and Fields.
 */
export const SKU_SPEC_REGISTRY: Record<string, SkuSpecSection[]> = {
  CELL: [
    { 
      sectionId: "CELL_TECHNICAL", 
      sectionTitle: "Cell Technical Specification", 
      fields: [
        { id: 'chemistry', label: 'Cell Chemistry', type: 'select', icon: FlaskConical, required: true, options: ['LFP', 'NMC', 'LTO'] },
        { id: 'formFactor', label: 'Form Factor', type: 'select', icon: BoxSelect, required: true, options: ['Cylindrical', 'Prismatic', 'Pouch'] },
        { id: 'nominalVoltage', label: 'Nominal Voltage (V)', type: 'number', icon: Zap, required: true },
        { id: 'capacityAh', label: 'Nominal Capacity (Ah)', type: 'number', icon: Battery, required: true },
      ] 
    }
  ],
  MODULE: [
    { 
      sectionId: "MODULE_TECHNICAL", 
      sectionTitle: "Module Technical Specification", 
      fields: [
        { id: 'cellTypeRef', label: 'Referenced Cell SKU', type: 'text', icon: Link2, required: true, placeholder: 'e.g. CELL-LFP-21700' },
        { id: 'seriesConfig', label: 'Series Count (S)', type: 'number', icon: Layers, required: true },
        { id: 'parallelConfig', label: 'Parallel Count (P)', type: 'number', icon: Layers, required: true },
      ] 
    }
  ],
  PACK: [
    { 
      sectionId: "PACK_TECHNICAL", 
      sectionTitle: "Pack Technical Specification", 
      fields: [
        { id: 'nominalVoltage', label: 'System Nominal Voltage (V)', type: 'number', icon: Zap, required: true },
        { id: 'capacityAh', label: 'Target Capacity (Ah)', type: 'number', icon: Battery, required: true },
        { id: 'allowedModuleSkus', label: 'Allowed Module SKUs', type: 'text', icon: Box, required: true, placeholder: 'Comma separated SKU codes' },
        { id: 'requiredBmsSku', label: 'Required BMS SKU', type: 'text', icon: Link2, required: true },
        { id: 'coolingType', label: 'Cooling Method', type: 'select', icon: Wind, options: ['Passive', 'Active Air', 'Liquid'] },
      ] 
    }
  ],
  BMS: [
    { 
      sectionId: "BMS_TECHNICAL", 
      sectionTitle: "BMS Technical Specification", 
      fields: [
        { id: 'chipset', label: 'Control Chipset', type: 'text', icon: Cpu, required: true, placeholder: 'e.g. TI-BQ-76952' },
        { id: 'supportedChemistries', label: 'Supported Chemistries', type: 'text', icon: FlaskConical, required: true, placeholder: 'e.g. LFP, NMC' },
        { id: 'firmwarePolicy', label: 'Firmware Update Policy', type: 'text', icon: FileCode, required: true },
        { id: 'protocol', label: 'Primary Protocol', type: 'select', icon: Cable, options: ['CAN 2.0B', 'RS485', 'SMBus'] },
      ] 
    }
  ],
  IOT: [
    { 
      sectionId: "IOT_TECHNICAL", 
      sectionTitle: "IoT Technical Specification", 
      fields: [
        { id: 'commsType', label: 'Connectivity Type', type: 'select', icon: Radio, required: true, options: ['4G_LTE', '5G_IOT', 'LoRaWAN', 'WiFi'] },
        { id: 'powerSource', label: 'Primary Power Source', type: 'select', icon: Zap, required: true, options: ['Internal_Bat', 'Bus_Powered', 'Hybrid'] },
        { id: 'telemetrySchemaVersion', label: 'Telemetry Schema Version', type: 'text', icon: FileCode, required: true, placeholder: 'v1.0.0' },
      ] 
    }
  ]
};

/**
 * Logic helper to resolve the specification schema for a given SKU type.
 */
export function resolveSpecSchema(skuType?: string): SkuSpecSection[] {
  if (!skuType) return [];
  return SKU_SPEC_REGISTRY[skuType] || [];
}