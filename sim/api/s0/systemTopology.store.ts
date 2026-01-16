/**
 * Unified In-memory Topology Store (S0)
 * Simulated database for Master Data with LocalStorage persistence.
 * @version V3.5
 * @governance S0-ARCH-BP-04
 * @updated V35-S0-HOTFIX-PP-35 (Effective Capability Evaluation)
 */

import { UserRole } from "../../../types";
import type { Enterprise, Plant, Line, Station, DeviceClass, TopologyAudit, S0AuditEntry } from "../../../domain/s0/systemTopology.types";
import type { CapabilityFlag, CapabilityOverride, EffectiveFlag, CapabilityScope } from "../../../domain/s0/capability.types";
import type { RegulatoryFramework, ComplianceBinding, SOPProfile } from "../../../domain/s0/complianceContext.types";
import type { AppUser } from "../../../domain/s0/userManagement.types";

const STORAGE_KEY = 'bpm_s0_master_data_v1';

interface S0StoreState {
  enterprises: Enterprise[];
  plants: Plant[];
  lines: Line[];
  stations: Station[];
  deviceClasses: DeviceClass[];
  capabilityFlags: CapabilityFlag[];
  capabilityOverrides: CapabilityOverride[];
  regulatoryFrameworks: RegulatoryFramework[];
  sopProfiles: SOPProfile[];
  complianceBindings: ComplianceBinding[];
  users: AppUser[];
  auditLogs: S0AuditEntry[];
}

let STATE: S0StoreState | null = null;

const INITIAL_AUDIT: TopologyAudit = {
  createdBy: "SYSTEM_PROVISIONER",
  createdAt: "2026-01-01T00:00:00Z",
  approvedBy: "GLOBAL_ADMIN",
  approvedAt: "2026-01-01T09:00:00Z"
};

/**
 * Persists current state to localStorage
 */
function saveToDisk() {
  if (!STATE) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.error("[S0-STORE] Persistence failed:", e);
  }
}

/**
 * Loads state from localStorage or initializes with seed
 */
function rehydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      STATE = JSON.parse(raw);
      console.info("[S0-STORE] Rehydrated from disk.");
      return;
    }
  } catch (e) {
    console.warn("[S0-STORE] Rehydration failed, falling back to seed.");
  }

  // Seed Data
  STATE = {
    enterprises: [
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
    ],
    plants: [
      {
        id: "FAC-WB-01",
        code: "PL-KOL-01",
        displayName: "Gigafactory 1 - Kolkata",
        status: "ACTIVE",
        effectiveFrom: "2026-01-01T00:00:00Z",
        audit: INITIAL_AUDIT,
        enterpriseId: "ENT-BPM-GLOBAL",
        lineIds: ["LINE-A"],
        locationCity: "Kolkata",
        locationState: "West Bengal",
        country: "India",
        timezone: "Asia/Kolkata",
        siteType: "GIGAFACTORY"
      }
    ],
    lines: [
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
        supportedSkuTypes: ["PACK", "MODULE"],
        lineType: "PACK_ASSEMBLY",
        maxThroughputPerHr: 20,
        shiftModel: 3
      }
    ],
    stations: [
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
    ],
    deviceClasses: [
      {
        id: "DC-SCAN-01",
        code: "BARCODE_SCANNER",
        displayName: "Standard Handheld Scanner",
        status: "ACTIVE",
        category: "SCANNER",
        supportedProtocols: ["USB", "REST"],
        effectiveFrom: "2026-01-01T00:00:00Z",
        audit: INITIAL_AUDIT
      }
    ],
    capabilityFlags: [
      { id: 'ENABLE_SERIALIZATION', label: 'Unit Serialization', description: 'Enable unique ID generation at S3.', defaultValue: true, category: 'TRACEABILITY' },
      { id: 'ENABLE_IOT_BINDING', label: 'IoT Asset Binding', description: 'Link BMS telemetry to Battery ID at S10.', defaultValue: true, category: 'TRACEABILITY' },
      { id: 'ENABLE_CELL_TRACE', label: 'Deep Cell Traceability', description: 'Track serials down to individual cell units.', defaultValue: false, category: 'TRACEABILITY' },
      { id: 'ENABLE_DIGITAL_PASSPORT', label: 'Digital Passport (EU)', description: 'Generate carbon footprint & compliance schema.', defaultValue: true, category: 'REGULATORY' },
      { id: 'STRICT_GATING', label: 'Strict Interlock Gating', description: 'Block stage transitions if gates are locked.', defaultValue: true, category: 'MANUFACTURING' }
    ],
    capabilityOverrides: [],
    regulatoryFrameworks: [
      { id: "RF-AIS-156", code: "AIS-156", name: "AIS-156 AMD 3", jurisdiction: "INDIA", mandatory: true, status: 'ACTIVE', description: "Safety requirements for traction batteries." },
      { id: "RF-EU-BP", code: "EU-2023/1542", name: "EU Battery Passport", jurisdiction: "EU", mandatory: true, status: 'ACTIVE', description: "Digital record for battery sustainability." },
      { id: "RF-UN-383", code: "UN-38.3", name: "UN38.3 Certified", jurisdiction: "GLOBAL", mandatory: true, status: 'ACTIVE', description: "Standard for testing lithium batteries." }
    ],
    sopProfiles: [
      { id: "SOP-ASSY-01", code: "SOP-IND-PK-01", name: "Pack Assembly Protocol (Standard)", version: "V2.4", applicableScopes: ["PLANT", "LINE"] },
      { id: "SOP-QC-01", code: "SOP-AIS-QC-156", name: "AIS-156 Quality Gate Procedure", version: "V1.8", applicableScopes: ["PLANT", "STATION"] }
    ],
    complianceBindings: [
      {
        scope: 'ENTERPRISE',
        scopeId: 'ENT-BPM-GLOBAL',
        regulatoryFrameworkIds: ["RF-AIS-156", "RF-UN-383"],
        sopProfileIds: ["SOP-QC-01"]
      }
    ],
    users: [
      { id: "USR-001", username: "admin.bpm", fullName: "Global System Admin", email: "admin@bpmos.internal", role: UserRole.SYSTEM_ADMIN, status: 'ACTIVE', scopes: [] },
      { id: "USR-002", username: "operator.kol", fullName: "Kolkata Operator 1", email: "op1@kolkata.bpmos.internal", role: UserRole.OPERATOR, status: 'ACTIVE', scopes: [{ scope: 'PLANT', scopeId: 'FAC-WB-01' }] }
    ],
    auditLogs: []
  };

  saveToDisk();
}

