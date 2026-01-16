
/**
 * S3 Inbound Simulation Store
 * 
 * Manages the state of Inbound Receipts and Serialized Units.
 * Persists to localStorage to survive page reloads during simulation.
 * 
 * @foundation V35-S3-PP-03
 */

import { S3Receipt } from '../../../stages/s3/contracts';
import { makeDemoReceipt } from '../../../stages/s3/contracts';

const STORAGE_KEY = 'bpmos.s3.inbound.v1';

interface S3StoreState {
  receipts: S3Receipt[];
  activeReceiptId?: string;
}

let STATE: S3StoreState | null = null;

/**
 * Persists current state to localStorage
 */
function saveToDisk() {
  if (!STATE) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.error("[S3-STORE] Persistence failed:", e);
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
      console.info("[S3-STORE] Rehydrated from disk.");
      return;
    }
  } catch (e) {
    console.warn("[S3-STORE] Rehydration failed, falling back to seed.");
  }

  // Seed Data
  const demoReceipt = makeDemoReceipt();
  STATE = {
    receipts: [demoReceipt],
    activeReceiptId: demoReceipt.id
  };

  saveToDisk();
}

function ensureState(): S3StoreState {
  if (!STATE) rehydrate();
  return STATE!;
}

// --- Accessors ---

export const getReceipts = (): S3Receipt[] => {
  return ensureState().receipts;
};

export const getActiveReceiptId = (): string | undefined => {
  return ensureState().activeReceiptId;
};

export const getReceiptById = (id: string): S3Receipt | undefined => {
  return ensureState().receipts.find(r => r.id === id);
};

export const getActiveReceipt = (): S3Receipt | undefined => {
  const state = ensureState();
  if (!state.activeReceiptId) return undefined;
  return state.receipts.find(r => r.id === state.activeReceiptId);
};

// --- Mutators ---

export const setActiveReceiptId = (id: string | undefined) => {
  const state = ensureState();
  state.activeReceiptId = id;
  saveToDisk();
};

export const upsertReceipt = (receipt: S3Receipt) => {
  const state = ensureState();
  const index = state.receipts.findIndex(r => r.id === receipt.id);
  
  if (index >= 0) {
    state.receipts[index] = receipt;
  } else {
    state.receipts.push(receipt);
  }
  
  // If no active receipt is set, set this one
  if (!state.activeReceiptId) {
    state.activeReceiptId = receipt.id;
  }
  
  saveToDisk();
  return receipt;
};

export const resetS3Store = () => {
  localStorage.removeItem(STORAGE_KEY);
  STATE = null;
  rehydrate();
};
