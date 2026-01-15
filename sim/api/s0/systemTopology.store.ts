/**
 * In-memory Topology Store (S0)
 * Simulated database for Enterprise, Plant, Line, and Station hierarchy.
 * @version V3.5
 * @governance S0-ARCH-BP-04
 */

import type { Enterprise, Plant, Line, Station, DeviceClass, TopologyAudit } from "../../../domain/s0/systemTopology.types";

const INITIAL_AUDIT: TopologyAudit = {
  createdBy: "SYSTEM_PROVISIONER",
  createdAt: "2026-01-01T00:00:00Z",
  approvedBy: "GLOBAL_ADMIN",
  approvedAt: "2026-01-01T09:00:00Z"
};

let STATIONS: Station[] = [
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

let LINES: Line[] = [
  {
    id: "LINE-A",
    code: "L-PK-01",
    displayName: "Pack Assembly Line A",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT,
    plantId: "FAC-WB-01",
    stationIds: ["STN-A4"],
    supportedOperations: ["ASSEMBLY", "TESTING"],
    supportedSkuTypes: ["PACK", "MODULE"]
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

let ENTERPRISES: Enterprise[] = [
  {
    id: "ENT-BPM-GLOBAL",
    code: "BPM-OS-HQ",
    displayName: "BPM Global Manufacturing",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT,
    plantIds: ["FAC-WB-01"],
    timezone: "UTC"
  }
];

let DEVICE_CLASSES: DeviceClass[] = [
  {
    id: "DC-SCAN-01",
    code: "BARCODE_SCANNER",
    displayName: "Standard Handheld Scanner",
    status: "ACTIVE",
    category: "SCANNER",
    supportedProtocols: ["USB", "REST"],
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT
  },
  {
    id: "DC-SCALE-01",
    code: "DIGITAL_SCALE",
    displayName: "Precision Floor Scale",
    status: "ACTIVE",
    category: "METROLOGY",
    supportedProtocols: ["MQTT", "RS232"],
    effectiveFrom: "2026-01-01T00:00:00Z",
    audit: INITIAL_AUDIT
  }
];

/**
 * STORE ACCESSORS (Read-Only)
 */

export const getEnterprises = (): readonly Enterprise[] => Object.freeze([...ENTERPRISES]);
export const getPlants = (): readonly Plant[] => Object.freeze([...PLANTS]);
export const getLines = (): readonly Line[] => Object.freeze([...LINES]);
export const getStations = (): readonly Station[] => Object.freeze([...STATIONS]);
export const getDeviceClasses = (): readonly DeviceClass[] => Object.freeze([...DEVICE_CLASSES]);

export const getEnterpriseById = (id: string) => ENTERPRISES.find(e => e.id === id);
export const getPlantById = (id: string) => PLANTS.find(p => p.id === id);
export const getLineById = (id: string) => LINES.find(l => l.id === id);
export const getStationById = (id: string) => STATIONS.find(s => s.id === id);
export const getDeviceClassById = (id: string) => DEVICE_CLASSES.find(dc => dc.id === id);

/**
 * STORE MUTATORS (V35-S0-CRUD-PP-11 / PP-13 / PP-14 / PP-15 / PP-16)
 */

export const addPlant = (plant: Plant) => {
  PLANTS = [...PLANTS, plant];
  return plant;
};

export const updatePlant = (id: string, updates: Partial<Plant>) => {
  PLANTS = PLANTS.map(p => p.id === id ? { ...p, ...updates } : p);
  return PLANTS.find(p => p.id === id);
};

export const addLine = (line: Line) => {
  LINES = [...LINES, line];
  return line;
};

export const updateLine = (id: string, updates: Partial<Line>) => {
  LINES = LINES.map(l => l.id === id ? { ...l, ...updates } : l);
  return LINES.find(l => l.id === id);
};

export const addStation = (station: Station) => {
  STATIONS = [...STATIONS, station];
  return station;
};

export const updateStation = (id: string, updates: Partial<Station>) => {
  STATIONS = STATIONS.map(s => s.id === id ? { ...s, ...updates } : s);
  return STATIONS.find(s => s.id === id);
};

export const updateEnterprise = (id: string, updates: Partial<Enterprise>) => {
  ENTERPRISES = ENTERPRISES.map(e => e.id === id ? { ...e, ...updates } : e);
  return ENTERPRISES.find(e => e.id === id);
};

export const addDeviceClass = (dc: DeviceClass) => {
  DEVICE_CLASSES = [...DEVICE_CLASSES, dc];
  return dc;
};

export const updateDeviceClass = (id: string, updates: Partial<DeviceClass>) => {
  DEVICE_CLASSES = DEVICE_CLASSES.map(dc => dc.id === id ? { ...dc, ...updates } : dc);
  return DEVICE_CLASSES.find(dc => dc.id === id);
};