/**
 * S0 Topology API Handlers
 * Simulated backend logic for system hierarchy retrieval and management.
 * @version V3.5
 * @governance S0-ARCH-BP-05
 * @updated V35-S0-CRUD-PP-11 (Plant Mutations)
 * @updated V35-S0-CRUD-PP-13 (Line Mutations)
 * @updated V35-S0-CRUD-PP-14 (Station Mutations)
 * @updated V35-S0-CRUD-PP-15 (Enterprise Mutations)
 * @updated V35-S0-CAP-PP-16 (Device Class Mutations)
 * @updated V35-S0-CAP-PP-17 (Capability Overrides)
 * @updated V35-S0-COMP-PP-18 (Regulatory Bindings)
 * @updated V35-S0-COMP-PP-19 (SOP Profile CRUD)
 * @updated V35-S0-RBAC-PP-20 (User Scopes)
 * @updated V35-S0-RBAC-PP-21 (Permission Preview)
 * @updated V35-S0-GOV-PP-22 (Audit Logging)
 * @updated V35-S0-GOV-PP-23 (Guardrails)
 * @updated V35-S0-HOTFIX-PP-25 (RBAC Permission Key)
 */

import { UserRole } from "../../../types";
import type { ApiHandler, ApiResponse, ApiRequest } from "../apiTypes";
import { 
  getEnterprises, 
  getPlants, 
  getLines, 
  getStations,
  getDeviceClasses,
  addPlant,
  updatePlant,
  addLine,
  updateLine,
  addStation,
  updateStation,
  updateEnterprise,
  addDeviceClass,
  updateDeviceClass,
  getCapabilityFlags,
  getCapabilityOverrides,
  upsertOverride,
  removeOverride,
  getPlantById,
  getLineById,
  getStationById,
  getRegulatoryFrameworks,
  getComplianceBindings,
  upsertComplianceBinding,
  removeComplianceBinding,
  getSopProfiles,
  addSopProfile,
  updateSopProfile,
  getUsers,
  addUser,
  updateUser,
  addS0AuditLog,
  getS0AuditLogs
} from "../s0/systemTopology.store";
import type { Enterprise, Plant, Line, Station, DeviceClass, S0AuditEntry } from "../../../domain/s0/systemTopology.types";
import type { CapabilityOverride, EffectiveFlag, CapabilityScope } from "../../../domain/s0/capability.types";
import type { RegulatoryFramework, ComplianceBinding, EffectiveCompliance, SOPProfile } from "../../../domain/s0/complianceContext.types";
import type { AppUser, EffectivePermissions } from "../../../domain/s0/userManagement.types";

const ok = (data: any): ApiResponse => ({
  status: 200,
  body: { ok: true, data }
});

const err = (code: string, message: string, status = 400): ApiResponse => ({
  status,
  body: { ok: false, error: { code, message } }
});

function parseBody<T>(req: ApiRequest): T {
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }
  return req.body as T;
}

/**
 * Audit Helper: Records S0 Activity to the store.
 */