function ensureState(): S0StoreState {
  if (!STATE) rehydrate();
  return STATE!;
}

/**
 * STORE ACCESSORS
 */
export const getEnterprises = () => ensureState().enterprises;
export const getPlants = () => ensureState().plants;
export const getLines = () => ensureState().lines;
export const getStations = () => ensureState().stations;
export const getDeviceClasses = () => ensureState().deviceClasses;
export const getCapabilityFlags = () => ensureState().capabilityFlags;
export const getCapabilityOverrides = () => ensureState().capabilityOverrides;
export const getRegulatoryFrameworks = () => ensureState().regulatoryFrameworks;
export const getSopProfiles = () => ensureState().sopProfiles;
export const getComplianceBindings = () => ensureState().complianceBindings;
export const getUsers = () => ensureState().users;
export const getS0AuditLogs = () => ensureState().auditLogs;

export const getEnterpriseById = (id: string) => ensureState().enterprises.find(e => e.id === id);
export const getPlantById = (id: string) => ensureState().plants.find(p => p.id === id);
export const getLineById = (id: string) => ensureState().lines.find(l => l.id === id);
export const getStationById = (id: string) => ensureState().stations.find(s => s.id === id);

/**
 * STORE MUTATORS
 */
export const addS0AuditLog = (entry: S0AuditEntry) => {
  const state = ensureState();
  state.auditLogs = [entry, ...state.auditLogs].slice(0, 100);
  saveToDisk();
  return entry;
};

// Fix: Use unknown cast to avoid type overlap errors in generic mutator
const createMutator = <T extends { id: string }>(key: keyof S0StoreState) => ({
  add: (item: T) => {
    const state = ensureState();
    (state[key] as unknown as T[]).push(item);
    saveToDisk();
    return item;
  },
  update: (id: string, updates: Partial<T>) => {
    const state = ensureState();
    const list = state[key] as unknown as T[];
    const idx = list.findIndex(x => x.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...updates };
      saveToDisk();
      return list[idx];
    }
    return null;
  }
});

const enterpriseMutators = createMutator<Enterprise>('enterprises');
export const addEnterprise = enterpriseMutators.add;
export const updateEnterprise = enterpriseMutators.update;

const plantMutators = createMutator<Plant>('plants');
export const addPlant = plantMutators.add;
export const updatePlant = plantMutators.update;

const lineMutators = createMutator<Line>('lines');
export const addLine = lineMutators.add;
export const updateLine = lineMutators.update;

const stationMutators = createMutator<Station>('stations');
export const addStation = stationMutators.add;
export const updateStation = stationMutators.update;

const deviceClassMutators = createMutator<DeviceClass>('deviceClasses');
export const addDeviceClass = deviceClassMutators.add;
export const updateDeviceClass = deviceClassMutators.update;

const userMutators = createMutator<AppUser>('users');
export const addUser = userMutators.add;
export const updateUser = userMutators.update;

const frameworkMutators = createMutator<RegulatoryFramework>('regulatoryFrameworks');
export const addRegulatoryFramework = frameworkMutators.add;
export const updateRegulatoryFramework = frameworkMutators.update;

const sopMutators = createMutator<SOPProfile>('sopProfiles');
export const addSopProfile = sopMutators.add;
export const updateSopProfile = sopMutators.update;

const flagMutators = createMutator<CapabilityFlag>('capabilityFlags');
export const updateCapabilityFlag = flagMutators.update;

