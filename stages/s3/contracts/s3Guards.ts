
import { S3Receipt, S3ReceiptLine, ReceiptState, ItemCategory, ItemTrackability } from './s3Types';

// --- Helpers ---

export const isTrackableCategory = (category: ItemCategory): boolean => {
  return ['CELL', 'BMS', 'MODULE', 'PACK', 'IOT'].includes(category);
};

export const requiresEnterpriseSerial = (line: S3ReceiptLine): boolean => {
  return line.trackability === ItemTrackability.TRACKABLE;
};

export const canAdvanceReceiptState = (receipt: S3Receipt, nextState: ReceiptState): boolean => {
  const current = receipt.state;
  
  // Basic linear progression check for now
  // Real logic will check line items status (e.g. all received, all QC'd)
  
  if (current === ReceiptState.DRAFT && nextState === ReceiptState.RECEIVING) return true;
  if (current === ReceiptState.RECEIVING && nextState === ReceiptState.SERIALIZATION_IN_PROGRESS) return true;
  if (current === ReceiptState.SERIALIZATION_IN_PROGRESS && nextState === ReceiptState.QC_PENDING) return true;
  if (current === ReceiptState.QC_PENDING && (nextState === ReceiptState.ACCEPTED || nextState === ReceiptState.PARTIAL_ACCEPTED || nextState === ReceiptState.REJECTED)) return true;
  if ((current === ReceiptState.ACCEPTED || current === ReceiptState.PARTIAL_ACCEPTED) && nextState === ReceiptState.PUTAWAY_IN_PROGRESS) return true;
  if (current === ReceiptState.PUTAWAY_IN_PROGRESS && nextState === ReceiptState.PUTAWAY_COMPLETE) return true;
  if (nextState === ReceiptState.CLOSED) return true;

  return false;
};
