/**
 * In-memory Topology Store (S0)
 * Simulated database for Enterprise, Plant, Line, and Station hierarchy.
 * @version V3.5
 * @governance S0-ARCH-BP-04
 * @updated V35-S0-HOTFIX-PP-29 (Regulatory & Flag Mutators)
 */

import { UserRole } from "../../../types";
import type { Enterprise, Plant, Line, Station, DeviceClass, TopologyAudit, S0AuditEntry } from "../../../domain/s0/systemTopology.types";
import type { CapabilityFlag, CapabilityOverride } from "../../../domain/s0/capability.types";
import type { RegulatoryFramework, ComplianceBinding, SOPProfile } from "../../../domain/s0/complianceContext.types";
import type { AppUser } from "../../../domain/s0/userManagement.types";

const INITIAL_AUDIT: TopologyAudit = {
  createdBy: "SYSTEM_PROVISIONER",
  createdAt: "2026-01-01T00:00:00Z",
  approvedBy: "GLOBAL_ADMIN",
  approvedAt: "2026-01-01T09:00:00Z"
};

let STATIONS: Station[] = [];
let LINES: Line[] = [];
let PLANTS: Plant[] = [];
let ENTERPRISES: Enterprise[] = [];
let DEVICE_CLASSES: DeviceClass[] = [];
let CAPABILITY_OVERRIDES: CapabilityOverride[] = [];
let SOP_PROFILES: SOPProfile[] = [];
let COMPLIANCE_BINDINGS: ComplianceBinding[] = [];
let USERS: AppUser[] = [];
let S0_AUDIT_LOGS: S0AuditEntry[] = [];
let CAPABILITY_FLAGS: CapabilityFlag[] = [];
let REGULATORY_FRAMEWORKS: RegulatoryFramework[] = [];

/**
 * ensureS0Seed
 * Idempotent seeder to ensure base data is present for Option-B simulation.
 */
