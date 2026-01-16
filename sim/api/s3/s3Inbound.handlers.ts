
/**
 * S3 Inbound API Handlers
 * 
 * Synchronous API-like wrappers for the S3 simulation store.
 * These functions mimic backend controller logic.
 * 
 * @foundation V35-S3-PP-03
 */

import { S3Receipt } from '../../../stages/s3/contracts';
import { 
  getReceipts, 
  getActiveReceipt, 
  setActiveReceiptId, 
  upsertReceipt 
} from './s3Inbound.store';

export const s3ListReceipts = (): S3Receipt[] => {
  return getReceipts();
};

export const s3GetActiveReceipt = (): S3Receipt | undefined => {
  return getActiveReceipt();
};

export const s3SetActiveReceipt = (id: string): void => {
  setActiveReceiptId(id);
};

export const s3UpsertReceipt = (receipt: S3Receipt): S3Receipt => {
  return upsertReceipt(receipt);
};
