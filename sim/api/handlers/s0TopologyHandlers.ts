/**
 * S0 Topology API Handlers
 * Simulated backend logic for system hierarchy retrieval and management.
 * @version V3.5
 * @governance S0-ARCH-BP-05
 * @updated V35-S0-CRUD-PP-11 (Plant Mutations)
 * @updated V35-S0-CRUD-PP-13 (Line Mutations)
 */

import type { ApiHandler, ApiResponse, ApiRequest } from "../apiTypes";
import { 
  getEnterprises, 
  getPlants, 
  getLines, 
  getStations,
  addPlant,
  updatePlant,
  addLine,
  updateLine
} from "../s0/systemTopology.store";
import type { Plant, Line } from "../../../domain/s0/systemTopology.types";

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
