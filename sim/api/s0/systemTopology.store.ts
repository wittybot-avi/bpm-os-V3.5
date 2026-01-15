/**
 * In-memory Topology Store (S0)
 * Simulated database for Enterprise, Plant, Line, and Station hierarchy.
 * @version V3.5
 * @governance S0-ARCH-BP-04
 */

import type { Enterprise, Plant, Line, Station, TopologyAudit } from "../../../domain/s0/systemTopology.types";

const INITIAL_AUDIT: TopologyAudit = {
  createdBy: "SYSTEM_PROVISIONER",
  createdAt: "2026-01-01T00:00:00Z",
  approvedBy: "GLOBAL_ADMIN",
  approvedAt: "2026-01-01T09:00:00Z"
};

const STATIONS: Station[] = [
  {
    id: "STN-A4",
    code: "STN-A4-MOD-INS",
    displayName: "Module Insertion Station",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT,
    lineId: "LINE-A",
    stationType: "ASSEMBLY",
    supportedOperations: ["INSERT_MODULE", "TORQUE_FIX", "SCAN_SERIAL"],
    deviceBindings: ["DEV-SCAN-01", "DEV-TORQ-01"]
  }
];

const LINES: Line[] = [
  {
    id: "LINE-A",
    code: "L-PK-01",
    displayName: "Pack Assembly Line A",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT,
    plantId: "FAC-WB-01",
    stationIds: ["STN-A4"]
  }
];

let PLANTS: Plant[] = [
  {
    id: "FAC-WB-01",
    code: "PL-KOL-01",
    displayName: "Gigafactory 1 - Kolkata",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT,
    enterpriseId: "ENT-BPM-GLOBAL",
    lineIds: ["LINE-A"]
  }
];

const ENTERPRISES: Enterprise[] = [
  {
    id: "ENT-BPM-GLOBAL",
    code: "BPM-OS-HQ",
    displayName: "BPM Global Manufacturing",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT,
    plantIds: ["FAC-WB-01"]
  }
];

/**
 * STORE ACCESSORS (Read-Only)
 */

export const getEnterprises = (): readonly Enterprise[] => Object.freeze([...ENTERPRISES]);
export const getPlants = (): readonly Plant[] => Object.freeze([...PLANTS]);
export const getLines = (): readonly Line[] => Object.freeze([...LINES]);
export const getStations = (): readonly Station[] => Object.freeze([...STATIONS]);

export const getEnterpriseById = (id: string) => ENTERPRISES.find(e => e.id === id);
export const getPlantById = (id: string) => PLANTS.find(p => p.id === id);
export const getLineById = (id: string) => LINES.find(l => l.id === id);
export const getStationById = (id: string) => STATIONS.find(s => s.id === id);

/**
 * STORE MUTATORS (V35-S0-CRUD-PP-11)
 */

export const addPlant = (plant: Plant) => {
  PLANTS = [...PLANTS, plant];
  return plant;
};

export const updatePlant = (id: string, updates: Partial<Plant>) => {
  PLANTS = PLANTS.map(p => p.id === id ? { ...p, ...updates } : p);
  return PLANTS.find(p => p.id === id);
};
