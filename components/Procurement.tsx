
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { UserContext, UserRole, NavView } from '../types';
import { 
  ShieldAlert, 
  ShoppingCart, 
  PackageCheck, 
  Truck, 
  FileText, 
  CreditCard,
  Building2,
  AlertCircle,
  CheckCircle2,
  Database,
  Send,
  ThumbsUp,
  Archive,
  Plus,
  History,
  RotateCcw,
  ArrowRight,
  Radar,
  Lock,
  Calendar,
  FileEdit,
  X,
  PackagePlus,
  Trash2,
  List,
  AlertTriangle,
  ScanBarcode,
  Ban
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { DisabledHint } from './DisabledHint';
import { getMockS2Context, S2Context, ActiveOrderContext, ActiveOrderItem } from '../stages/s2/s2Contract';
import { getS2ActionState, S2ActionId } from '../stages/s2/s2Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { getMockS1Context, SkuMasterData } from '../stages/s1/s1Contract';

// Mock Data Types
interface Supplier {
  id: string;
  name: string;
  type: 'Cells' | 'BMS' | 'Mechanical' | 'Thermal';
  status: 'Approved' | 'Conditional' | 'Pending';
  region: string;
  rating: string;
}

interface CommercialTerm {
  id: string;
  skuRef: string;
  moq: string;
  leadTime: string;
  priceBand: string;
  contractStatus: 'Active' | 'Draft' | 'Expired';
}

const SUPPLIERS: Supplier[] = [
  { id: 'sup-001', name: 'CellGlobal Dynamics', type: 'Cells', status: 'Approved', region: 'APAC', rating: 'A+' },
  { id: 'sup-002', name: 'Orion BMS Systems', type: 'BMS', status: 'Approved', region: 'NA', rating: 'A' },
  { id: 'sup-003', name: 'ThermalWrap Inc', type: 'Thermal', status: 'Conditional', region: 'EU', rating: 'B' },
  { id: 'sup-004', name: 'Precision Casings', type: 'Mechanical', status: 'Pending', region: 'APAC', rating: '-' },
];

// Governance Map: S1 SKU Type -> Allowed Supplier Types
const SKU_TYPE_SUPPLIER_MAP: Record<string, string[]> = {
  'CELL': ['Cells'],
  'BMS': ['BMS'],
  'IOT': ['BMS'], // Electronics supplier handles IoT
  'PACK': ['Mechanical'], // Enclosures/Structure
  'MODULE': ['Cells', 'Mechanical'], // Could be either depending on sub-assembly
};

const TERMS: CommercialTerm[] = [
  { id: 'tm-001', skuRef: 'BP-LFP-48V-2.5K', moq: '5,000 Units', leadTime: '12 Weeks', priceBand: '$125 - $140 / kWh', contractStatus: 'Active' },
  { id: 'tm-002', skuRef: 'BP-LTO-24V-1K', moq: '1,000 Units', leadTime: '16 Weeks', priceBand: '$350 - $380 / kWh', contractStatus: 'Draft' },
];

interface ProcurementProps {
  onNavigate?: (view: NavView) => void;
}

export const Procurement: React.FC<ProcurementProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Local State for S2 Context Simulation
  const [s2Context, setS2Context] = useState<S2Context>(getMockS2Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Tabs State
  const [leftTab, setLeftTab] = useState<'S1' | 'MANUAL'>('S1');
  const [rightTab, setRightTab] = useState<'LINES' | 'TERMS'>('LINES');

  // S1 SKU Data State
  const [availableSkus, setAvailableSkus] = useState<SkuMasterData[]>([]);
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  
  // Form Drafts
  const [skuLineDraft, setSkuLineDraft] = useState<Partial<ActiveOrderItem>>({});
  const [manualLineDraft, setManualLineDraft] = useState<Partial<ActiveOrderItem>>({
    name: '',
    category: 'MRO',
    uom: 'Units',
    quantity: 0,
    deliveryDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // UI State - synced with context where possible
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(s2Context.activeOrder?.activeSupplierId || SUPPLIERS[0].id);

  // Load events on mount
  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S2'));
    
    // Fetch S1 Data (Simulated)
    const s1Data = getMockS1Context();
    const approved = s1Data.skus.filter(s => s.status === 'APPROVED');
    setAvailableSkus(approved);
  }, []);

  // Sync selection with context
  useEffect(() => {
    if (s2Context.activeOrder?.activeSupplierId) {
      setSelectedSupplierId(s2Context.activeOrder.activeSupplierId);
    }
  }, [s2Context.activeOrder?.activeSupplierId]);

  // Guard Logic
  const getAction = (actionId: S2ActionId) => getS2ActionState(role, s2Context, actionId);

  // Derive display values from detailed state
  const stateLabel = s2Context.procurementStatus.replace('S2_', '').replace(/_/g, ' ');
  let stateReason = 'Processing';
  let stateNext = 'Wait';

  switch (s2Context.procurementStatus) {
    case 'S2_DRAFT': stateReason = 'Drafting PO'; stateNext = 'Submit for Approval'; break;
    case 'S2_RFQ_ISSUED': stateReason = 'RFQ Sent to Vendor'; stateNext = 'Wait for Response'; break;
    case 'S2_VENDOR_RESPONSE_RECEIVED': stateReason = 'Vendor Replied'; stateNext = 'Evaluate Commercials'; break;
    case 'S2_COMMERCIAL_EVALUATION': stateReason = 'Evaluating Terms'; stateNext = 'Submit for Approval'; break;
    case 'S2_WAITING_APPROVAL': stateReason = 'Pending Mgmt Sign-off'; stateNext = 'Approve PO'; break;
    case 'S2_APPROVED': stateReason = 'Approved by Mgmt'; stateNext = 'Issue to Vendor'; break;
    case 'S2_PO_ISSUED': stateReason = 'PO Issued'; stateNext = 'Wait for Acknowledgement'; break;
    case 'S2_PO_ACKNOWLEDGED': stateReason = 'Vendor Acknowledged'; stateNext = 'Close Cycle'; break;
    case 'S2_LOCKED': stateReason = 'Cycle Closed'; stateNext = 'Proceed to S3'; break;
  }

  // Governance: Lock fields when PO is Issued/Locked
  const isLocked = ['S2_PO_ISSUED', 'S2_PO_ACKNOWLEDGED', 'S2_LOCKED'].includes(s2Context.procurementStatus);
  
  // S3 Eligibility Check
  const serializableItemsCount = s2Context.activeOrder?.selectedItems.filter(i => i.fulfillmentType === 'SERIALIZABLE').length || 0;
  const hasSerializableItems = serializableItemsCount > 0;

  // Validation Logic (PP-S2-09)
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!s2Context.activeOrder) return errors;

    const supplier = SUPPLIERS.find(s => s.id === selectedSupplierId);
    if (!supplier) return errors;

    // Rule 1: Supplier Status
    if (supplier.status === 'Pending') {
      errors.push(`Selected supplier '${supplier.name}' is Pending approval. PO cannot be issued.`);
    }

    // Rule 2: Item Category Compatibility
    s2Context.activeOrder.selectedItems.forEach(item => {
      if (item.itemType === 'SKU' && item.skuCode) {
        const skuDef = availableSkus.find(s => s.skuCode === item.skuCode);
        if (skuDef) {
           const allowedTypes = SKU_TYPE_SUPPLIER_MAP[skuDef.type] || [];
           if (allowedTypes.length > 0 && !allowedTypes.includes(supplier.type)) {
              errors.push(`Incompatible: Item '${item.name}' (${skuDef.type}) requires [${allowedTypes.join(', ')}] supplier. Selected: ${supplier.type}.`);
           }
        }
      }
    });

    return errors;
  }, [s2Context.activeOrder, selectedSupplierId, availableSkus]);

  const hasValidationErrors = validationErrors.length > 0;


  // --- Handlers ---

  const handleEditSku = (sku: SkuMasterData) => {
    if (isLocked) return;
    setEditingSkuId(sku.skuId);
    setSkuLineDraft({
        skuCode: sku.skuCode,
        name: sku.name,
        quantity: 100, // default
        uom: 'Units', // default for SKUs
        deliveryDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingSkuId(null);
    setSkuLineDraft({});
  };

  const handleAddSkuItem = () => {
    if (!skuLineDraft.skuCode || !skuLineDraft.quantity) return;
    
    addItemToOrder({
        itemId: `item-${Date.now()}`,
        itemType: 'SKU',
        fulfillmentType: 'SERIALIZABLE',
        skuCode: skuLineDraft.skuCode,
        name: skuLineDraft.name || skuLineDraft.skuCode,
        uom: skuLineDraft.uom || 'Units',
        quantity: skuLineDraft.quantity,
        deliveryDate: skuLineDraft.deliveryDate,
        notes: skuLineDraft.notes
    });
    handleCancelEdit();
  };

  const handleAddManualItem = () => {
    if (!manualLineDraft.name || !manualLineDraft.quantity) return;

    addItemToOrder({
        itemId: `man-${Date.now()}`,
        itemType: 'MANUAL',
        fulfillmentType: 'NON_SERIALIZABLE',
        name: manualLineDraft.name,
        category: manualLineDraft.category,
        uom: manualLineDraft.uom || 'Units',
        quantity: manualLineDraft.quantity,
        deliveryDate: manualLineDraft.deliveryDate,
        notes: manualLineDraft.notes
    });

    // Reset form
    setManualLineDraft({
        name: '',
        category: 'MRO',
        uom: 'Units',
        quantity: 0,
        deliveryDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
  };

  const addItemToOrder = (newItem: ActiveOrderItem) => {
    setS2Context(prev => {
        if (!prev.activeOrder) return prev;
        
        // For SKUs, check if exists and update. For Manual, always add new.
        let newItems = [...prev.activeOrder.selectedItems];
        if (newItem.itemType === 'SKU') {
            const existingIdx = newItems.findIndex(i => i.itemType === 'SKU' && i.skuCode === newItem.skuCode);
            if (existingIdx >= 0) {
                // Update existing
                newItems[existingIdx] = { ...newItems[existingIdx], ...newItem, itemId: newItems[existingIdx].itemId };
            } else {
                newItems.push(newItem);
            }
        } else {
            newItems.push(newItem);
        }

        return {
            ...prev,
            activeOrder: { ...prev.activeOrder, selectedItems: newItems }
        };
    });

    // Switch view to lines to show addition
    setRightTab('LINES');

    const evt = emitAuditEvent({
        stageId: 'S2',
        actionId: 'CREATE_PO', 
        actorRole: role,
        message: `Added line item: ${newItem.name} (${newItem.quantity} ${newItem.uom})`
    });
    setLocalEvents(prev => [evt, ...prev]);
  };

  const handleRemoveItem = (itemId: string) => {
    if (isLocked) return;
    setS2Context(prev => {
        if (!prev.activeOrder) return prev;
        return {
            ...prev,
            activeOrder: {
                ...prev.activeOrder,
                selectedItems: prev.activeOrder.selectedItems.filter(i => i.itemId !== itemId)
            }
        };
    });
  };

  // --- Core Action Handlers ---

  const handleCreatePo = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      const newOrder: ActiveOrderContext = {
        orderId: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        plantId: 'FAC-WB-01',
        activeSupplierId: selectedSupplierId,
        selectedItems: [],
        currentState: 'S2_DRAFT',
        createdBy: role,
        createdAt: now
      };

      setS2Context(prev => ({ 
        ...prev, 
        activePoCount: prev.activePoCount + 1,
        procurementStatus: 'S2_DRAFT', // Explicitly start at DRAFT
        lastPoCreatedAt: now,
        activeOrder: newOrder
      }));
      
      const evt = emitAuditEvent({
        stageId: 'S2',
        actionId: 'CREATE_PO',
        actorRole: role,
        message: `[Init -> S2_DRAFT] Created PO ${newOrder.orderId}`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 600);
  };

  const handleSubmitPo = () => {
    if (hasValidationErrors) return;
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ 
        ...prev, 
        procurementStatus: 'S2_WAITING_APPROVAL',
        pendingApprovalsCount: prev.pendingApprovalsCount + 1,
        activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_WAITING_APPROVAL' } : prev.activeOrder
      }));
      
      const evt = emitAuditEvent({
        stageId: 'S2',
        actionId: 'SUBMIT_PO_FOR_APPROVAL',
        actorRole: role,
        message: `[S2_DRAFT -> S2_WAITING_APPROVAL] Submitted PO ${s2Context.activeOrder?.orderId || ''} for commercial approval`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 800);
  };

  const handleApprovePo = () => {
    if (hasValidationErrors) return;
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ 
        ...prev, 
        procurementStatus: 'S2_APPROVED',
        pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
        activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_APPROVED' } : prev.activeOrder
      }));
      
      const evt = emitAuditEvent({
        stageId: 'S2',
        actionId: 'APPROVE_PO',
        actorRole: role,
        message: `[S2_WAITING_APPROVAL -> S2_APPROVED] PO ${s2Context.activeOrder?.orderId || ''} approved by Management`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  };

  const handleIssuePo = () => {
    if (hasValidationErrors) return;
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ 
        ...prev, 
        procurementStatus: 'S2_PO_ISSUED',
        activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_PO_ISSUED' } : prev.activeOrder
      }));
      
      const supplierName = SUPPLIERS.find(s => s.id === selectedSupplierId)?.name || 'Vendor';
      const evt = emitAuditEvent({
        stageId: 'S2',
        actionId: 'ISSUE_PO_TO_VENDOR',
        actorRole: role,
        message: `[S2_APPROVED -> S2_PO_ISSUED] Issued PO ${s2Context.activeOrder?.orderId || ''} to ${supplierName}`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  };

  const handleCloseCycle = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ 
        ...prev, 
        procurementStatus: 'S2_LOCKED', // Final state
        activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_LOCKED' } : prev.activeOrder
      }));
      
      const evt = emitAuditEvent({
        stageId: 'S2',
        actionId: 'CLOSE_PROCUREMENT_CYCLE',
        actorRole: role,
        message: '[S2_PO_ACKNOWLEDGED -> S2_LOCKED] Cycle closed. S3 Readiness Signal Emitted.'
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 800);
  };

  // Simulating the vendor interaction flow for demo richness
  useEffect(() => {
    if (s2Context.procurementStatus === 'S2_PO_ISSUED') {
      const timer = setTimeout(() => {
        setS2Context(prev => ({ 
            ...prev, 
            procurementStatus: 'S2_PO_ACKNOWLEDGED',
            activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_PO_ACKNOWLEDGED' } : prev.activeOrder
        }));
        
        // Log automatic event
        const evt = emitAuditEvent({
            stageId: 'S2',
            actionId: 'AUTO_VENDOR_ACK',
            actorRole: 'SYSTEM (VENDOR_PORTAL)',
            message: `[S2_PO_ISSUED -> S2_PO_ACKNOWLEDGED] Vendor acknowledged receipt of PO`
        });
        setLocalEvents(prev => [evt, ...prev]);

      }, 3000); // 3s delay to simulate acknowledgement
      return () => clearTimeout(timer);
    }
  }, [s2Context.procurementStatus]);


  // Navigation Handlers
  const handleNavToS3 = () => {
    if (onNavigate) {
      emitAuditEvent({
        stageId: 'S2',
        actionId: 'NAV_NEXT_STAGE',
        actorRole: role,
        message: 'Navigated to S3: Inbound Receipt from S2'
      });
      onNavigate('inbound_receipt');
    }
  };

  const handleNavToControlTower = () => {
    if (onNavigate) {
      onNavigate('control_tower');
    }
  };

  // Pre-calculate action states
  const createPoState = getAction('CREATE_PO');
  const submitPoState = getAction('SUBMIT_PO_FOR_APPROVAL');
  const approvePoState = getAction('APPROVE_PO');
  const issuePoState = getAction('ISSUE_PO_TO_VENDOR');
  const closeCycleState = getAction('CLOSE_PROCUREMENT_CYCLE');

  // Logic for Next Step
  const isReadyForNext = s2Context.procurementStatus === 'S2_PO_ACKNOWLEDGED' || s2Context.procurementStatus === 'S2_LOCKED';

  // RBAC Access Check
  const hasAccess = 
    role === UserRole.SYSTEM_ADMIN || 
    role === UserRole.PROCUREMENT || 
    role === UserRole.MANAGEMENT ||
    role === UserRole.OPERATOR; // Allow operator to view but not act

  if (!hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p>Your role ({role}) does not have permission to view Commercial Procurement.</p>
      </div>
    );
  }

  // Helper to check if SKU is in cart
  const getItemInOrder = (skuCode: string) => {
    return s2Context.activeOrder?.selectedItems.find(i => i.itemType === 'SKU' && i.skuCode === skuCode);
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-300 pb-12">
      {/* Standard Header */}
      <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              Procurement <span className="text-slate-300">/</span> Orders
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <ShoppingCart className="text-brand-600" size={24} />
             Commercial Procurement (S2)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Manage supplier qualifications, commercial terms, and procurement orders.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button 
              className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400 transition-colors"
              disabled={!createPoState.enabled || isSimulating}
              onClick={handleCreatePo}
              title={createPoState.reason}
            >
              <Plus size={16} />
              <span>Create PO</span>
            </button>
          </div>
          {!createPoState.enabled && (
             <DisabledHint reason={createPoState.reason || 'Blocked'} className="mt-1" />
          )}
          
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-1">
            <Database size={10} /> 
            <span>Active POs: {s2Context.activePoCount}</span>
            <span className="text-slate-300">|</span>
            <span>Pending: {s2Context.pendingApprovalsCount}</span>
            <span className="text-slate-300">|</span>
            <span className={`font-bold ${s2Context.procurementStatus === 'S2_APPROVED' ? 'text-green-600' : 'text-blue-600'}`}>
              {s2Context.procurementStatus.replace('S2_', '')}
            </span>
          </div>
        </div>
      </div>

      <StageStateBanner 
        stageId="S2" 
        labelOverride={stateLabel}
        reasonOverride={stateReason}
        nextActionOverride={stateNext}
      />
      
      <PreconditionsPanel stageId="S2" />

      {/* Lock-on-PO Governance Banner */}
      {isLocked && (
        <div className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-1 shadow-md border border-slate-700">
          <Lock size={16} className="text-red-400" />
          <span>COMMERCIAL SNAPSHOT LOCKED</span>
          <span className="font-normal opacity-75 text-xs ml-2 border-l border-slate-600 pl-2">
             PO Issued to Vendor • Modifications Restricted
          </span>
        </div>
      )}

      {/* Validation Errors Banner */}
      {hasValidationErrors && (
        <div className="bg-red-50 text-red-800 px-4 py-3 rounded-md text-sm border border-red-200 mb-4 animate-in slide-in-from-top-2">
           <div className="flex items-center gap-2 font-bold mb-1">
             <Ban size={16} className="text-red-600" />
             <span>Supplier Eligibility Conflict</span>
           </div>
           <ul className="list-disc pl-5 space-y-1">
             {validationErrors.map((err, i) => (
               <li key={i} className="text-xs">{err}</li>
             ))}
           </ul>
        </div>
      )}

      {/* Recent Local Activity Panel */}
      {localEvents.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-6 animate-in slide-in-from-top-2">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
              <History size={14} /> Recent S2 Activity (Session)
           </div>
           <div className="space-y-2">
              {localEvents.slice(0, 3).map(evt => (
                 <div key={evt.id} className="flex items-center gap-3 text-sm bg-white p-2 rounded border border-slate-100 shadow-sm">
                    <span className="font-mono text-[10px] text-slate-400">{evt.timestamp}</span>
                    <span className="font-bold text-slate-700 text-xs px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">{evt.actorRole}</span>
                    <span className="text-slate-600 flex-1 truncate">{evt.message}</span>
                    <CheckCircle2 size={14} className="text-green-500" />
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Next Step Guidance Panel */}
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-3 ${!onNavigate ? 'hidden' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full text-blue-600">
            <ArrowRight size={20} />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-sm">Next Recommended Action</h3>
            <p className="text-xs text-blue-700 mt-1 max-w-lg">
              {isReadyForNext 
                ? (hasSerializableItems 
                   ? "Procurement cycle complete. Proceed to Inbound Receipt (S3) to process incoming materials." 
                   : "Order complete. Non-serializable items can be received directly without S3 processing.")
                : "Procurement active. Complete approval and issuance cycle to unlock Inbound Logistics."}
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
           <button 
             onClick={handleNavToControlTower} 
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100 transition-colors"
           >
             <Radar size={14} /> Control Tower
           </button>
           <div className="flex-1 sm:flex-none flex flex-col items-center">
             <button 
               onClick={handleNavToS3} 
               disabled={!isReadyForNext || !hasSerializableItems}
               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
               title={!hasSerializableItems ? 'No items require S3 serialization' : ''}
             >
               <Truck size={14} /> Go to S3: Inbound
             </button>
             {!isReadyForNext && (
                <span className="text-[9px] text-red-500 mt-1 font-medium">Wait for PO Ack</span>
             )}
             {isReadyForNext && !hasSerializableItems && (
                 <span className="text-[9px] text-amber-600 mt-1 font-medium">Direct Receipt Only</span>
             )}
           </div>
        </div>
      </div>

      {/* Procurement Lifecycle Toolbar */}
      <div className={`bg-white p-4 rounded-lg shadow-sm border border-industrial-border flex flex-col md:flex-row items-center gap-4 justify-between transition-opacity ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100">
               <FileText size={20} />
            </div>
            <div>
               <h3 className="font-bold text-slate-800 text-sm">
                   Active Order Cycle {s2Context.activeOrder ? <span className="font-mono text-blue-600">({s2Context.activeOrder.orderId})</span> : ''}
               </h3>
               <p className="text-xs text-slate-500">Status: <span className="font-bold">{stateLabel}</span></p>
            </div>
         </div>

         <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Submit */}
            <div className="flex flex-col items-center">
              <button 
                disabled={!submitPoState.enabled || hasValidationErrors}
                onClick={handleSubmitPo}
                title={hasValidationErrors ? 'Validation Failed' : submitPoState.reason}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 text-xs font-bold transition-colors"
              >
                <Send size={14} /> Submit
              </button>
            </div>

            <div className="w-4 h-px bg-slate-300"></div>

            {/* Approve */}
            <div className="flex flex-col items-center">
              <button 
                disabled={!approvePoState.enabled || hasValidationErrors}
                onClick={handleApprovePo}
                title={hasValidationErrors ? 'Validation Failed' : approvePoState.reason}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold transition-colors"
              >
                <ThumbsUp size={14} /> Approve
              </button>
            </div>

            <div className="w-4 h-px bg-slate-300"></div>

            {/* Issue */}
            <div className="flex flex-col items-center">
              <button 
                disabled={!issuePoState.enabled || hasValidationErrors}
                onClick={handleIssuePo}
                title={hasValidationErrors ? 'Validation Failed' : issuePoState.reason}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-100 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold transition-colors"
              >
                <CreditCard size={14} /> Issue PO
              </button>
            </div>

            {/* Close Cycle - Always show, disable if not allowed */}
            <div className="w-4 h-px bg-slate-300"></div>
            <div className="flex flex-col items-center">
                <button 
                    disabled={!closeCycleState.enabled}
                    onClick={handleCloseCycle}
                    title={closeCycleState.reason}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold transition-colors"
                >
                    <RotateCcw size={14} /> Close
                </button>
            </div>
         </div>
      </div>

      {/* Main Grid */}
      <div className={`flex-1 grid grid-cols-12 gap-6 min-h-0 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* Left Col: Selection Lane */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-100 bg-slate-50">
             <button 
                onClick={() => setLeftTab('S1')}
                className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${leftTab === 'S1' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Approved SKUs (S1)
             </button>
             <button 
                onClick={() => setLeftTab('MANUAL')}
                className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${leftTab === 'MANUAL' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Manual Entry
             </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
            {/* S1 SKU List */}
            {leftTab === 'S1' && (
               <>
                {availableSkus.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                        No approved SKUs found in S1 Master Data.
                    </div>
                ) : availableSkus.map((sku) => {
                  const inOrder = getItemInOrder(sku.skuCode);
                  const isEditing = editingSkuId === sku.skuId;

                  if (isEditing) {
                      return (
                        <div key={sku.skuId} className="p-3 bg-brand-50 border border-brand-200 rounded-md shadow-sm space-y-3 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-brand-800 text-sm">{sku.skuCode}</span>
                                <button onClick={handleCancelEdit} className="text-brand-400 hover:text-brand-600"><X size={14}/></button>
                            </div>
                            
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Quantity</label>
                                    <input 
                                        type="number" 
                                        className="w-full text-xs p-1.5 rounded border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        value={skuLineDraft.quantity}
                                        onChange={(e) => setSkuLineDraft(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Req. Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full text-xs p-1.5 rounded border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        value={skuLineDraft.deliveryDate}
                                        onChange={(e) => setSkuLineDraft(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Notes</label>
                                    <textarea 
                                        rows={2}
                                        className="w-full text-xs p-1.5 rounded border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        value={skuLineDraft.notes || ''}
                                        onChange={(e) => setSkuLineDraft(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Special instructions..."
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleAddSkuItem}
                                disabled={!skuLineDraft.quantity}
                                className="w-full py-1.5 bg-brand-600 text-white text-xs font-bold rounded shadow-sm hover:bg-brand-700 disabled:opacity-50"
                            >
                                {inOrder ? 'Update Order' : 'Add to Order'}
                            </button>
                        </div>
                      );
                  }

                  return (
                    <div 
                        key={sku.skuId} 
                        onClick={() => handleEditSku(sku)}
                        className={`p-3 bg-white border rounded-md shadow-sm transition-all cursor-pointer hover:border-brand-300 hover:shadow-md ${inOrder ? 'border-l-4 border-l-green-500' : 'border-slate-100'} ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-800 text-sm">{sku.skuCode}</span>
                            {inOrder && <CheckCircle2 size={14} className="text-green-500" />}
                        </div>
                        <div className="text-xs text-slate-500 mb-1">{sku.name}</div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{sku.type}</span>
                            <span>Rev: {sku.revision.id}</span>
                        </div>
                        {inOrder && (
                            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-green-700 flex justify-between">
                                <span>In Basket</span>
                                <span>Qty: {inOrder.quantity}</span>
                            </div>
                        )}
                    </div>
                  );
                })}
               </>
            )}

            {/* Manual Entry Form */}
            {leftTab === 'MANUAL' && (
                <div className="p-2 space-y-4 animate-in fade-in slide-in-from-right-2">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex gap-2">
                        <PackagePlus size={16} className="shrink-0" />
                        <p>Items added here are <strong>Non-Trackable</strong> and bypass standard S1 validation.</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Item Name / Description</label>
                            <input 
                                type="text" 
                                className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                placeholder="e.g. MRO - Thermal Paste"
                                value={manualLineDraft.name}
                                onChange={(e) => setManualLineDraft(prev => ({ ...prev, name: e.target.value }))}
                                disabled={isLocked}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Category</label>
                                <select 
                                    className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                                    value={manualLineDraft.category}
                                    onChange={(e) => setManualLineDraft(prev => ({ ...prev, category: e.target.value as any }))}
                                    disabled={isLocked}
                                >
                                    <option value="MRO">MRO</option>
                                    <option value="Consumable">Consumable</option>
                                    <option value="Packaging">Packaging</option>
                                    <option value="Chemical">Chemical</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">UoM</label>
                                <input 
                                    type="text" 
                                    className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    value={manualLineDraft.uom}
                                    onChange={(e) => setManualLineDraft(prev => ({ ...prev, uom: e.target.value }))}
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    value={manualLineDraft.quantity}
                                    onChange={(e) => setManualLineDraft(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                    disabled={isLocked}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Req. Date</label>
                                <input 
                                    type="date" 
                                    className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    value={manualLineDraft.deliveryDate}
                                    onChange={(e) => setManualLineDraft(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Notes</label>
                            <textarea 
                                rows={2}
                                className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                placeholder="Details..."
                                value={manualLineDraft.notes}
                                onChange={(e) => setManualLineDraft(prev => ({ ...prev, notes: e.target.value }))}
                                disabled={isLocked}
                            />
                        </div>

                        <button 
                            onClick={handleAddManualItem}
                            disabled={!manualLineDraft.name || !manualLineDraft.quantity || isLocked}
                            className="w-full py-2 bg-brand-600 text-white text-xs font-bold rounded shadow-sm hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Add Manual Item
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Middle Col: Supplier Master */}
        <div className="col-span-5 bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50">
             <h3 className="font-semibold text-slate-700 flex items-center gap-2">
               <Truck size={16} />
               Supplier Master
             </h3>
             <span className="text-xs text-slate-400">Qualified Vendors ({s2Context.vendorCatalogCount})</span>
          </div>
          <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Supplier Name</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SUPPLIERS.map((sup) => (
                  <tr 
                    key={sup.id} 
                    onClick={() => {
                        if (isLocked) return;
                        setSelectedSupplierId(sup.id);
                        // If there's an active order draft, update it.
                        if (s2Context.activeOrder && s2Context.procurementStatus === 'S2_DRAFT') {
                             setS2Context(prev => ({
                                 ...prev,
                                 activeOrder: prev.activeOrder ? { ...prev.activeOrder, activeSupplierId: sup.id } : prev.activeOrder
                             }));
                        }
                    }}
                    className={`
                        transition-colors 
                        ${selectedSupplierId === sup.id ? 'bg-brand-50' : ''}
                        ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-slate-50'}
                    `}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{sup.name}</td>
                    <td className="px-4 py-3 text-slate-600">{sup.type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        sup.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        sup.status === 'Conditional' ? 'bg-amber-100 text-amber-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {sup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{sup.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Summary & Terms */}
        <div className="col-span-4 bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-100 bg-slate-50">
             <button 
                onClick={() => setRightTab('LINES')}
                className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${rightTab === 'LINES' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Order Lines ({s2Context.activeOrder?.selectedItems.length || 0})
             </button>
             <button 
                onClick={() => setRightTab('TERMS')}
                className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${rightTab === 'TERMS' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Commercial Terms
             </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4 custom-scrollbar">
             {rightTab === 'LINES' && (
                <div className="flex flex-col h-full">
                  <div className="space-y-3 flex-1">
                      {(!s2Context.activeOrder || s2Context.activeOrder.selectedItems.length === 0) ? (
                          <div className="text-center py-8 text-slate-400 text-xs italic">
                              No items added to the order yet.
                          </div>
                      ) : (
                          s2Context.activeOrder.selectedItems.map((item) => (
                              <div key={item.itemId} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col gap-2">
                                  <div className="flex justify-between items-start">
                                      <div className="flex flex-col">
                                          <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                                  item.fulfillmentType === 'SERIALIZABLE'
                                                  ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                                              }`}>
                                                  {item.fulfillmentType === 'SERIALIZABLE' ? 'TRACKABLE (S3)' : 'DIRECT CONSUMPTION'}
                                              </span>
                                              {item.skuCode && <span className="text-[10px] font-mono text-slate-400">{item.skuCode}</span>}
                                          </div>
                                      </div>
                                      {!isLocked && (
                                          <button 
                                              onClick={() => handleRemoveItem(item.itemId)} 
                                              className="text-slate-400 hover:text-red-500 transition-colors"
                                              title="Remove Item"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      )}
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                                      <div className="font-mono">
                                          <span className="text-slate-500">Qty:</span> <span className="font-bold">{item.quantity} {item.uom}</span>
                                      </div>
                                      <div className="text-slate-500 flex items-center gap-1">
                                          <Calendar size={10} /> {item.deliveryDate}
                                      </div>
                                  </div>
                                  {item.notes && <div className="text-[10px] text-slate-500 italic bg-white p-1 rounded border border-slate-100">{item.notes}</div>}
                              </div>
                          ))
                      )}
                  </div>
                  
                  {s2Context.activeOrder && s2Context.activeOrder.selectedItems.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-slate-200 text-xs flex justify-between items-center bg-slate-50 p-2 rounded">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">S3 Eligibility</span>
                        <div className="flex items-center gap-2">
                           <ScanBarcode size={14} className="text-blue-600"/>
                           <span className="font-bold text-slate-700">{serializableItemsCount} Items Serializable</span>
                        </div>
                     </div>
                  )}
                </div>
             )}

             {rightTab === 'TERMS' && (
                <>
                    {TERMS.map((term) => (
                    <div key={term.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-mono font-bold text-slate-500">{term.skuRef}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                            term.contractStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                            term.contractStatus === 'Draft' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                            'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {term.contractStatus}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                            <div className="text-[10px] text-slate-400 uppercase">MOQ</div>
                            <div className="font-medium text-slate-800">{term.moq}</div>
                            </div>
                            <div>
                            <div className="text-[10px] text-slate-400 uppercase">Lead Time</div>
                            <div className="font-medium text-slate-800">{term.leadTime}</div>
                            </div>
                            <div className="col-span-2">
                            <div className="text-[10px] text-slate-400 uppercase">Indicative Price Band</div>
                            <div className="font-medium text-slate-800 bg-white border border-slate-200 p-2 rounded text-center">
                                {term.priceBand}
                            </div>
                            </div>
                        </div>
                    </div>
                    ))}
                    
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>Commercial terms displayed are for demonstration purposes. Actual pricing is retrieved securely from the ERP backend (mocked).</p>
                    </div>
                </>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
