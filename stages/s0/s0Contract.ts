/**
 * S0 System Setup - Master Data Contract
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. S0 is the authoritative source for MASTER DATA (Configuration & Capabilities).
 * 2. S0 CANNOT create operational instances (SKUs, Batches, Serials, Materials).
 * 3. S0 entities are slow-changing, reference-only, and globally unique.
 * 4. Downstream stages (S1-S17) must treat S0 data as READ-ONLY.
 * 
 * @foundation V35-S0-ARCH-BP-01
 */

import { EntityId, IsoDateTime } from '../../types';

/**
 * System Feature Flag
 * Defines a toggleable capability within the OS.
 */
export interface SystemFeatureFlag {
  id: string;
  label: string;
  description: string;
  isEnabled: boolean;
  scope: 'GLOBAL' | 'PLANT' | 'LINE';
}

/**
 * Plant Master Data
 * High-level facility configuration.
 */
export interface PlantMasterData {
  plantId: EntityId;
  name: string;
  regionCode: string; // ISO 3166-2
  timezone: string;   // IANA Timezone string
  capabilities: string[]; // e.g. ["LFP_ASSEMBLY", "HV_TESTING"]
}

/**
 * Line Master Data
 * Defines physical production lines within the plant.
 */
export interface LineMasterData {
  lineId: EntityId;
  name: string;
  type: 'AUTOMATED' | 'MANUAL' | 'HYBRID';
  workstations: WorkstationMasterData[];
}

/**
 * Workstation Master Data
 * Specific nodes on a production line.
 */
export interface WorkstationMasterData {
  stationId: EntityId;
  name: string;
  requiredDeviceClasses: DeviceClassMasterData[];
  isGated: boolean; // Indicates if this station has a mandatory interlock
}

/**
 * Device Class Master Data
 * Functional category of hardware allowed at stations.
 */
export interface DeviceClassMasterData {
  classId: EntityId;
  label: string; // e.g. "Scanner", "Scale", "Torque_Tool"
  protocol: 'REST' | 'MQTT' | 'CAN' | 'USB';
}

/**
 * S0 Global Context
 * Root aggregate for all Master Data.
 */
export interface S0Context {
  // Metadata
  status: 'READY' | 'CONFIGURING' | 'MAINTENANCE';
  activeSopVersion: string;
  configLastUpdated: IsoDateTime;
  
  // Master Entities
  plant: PlantMasterData;
  lines: LineMasterData[];
  featureFlags: SystemFeatureFlag[];
  
  // System-level counters (Reference only)
  activeLines: number;
  plantName: string; // Legacy field retained for backward compatibility
  plantId: string;   // Legacy field retained for backward compatibility
  region: string;    // Legacy field retained for backward compatibility
}

/**
 * Returns deterministic mock data for S0 context as Master Data.
 */
export const getMockS0Context = (): S0Context => {
  const defaultDevice: DeviceClassMasterData = { classId: 'DC-SCAN-01', label: 'BARCODE_SCANNER', protocol: 'USB' };
  
  const lineA: LineMasterData = {
    lineId: 'LINE-A',
    name: 'Pack Assembly Line A',
    type: 'HYBRID',
    workstations: [
      { stationId: 'STN-A4', name: 'Module Insertion', requiredDeviceClasses: [defaultDevice], isGated: true }
    ]
  };

  const featureFlags: SystemFeatureFlag[] = [
    { id: 'ENABLE_SERIALIZATION', label: 'Unit Serialization', description: 'Enable unique ID generation at S3.', isEnabled: true, scope: 'GLOBAL' },
    { id: 'ENABLE_IOT_BINDING', label: 'IoT Asset Binding', description: 'Link BMS telemetry to Battery ID at S10.', isEnabled: true, scope: 'PLANT' },
    { id: 'ENABLE_CELL_TRACE', label: 'Deep Cell Traceability', description: 'Track serials down to individual cell units.', isEnabled: false, scope: 'LINE' },
    { id: 'ENABLE_DIGITAL_PASSPORT', label: 'Digital Passport (EU)', description: 'Generate carbon footprint & compliance schema.', isEnabled: true, scope: 'GLOBAL' },
    { id: 'STRICT_GATING', label: 'Strict Interlock Gating', description: 'Block stage transitions if gates are locked.', isEnabled: true, scope: 'GLOBAL' }
  ];

  return {
    plantId: 'FAC-IND-WB-001-A',
    plantName: 'Gigafactory 1 - Bengal Unit',
    region: 'Kolkata, WB, India (IST Zone)',
    activeSopVersion: 'V3.5.0-BASELINE',
    configLastUpdated: '2026-01-28 05:30 IST',
    status: 'READY',
    activeLines: 1,
    plant: {
      plantId: 'FAC-IND-WB-001-A',
      name: 'Gigafactory 1',
      regionCode: 'IN-WB',
      timezone: 'Asia/Kolkata',
      capabilities: ['LFP_ASSEMBLY', 'NMC_ASSEMBLY', 'HV_TESTING']
    },
    lines: [lineA],
    featureFlags
  };
};