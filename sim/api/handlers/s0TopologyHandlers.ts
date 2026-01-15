/**
 * S0 Topology API Handlers
 * Simulated backend logic for system hierarchy retrieval.
 * @version V3.5
 * @governance S0-ARCH-BP-05
 */

import type { ApiHandler, ApiResponse } from "../apiTypes";
import { 
  getEnterprises, 
  getPlants, 
  getLines, 
  getStations 
} from "../s0/systemTopology.store";

const ok = (data: any): ApiResponse => ({
  status: 200,
  body: { ok: true, data }
});

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