export const upsertOverride = (override: CapabilityOverride) => {
  const state = ensureState();
  const existingIndex = state.capabilityOverrides.findIndex(
    o => o.flagId === override.flagId && o.scope === override.scope && o.scopeId === override.scopeId
  );
  if (existingIndex > -1) {
    state.capabilityOverrides[existingIndex] = override;
  } else {
    state.capabilityOverrides.push(override);
  }
  saveToDisk();
  return override;
};

export const removeOverride = (flagId: string, scope: string, scopeId: string) => {
  const state = ensureState();
  state.capabilityOverrides = state.capabilityOverrides.filter(
    o => !(o.flagId === flagId && o.scope === scope && o.scopeId === scopeId)
  );
  saveToDisk();
};

export const upsertComplianceBinding = (binding: ComplianceBinding) => {
  const state = ensureState();
  const existingIndex = state.complianceBindings.findIndex(
    b => b.scope === binding.scope && b.scopeId === binding.scopeId
  );
  if (existingIndex > -1) {
    state.complianceBindings[existingIndex] = binding;
  } else {
    state.complianceBindings.push(binding);
  }
  saveToDisk();
  return binding;
};

export const removeComplianceBinding = (scope: string, scopeId: string) => {
  const state = ensureState();
  state.complianceBindings = state.complianceBindings.filter(
    b => !(b.scope === scope && b.scopeId === scopeId)
  );
  saveToDisk();
};

/**
 * Resolves a single capability flag's value for a given scope hierarchy.
 * @version V35-S0-HOTFIX-PP-35
 */
export function resolveEffectiveFlag(flagId: string, scope: CapabilityScope, scopeId: string): EffectiveFlag {
  const state = ensureState();
  const flag = state.capabilityFlags.find(f => f.id === flagId)!;
  const overrides = state.capabilityOverrides;

  // 1. Direct Override at requested scope
  const direct = overrides.find(o => o.flagId === flagId && o.scope === scope && o.scopeId === scopeId);
  if (direct) {
    return { ...flag, effectiveValue: direct.value, sourceScope: scope, sourceId: scopeId, isOverridden: true };
  }

  // 2. Hierarchical inheritance logic
  if (scope === 'STATION') {
    const station = state.stations.find(s => s.id === scopeId);
    if (station) {
      const lineId = station.lineId;
      const lineOverride = overrides.find(o => o.flagId === flagId && o.scope === 'LINE' && o.scopeId === lineId);
      if (lineOverride) return { ...flag, effectiveValue: lineOverride.value, sourceScope: 'LINE', sourceId: lineId, isOverridden: false };
      
      const line = state.lines.find(l => l.id === lineId);
      if (line) {
        const plantId = line.plantId;
        const plantOverride = overrides.find(o => o.flagId === flagId && o.scope === 'PLANT' && o.scopeId === plantId);
        if (plantOverride) return { ...flag, effectiveValue: plantOverride.value, sourceScope: 'PLANT', sourceId: plantId, isOverridden: false };
        
        const plant = state.plants.find(p => p.id === plantId);
        if (plant) {
          const entId = plant.enterpriseId;
          const entOverride = overrides.find(o => o.flagId === flagId && o.scope === 'ENTERPRISE' && o.scopeId === entId);
          if (entOverride) return { ...flag, effectiveValue: entOverride.value, sourceScope: 'ENTERPRISE', sourceId: entId, isOverridden: false };
        }
      }
    }
  } else if (scope === 'LINE') {
    const line = state.lines.find(l => l.id === scopeId);
    if (line) {
      const plantId = line.plantId;
      const plantOverride = overrides.find(o => o.flagId === flagId && o.scope === 'PLANT' && o.scopeId === plantId);
      if (plantOverride) return { ...flag, effectiveValue: plantOverride.value, sourceScope: 'PLANT', sourceId: plantId, isOverridden: false };
      
      const plant = state.plants.find(p => p.id === plantId);
      if (plant) {
        const entId = plant.enterpriseId;
        const entOverride = overrides.find(o => o.flagId === flagId && o.scope === 'ENTERPRISE' && o.scopeId === entId);
        if (entOverride) return { ...flag, effectiveValue: entOverride.value, sourceScope: 'ENTERPRISE', sourceId: entId, isOverridden: false };
      }
    }
  } else if (scope === 'PLANT') {
    const plant = state.plants.find(p => p.id === scopeId);
    if (plant) {
      const entId = plant.enterpriseId;
      const entOverride = overrides.find(o => o.flagId === flagId && o.scope === 'ENTERPRISE' && o.scopeId === entId);
      if (entOverride) return { ...flag, effectiveValue: entOverride.value, sourceScope: 'ENTERPRISE', sourceId: entId, isOverridden: false };
    }
  }

  // 3. Fallback to Global Default
  return { ...flag, effectiveValue: flag.defaultValue, sourceScope: 'GLOBAL', isOverridden: false };
}

export const resetS0UIState = () => {
  console.debug("[S0-STORE] State consistency check triggered.");
  ensureState();
};