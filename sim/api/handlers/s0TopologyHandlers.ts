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
 */

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
  getRegulatoryFrameworks,
  getComplianceBindings,
  upsertComplianceBinding,
  removeComplianceBinding,
  getSopProfiles,
  addSopProfile,
  updateSopProfile
} from "../s0/systemTopology.store";
import type { Enterprise, Plant, Line, Station, DeviceClass } from "../../../domain/s0/systemTopology.types";
import type { CapabilityOverride, EffectiveFlag, CapabilityScope } from "../../../domain/s0/capability.types";
import type { RegulatoryFramework, ComplianceBinding, EffectiveCompliance, SOPProfile } from "../../../domain/s0/complianceContext.types";

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

  const updated = updateEnterprise(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Enterprise not found", 404);

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
    audit: {
      createdBy: "API_USER",
      createdAt: new Date().toISOString()
    }
  };

  addPlant(newPlant);
  return ok(newPlant);
};

/**
 * PATCH /api/s0/plants/update
 */
export const updatePlantHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<Plant> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Plant ID is required");

  const updated = updatePlant(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Plant not found", 404);

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
    audit: {
      createdBy: "API_USER",
      createdAt: new Date().toISOString()
    }
  };

  addLine(newLine);
  return ok(newLine);
};

/**
 * PATCH /api/s0/lines/update
 */
export const updateLineHandler: ApiHandler = async (req) => {
  const body = parseBody<{ id: string; updates: Partial<Line> }>(req);
  if (!body.id) return err("BAD_REQUEST", "Line ID is required");

  const updated = updateLine(body.id, body.updates);
  if (!updated) return err("NOT_FOUND", "Line not found", 404);

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
    audit: {
      createdBy: "API_USER",
      createdAt: new Date().toISOString()
    }
  };

  addStation(newStation);
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
    audit: {
      createdBy: "API_USER",
      createdAt: new Date().toISOString()
    }
  };

  addDeviceClass(newDc);
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

  return ok(updated);
};

/**
 * GET /api/s0/capabilities/effective
 * Returns the effective value for all flags given a scope context.
 */
export const getEffectiveCapabilitiesHandler: ApiHandler = async (req) => {
  const scope = req.query?.["scope"] as CapabilityScope;
  const scopeId = req.query?.["scopeId"];

  if (!scope || !scopeId) return err("BAD_REQUEST", "Scope and scopeId are required");

  const flags = getCapabilityFlags();
  const overrides = getCapabilityOverrides();

  // Resolution Logic: Hierarchy search
  const resolve = (flagId: string): EffectiveFlag => {
    const flag = flags.find(f => f.id === flagId)!;
    
    // 1. Check exact scope
    const exact = overrides.find(o => o.flagId === flagId && o.scope === scope && o.scopeId === scopeId);
    if (exact) return { ...flag, effectiveValue: exact.value, sourceScope: scope, sourceId: scopeId, isOverridden: true };

    // 2. Fallback to Hierarchy
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

    // 3. Global Default
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

  const override: CapabilityOverride = {
    ...body,
    updatedAt: new Date().toISOString(),
    updatedBy: "API_USER"
  };

  upsertOverride(override);
  return ok(override);
};

/**
 * DELETE /api/s0/capabilities/override
 */
export const removeCapabilityOverrideHandler: ApiHandler = async (req) => {
  const { flagId, scope, scopeId } = parseBody<{ flagId: string; scope: string; scopeId: string }>(req);
  if (!flagId || !scope || !scopeId) return err("BAD_REQUEST", "Ids are required");

  removeOverride(flagId, scope, scopeId);
  return ok({ success: true });
};

/**
 * GET /api/s0/compliance/frameworks
 */
export const listRegulatoryFrameworksHandler: ApiHandler = async () => {
  return ok(getRegulatoryFrameworks());
};

/**
 * GET /api/s0/compliance/sop-profiles
 */
export const listSopProfilesHandler: ApiHandler = async () => {
  return ok(getSopProfiles());
};

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

  // Resolution Logic: Exact scope or fallback to parent
  let activeBinding = bindings.find(b => b.scope === scope && b.scopeId === scopeId);
  let isOverridden = !!activeBinding;

  if (!activeBinding && scope === 'PLANT') {
    const plant = getPlantById(scopeId);
    if (plant) {
      activeBinding = bindings.find(b => b.scope === 'ENTERPRISE' && b.scopeId === plant.enterpriseId);
    }
  }

  if (!activeBinding) {
    return ok({
      frameworks: [],
      sopProfiles: [],
      sourceScope: 'GLOBAL',
      sourceId: 'GLOBAL',
      isOverridden: false
    });
  }

  const resolvedFrameworks = frameworks.filter(f => activeBinding?.regulatoryFrameworkIds.includes(f.id));
  const resolvedSops = sops.filter(s => activeBinding?.sopProfileIds.includes(s.id));

  const result: EffectiveCompliance = {
    frameworks: resolvedFrameworks,
    sopProfiles: resolvedSops,
    sourceScope: activeBinding.scope,
    sourceId: activeBinding.scopeId,
    isOverridden
  };

  return ok(result);
};

/**
 * POST /api/s0/compliance/bind
 */
export const setComplianceBindingHandler: ApiHandler = async (req) => {
  const body = parseBody<ComplianceBinding>(req);
  if (!body.scope || !body.scopeId) return err("BAD_REQUEST", "scope and scopeId are required");

  upsertComplianceBinding(body);
  return ok(body);
};

/**
 * DELETE /api/s0/compliance/bind
 */
export const removeComplianceBindingHandler: ApiHandler = async (req) => {
  const { scope, scopeId } = parseBody<{ scope: string; scopeId: string }>(req);
  if (!scope || !scopeId) return err("BAD_REQUEST", "scope and scopeId are required");

  removeComplianceBinding(scope, scopeId);
  return ok({ success: true });
};
