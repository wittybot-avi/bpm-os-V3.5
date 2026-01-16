
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
  Ban,
  Eye,
  FileBadge,
  TrendingUp,
  Globe,
  Phone,
  Mail,
  Award,
  Server,
  UserCog,
  User,
  Paperclip,
  Save,
  Edit,
  Download,
  GitBranch,
  Camera,
  Maximize2,
  Minimize2,
  TrendingDown,
  Minus,
  CheckSquare
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { DisabledHint } from './DisabledHint';
import { getMockS2Context } from '../stages/s2/s2Contract';
import { S2Context, ActiveOrderContext, ActiveOrderItem, Supplier, CommercialTerm, S2ActionId, S2Gate } from '../stages/s2/contracts/s2Types';
import { getS2ActionState } from '../stages/s2/s2Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { getMockS1Context, SkuMasterData } from '../stages/s1/s1Contract';

const SUPPLIERS: Supplier[] = [
  { 
    id: 'sup-001', 
    name: 'CellGlobal Dynamics', 
    type: 'Cells', 
    status: 'Approved', 
    region: 'APAC', 
    rating: 'A+',
    riskLevel: 'Low',
    certificates: ['ISO 9001:2015', 'IATF 16949', 'ISO 14001'],
    contactPerson: 'Wei Zhang',
    lastAudit: '2025-11-15',
    performanceScore: 98,
    source: 'ERP_MANAGED'
  },
  { 
    id: 'sup-002', 
    name: 'Orion BMS Systems', 
    type: 'BMS', 
    status: 'Approved', 
    region: 'NA', 
    rating: 'A',
    riskLevel: 'Low',
    certificates: ['ISO 9001', 'ISO 27001 (Cybersec)'],
    contactPerson: 'Sarah Connor',
    lastAudit: '2025-10-01',
    performanceScore: 95,
    source: 'ERP_MANAGED'
  },
  { 
    id: 'sup-003', 
    name: 'ThermalWrap Inc', 
    type: 'Thermal', 
    status: 'Conditional', 
    region: 'EU', 
    rating: 'B',
    riskLevel: 'Medium',
    certificates: ['ISO 9001'],
    contactPerson: 'Jean Reno',
    lastAudit: '2025-08-20',
    performanceScore: 82,
    source: 'MANUAL'
  },
  { 
    id: 'sup-004', 
    name: 'Precision Casings', 
    type: 'Mechanical', 
    status: 'Pending', 
    region: 'APAC', 
    rating: '-',
    riskLevel: 'High',
    certificates: ['Pending Review'],
    contactPerson: 'Lee Min',
    lastAudit: 'Pending',
    performanceScore: 0,
    source: 'MANUAL'
  },
  { 
    id: 'sup-005', 
    name: 'Volt-X Recycled', 
    type: 'Cells', 
    status: 'Rejected', 
    region: 'EU', 
    rating: 'F',
    riskLevel: 'High',
    certificates: [],
    contactPerson: 'Unknown',
    lastAudit: '2024-01-01',
    performanceScore: 20,
    source: 'MANUAL'
  },
];

const SKU_TYPE_SUPPLIER_MAP: Record<string, string[]> = {
  'CELL': ['Cells'],
  'BMS': ['BMS'],
  'IOT': ['BMS'], 
  'PACK': ['Mechanical'], 
  'MODULE': ['Cells', 'Mechanical'],
};

const INITIAL_TERMS: CommercialTerm[] = [
  { 
    id: 'tm-001-v1', 
    masterId: 'tm-001',
    version: 1,
    skuRef: 'BP-LFP-48V-2.5K', 
    supplierId: 'sup-001',
    moq: '5,000 Units', 
    leadTime: '12 Weeks', 
    priceBand: '$125 - $140 / kWh', 
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    contractStatus: 'Active',
    attachments: ['MSA_2026_Signed.pdf']
  },
  { 
    id: 'tm-002-v1', 
    masterId: 'tm-002',
    version: 1,
    skuRef: 'BP-LTO-24V-1K', 
    supplierId: 'sup-003',
    moq: '1,000 Units', 
    leadTime: '16 Weeks', 
    priceBand: '$350 - $380 / kWh', 
    validFrom: '2026-02-01',
    validTo: '2026-06-30',
    contractStatus: 'Draft',
    attachments: []
  },
];

const INITIAL_GATES: S2Gate[] = [
  { id: 'gate-01', label: 'Vendor Qualification', description: 'Supplier must be in Approved or Conditional status.', status: 'MET', requiredFor: ['SUBMIT_PO_FOR_APPROVAL', 'ISSUE_PO_TO_VENDOR'], evidenceRefs: ['SUP-CERT-001'], lastUpdated: '2026-01-10' },
  { id: 'gate-02', label: 'Budget Allocation', description: 'Finance must confirm Q1 CapEx availability for this PO value.', status: 'PENDING', requiredFor: ['ISSUE_PO_TO_VENDOR'], evidenceRefs: [], lastUpdated: '2026-01-16' },
  { id: 'gate-03', label: 'ERP Sync', description: 'Vendor record must exist in SAP/Oracle.', status: 'MET', requiredFor: ['CLOSE_PROCUREMENT_CYCLE'], evidenceRefs: ['ERP-LINK-OK'], lastUpdated: '2026-01-15' },
  { id: 'gate-04', label: 'Legal Review', description: 'MSA or standard terms must be attached.', status: 'PENDING', requiredFor: ['APPROVE_PO'], evidenceRefs: [], lastUpdated: '2026-01-16' }
];

interface ProcurementProps {
  onNavigate?: (view: NavView) => void;
}

