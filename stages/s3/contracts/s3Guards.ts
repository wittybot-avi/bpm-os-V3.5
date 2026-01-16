
import { S3Receipt, S3ReceiptLine, ReceiptState, ItemCategory, ItemTrackability } from './s3Types';
import { canTransitionReceipt } from './s3StateMachine';

// --- Helpers ---

export const isTrackableCategory = (category: ItemCategory): boolean => {
  return ['CELL', 'BMS', 'MODULE', 'PACK', 'IOT'].includes(category);
};

export const requiresEnterpriseSerial = (line: S3ReceiptLine): boolean => {
  // Only primary components need unique enterprise serialization at inbound.
  // Modules/Packs are typically assembled later (S5/S7), but if bought-out, they might need it.
  // For this rule, we restrict to base components.
  const isBaseComponent = ['CELL', 'BMS', 'IOT'].includes(line.category);
  return isBaseComponent && line.trackability === ItemTrackability.TRACKABLE;
};

export const canAdvanceReceiptState = (receipt: S3Receipt, nextState: ReceiptState): boolean => {
  return canTransitionReceipt(receipt.state, nextState);
};
