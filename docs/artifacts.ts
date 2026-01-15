/**
 * Documentation Artifacts Registry
 * 
 * This file serves as a lightweight index for the Documentation UI.
 * Content is loaded asynchronously via fetch() from static markdown files.
 * DO NOT import markdown files here using ?raw or aliases.
 */

export type DocArtifact = {
  id: string;
  title: string;
  tab: string;
  path: string;
};

export const DOC_ARTIFACTS: DocArtifact[] = [
  { 
    id: "context", 
    title: "System Context", 
    tab: "System Context", 
    path: "/docs/SYSTEM_CONTEXT.md" 
  },
  { 
    id: "s0-sot", 
    title: "S0 Master Data SoT", 
    tab: "S0 Master Data", 
    path: "/docs/v35/S0_MASTER_DATA_SOURCE_OF_TRUTH.md" 
  },
  { 
    id: "s1-sot", 
    title: "S1 Product Master SoT", 
    tab: "S1 Product Master", 
    path: "/docs/v35/S1_PRODUCT_MASTER_SOURCE_OF_TRUTH.md" 
  },
  { 
    id: "s1-master", 
    title: "S1 Product Master Contract", 
    tab: "S1 Contract", 
    path: "/docs/v35/S1_PRODUCT_MASTER_CONTRACT.md" 
  },
  { 
    id: "data-contract", 
    title: "Screen Data Contract", 
    tab: "Data Contract", 
    path: "/docs/handover/SCREEN_DATA_CONTRACT.md" 
  },
  { 
    id: "rbac-matrix", 
    title: "RBAC Action Matrix", 
    tab: "RBAC Matrix", 
    path: "/docs/handover/RBAC_ACTION_MATRIX.md" 
  },
  { 
    id: "route-map", 
    title: "Route & Navigation Map", 
    tab: "Route Map", 
    path: "/docs/handover/ROUTE_NAV_MAP.md" 
  },
  { 
    id: "design-freeze", 
    title: "Design Freeze Declaration", 
    tab: "Design Freeze", 
    path: "/docs/handover/DESIGN_FREEZE.md" 
  },
  { 
    id: "rulebook", 
    title: "Rulebook", 
    tab: "Rulebook", 
    path: "/docs/governance/RULEBOOK.md" 
  },
  { 
    id: "manifest", 
    title: "V3.3 Do-Not-Break Manifest", 
    tab: "V3.3 Manifest", 
    path: "/docs/V33_DO_NOT_BREAK_MANIFEST.md" 
  },
  { 
    id: "patchlog", 
    title: "Patchlog", 
    tab: "Patchlog", 
    path: "/docs/governance/PATCHLOG.md" 
  },
  { 
    id: "backend", 
    title: "Backend Contract", 
    tab: "Backend Contract", 
    path: "/docs/governance/BACKEND_CONTRACT.md" 
  }
];