export const Procurement: React.FC<ProcurementProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Local State
  const [s2Context, setS2Context] = useState<S2Context>(getMockS2Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Tabs State
  const [leftTab, setLeftTab] = useState<'S1' | 'MANUAL'>('S1');
  const [rightTab, setRightTab] = useState<'LINES' | 'TERMS'>('LINES');
  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  // S1 SKU Data State
  const [availableSkus, setAvailableSkus] = useState<SkuMasterData[]>([]);
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  
  // Commercial Terms State
  const [commercialTerms, setCommercialTerms] = useState<CommercialTerm[]>(INITIAL_TERMS);
  const [editingTerm, setEditingTerm] = useState<Partial<CommercialTerm> | null>(null);
  const [viewingHistoryMasterId, setViewingHistoryMasterId] = useState<string | null>(null);

  // Drill-down State
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [activeGateId, setActiveGateId] = useState<string | null>(null); // For Gate Drawer
  
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

  // Gates State
  const [s2Gates, setS2Gates] = useState<S2Gate[]>(INITIAL_GATES);

  // UI State - synced with context where possible
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(s2Context.activeOrder?.activeSupplierId || SUPPLIERS[0].id);

  // Load events on mount
  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S2'));
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

  // Derived state for display
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

  const isLocked = ['S2_PO_ISSUED', 'S2_PO_ACKNOWLEDGED', 'S2_LOCKED'].includes(s2Context.procurementStatus);
  const serializableItemsCount = s2Context.activeOrder?.selectedItems.filter(i => i.fulfillmentType === 'SERIALIZABLE').length || 0;
  const hasSerializableItems = serializableItemsCount > 0;

  // Validation Logic (PP-S2-09 & PP-S2-12)
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!s2Context.activeOrder) return errors;

    const supplier = SUPPLIERS.find(s => s.id === selectedSupplierId);
    if (!supplier) return errors;

    if (supplier.status === 'Pending' || supplier.status === 'Rejected') {
      errors.push(`Selected supplier '${supplier.name}' is ${supplier.status}. PO cannot be issued.`);
    }

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
  const validationErrorText = hasValidationErrors ? validationErrors[0] : null;

  // Gate Checking Logic
  const checkGates = (action: S2ActionId): { allowed: boolean, missing: string[] } => {
    const requiredGates = s2Gates.filter(g => g.requiredFor.includes(action));
    const missing = requiredGates.filter(g => g.status !== 'MET').map(g => g.label);
    return { allowed: missing.length === 0, missing };
  };

  // --- Handlers ---
  // (Keeping existing CRUD handlers)
  
  const handleEditSku = (sku: SkuMasterData) => {
    if (isLocked) return;
    setEditingSkuId(sku.skuId);
    setSkuLineDraft({ skuCode: sku.skuCode, name: sku.name, quantity: 100, uom: 'Units', deliveryDate: new Date().toISOString().split('T')[0], notes: '' });
  };

  const handleCancelEdit = () => { setEditingSkuId(null); setSkuLineDraft({}); };

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
    setManualLineDraft({ name: '', category: 'MRO', uom: 'Units', quantity: 0, deliveryDate: new Date().toISOString().split('T')[0], notes: '' });
  };

  const addItemToOrder = (newItem: ActiveOrderItem) => {
    setS2Context(prev => {
        if (!prev.activeOrder) return prev;
        let newItems = [...prev.activeOrder.selectedItems];
        if (newItem.itemType === 'SKU') {
            const existingIdx = newItems.findIndex(i => i.itemType === 'SKU' && i.skuCode === newItem.skuCode);
            if (existingIdx >= 0) {
                newItems[existingIdx] = { ...newItems[existingIdx], ...newItem, itemId: newItems[existingIdx].itemId };
            } else { newItems.push(newItem); }
        } else { newItems.push(newItem); }
        return { ...prev, activeOrder: { ...prev.activeOrder, selectedItems: newItems } };
    });
    setRightTab('LINES');
    const evt = emitAuditEvent({ stageId: 'S2', actionId: 'CREATE_PO', actorRole: role, message: `Added line item: ${newItem.name} (${newItem.quantity} ${newItem.uom})` });
    setLocalEvents(prev => [evt, ...prev]);
  };

  const handleRemoveItem = (itemId: string) => {
    if (isLocked) return;
    setS2Context(prev => {
        if (!prev.activeOrder) return prev;
        return { ...prev, activeOrder: { ...prev.activeOrder, selectedItems: prev.activeOrder.selectedItems.filter(i => i.itemId !== itemId) } };
    });
  };

  const handleInspectSupplier = (e: React.MouseEvent, supplier: Supplier) => { e.stopPropagation(); setViewingSupplier(supplier); };

  // Terms CRUD
  const handleCreateTerm = () => {
    const newMasterId = `tm-${Date.now()}`;
    setEditingTerm({ id: `${newMasterId}-v1`, masterId: newMasterId, version: 1, skuRef: availableSkus[0]?.skuCode || '', supplierId: SUPPLIERS[0].id, moq: '1000 Units', leadTime: '4 Weeks', priceBand: '$100 - $110 / Unit', validFrom: new Date().toISOString().split('T')[0], validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], contractStatus: 'Draft', attachments: [] });
  };

  const handleEditTerm = (term: CommercialTerm) => {
    if (term.contractStatus === 'Active') {
      setEditingTerm({ ...term, id: `${term.masterId}-v${term.version + 1}`, version: term.version + 1, contractStatus: 'Draft' });
    } else { setEditingTerm({ ...term }); }
  };

  const handleDeleteTerm = (id: string) => { setCommercialTerms(prev => prev.filter(t => t.id !== id)); };

  const handleSaveTerm = () => {
    if (!editingTerm) return;
    setCommercialTerms(prev => {
      const idx = prev.findIndex(t => t.id === editingTerm.id);
      if (idx >= 0) { const updated = [...prev]; updated[idx] = editingTerm as CommercialTerm; return updated; }
      return [...prev, editingTerm as CommercialTerm];
    });
    setEditingTerm(null);
  };

  const handleAddAttachment = () => {
    const name = window.prompt("Simulate File Upload\nEnter attachment name (e.g. Contract.pdf):");
    if (name && editingTerm) { setEditingTerm(prev => ({ ...prev, attachments: [...(prev?.attachments || []), name] })); }
  };

  const handleRemoveAttachment = (name: string) => {
    if (!editingTerm) return;
    setEditingTerm(prev => ({ ...prev, attachments: prev?.attachments?.filter(f => f !== name) }));
  };
  
  const visibleTerms = useMemo(() => {
    if (isLocked && s2Context.activeOrder?.termSnapshots) { return s2Context.activeOrder.termSnapshots; }
    const map = new Map<string, CommercialTerm>();
    commercialTerms.forEach(term => {
      const existing = map.get(term.masterId);
      if (!existing || term.version > existing.version) { map.set(term.masterId, term); }
    });
    return Array.from(map.values());
  }, [commercialTerms, isLocked, s2Context.activeOrder]);

  // Variance Calculation
  const getVarianceInfo = (term: CommercialTerm) => {
    if (term.version <= 1) return { priceDiff: 0, leadDiff: 0, hasBaseline: false };
    const previous = commercialTerms.find(t => t.masterId === term.masterId && t.version === term.version - 1);
    if (!previous) return { priceDiff: 0, leadDiff: 0, hasBaseline: false };

    const parsePrice = (s: string) => {
        const matches = s.match(/(\d+)/g);
        if (!matches) return 0;
        const sum = matches.reduce((a, b) => a + parseInt(b), 0);
        return sum / matches.length;
    };
    const parseLead = (s: string) => parseInt(s.replace(/\D/g, '')) || 0;

    const currPrice = parsePrice(term.priceBand);
    const prevPrice = parsePrice(previous.priceBand);
    const priceDiff = prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : 0;

    const currLead = parseLead(term.leadTime);
    const prevLead = parseLead(previous.leadTime);
    const leadDiff = currLead - prevLead;

    return { priceDiff, leadDiff, hasBaseline: true };
  };

  // Core Actions
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
        createdAt: now,
        termSnapshots: []
      };
      setS2Context(prev => ({ ...prev, activePoCount: prev.activePoCount + 1, procurementStatus: 'S2_DRAFT', lastPoCreatedAt: now, activeOrder: newOrder }));
      const evt = emitAuditEvent({ stageId: 'S2', actionId: 'CREATE_PO', actorRole: role, message: `[Init -> S2_DRAFT] Created PO ${newOrder.orderId}` });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 600);
  };

  const wrapAction = (fn: () => void, actionId: S2ActionId) => {
      if (hasValidationErrors) return;
      const gates = checkGates(actionId);
      if (!gates.allowed) return;
      fn();
  };

  const handleSubmitPo = () => wrapAction(() => {
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ ...prev, procurementStatus: 'S2_WAITING_APPROVAL', pendingApprovalsCount: prev.pendingApprovalsCount + 1, activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_WAITING_APPROVAL' } : prev.activeOrder }));
      const evt = emitAuditEvent({ stageId: 'S2', actionId: 'SUBMIT_PO_FOR_APPROVAL', actorRole: role, message: `[S2_DRAFT -> S2_WAITING_APPROVAL] Submitted PO ${s2Context.activeOrder?.orderId || ''} for commercial approval` });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 800);
  }, 'SUBMIT_PO_FOR_APPROVAL');

  const handleApprovePo = () => wrapAction(() => {
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ ...prev, procurementStatus: 'S2_APPROVED', pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1), activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_APPROVED' } : prev.activeOrder }));
      const evt = emitAuditEvent({ stageId: 'S2', actionId: 'APPROVE_PO', actorRole: role, message: `[S2_WAITING_APPROVAL -> S2_APPROVED] PO ${s2Context.activeOrder?.orderId || ''} approved by Management` });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  }, 'APPROVE_PO');

  const handleIssuePo = () => wrapAction(() => {
    setIsSimulating(true);
    const currentSupplierId = s2Context.activeOrder?.activeSupplierId;
    const orderSkus = s2Context.activeOrder?.selectedItems.map(i => i.skuCode).filter(Boolean) as string[] || [];
    const snapshots = commercialTerms.filter(term => term.supplierId === currentSupplierId && orderSkus.includes(term.skuRef) && term.contractStatus === 'Active');
    setTimeout(() => {
      setS2Context(prev => ({ ...prev, procurementStatus: 'S2_PO_ISSUED', activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_PO_ISSUED', termSnapshots: snapshots } : prev.activeOrder }));
      const supplierName = SUPPLIERS.find(s => s.id === selectedSupplierId)?.name || 'Vendor';
      const evt = emitAuditEvent({ stageId: 'S2', actionId: 'ISSUE_PO_TO_VENDOR', actorRole: role, message: `[S2_APPROVED -> S2_PO_ISSUED] Issued PO ${s2Context.activeOrder?.orderId || ''} to ${supplierName}. Terms Snapshot Frozen.` });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  }, 'ISSUE_PO_TO_VENDOR');

  const handleCloseCycle = () => wrapAction(() => {
    setIsSimulating(true);
    setTimeout(() => {
      setS2Context(prev => ({ ...prev, procurementStatus: 'S2_LOCKED', activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_LOCKED' } : prev.activeOrder }));
      const evt = emitAuditEvent({ stageId: 'S2', actionId: 'CLOSE_PROCUREMENT_CYCLE', actorRole: role, message: '[S2_PO_ACKNOWLEDGED -> S2_LOCKED] Cycle closed. S3 Readiness Signal Emitted.' });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 800);
  }, 'CLOSE_PROCUREMENT_CYCLE');

  // Vendor Ack Simulation
  useEffect(() => {
    if (s2Context.procurementStatus === 'S2_PO_ISSUED') {
      const timer = setTimeout(() => {
        setS2Context(prev => ({ ...prev, procurementStatus: 'S2_PO_ACKNOWLEDGED', activeOrder: prev.activeOrder ? { ...prev.activeOrder, currentState: 'S2_PO_ACKNOWLEDGED' } : prev.activeOrder }));
        const evt = emitAuditEvent({ stageId: 'S2', actionId: 'AUTO_VENDOR_ACK', actorRole: 'SYSTEM (VENDOR_PORTAL)', message: `[S2_PO_ISSUED -> S2_PO_ACKNOWLEDGED] Vendor acknowledged receipt of PO` });
        setLocalEvents(prev => [evt, ...prev]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [s2Context.procurementStatus]);

  // Nav
  const handleNavToS3 = () => { if (onNavigate) { emitAuditEvent({ stageId: 'S2', actionId: 'NAV_NEXT_STAGE', actorRole: role, message: 'Navigated to S3: Inbound Receipt from S2' }); onNavigate('inbound_receipt'); }};
  const handleNavToControlTower = () => { if (onNavigate) { onNavigate('control_tower'); }};

  // State
  const createPoState = getAction('CREATE_PO');
  const submitPoState = getAction('SUBMIT_PO_FOR_APPROVAL');
  const approvePoState = getAction('APPROVE_PO');
  const issuePoState = getAction('ISSUE_PO_TO_VENDOR');
  const closeCycleState = getAction('CLOSE_PROCUREMENT_CYCLE');
  const isReadyForNext = s2Context.procurementStatus === 'S2_PO_ACKNOWLEDGED' || s2Context.procurementStatus === 'S2_LOCKED';
  const hasAccess = role === UserRole.SYSTEM_ADMIN || role === UserRole.PROCUREMENT || role === UserRole.MANAGEMENT || role === UserRole.OPERATOR;

  // Gate Helpers
  const toggleGate = (id: string) => {
      setS2Gates(prev => prev.map(g => {
          if (g.id === id) {
              const nextStatus = g.status === 'MET' ? 'PENDING' : 'MET';
              emitAuditEvent({ stageId: 'S2', actionId: 'TOGGLE_GATE', actorRole: role, message: `Gate '${g.label}' updated to ${nextStatus}` });
              return { ...g, status: nextStatus, lastUpdated: new Date().toISOString().split('T')[0] };
          }
          return g;
      }));
  };

  const getGateBlockReason = (action: S2ActionId) => {
      const { missing } = checkGates(action);
      return missing.length > 0 ? `Unmet Preconditions: ${missing.join(', ')}` : null;
  };

  if (!hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" /><h2 className="text-xl font-bold text-slate-700">Access Restricted</h2><p>Your role ({role}) does not have permission to view Commercial Procurement.</p>
      </div>
    );
  }

  const getItemInOrder = (skuCode: string) => s2Context.activeOrder?.selectedItems.find(i => i.itemType === 'SKU' && i.skuCode === skuCode);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Term History Drawer */}
      {viewingHistoryMasterId && (
        <div className="absolute inset-0 z-[60] flex justify-end">
           <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setViewingHistoryMasterId(null)} />
           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={16} className="text-brand-600" /> Version History</h3><button onClick={() => setViewingHistoryMasterId(null)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {commercialTerms.filter(t => t.masterId === viewingHistoryMasterId).sort((a, b) => b.version - a.version).map(ver => (
                    <div key={ver.id} className={`p-3 rounded-lg border ${ver.contractStatus === 'Active' ? 'bg-white border-green-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                       <div className="flex justify-between items-start mb-2"><span className="font-bold text-slate-700 text-sm">Version {ver.version}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${ver.contractStatus === 'Active' ? 'bg-green-100 text-green-700' : ver.contractStatus === 'Draft' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{ver.contractStatus}</span></div>
                       <div className="grid grid-cols-2 gap-2 text-xs text-slate-500"><div><span className="font-bold">Price:</span> {ver.priceBand}</div><div><span className="font-bold">MOQ:</span> {ver.moq}</div><div className="col-span-2 text-[10px] text-slate-400 border-t border-slate-100 pt-1 mt-1">Valid: {ver.validFrom} - {ver.validTo}</div></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Supplier Drill-Down Drawer */}
      {viewingSupplier && (
        <div className="absolute inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setViewingSupplier(null)} />
           <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
                  <div><div className="flex items-center gap-2 mb-1"><h2 className="text-xl font-bold text-slate-800">{viewingSupplier.name}</h2>{viewingSupplier.source === 'ERP_MANAGED' ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><Server size={10} /> ERP</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"><UserCog size={10} /> Manual</span>}<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${viewingSupplier.status === 'Approved' ? 'bg-green-100 text-green-700' : viewingSupplier.status === 'Conditional' ? 'bg-amber-100 text-amber-700' : viewingSupplier.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{viewingSupplier.status}</span></div><div className="text-xs text-slate-500 font-mono">ID: {viewingSupplier.id} • {viewingSupplier.type}</div></div><button onClick={() => setViewingSupplier(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {viewingSupplier.source === 'ERP_MANAGED' && (<div className="p-3 bg-indigo-50 border border-indigo-100 rounded-md flex items-start gap-2"><Lock size={14} className="text-indigo-600 mt-0.5 shrink-0" /><div className="text-xs text-indigo-800"><strong>System of Record:</strong> This supplier is managed by the central ERP. Modifications must be performed in the source system (SAP/Oracle).</div></div>)}
                  <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-center flex flex-col items-center gap-1"><div className="text-[10px] uppercase font-bold text-slate-400">Score</div><div className="text-xl font-bold text-brand-600">{viewingSupplier.performanceScore}/100</div><TrendingUp size={14} className="text-green-500" /></div>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-center flex flex-col items-center gap-1"><div className="text-[10px] uppercase font-bold text-slate-400">Risk</div><div className={`text-xl font-bold ${viewingSupplier.riskLevel === 'Low' ? 'text-green-600' : viewingSupplier.riskLevel === 'Medium' ? 'text-amber-600' : 'text-red-600'}`}>{viewingSupplier.riskLevel}</div><ShieldAlert size={14} className={viewingSupplier.riskLevel === 'High' ? 'text-red-500' : 'text-slate-300'} /></div>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-center flex flex-col items-center gap-1"><div className="text-[10px] uppercase font-bold text-slate-400">Rating</div><div className="text-xl font-bold text-purple-600">{viewingSupplier.rating}</div><Award size={14} className="text-purple-400" /></div>
                  </div>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Details</h3><div className="flex items-center gap-3 text-sm text-slate-700"><Globe size={16} className="text-slate-400" /><span>Region: <strong>{viewingSupplier.region}</strong></span></div><div className="flex items-center gap-3 text-sm text-slate-700"><User size={16} className="text-slate-400" /><span>Contact: <strong>{viewingSupplier.contactPerson}</strong></span></div><div className="flex items-center gap-3 text-sm text-slate-700"><History size={16} className="text-slate-400" /><span>Last Audit: <strong>{viewingSupplier.lastAudit}</strong></span></div></div>
                  <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Certifications</h3><div className="flex flex-wrap gap-2">{viewingSupplier.certificates.map((cert, i) => (<span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium flex items-center gap-1"><FileBadge size={12} /> {cert}</span>))}</div></div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end"><button onClick={() => setViewingSupplier(null)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded hover:bg-slate-100 transition-colors">Close</button></div>
           </div>
        </div>
      )}

      {/* Gate Drawer */}
      {activeGateId && (
         <div className="absolute inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setActiveGateId(null)} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
               {(() => {
                   const gate = s2Gates.find(g => g.id === activeGateId);
                   if (!gate) return null;
                   const canEdit = role === UserRole.SYSTEM_ADMIN || role === UserRole.PROCUREMENT;
                   return (
                       <>
                           <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                  {gate.status === 'MET' ? <CheckCircle2 className="text-green-600" /> : <AlertCircle className="text-amber-500" />}
                                  <h3 className="font-bold text-slate-800">{gate.label}</h3>
                               </div>
                               <button onClick={() => setActiveGateId(null)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                           </div>
                           <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600">{gate.description}</div>
                               <div>
                                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gate Status</h4>
                                   <div className={`p-4 rounded-lg border flex items-center justify-between ${gate.status === 'MET' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                       <span className={`font-bold ${gate.status === 'MET' ? 'text-green-700' : 'text-amber-700'}`}>{gate.status}</span>
                                       {canEdit ? (
                                           <button onClick={() => toggleGate(gate.id)} className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50 shadow-sm">
                                               {gate.status === 'MET' ? 'Revoke' : 'Mark Met'}
                                           </button>
                                       ) : <span className="text-[10px] text-slate-400 italic">Read Only</span>}
                                   </div>
                               </div>
                               <div>
                                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Evidence</h4>
                                   {gate.evidenceRefs.length > 0 ? (
                                       <div className="space-y-2">
                                           {gate.evidenceRefs.map(ref => (
                                               <div key={ref} className="flex items-center gap-2 p-2 border rounded bg-white text-xs">
                                                   <FileText size={12} className="text-blue-500" /> {ref}
                                               </div>
                                           ))}
                                       </div>
                                   ) : <div className="text-xs text-slate-400 italic">No evidence attached.</div>}
                               </div>
                               <div className="text-[10px] text-slate-400 pt-4 border-t">Last Updated: {gate.lastUpdated}</div>
                           </div>
                       </>
                   );
               })()}
            </div>
         </div>
      )}

      {/* Main Container - Scrollable */}
      <div className="flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex-none px-6 pt-4 pb-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
            <div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Procurement <span className="text-slate-300">/</span> Orders</div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="text-brand-600" size={24} /> Commercial Procurement (S2)</h1>
            </div>
            <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
                <button className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400 transition-colors" disabled={!createPoState.enabled || isSimulating} onClick={handleCreatePo} title={createPoState.reason}><Plus size={16} /><span>Create PO</span></button>
            </div>
            {!createPoState.enabled && (<DisabledHint reason={createPoState.reason || 'Blocked'} className="mt-1" />)}
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-1"><Database size={10} /> <span>Active POs: {s2Context.activePoCount}</span><span className="text-slate-300">|</span><span>Pending: {s2Context.pendingApprovalsCount}</span><span className="text-slate-300">|</span><span className={`font-bold ${s2Context.procurementStatus === 'S2_APPROVED' ? 'text-green-600' : 'text-blue-600'}`}>{s2Context.procurementStatus.replace('S2_', '')}</span></div>
            </div>
        </div>
        
        <div className="mt-4">
            <StageStateBanner stageId="S2" labelOverride={stateLabel} reasonOverride={stateReason} nextActionOverride={stateNext} />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

        {/* Operational Preconditions - Interactive */}
        <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-all ${focusedSection === 'PRECONDITIONS' ? 'ring-2 ring-brand-500' : ''}`}>
            <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
               <div className="flex items-center gap-2">
                   <CheckSquare size={16} className="text-slate-500" />
                   <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operational Preconditions</h3>
               </div>
               <button onClick={() => setFocusedSection(focusedSection === 'PRECONDITIONS' ? null : 'PRECONDITIONS')} className="text-slate-400 hover:text-brand-600"><Maximize2 size={14} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {s2Gates.map(gate => (
                    <div key={gate.id} onClick={() => setActiveGateId(gate.id)} className={`flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-slate-50 transition-colors ${gate.status === 'MET' ? 'border-green-200 bg-green-50/30' : gate.status === 'BLOCKED' ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                        <div className="mt-0.5">{gate.status === 'MET' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-amber-500" />}</div>
                        <div><div className="text-sm font-bold text-slate-700">{gate.label}</div><div className="text-[10px] text-slate-500 mt-1">{gate.status}</div></div>
                    </div>
                ))}
            </div>
        </div>

        {isLocked && <div className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 shadow-md border border-slate-700"><Lock size={16} className="text-red-400" /><span>COMMERCIAL SNAPSHOT LOCKED</span><span className="font-normal opacity-75 text-xs ml-2 border-l border-slate-600 pl-2">PO Issued to Vendor • Modifications Restricted</span></div>}
        {hasValidationErrors && <div className="bg-red-50 text-red-800 px-4 py-3 rounded-md text-sm border border-red-200"><div className="flex items-center gap-2 font-bold mb-1"><Ban size={16} className="text-red-600" /><span>Supplier Eligibility Conflict</span></div><ul className="list-disc pl-5 space-y-1">{validationErrors.map((err, i) => <li key={i} className="text-xs">{err}</li>)}</ul></div>}
        {localEvents.length > 0 && <div className="bg-slate-50 border border-slate-200 rounded-md p-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2"><History size={14} /> Recent S2 Activity (Session)</div><div className="space-y-2">{localEvents.slice(0, 3).map(evt => <div key={evt.id} className="flex items-center gap-3 text-sm bg-white p-2 rounded border border-slate-100 shadow-sm"><span className="font-mono text-[10px] text-slate-400">{evt.timestamp}</span><span className="font-bold text-slate-700 text-xs px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">{evt.actorRole}</span><span className="text-slate-600 flex-1 truncate">{evt.message}</span><CheckCircle2 size={14} className="text-green-500" /></div>)}</div></div>}
        
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${!onNavigate ? 'hidden' : ''}`}><div className="flex items-start gap-3"><div className="p-2 bg-blue-100 rounded-full text-blue-600"><ArrowRight size={20} /></div><div><h3 className="font-bold text-blue-900 text-sm">Next Recommended Action</h3><p className="text-xs text-blue-700 mt-1 max-w-lg">{s2Context.procurementStatus === 'S2_PO_ACKNOWLEDGED' || s2Context.procurementStatus === 'S2_LOCKED' ? (hasSerializableItems ? "Procurement cycle complete. Proceed to Inbound Receipt (S3) to process incoming materials." : "Order complete. Non-serializable items can be received directly without S3 processing.") : "Procurement active. Complete approval and issuance cycle to unlock Inbound Logistics."}</p></div></div><div className="flex gap-3 w-full sm:w-auto"><button onClick={() => onNavigate && onNavigate('control_tower')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100 transition-colors"><Radar size={14} /> Control Tower</button><div className="flex-1 sm:flex-none flex flex-col items-center"><button onClick={() => onNavigate && onNavigate('inbound_receipt')} disabled={s2Context.procurementStatus !== 'S2_PO_ACKNOWLEDGED' && s2Context.procurementStatus !== 'S2_LOCKED'} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm" title={!hasSerializableItems ? 'No items require S3 serialization' : ''}><Truck size={14} /> Go to S3: Inbound</button></div></div></div>

        {/* Toolbar */}
        <div className={`bg-white p-4 rounded-lg shadow-sm border border-industrial-border flex flex-col md:flex-row items-center gap-4 justify-between transition-opacity ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
           <div className="flex items-center gap-3 w-full md:w-auto"><div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100"><FileText size={20} /></div><div><h3 className="font-bold text-slate-800 text-sm">Active Order Cycle {s2Context.activeOrder ? <span className="font-mono text-blue-600">({s2Context.activeOrder.orderId})</span> : ''}</h3><p className="text-xs text-slate-500">Status: <span className="font-bold">{stateLabel}</span></p></div></div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex flex-col items-center"><button disabled={!submitPoState.enabled || hasValidationErrors || checkGates('SUBMIT_PO_FOR_APPROVAL').missing.length > 0} onClick={handleSubmitPo} title={validationErrorText || submitPoState.reason || getGateBlockReason('SUBMIT_PO_FOR_APPROVAL')} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 text-xs font-bold transition-colors"><Send size={14} /> Submit</button></div><div className="w-4 h-px bg-slate-300"></div>
              <div className="flex flex-col items-center"><button disabled={!approvePoState.enabled || hasValidationErrors || checkGates('APPROVE_PO').missing.length > 0} onClick={handleApprovePo} title={validationErrorText || approvePoState.reason || getGateBlockReason('APPROVE_PO')} className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold transition-colors"><ThumbsUp size={14} /> Approve</button></div><div className="w-4 h-px bg-slate-300"></div>
              <div className="flex flex-col items-center"><button disabled={!issuePoState.enabled || hasValidationErrors || checkGates('ISSUE_PO_TO_VENDOR').missing.length > 0} onClick={handleIssuePo} title={validationErrorText || issuePoState.reason || getGateBlockReason('ISSUE_PO_TO_VENDOR')} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-100 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold transition-colors"><CreditCard size={14} /> Issue PO</button></div><div className="w-4 h-px bg-slate-300"></div>
              <div className="flex flex-col items-center"><button disabled={!closeCycleState.enabled || checkGates('CLOSE_PROCUREMENT_CYCLE').missing.length > 0} onClick={handleCloseCycle} title={closeCycleState.reason || getGateBlockReason('CLOSE_PROCUREMENT_CYCLE')} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold transition-colors"><RotateCcw size={14} /> Close</button></div>
           </div>
        </div>

        {/* Main Workspace Grid */}
        <div className={`grid gap-6 ${focusedSection ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'} ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
          
          {/* Left Col: Selection Lane */}
          {(!focusedSection || focusedSection === 'LEFT') && (
            <div className={`${focusedSection === 'LEFT' ? 'col-span-1' : 'lg:col-span-3'} bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden`}>
            <div className="flex border-b border-slate-100 bg-slate-50">
               <button onClick={() => setLeftTab('S1')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${leftTab === 'S1' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Approved SKUs (S1)</button>
               <button onClick={() => setLeftTab('MANUAL')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${leftTab === 'MANUAL' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Manual Entry</button>
            </div>
            <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar max-h-[500px]">
              {leftTab === 'S1' && (
                 <>
                  {availableSkus.length === 0 ? <div className="p-4 text-center text-xs text-slate-400">No approved SKUs found in S1 Master Data.</div> : availableSkus.map((sku) => {
                    const inOrder = getItemInOrder(sku.skuCode);
                    const isEditing = editingSkuId === sku.skuId;
                    if (isEditing) {
                        return (
                          <div key={sku.skuId} className="p-3 bg-brand-50 border border-brand-200 rounded-md shadow-sm space-y-3 animate-in zoom-in-95 duration-200">
                              <div className="flex justify-between items-start"><span className="font-bold text-brand-800 text-sm">{sku.skuCode}</span><button onClick={handleCancelEdit} className="text-brand-400 hover:text-brand-600"><X size={14}/></button></div>
                              <div className="space-y-2"><div><label className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Quantity</label><input type="number" className="w-full text-xs p-1.5 rounded border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500" value={skuLineDraft.quantity} onChange={(e) => setSkuLineDraft(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))} /></div><div><label className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Req. Date</label><input type="date" className="w-full text-xs p-1.5 rounded border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500" value={skuLineDraft.deliveryDate} onChange={(e) => setSkuLineDraft(prev => ({ ...prev, deliveryDate: e.target.value }))} /></div><div><label className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Notes</label><textarea rows={2} className="w-full text-xs p-1.5 rounded border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500" value={skuLineDraft.notes || ''} onChange={(e) => setSkuLineDraft(prev => ({ ...prev, notes: e.target.value }))} placeholder="Special instructions..." /></div></div>
                              <button onClick={handleAddSkuItem} disabled={!skuLineDraft.quantity} className="w-full py-1.5 bg-brand-600 text-white text-xs font-bold rounded shadow-sm hover:bg-brand-700 disabled:opacity-50">{inOrder ? 'Update Order' : 'Add to Order'}</button>
                          </div>
                        );
                    }
                    return (
                      <div key={sku.skuId} onClick={() => handleEditSku(sku)} className={`p-3 bg-white border rounded-md shadow-sm transition-all cursor-pointer hover:border-brand-300 hover:shadow-md ${inOrder ? 'border-l-4 border-l-green-500' : 'border-slate-100'} ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="flex justify-between items-start mb-1"><span className="font-bold text-slate-800 text-sm">{sku.skuCode}</span>{inOrder && <CheckCircle2 size={14} className="text-green-500" />}</div>
                          <div className="text-xs text-slate-500 mb-1">{sku.name}</div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2"><span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{sku.type}</span><span>Rev: {sku.revision.id}</span></div>
                          {inOrder && <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-green-700 flex justify-between"><span>In Basket</span><span>Qty: {inOrder.quantity}</span></div>}
                      </div>
                    );
                  })}
                 </>
              )}
              {leftTab === 'MANUAL' && (
                  <div className="p-2 space-y-4 animate-in fade-in slide-in-from-right-2">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex gap-2"><PackagePlus size={16} className="shrink-0" /><p>Items added here are <strong>Non-Trackable</strong> and bypass standard S1 validation.</p></div>
                      <div className="space-y-3"><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Item Name / Description</label><input type="text" className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="e.g. MRO - Thermal Paste" value={manualLineDraft.name} onChange={(e) => setManualLineDraft(prev => ({ ...prev, name: e.target.value }))} disabled={isLocked} /></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Category</label><select className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" value={manualLineDraft.category} onChange={(e) => setManualLineDraft(prev => ({ ...prev, category: e.target.value as any }))} disabled={isLocked}><option value="MRO">MRO</option><option value="Consumable">Consumable</option><option value="Packaging">Packaging</option><option value="Chemical">Chemical</option><option value="Other">Other</option></select></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">UoM</label><input type="text" className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500" value={manualLineDraft.uom} onChange={(e) => setManualLineDraft(prev => ({ ...prev, uom: e.target.value }))} disabled={isLocked} /></div></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Quantity</label><input type="number" className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500" value={manualLineDraft.quantity} onChange={(e) => setManualLineDraft(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))} disabled={isLocked} /></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Req. Date</label><input type="date" className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500" value={manualLineDraft.deliveryDate} onChange={(e) => setManualLineDraft(prev => ({ ...prev, deliveryDate: e.target.value }))} disabled={isLocked} /></div></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Notes</label><textarea rows={2} className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Details..." value={manualLineDraft.notes} onChange={(e) => setManualLineDraft(prev => ({ ...prev, notes: e.target.value }))} disabled={isLocked} /></div><button onClick={handleAddManualItem} disabled={!manualLineDraft.name || !manualLineDraft.quantity || isLocked} className="w-full py-2 bg-brand-600 text-white text-xs font-bold rounded shadow-sm hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"><Plus size={14} /> Add Manual Item</button></div>
                  </div>
              )}
            </div>
          </div>
          )}

          {/* Middle Col: Supplier Master */}
          {(!focusedSection || focusedSection === 'MIDDLE') && (
            <div className={`${focusedSection === 'MIDDLE' ? 'col-span-1' : 'lg:col-span-5'} bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden`}>
             <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-semibold text-slate-700 flex items-center gap-2"><Truck size={16} /> Supplier Master</h3><span className="text-xs text-slate-400">Qualified Vendors ({s2Context.vendorCatalogCount})</span></div>
            <div className="overflow-y-auto p-0 custom-scrollbar max-h-[500px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0"><tr><th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Supplier Name</th><th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Type</th><th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Status</th><th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {SUPPLIERS.map((sup) => (
                    <tr key={sup.id} onClick={() => { if (isLocked) return; setSelectedSupplierId(sup.id); if (s2Context.activeOrder && s2Context.procurementStatus === 'S2_DRAFT') { setS2Context(prev => ({ ...prev, activeOrder: prev.activeOrder ? { ...prev.activeOrder, activeSupplierId: sup.id } : prev.activeOrder })); } }} className={`transition-colors ${selectedSupplierId === sup.id ? 'bg-brand-50' : ''} ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">{sup.name}{sup.source === 'ERP_MANAGED' && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">ERP</span>}{sup.source === 'MANUAL' && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">MANUAL</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{sup.type}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sup.status === 'Approved' ? 'bg-green-100 text-green-700' : sup.status === 'Conditional' ? 'bg-amber-100 text-amber-700' : sup.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{sup.status}</span></td>
                      <td className="px-4 py-3"><button onClick={(e) => handleInspectSupplier(e, sup)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"><Eye size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Right Col: Summary & Terms */}
          {(!focusedSection || focusedSection === 'RIGHT') && (
            <div className={`${focusedSection === 'RIGHT' ? 'col-span-1' : 'lg:col-span-4'} bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden relative`}>
            <div className="flex border-b border-slate-100 bg-slate-50">
               <button onClick={() => setRightTab('LINES')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${rightTab === 'LINES' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Order Lines ({s2Context.activeOrder?.selectedItems.length || 0})</button>
               <button onClick={() => setRightTab('TERMS')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${rightTab === 'TERMS' ? 'bg-white border-t-2 border-t-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Commercial Terms</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white max-h-[500px]">
               {rightTab === 'LINES' && (
                  <div className="flex flex-col h-full">
                    <div className="space-y-3 flex-1">
                        {(!s2Context.activeOrder || s2Context.activeOrder.selectedItems.length === 0) ? <div className="text-center py-8 text-slate-400 text-xs italic">No items added to the order yet.</div> : s2Context.activeOrder.selectedItems.map((item) => (
                                <div key={item.itemId} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col gap-2">
                                    <div className="flex justify-between items-start"><div className="flex flex-col"><span className="font-bold text-slate-700 text-sm">{item.name}</span><div className="flex items-center gap-2 mt-0.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${item.fulfillmentType === 'SERIALIZABLE' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{item.fulfillmentType === 'SERIALIZABLE' ? 'TRACKABLE (S3)' : 'DIRECT CONSUMPTION'}</span>{item.skuCode && <span className="text-[10px] font-mono text-slate-400">{item.skuCode}</span>}</div></div>{!isLocked && <button onClick={() => handleRemoveItem(item.itemId)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>}</div>
                                    <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1"><div className="font-mono"><span className="text-slate-500">Qty:</span> <span className="font-bold">{item.quantity} {item.uom}</span></div><div className="text-slate-500 flex items-center gap-1"><Calendar size={10} /> {item.deliveryDate}</div></div>
                                    {item.notes && <div className="text-[10px] text-slate-500 italic bg-white p-1 rounded border border-slate-100">{item.notes}</div>}
                                </div>
                            ))}
                    </div>
                    {s2Context.activeOrder && s2Context.activeOrder.selectedItems.length > 0 && <div className="mt-4 pt-3 border-t border-slate-200 text-xs flex justify-between items-center bg-slate-50 p-2 rounded"><span className="text-slate-500 font-bold uppercase text-[10px]">S3 Eligibility</span><div className="flex items-center gap-2"><ScanBarcode size={14} className="text-blue-600"/><span className="font-bold text-slate-700">{serializableItemsCount} Items Serializable</span></div></div>}
                  </div>
               )}
               {rightTab === 'TERMS' && !editingTerm && (
                  <>
                      {isLocked && <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 text-xs flex items-center gap-2 text-amber-800"><Camera size={16} /><div><div className="font-bold">Historical Snapshot</div><div>Terms are locked to version at PO Issue time.</div></div></div>}
                      <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">{isLocked ? 'Snapshotted Terms' : 'Active Contracts'}</h3>{!isLocked && <button onClick={handleCreateTerm} className="text-[10px] flex items-center gap-1 text-brand-600 font-bold hover:text-brand-800"><Plus size={12} /> New Term</button>}</div>
                      {visibleTerms.length === 0 ? <div className="text-center py-8 text-slate-400 text-xs italic">No commercial terms defined.</div> : visibleTerms.map((term) => {
                          const v = getVarianceInfo(term);
                          return (
                          <div key={term.id} className={`border rounded-lg p-4 bg-slate-50 relative group ${isLocked ? 'border-amber-200' : 'border-slate-200'}`}>
                              {!isLocked && <div className="absolute top-2 right-2 flex gap-1 transition-opacity"><button onClick={() => setViewingHistoryMasterId(term.masterId)} className="p-1 hover:bg-slate-200 rounded text-slate-500" title="View Version History"><History size={12}/></button><div className="w-px h-3 bg-slate-300 mx-1"></div><button onClick={() => handleEditTerm(term)} className="p-1 hover:bg-slate-200 rounded text-slate-500" title="Edit / New Version"><Edit size={12}/></button><button onClick={() => handleDeleteTerm(term.id)} className="p-1 hover:bg-red-100 text-red-500 rounded" title="Delete"><Trash2 size={12}/></button></div>}
                              {isLocked && <div className="absolute top-2 right-2"><span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200">SNAPSHOT</span></div>}
                              <div className="flex justify-between items-start mb-3"><div className="flex flex-col"><span className="text-xs font-mono font-bold text-slate-700">{term.skuRef}</span><span className="text-[10px] text-slate-500">{SUPPLIERS.find(s=>s.id === term.supplierId)?.name}</span></div><div className="flex flex-col items-end gap-1 mt-6 mr-1"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${term.contractStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : term.contractStatus === 'Draft' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{term.contractStatus}</span><span className="text-[9px] font-mono text-slate-400 flex items-center gap-1"><GitBranch size={8} /> V{term.version}</span></div></div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div><div className="text-[10px] text-slate-400 uppercase">MOQ</div><div className="font-medium text-slate-800">{term.moq}</div></div>
                                  <div><div className="text-[10px] text-slate-400 uppercase">Lead Time</div><div className="font-medium text-slate-800">{term.leadTime}</div>{v.hasBaseline && v.leadDiff !== 0 && <span className={`text-[9px] font-bold ${v.leadDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>{v.leadDiff > 0 ? `+${v.leadDiff}w` : `${v.leadDiff}w`}</span>}</div>
                                  <div className="col-span-2"><div className="text-[10px] text-slate-400 uppercase">Indicative Price Band</div><div className="font-medium text-slate-800 bg-white border border-slate-200 p-2 rounded text-center flex items-center justify-center gap-2">{term.priceBand} {v.hasBaseline && v.priceDiff !== 0 && <span className={`text-[9px] px-1.5 rounded ${v.priceDiff > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{v.priceDiff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(v.priceDiff).toFixed(1)}%</span>}</div></div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400"><span>Valid: {term.validFrom} - {term.validTo}</span>{term.attachments.length > 0 && <Paperclip size={12} className="text-slate-500" />}</div>
                          </div>
                      )})}
                      {!isLocked && <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex items-start gap-2"><AlertCircle size={14} className="mt-0.5 shrink-0" /><p>Commercial terms displayed are for demonstration purposes. Actual pricing is retrieved securely from the ERP backend (mocked).</p></div>}
                  </>
               )}
               {rightTab === 'TERMS' && editingTerm && (
                 <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
                   <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2"><div><h3 className="font-bold text-slate-700 text-sm">{editingTerm.masterId ? (editingTerm.contractStatus === 'Draft' && editingTerm.version && editingTerm.version > 1 ? 'New Version' : 'Edit Term') : 'New Term'}</h3>{editingTerm.version && editingTerm.version > 1 && (<span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 rounded">V{editingTerm.version}</span>)}</div><button onClick={() => setEditingTerm(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button></div>
                   <div className="space-y-4 flex-1 overflow-y-auto pr-1"><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">SKU</label><select className="w-full text-xs p-2 rounded border border-slate-300 bg-white" value={editingTerm.skuRef} onChange={(e) => setEditingTerm(prev => ({ ...prev, skuRef: e.target.value }))}><option value="">Select SKU</option>{availableSkus.map(s => <option key={s.skuCode} value={s.skuCode}>{s.skuCode}</option>)}</select></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Supplier</label><select className="w-full text-xs p-2 rounded border border-slate-300 bg-white" value={editingTerm.supplierId} onChange={(e) => setEditingTerm(prev => ({ ...prev, supplierId: e.target.value }))}>{SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Status</label><select className="w-full text-xs p-2 rounded border border-slate-300 bg-white" value={editingTerm.contractStatus} onChange={(e) => setEditingTerm(prev => ({ ...prev, contractStatus: e.target.value as any }))}><option value="Draft">Draft</option><option value="Active">Active</option><option value="Expired">Expired</option></select></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Price Band</label><input type="text" className="w-full text-xs p-2 rounded border border-slate-300" value={editingTerm.priceBand} onChange={(e) => setEditingTerm(prev => ({...prev, priceBand: e.target.value}))} /></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">MOQ</label><input type="text" className="w-full text-xs p-2 rounded border border-slate-300" value={editingTerm.moq} onChange={(e) => setEditingTerm(prev => ({...prev, moq: e.target.value}))} /></div></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Lead Time</label><input type="text" className="w-full text-xs p-2 rounded border border-slate-300" value={editingTerm.leadTime} onChange={(e) => setEditingTerm(prev => ({...prev, leadTime: e.target.value}))} /></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Valid From</label><input type="date" className="w-full text-xs p-2 rounded border border-slate-300" value={editingTerm.validFrom} onChange={(e) => setEditingTerm(prev => ({...prev, validFrom: e.target.value}))} /></div><div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Valid To</label><input type="date" className="w-full text-xs p-2 rounded border border-slate-300" value={editingTerm.validTo} onChange={(e) => setEditingTerm(prev => ({...prev, validTo: e.target.value}))} /></div></div><div className="bg-slate-50 p-3 rounded border border-slate-200"><div className="flex justify-between items-center mb-2"><label className="text-[10px] uppercase font-bold text-slate-500">Attachments</label><button onClick={handleAddAttachment} className="text-[10px] text-brand-600 font-bold hover:underline flex items-center gap-1"><Paperclip size={10} /> Add</button></div><div className="space-y-1">{editingTerm.attachments && editingTerm.attachments.length > 0 ? (editingTerm.attachments.map((file, i) => (<div key={i} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100"><span className="truncate max-w-[150px]">{file}</span><button onClick={() => handleRemoveAttachment(file)} className="text-red-400 hover:text-red-600"><X size={12}/></button></div>))) : <span className="text-[10px] text-slate-400 italic">No files attached.</span>}</div></div></div><div className="pt-4 mt-auto flex gap-2"><button onClick={() => setEditingTerm(null)} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200">Cancel</button><button onClick={handleSaveTerm} className="flex-1 py-2 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 flex items-center justify-center gap-2 shadow-sm"><Save size={14}/> Save Term</button></div>
                 </div>
               )}
            </div>
          </div>
          )}

        </div>

      </div>
    </div>
  );
};