function logS0(entry: Omit<S0AuditEntry, 'id' | 'timestamp'>): void {
  addS0AuditLog({
    ...entry,
    id: `audit-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /api/s0/audit
 */
export const getAuditLogsHandler: ApiHandler = async () => {
  return ok(getS0AuditLogs());
};

/**
 * GET /api/s0/enterprises
 */
export const listEnterprises: ApiHandler = async () => {
  return ok(getEnterprises());
};

/**
 * PATCH /api/s0/enterprises/update
 */
export const updateEnterpriseHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<Enterprise> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Enterprise ID is required");

  // V35-S0-GOV-PP-23: Block Suspend if child entities exist
  if (body.updates.status && body.updates.status !== 'ACTIVE') {
    const hasPlants = getPlants().some(p => p.enterpriseId === body.id);
    if (hasPlants) {
      return err("PRECONDITION_FAILED", "Cannot suspend Enterprise with active Plants. Retain or move Plants first.");
    }
  }

  const updated = updateEnterprise(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Enterprise not found", 404);
  
  logS0({ entityType: 'ENTERPRISE', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/plants?enterpriseId=
 */
export const listPlants: ApiHandler = async (req) => {
  const enterpriseId = req.query?.["enterpriseId"];
  const plants = getPlants();
  if (enterpriseId) {
    return ok(plants.filter(p => p.enterpriseId === enterpriseId));
  }
  return ok(plants);
};

/**
 * POST /api/s0/plants/create
 */
export const createPlantHandler: ApiHandler = async (req) => {
  const body = parseBody<Partial<Plant>>(req);
  if (!body.code || !body.displayName) return err("BAD_REQUEST", "Plant code and display name are required");
  const newPlant: Plant = {
    id: `FAC-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    code: body.code,
    displayName: body.displayName,
    status: body.status || 'ACTIVE',
    enterpriseId: body.enterpriseId || 'ENT-BPM-GLOBAL',
    effectiveFrom: new Date().toISOString(),
    lineIds: [],
    audit: { createdBy: "API_USER", createdAt: new Date().toISOString() }
  };
  addPlant(newPlant);
  
  logS0({ entityType: 'PLANT', entityId: newPlant.id, action: 'CREATE', actor: 'API_USER' });
  
  return ok(newPlant);
};

/**
 * PATCH /api/s0/plants/update
 */
export const updatePlantHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<Plant> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Plant ID is required");

  // V35-S0-GOV-PP-23: Block Suspend if child entities exist
  if (body.updates.status && body.updates.status !== 'ACTIVE') {
    const hasLines = getLines().some(l => l.plantId === body.id);
    if (hasLines) {
      return err("PRECONDITION_FAILED", "Cannot suspend Plant with existing production Lines. Retire or move Lines first.");
    }
  }

  const updated = updatePlant(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Plant not found", 404);
  
  logS0({ entityType: 'PLANT', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/lines?plantId=
 */
export const listLines: ApiHandler = async (req) => {
  const plantId = req.query?.["plantId"];
  const lines = getLines();
  if (plantId) {
    return ok(lines.filter(l => l.plantId === plantId));
  }
  return ok(lines);
};

/**
 * POST /api/s0/lines/create
 */
export const createLineHandler: ApiHandler = async (req) => {
  const body = parseBody<Partial<Line>>(req);
  if (!body.code || !body.displayName || !body.plantId) {
    return err("BAD_REQUEST", "Line code, display name, and parent Plant ID are required");
  }
  const newLine: Line = {
    id: `LN-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    code: body.code,
    displayName: body.displayName,
    status: body.status || 'ACTIVE',
    plantId: body.plantId,
    effectiveFrom: new Date().toISOString(),
    stationIds: [],
    supportedOperations: body.supportedOperations || [],
    supportedSkuTypes: body.supportedSkuTypes || [],
    audit: { createdBy: "API_USER", createdAt: new Date().toISOString() }
  };
  addLine(newLine);
  
  logS0({ entityType: 'LINE', entityId: newLine.id, action: 'CREATE', actor: 'API_USER' });
  
  return ok(newLine);
};

/**
 * PATCH /api/s0/lines/update
 */
export const updateLineHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<Line> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Line ID is required");

  // V35-S0-GOV-PP-23: Block Suspend if child entities exist
  if (body.updates.status && body.updates.status !== 'ACTIVE') {
    const hasStations = getStations().some(s => s.lineId === body.id);
    if (hasStations) {
      return err("PRECONDITION_FAILED", "Cannot suspend Line with existing Workstations. Retire Stations first.");
    }
  }

  const updated = updateLine(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Line not found", 404);
  
  logS0({ entityType: 'LINE', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/stations?lineId=
 */
export const listStations: ApiHandler = async (req) => {
  const lineId = req.query?.["lineId"];
  const stations = getStations();
  if (lineId) {
    return ok(stations.filter(s => s.lineId === lineId));
  }
  return ok(stations);
};

/**
 * POST /api/s0/stations/create
 */
export const createStationHandler: ApiHandler = async (req) => {
  const body = parseBody<Partial<Station>>(req);
  if (!body.code || !body.displayName || !body.lineId || !body.stationType) {
    return err("BAD_REQUEST", "Station code, name, line ID, and station type are required");
  }
  const newStation: Station = {
    id: `STN-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    code: body.code,
    displayName: body.displayName,
    status: body.status || 'ACTIVE',
    lineId: body.lineId,
    stationType: body.stationType,
    supportedOperations: body.supportedOperations || [],
    deviceBindings: [],
    effectiveFrom: new Date().toISOString(),
    audit: { createdBy: "API_USER", createdAt: new Date().toISOString() }
  };
  addStation(newStation);
  
  logS0({ entityType: 'STATION', entityId: newStation.id, action: 'CREATE', actor: 'API_USER' });
  
  return ok(newStation);
};

/**
 * PATCH /api/s0/stations/update
 */
export const updateStationHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<Station> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Station ID is required");
  const updated = updateStation(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Station not found", 404);
  
  logS0({ entityType: 'STATION', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/device-classes
 */
export const listDeviceClassesHandler: ApiHandler = async () => {
  return ok(getDeviceClasses());
};

/**
 * POST /api/s0/device-classes/create
 */
export const createDeviceClassHandler: ApiHandler = async (req) => {
  const body = parseBody<Partial<DeviceClass>>(req);
  if (!body.code || !body.displayName || !body.category) {
    return err("BAD_REQUEST", "Code, display name, and category are required");
  }
  const newDc: DeviceClass = {
    id: `DC-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    code: body.code,
    displayName: body.displayName,
    status: body.status || 'ACTIVE',
    category: body.category,
    supportedProtocols: body.supportedProtocols || [],
    effectiveFrom: new Date().toISOString(),
    audit: { createdBy: "API_USER", createdAt: new Date().toISOString() }
  };
  addDeviceClass(newDc);
  
  logS0({ entityType: 'DEVICE_CLASS', entityId: newDc.id, action: 'CREATE', actor: 'API_USER' });
  
  return ok(newDc);
};

/**
 * PATCH /api/s0/device-classes/update
 */
export const updateDeviceClassHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<DeviceClass> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Device Class ID is required");
  const updated = updateDeviceClass(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Device Class not found", 404);
  
  logS0({ entityType: 'DEVICE_CLASS', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/capabilities/effective
 */
export const getEffectiveCapabilitiesHandler: ApiHandler = async (req) => {
  const scope = req.query?.["scope"] as CapabilityScope;
  const scopeId = req.query?.["scopeId"];
  if (!scope || !scopeId) return err("BAD_REQUEST", "Scope and scopeId are required");
  const flags = getCapabilityFlags();
  const overrides = getCapabilityOverrides();
  const resolve = (flagId: string): EffectiveFlag => {
    const flag = flags.find(f => f.id === flagId)!;
    const exact = overrides.find(o => o.flagId === flagId && o.scope === scope && o.scopeId === scopeId);
    if (exact) return { ...flag, effectiveValue: exact.value, sourceScope: scope, sourceId: scopeId, isOverridden: true };
    if (scope === 'STATION') {
      const station = getStations().find(s => s.id === scopeId);
      if (station) {
        const lineId = station.lineId;
        const lineOverride = overrides.find(o => o.flagId === flagId && o.scope === 'LINE' && o.scopeId === lineId);
        if (lineOverride) return { ...flag, effectiveValue: lineOverride.value, sourceScope: 'LINE', sourceId: lineId, isOverridden: false };
        const line = getLineById(lineId);
        if (line) {
          const plantId = line.plantId;
          const plantOverride = overrides.find(o => o.flagId === flagId && o.scope === 'PLANT' && o.scopeId === plantId);
          if (plantOverride) return { ...flag, effectiveValue: plantOverride.value, sourceScope: 'PLANT', sourceId: plantId, isOverridden: false };
          const plant = getPlantById(plantId);
          if (plant) {
             const entId = plant.enterpriseId;
             const entOverride = overrides.find(o => o.flagId === flagId && o.scope === 'ENTERPRISE' && o.scopeId === entId);
             if (entOverride) return { ...flag, effectiveValue: entOverride.value, sourceScope: 'ENTERPRISE', sourceId: entId, isOverridden: false };
          }
        }
      }
    } else if (scope === 'LINE') {
      const line = getLines().find(l => l.id === scopeId);
      if (line) {
        const plantId = line.plantId;
        const plantOverride = overrides.find(o => o.flagId === flagId && o.scope === 'PLANT' && o.scopeId === plantId);
        if (plantOverride) return { ...flag, effectiveValue: plantOverride.value, sourceScope: 'PLANT', sourceId: plantId, isOverridden: false };
      }
    } else if (scope === 'PLANT') {
      const plant = getPlants().find(p => p.id === scopeId);
      if (plant) {
        const entId = plant.enterpriseId;
        const entOverride = overrides.find(o => o.flagId === flagId && o.scope === 'ENTERPRISE' && o.scopeId === entId);
        if (entOverride) return { ...flag, effectiveValue: entOverride.value, sourceScope: 'ENTERPRISE', sourceId: entId, isOverridden: false };
      }
    }
    return { ...flag, effectiveValue: flag.defaultValue, sourceScope: 'GLOBAL', isOverridden: false };
  };
  const resolved = flags.map(f => resolve(f.id));
  return ok(resolved);
};

/**
 * POST /api/s0/capabilities/override
 */
export const setCapabilityOverrideHandler: ApiHandler = async (req) => {
  const body = parseBody<CapabilityOverride>(req);
  if (!body.flagId || !body.scope || !body.scopeId) return err("BAD_REQUEST", "flagId, scope, and scopeId are required");
  const override: CapabilityOverride = { ...body, updatedAt: new Date().toISOString(), updatedBy: "API_USER" };
  upsertOverride(override);
  
  logS0({ entityType: 'CAPABILITY', entityId: body.flagId, action: 'OVERRIDE', actor: 'API_USER', details: `${body.scope}:${body.scopeId}=${body.value}` });
  
  return ok(override);
};

/**
 * DELETE /api/s0/capabilities/override
 */
export const removeCapabilityOverrideHandler: ApiHandler = async (req) => {
  const { flagId, scope, scopeId } = parseBody<{ flagId: string; scope: string; scopeId: string }>(req);
  if (!flagId || !scope || !scopeId) return err("BAD_REQUEST", "Ids are required");
  removeOverride(flagId, scope, scopeId);
  
  logS0({ entityType: 'CAPABILITY', entityId: flagId, action: 'REMOVE_OVERRIDE', actor: 'API_USER', details: `${scope}:${scopeId}` });
  
  return ok({ success: true });
};

/**
 * GET /api/s0/compliance/frameworks
 */
export const listRegulatoryFrameworksHandler: ApiHandler = async () => ok(getRegulatoryFrameworks());

/**
 * GET /api/s0/compliance/sop-profiles
 */
export const listSopProfilesHandler: ApiHandler = async () => ok(getSopProfiles());

/**
 * POST /api/s0/compliance/sop-profiles/create
 */
export const createSopProfileHandler: ApiHandler = async (req) => {
  const body = parseBody<Partial<SOPProfile>>(req);
  if (!body.code || !body.name || !body.version) return err("BAD_REQUEST", "Code, Name and Version are required");
  const newSop: SOPProfile = {
    id: `SOP-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    code: body.code,
    name: body.name,
    version: body.version,
    applicableScopes: body.applicableScopes || ["PLANT"]
  };
  addSopProfile(newSop);
  
  logS0({ entityType: 'SOP_PROFILE', entityId: newSop.id, action: 'CREATE', actor: 'API_USER' });
  
  return ok(newSop);
};

/**
 * PATCH /api/s0/compliance/sop-profiles/update
 */
export const updateSopProfileHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<SOPProfile> }>(req);
  if (!body.id) return err("BAD_REQUEST", "SOP Profile ID is required");
  const updated = updateSopProfile(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "SOP Profile not found", 404);
  
  logS0({ entityType: 'SOP_PROFILE', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/compliance/effective
 */
export const getEffectiveComplianceHandler: ApiHandler = async (req) => {
  const scope = req.query?.["scope"] as CapabilityScope;
  const scopeId = req.query?.["scopeId"];
  if (!scope || !scopeId) return err("BAD_REQUEST", "Scope and scopeId are required");
  const frameworks = getRegulatoryFrameworks();
  const sops = getSopProfiles();
  const bindings = getComplianceBindings();
  let activeBinding = bindings.find(b => b.scope === scope && b.scopeId === scopeId);
  let isOverridden = !!activeBinding;
  if (!activeBinding && scope === 'PLANT') {
    const plant = getPlantById(scopeId);
    if (plant) { activeBinding = bindings.find(b => b.scope === 'ENTERPRISE' && b.scopeId === plant.enterpriseId); }
  }
  if (!activeBinding) {
    return ok({ frameworks: [], sopProfiles: [], sourceScope: 'GLOBAL', sourceId: 'GLOBAL', isOverridden: false });
  }
  const resolvedFrameworks = frameworks.filter(f => activeBinding?.regulatoryFrameworkIds.includes(f.id));
  const resolvedSops = sops.filter(s => activeBinding?.sopProfileIds.includes(s.id));
  const result: EffectiveCompliance = { frameworks: resolvedFrameworks, sopProfiles: resolvedSops, sourceScope: activeBinding.scope, sourceId: activeBinding.scopeId, isOverridden };
  return ok(result);
};

/**
 * POST /api/s0/compliance/bind
 */
export const setComplianceBindingHandler: ApiHandler = async (req) => {
  const body = parseBody<ComplianceBinding>(req);
  if (!body.scope || !body.scopeId) return err("BAD_REQUEST", "scope and scopeId are required");
  upsertComplianceBinding(body);
  
  logS0({ entityType: 'COMPLIANCE', entityId: body.scopeId, action: 'BIND', actor: 'API_USER', details: `Scope: ${body.scope}` });
  
  return ok(body);
};

/**
 * DELETE /api/s0/compliance/bind
 */
export const removeComplianceBindingHandler: ApiHandler = async (req) => {
  const { scope, scopeId } = parseBody<{ scope: string; scopeId: string }>(req);
  if (!scope || !scopeId) return err("BAD_REQUEST", "scope and scopeId are required");
  removeComplianceBinding(scope, scopeId);
  
  logS0({ entityType: 'COMPLIANCE', entityId: scopeId, action: 'DELETE', actor: 'API_USER', details: `Unbound Scope: ${scope}` });
  
  return ok({ success: true });
};

/**
 * GET /api/s0/users
 */
export const listUsersHandler: ApiHandler = async () => ok(getUsers());

/**
 * POST /api/s0/users/create
 */
export const createUserHandler: ApiHandler = async (req) => {
  const body = parseBody<Partial<AppUser>>(req);
  if (!body.username || !body.fullName || !body.role) return err("BAD_REQUEST", "Username, Name and Role are required");
  const newUser: AppUser = {
    id: `USR-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    username: body.username,
    fullName: body.fullName,
    role: body.role,
    status: body.status || 'ACTIVE',
    scopes: body.scopes || []
  };
  addUser(newUser);
  
  logS0({ entityType: 'USER', entityId: newUser.id, action: 'CREATE', actor: 'API_USER' });
  
  return ok(newUser);
};

/**
 * PATCH /api/s0/users/update
 */
export const updateUserHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<AppUser> }>(req);
  if (!body.id) return err("BAD_REQUEST", "User ID is required");
  const updated = updateUser(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "User not found", 404);
  
  logS0({ entityType: 'USER', entityId: body.id, action: 'UPDATE', actor: 'API_USER', details: JSON.stringify(body.updates) });
  
  return ok(updated);
};

/**
 * GET /api/s0/users/permissions
 */
export const getEffectiveUserPermissionsHandler: ApiHandler = async (req) => {
  const userId = req.query?.["userId"];
  const scope = req.query?.["scope"] as CapabilityScope;
  const scopeId = req.query?.["scopeId"];
  if (!userId || !scope || !scopeId) return err("BAD_REQUEST", "userId, scope and scopeId are required");
  const user = getUsers().find(u => u.id === userId);
  if (!user) return err("NOT_FOUND", "User not found", 404);

  const ROLE_PERMS: Record<UserRole, string[]> = {
    [UserRole.SYSTEM_ADMIN]: ['S0_MANAGE_MASTER_DATA', 'MANAGE_ENTERPRISE', 'MANAGE_PLANTS', 'MANAGE_LINES', 'MANAGE_STATIONS', 'MANAGE_DEVICES', 'MANAGE_REGS', 'MANAGE_SOP', 'MANAGE_USERS', 'MANAGE_CAPABILITIES'],
    [UserRole.MANAGEMENT]: ['S0_MANAGE_MASTER_DATA', 'VIEW_TOPOLOGY', 'MANAGE_PLANTS', 'MANAGE_LINES', 'MANAGE_STATIONS', 'MANAGE_REGS'],
    [UserRole.COMPLIANCE]: ['S0_MANAGE_MASTER_DATA', 'VIEW_TOPOLOGY', 'MANAGE_REGS', 'MANAGE_SOP'],
    [UserRole.ENGINEERING]: ['VIEW_TOPOLOGY', 'MANAGE_LINES', 'MANAGE_STATIONS', 'MANAGE_DEVICES'],
    [UserRole.OPERATOR]: ['VIEW_TOPOLOGY'],
    [UserRole.QA_ENGINEER]: ['VIEW_TOPOLOGY'],
    [UserRole.SUPERVISOR]: ['VIEW_TOPOLOGY', 'MANAGE_STATIONS'],
    [UserRole.STORES]: ['VIEW_TOPOLOGY'],
    [UserRole.PROCUREMENT]: ['VIEW_TOPOLOGY'],
    [UserRole.PLANNER]: ['VIEW_TOPOLOGY'],
    [UserRole.LOGISTICS]: ['VIEW_TOPOLOGY'],
    [UserRole.SERVICE]: ['VIEW_TOPOLOGY'],
    [UserRole.SUSTAINABILITY]: ['VIEW_TOPOLOGY']
  };

  const baseActions = ROLE_PERMS[user.role] || [];
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return ok({ userId, scope, scopeId, allowedActions: baseActions, isRestrictedByScope: false } as EffectivePermissions);
  }

  const isAuthorizedAtNode = (): boolean => {
    for (const binding of user.scopes) {
      if (binding.scopeId === 'GLOBAL') return true;
      if (binding.scope === scope && binding.scopeId === scopeId) return true;
      if (scope === 'PLANT') {
        const plant = getPlantById(scopeId);
        if (plant && binding.scope === 'ENTERPRISE' && binding.scopeId === plant.enterpriseId) return true;
      }
      if (scope === 'LINE') {
        const line = getLineById(scopeId);
        if (line) {
          if (binding.scope === 'PLANT' && binding.scopeId === line.plantId) return true;
          const plant = getPlantById(line.plantId);
          if (plant && binding.scope === 'ENTERPRISE' && binding.scopeId === plant.enterpriseId) return true;
        }
      }
      if (scope === 'STATION') {
        const station = getStationById(scopeId);
        if (station) {
          if (binding.scope === 'LINE' && binding.scopeId === station.lineId) return true;
          const line = getLineById(station.lineId);
          if (line) {
            if (binding.scope === 'PLANT' && binding.scopeId === line.plantId) return true;
            const plant = getPlantById(line.plantId);
            if (plant && binding.scope === 'ENTERPRISE' && binding.scopeId === plant.enterpriseId) return true;
          }
        }
      }
    }
    return false;
  };
  const authorized = isAuthorizedAtNode();
  return ok({ userId, scope, scopeId, allowedActions: authorized ? baseActions : [], isRestrictedByScope: !authorized } as EffectivePermissions);
};