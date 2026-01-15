/**
 * Capability & Scope Taxonomy (S0)
 * Defines the functional flags and authorization scopes for the OS framework.
 * @version V3.5
 * @governance S0-ARCH-BP-02
 */

/**
 * Hierarchical scope where a capability can be enforced or toggled.
 */
export type CapabilityScope = 'ENTERPRISE' | 'PLANT' | 'LINE' | 'STATION';

/**
 * Functional categories for grouping system capabilities.
 * Aligns with S0 Master Data tiles.
 */
export type CapabilityCategory = 
  | 'MANUFACTURING'  // e.g. Interlock Gating
  | 'QUALITY'        // e.g. AQL Sampling
  | 'TRACEABILITY'   // e.g. Serialization, IoT Binding
  | 'REGULATORY'     // e.g. Digital Passport, Battery Aadhaar
  | 'DEVICE'         // e.g. Protocol Support
  | 'DATA';          // e.g. Retention Policy

/**
 * CapabilityFlag: A specific functional feature toggle within the system.
 * Used to drive conditional logic in MES operational stages.
 */
export interface CapabilityFlag {
  readonly key: string;              // unique machine name (e.g. "STRICT_GATING")
  readonly description: string;      // Human-readable purpose
  readonly scope: CapabilityScope;   // Hierarchy level of enforcement
  readonly category: CapabilityCategory; 
  readonly defaultState: boolean;    // Initial value for new nodes
  readonly requiresApproval: boolean; // If changes require dual-signoff
}