export function ensureS0Seed() {
  if (ENTERPRISES.length > 0) return;

  console.info("[S0-STORE] Rehydrating Master Data seed...");

  CAPABILITY_FLAGS = [
    { id: 'ENABLE_SERIALIZATION', label: 'Unit Serialization', description: 'Enable unique ID generation at S3.', defaultValue: true, category: 'TRACEABILITY' },
    { id: 'ENABLE_IOT_BINDING', label: 'IoT Asset Binding', description: 'Link BMS telemetry to Battery ID at S10.', defaultValue: true, category: 'TRACEABILITY' },
    { id: 'ENABLE_CELL_TRACE', label: 'Deep Cell Traceability', description: 'Track serials down to individual cell units.', defaultValue: false, category: 'TRACEABILITY' },
    { id: 'ENABLE_DIGITAL_PASSPORT', label: 'Digital Passport (EU)', description: 'Generate carbon footprint & compliance schema.', defaultValue: true, category: 'REGULATORY' },
    { id: 'STRICT_GATING', label: 'Strict Interlock Gating', description: 'Block stage transitions if gates are locked.', defaultValue: true, category: 'MANUFACTURING' }
  ];

  REGULATORY_FRAMEWORKS = [
    { id: "RF-AIS-156", code: "AIS-156", name: "AIS-156 AMD 3", jurisdiction: "INDIA", mandatory: true, status: 'ACTIVE', description: "Safety requirements for traction batteries of L, M and N category vehicles." },
    { id: "RF-EU-BP", code: "EU-2023/1542", name: "EU Battery Passport", jurisdiction: "EU", mandatory: true, status: 'ACTIVE', description: "Digital record providing transparency on battery sustainability and circularity." },
    { id: "RF-UN-383", code: "UN-38.3", name: "UN38.3 Certified", jurisdiction: "GLOBAL", mandatory: true, status: 'ACTIVE', description: "Standard for testing lithium batteries for transport." },
    { id: "RF-BATT-AADHAAR", code: "BAT-AADHAAR-V1", name: "BATT-AADHAAR-V1", jurisdiction: "INDIA", mandatory: false, status: 'ACTIVE', description: "Sovereign identity framework for battery tracking." }
  ];

  ENTERPRISES = [
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

  PLANTS = [
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

  LINES = [
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

  STATIONS = [
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

  DEVICE_CLASSES = [
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
  ];

  SOP_PROFILES = [
    { id: "SOP-ASSY-01", code: "SOP-IND-PK-01", name: "Pack Assembly Protocol (Standard)", version: "V2.4", applicableScopes: ["PLANT", "LINE"] },
    { id: "SOP-QC-01", code: "SOP-AIS-QC-156", name: "AIS-156 Quality Gate Procedure", version: "V1.8", applicableScopes: ["PLANT", "STATION"] }
  ];

  COMPLIANCE_BINDINGS = [
    {
      scope: 'ENTERPRISE',
      scopeId: 'ENT-BPM-GLOBAL',
      regulatoryFrameworkIds: ["RF-AIS-156", "RF-UN-383"],
      sopProfileIds: ["SOP-QC-01"]
    }
  ];

  USERS = [
    {
      id: "USR-001",
      username: "admin.bpm",
      fullName: "Global System Admin",
      email: "admin@bpmos.internal",
      role: UserRole.SYSTEM_ADMIN,
      status: 'ACTIVE',
      scopes: []
    },
    {
      id: "USR-002",
      username: "operator.kol",
      fullName: "Kolkata Operator 1",
      email: "op1@kolkata.bpmos.internal",
      role: UserRole.OPERATOR,
      status: 'ACTIVE',
      scopes: [{ scope: 'PLANT', scopeId: 'FAC-WB-01' }]
    }
  ];
}

/**
 * STORE ACCESSORS (Read-Only)
 */
export const getEnterprises = (): readonly Enterprise[] => { ensureS0Seed(); return Object.freeze([...ENTERPRISES]); };
export const getPlants = (): readonly Plant[] => { ensureS0Seed(); return Object.freeze([...PLANTS]); };
export const getLines = (): readonly Line[] => { ensureS0Seed(); return Object.freeze([...LINES]); };
export const getStations = (): readonly Station[] => { ensureS0Seed(); return Object.freeze([...STATIONS]); };
export const getDeviceClasses = (): readonly DeviceClass[] => { ensureS0Seed(); return Object.freeze([...DEVICE_CLASSES]); };
export const getCapabilityFlags = (): readonly CapabilityFlag[] => { ensureS0Seed(); return Object.freeze([...CAPABILITY_FLAGS]); };
export const getCapabilityOverrides = (): readonly CapabilityOverride[] => Object.freeze([...CAPABILITY_OVERRIDES]);
export const getRegulatoryFrameworks = (): readonly RegulatoryFramework[] => { ensureS0Seed(); return Object.freeze([...REGULATORY_FRAMEWORKS]); };
export const getSopProfiles = (): readonly SOPProfile[] => { ensureS0Seed(); return Object.freeze([...SOP_PROFILES]); };
export const getComplianceBindings = (): readonly ComplianceBinding[] => { ensureS0Seed(); return Object.freeze([...COMPLIANCE_BINDINGS]); };
export const getUsers = (): readonly AppUser[] => { ensureS0Seed(); return Object.freeze([...USERS]); };
export const getS0AuditLogs = (): readonly S0AuditEntry[] => Object.freeze([...S0_AUDIT_LOGS]);

export const getEnterpriseById = (id: string) => { ensureS0Seed(); return ENTERPRISES.find(e => e.id === id); };
export const getPlantById = (id: string) => { ensureS0Seed(); return PLANTS.find(p => p.id === id); };
export const getLineById = (id: string) => { ensureS0Seed(); return LINES.find(l => l.id === id); };
export const getStationById = (id: string) => { ensureS0Seed(); return STATIONS.find(s => s.id === id); };
export const getDeviceClassById = (id: string) => { ensureS0Seed(); return DEVICE_CLASSES.find(dc => dc.id === id); };

/**
 * STORE MUTATORS
 */
export const addS0AuditLog = (entry: S0AuditEntry) => {
  S0_AUDIT_LOGS = [entry, ...S0_AUDIT_LOGS].slice(0, 100);
  return entry;
};

export const addEnterprise = (ent: Enterprise) => {
  ENTERPRISES = [...ENTERPRISES, ent];
  return ent;
};

export const updateEnterprise = (id: string, updates: Partial<Enterprise>) => {
  ENTERPRISES = ENTERPRISES.map(e => e.id === id ? { ...e, ...updates } : e);
  return ENTERPRISES.find(e => e.id === id);
};

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

export const addDeviceClass = (dc: DeviceClass) => {
  DEVICE_CLASSES = [...DEVICE_CLASSES, dc];
  return dc;
};

export const updateDeviceClass = (id: string, updates: Partial<DeviceClass>) => {
  DEVICE_CLASSES = DEVICE_CLASSES.map(dc => dc.id === id ? { ...dc, ...updates } : dc);
  return DEVICE_CLASSES.find(dc => dc.id === id);
};

export const addSopProfile = (sop: SOPProfile) => {
  SOP_PROFILES = [...SOP_PROFILES, sop];
  return sop;
};

export const updateSopProfile = (id: string, updates: Partial<SOPProfile>) => {
  SOP_PROFILES = SOP_PROFILES.map(s => s.id === id ? { ...s, ...updates } : s);
  return SOP_PROFILES.find(s => s.id === id);
};

export const addRegulatoryFramework = (fw: RegulatoryFramework) => {
  REGULATORY_FRAMEWORKS = [...REGULATORY_FRAMEWORKS, fw];
  return fw;
};

export const updateRegulatoryFramework = (id: string, updates: Partial<RegulatoryFramework>) => {
  REGULATORY_FRAMEWORKS = REGULATORY_FRAMEWORKS.map(f => f.id === id ? { ...f, ...updates } : f);
  return REGULATORY_FRAMEWORKS.find(f => f.id === id);
};

export const updateCapabilityFlag = (id: string, updates: Partial<CapabilityFlag>) => {
  CAPABILITY_FLAGS = CAPABILITY_FLAGS.map(f => f.id === id ? { ...f, ...updates } : f);
  return CAPABILITY_FLAGS.find(f => f.id === id);
};

export const addUser = (user: AppUser) => {
  USERS = [...USERS, user];
  return user;
};

export const updateUser = (id: string, updates: Partial<AppUser>) => {
  USERS = USERS.map(u => u.id === id ? { ...u, ...updates } : u);
  return USERS.find(u => u.id === id);
};

export const upsertOverride = (override: CapabilityOverride) => {
  const existingIndex = CAPABILITY_OVERRIDES.findIndex(
    o => o.flagId === override.flagId && o.scope === override.scope && o.scopeId === override.scopeId
  );

  if (existingIndex > -1) {
    const updated = [...CAPABILITY_OVERRIDES];
    updated[existingIndex] = override;
    CAPABILITY_OVERRIDES = updated;
  } else {
    CAPABILITY_OVERRIDES = [...CAPABILITY_OVERRIDES, override];
  }
  return override;
};

export const removeOverride = (flagId: string, scope: string, scopeId: string) => {
  CAPABILITY_OVERRIDES = CAPABILITY_OVERRIDES.filter(
    o => !(o.flagId === flagId && o.scope === scope && o.scopeId === scopeId)
  );
};

export const upsertComplianceBinding = (binding: ComplianceBinding) => {
  const existingIndex = COMPLIANCE_BINDINGS.findIndex(
    b => b.scope === binding.scope && b.scopeId === binding.scopeId
  );

  if (existingIndex > -1) {
    const updated = [...COMPLIANCE_BINDINGS];
    updated[existingIndex] = binding;
    COMPLIANCE_BINDINGS = updated;
  } else {
    COMPLIANCE_BINDINGS = [...COMPLIANCE_BINDINGS, binding];
  }
  return binding;
};

export const removeComplianceBinding = (scope: string, scopeId: string) => {
  COMPLIANCE_BINDINGS = COMPLIANCE_BINDINGS.filter(
    b => !(b.scope === scope && b.scopeId === scopeId)
  );
};

export const resetS0UIState = () => {
  console.debug("[S0-STORE] In-memory UI state reset triggered.");
};

ensureS0Seed();