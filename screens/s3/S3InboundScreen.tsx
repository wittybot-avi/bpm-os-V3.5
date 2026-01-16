
/**
 * S3 Inbound Receipt Screen
 * Updated for Phase 3: Uses new InboundReceipt shell directly.
 * Legacy FLOW-003 wizard hooks have been removed for Greenfield architecture.
 * @foundation V35-S3-PP-05
 */

import React from 'react';
import { InboundReceipt } from '../../components/InboundReceipt';
import { NavView } from '../../types';

interface S3InboundScreenProps {
  onNavigate?: (view: NavView) => void;
}

export const S3InboundScreen: React.FC<S3InboundScreenProps> = (props) => {
  return (
    <div className="h-full w-full">
        <InboundReceipt {...props} />
    </div>
  );
};
