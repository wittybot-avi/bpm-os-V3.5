
import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Truck, Package, Activity, ArrowRight, LayoutList, Plus, FileInput, CheckCircle2, ShieldAlert, FileWarning, RefreshCcw, Paperclip, FileText, Calendar, Tag, Save, X, AlertTriangle, PlayCircle, ShieldCheck, ScanBarcode, Settings2, Barcode, Database, Copy, AlertCircle, FileDigit, QrCode, ArrowRightCircle, Link, Search, FileSearch, AlertOctagon, Printer, Ban, RotateCcw, ThumbsUp, ThumbsDown, PauseCircle, Archive, MapPin, Maximize2, Minimize2, ListChecks, Lock, ExternalLink } from 'lucide-react';
import { NavView, UserContext, UserRole } from '../types';
import { S3Receipt, ReceiptState, getReceiptNextActions, S3ReceiptLine, ItemTrackability, makeReceiptCode, canS3, S3Attachment, AttachmentType, validateReceipt, validateClosure, ValidationResult, transitionReceipt, allowedReceiptTransitions, generateS3Units, S3SerializedUnit, UnitState, LabelStatus } from '../stages/s3/contracts';
import { getNextUnitState, canTransitionUnit, transitionUnit } from '../stages/s3/contracts/s3StateMachine';
import { s3ListReceipts, s3GetActiveReceipt, s3SetActiveReceipt, s3UpsertReceipt } from '../sim/api/s3/s3Inbound.handlers';
import { s3ListOpenOrdersFromS2, S3MockOrder, s3ListSuppliers, S3Supplier } from '../sim/api/s3/s3S2Adapter';
import { saveS3Output } from '../sim/api/s3/s3Outbound.contract';

interface InboundReceiptProps {
  onNavigate?: (view: NavView) => void;
}

// --- PRECONDITION TYPES ---
type PreconditionStatus = 'MET' | 'PENDING' | 'BLOCKED';
interface Precondition {
  id: string;
  label: string;
  status: PreconditionStatus;
  description: string;
}

// --- SECTION COMPONENT ---
const Section: React.FC<{ 
    title: string; 
    icon: React.ElementType; 
    isFocused: boolean; 
    onToggleFocus: () => void; 
    children: React.ReactNode; 
    className?: string;
    rightSlot?: React.ReactNode;
}> = ({ title, icon: Icon, isFocused, onToggleFocus, children, className = '', rightSlot }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col transition-all duration-300 ${isFocused ? 'fixed inset-4 z-50 shadow-2xl ring-2 ring-brand-500' : 'relative'} ${className}`}>
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-slate-500" />
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {rightSlot}
                    <button onClick={onToggleFocus} className="text-slate-400 hover:text-brand-600 transition-colors p-1 rounded hover:bg-slate-200">
                        {isFocused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-white">
                {children}
            </div>
        </div>
    );
};

export const InboundReceipt: React.FC<InboundReceiptProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  const [receipts, setReceipts] = useState<S3Receipt[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<S3Receipt | undefined>(undefined);
  const [openOrders, setOpenOrders] = useState<S3MockOrder[]>([]);
  const [suppliers, setSuppliers] = useState<S3Supplier[]>([]);
  
  // Intake Panel State
  const [intakeMode, setIntakeMode] = useState<'PO' | 'MANUAL'>('PO');
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  
  // Manual Receipt State
  const [manualSupplierId, setManualSupplierId] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('');
  const [supervisorAck, setSupervisorAck] = useState<boolean>(false);

  // Detail View State
  const [activeTab, setActiveTab] = useState<'LINES' | 'EVIDENCE' | 'PUTAWAY'>('LINES');
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  
  // Validation State
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // Edit Buffers
  const [evidenceBuffer, setEvidenceBuffer] = useState<Partial<S3Receipt>>({});
  const [lineBuffers, setLineBuffers] = useState<Record<string, Partial<S3ReceiptLine>>>({});

  // Serial Generation State
  const [genPanel, setGenPanel] = useState<{ lineId: string, mode: 'RANGE' | 'POOL', count: number } | null>(null);

  // Supplier Serial Entry State
  const [serialEntryLineId, setSerialEntryLineId] = useState<string | null>(null);
  const [serialBuffer, setSerialBuffer] = useState<S3SerializedUnit[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [serialErrors, setSerialErrors] = useState<string[]>([]);

  // QC State
  const [qcLineId, setQcLineId] = useState<string | null>(null);
  const [qcBuffer, setQcBuffer] = useState<S3SerializedUnit[]>([]);
  const [qcFilter, setQcFilter] = useState<'ALL' | 'PENDING' | 'HOLD' | 'FINAL'>('PENDING');

  // Putaway State
  const [putawayFilter, setPutawayFilter] = useState<'ALL' | 'ACCEPTED' | 'HOLD' | 'REJECTED'>('ALL');
  const [putawaySelection, setPutawaySelection] = useState<Set<string>>(new Set());
  const [targetLocation, setTargetLocation] = useState({ warehouse: 'Main Warehouse', zone: 'Zone A', bin: '' });
  
  // Trace Mapping View State
  const [showTraceMapping, setShowTraceMapping] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // Initial load and sync
  useEffect(() => {
    setReceipts(s3ListReceipts());
    setActiveReceipt(s3GetActiveReceipt());
    setOpenOrders(s3ListOpenOrdersFromS2());
    setSuppliers(s3ListSuppliers());
    setValidationResult(null); // Reset validation on load
  }, [refreshKey]);

  // Reset form when toggling mode
  useEffect(() => {
      setSelectedPoId('');
      setManualSupplierId('');
      setManualReason('');
      setSupervisorAck(false);
  }, [intakeMode]);

  // Sync buffers when active receipt changes
  useEffect(() => {
      if (activeReceipt) {
          setEvidenceBuffer({
              invoiceNo: activeReceipt.invoiceNo || '',
              invoiceDate: activeReceipt.invoiceDate || '',
              packingListRef: activeReceipt.packingListRef || '',
              transportDocRef: activeReceipt.transportDocRef || ''
          });
          const initialLines: Record<string, Partial<S3ReceiptLine>> = {};
          activeReceipt.lines.forEach(l => {
              initialLines[l.id] = {
                  lotRef: l.lotRef || '',
                  mfgDate: l.mfgDate || '',
                  expDate: l.expDate || '',
                  qtyReceived: l.qtyReceived || 0
              };
          });
          setLineBuffers(initialLines);
          setValidationResult(null); // Clear validation when switching receipts
          setGenPanel(null);
          setSerialEntryLineId(null);
          setQcLineId(null);
          setPutawaySelection(new Set());
          setShowTraceMapping(false);
      }
  }, [activeReceipt]);

  // --- PRECONDITIONS LOGIC (Reactive) ---
  const preconditions: Precondition[] = useMemo(() => {
      if (!activeReceipt) return [];

      const p: Precondition[] = [];

      // 1. PO Linked or Valid Manual
      const isManual = !activeReceipt.poId;
      // For Manual receipts, we implicitly trust them if created, or check for audit logs.
      // S2 logic usually handles PO creation. If Receipt exists, it's linked or valid manual.
      p.push({
          id: 'PO_LINKED',
          label: isManual ? 'Manual Receipt Authorization' : 'Purchase Order Linkage',
          status: 'MET',
          description: isManual ? 'Receipt created manually with audit reason.' : `Linked to PO ${activeReceipt.poId}`
      });

      // 2. Invoice Captured
      const hasInvoice = !!activeReceipt.invoiceNo && activeReceipt.invoiceNo.length > 0;
      p.push({
          id: 'INVOICE_CAPTURED',
          label: 'Commercial Invoice',
          status: hasInvoice ? 'MET' : 'PENDING',
          description: hasInvoice ? `Captured: ${activeReceipt.invoiceNo}` : 'Invoice number missing in Evidence.'
      });

      // 3. Serials Generated & Verified (Trackable items only)
      let trackableCount = 0;
      let verifiedCount = 0;
      let generatedCount = 0;
      
      activeReceipt.lines.forEach(l => {
          if (l.trackability === ItemTrackability.TRACKABLE) {
              trackableCount += (l.qtyReceived || 0); // Use received qty as target
              if (l.units) {
                  generatedCount += l.units.length;
                  verifiedCount += l.units.filter(u => u.state === UnitState.VERIFIED || u.state === UnitState.ACCEPTED || u.state === UnitState.QC_HOLD || u.state === UnitState.REJECTED).length;
              }
          }
      });

      if (trackableCount === 0) {
          p.push({ id: 'SERIALS', label: 'Serialization', status: 'MET', description: 'No trackable items.' });
      } else {
          const allGenerated = generatedCount >= trackableCount;
          const allVerified = verifiedCount >= generatedCount && generatedCount > 0;
          
          let status: PreconditionStatus = 'PENDING';
          if (allGenerated && allVerified) status = 'MET';
          else if (!allGenerated) status = 'BLOCKED'; // Must generate first

          p.push({
              id: 'SERIALS',
              label: 'Serialization & Verification',
              status,
              description: `${verifiedCount}/${trackableCount} units verified.`
          });
      }

      // 4. QC Completed
      let pendingQC = 0;
      activeReceipt.lines.forEach(l => {
          if (l.trackability === ItemTrackability.TRACKABLE && l.units) {
               // Units that are verified but not dispositioned
               pendingQC += l.units.filter(u => u.state === UnitState.VERIFIED).length;
          }
      });
      p.push({
          id: 'QC_COMPLETED',
          label: 'Quality Control',
          status: pendingQC === 0 ? 'MET' : 'PENDING',
          description: pendingQC === 0 ? 'All verifications dispositioned.' : `${pendingQC} units pending QC decision.`
      });

      // 5. Putaway Assigned
      let unassigned = 0;
      let totalUnits = 0;
      activeReceipt.lines.forEach(l => {
          if (l.units) {
              totalUnits += l.units.length;
              // Check if accepted/hold/rejected units have putaway
              unassigned += l.units.filter(u => 
                  (u.state === UnitState.ACCEPTED || u.state === UnitState.QC_HOLD || u.state === UnitState.REJECTED) && 
                  (!u.putaway?.bin)
              ).length;
          }
      });

      p.push({
          id: 'PUTAWAY',
          label: 'Storage Assignment',
          status: unassigned === 0 ? 'MET' : 'PENDING',
          description: unassigned === 0 ? 'All processed units assigned.' : `${unassigned} units awaiting putaway.`
      });

      return p;

  }, [activeReceipt]);

  const allPreconditionsMet = preconditions.every(p => p.status === 'MET');

  const handleSelectReceipt = (id: string) => {
    s3SetActiveReceipt(id);
    setActiveTab('LINES');
    setRefreshKey(k => k + 1);
  };

  const handleLoadPo = () => {
    if (!selectedPoId) return;
    const order = openOrders.find(o => o.poId === selectedPoId);
    if (!order) return;

    // Generate new Receipt from PO
    const newLines: S3ReceiptLine[] = order.items.map((item, idx) => ({
        id: `line-${Date.now()}-${idx}`,
        receiptId: '', // Set after receipt creation
        skuId: item.skuId,
        itemName: item.itemName,
        category: item.category,
        // Rule: Only CELL, BMS, IOT are trackable by default. Others (MISC) are non-trackable.
        trackability: ['CELL', 'BMS', 'IOT'].includes(item.category) 
            ? ItemTrackability.TRACKABLE 
            : ItemTrackability.NON_TRACKABLE,
        qtyExpected: item.qtyOrdered,
        qtyReceived: 0,
        units: []
    }));

    const newReceipt: S3Receipt = {
        id: `rcpt-${Date.now()}`,
        code: makeReceiptCode(receipts.length + 1),
        supplierId: order.supplierId,
        poId: order.poId,
        attachments: [],
        createdAt: new Date().toISOString(),
        createdByRole: role,
        state: ReceiptState.DRAFT,
        lines: newLines,
        audit: [{
            id: `aud-${Date.now()}`,
            ts: new Date().toISOString(),
            actorRole: role,
            actorLabel: 'User',
            eventType: 'CREATED',
            refType: 'RECEIPT',
            refId: '',
            message: `Created from PO ${order.poCode}`
        }]
    };

    newReceipt.lines.forEach(l => l.receiptId = newReceipt.id);
    newReceipt.audit.forEach(a => a.refId = newReceipt.id);

    s3UpsertReceipt(newReceipt);
    s3SetActiveReceipt(newReceipt.id);
    setSelectedPoId(''); // Reset selector
    setRefreshKey(k => k + 1);
  };

  const handleCreateManualReceipt = () => {
      if (!manualSupplierId || manualReason.length < 10) return;
      
      const requiresAck = role !== UserRole.SYSTEM_ADMIN;
      if (requiresAck && !supervisorAck) return;

      const newReceipt: S3Receipt = {
        id: `rcpt-man-${Date.now()}`,
        code: makeReceiptCode(receipts.length + 1),
        supplierId: manualSupplierId,
        attachments: [],
        createdAt: new Date().toISOString(),
        createdByRole: role,
        state: ReceiptState.DRAFT,
        lines: [], 
        audit: [{
            id: `aud-${Date.now()}`,
            ts: new Date().toISOString(),
            actorRole: role,
            actorLabel: 'User',
            eventType: 'MANUAL_RECEIPT_CREATED',
            refType: 'RECEIPT',
            refId: '',
            message: `Manual Receipt created. Reason: ${manualReason}`
        }]
    };
    newReceipt.audit.forEach(a => a.refId = newReceipt.id);

    s3UpsertReceipt(newReceipt);
    s3SetActiveReceipt(newReceipt.id);
    setManualSupplierId('');
    setManualReason('');
    setSupervisorAck(false);
    setIntakeMode('PO');
    setRefreshKey(k => k + 1);
  };

  const handleSaveEvidence = () => {
      if (!activeReceipt) return;
      const updatedReceipt = {
          ...activeReceipt,
          ...evidenceBuffer,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'User',
                  eventType: 'EVIDENCE_UPDATED',
                  refType: 'RECEIPT',
                  refId: activeReceipt.id,
                  message: 'Updated commercial evidence metadata'
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;
      
      s3UpsertReceipt(updatedReceipt);
      setRefreshKey(k => k + 1);
  };

  const handleAddAttachment = () => {
      if (!activeReceipt) return;
      const type = window.prompt('Document Type (INVOICE, PACKING_LIST, COA, PHOTO, OTHER):', 'PACKING_LIST') as AttachmentType;
      const filename = window.prompt('Simulated Filename:', `Doc_${Date.now()}.pdf`);
      
      if (!type || !filename) return;

      const newAtt: S3Attachment = {
          id: `att-${Date.now()}`,
          type,
          filename,
          uploadedAt: new Date().toISOString(),
          uploadedBy: role
      };

      const updatedReceipt = {
          ...activeReceipt,
          attachments: [...(activeReceipt.attachments || []), newAtt],
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'User',
                  eventType: 'ATTACHMENT_ADDED',
                  refType: 'RECEIPT',
                  refId: activeReceipt.id,
                  message: `Attached document: ${filename} (${type})`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setRefreshKey(k => k + 1);
  };

  const handleUpdateLine = (lineId: string) => {
      if (!activeReceipt) return;
      const buffer = lineBuffers[lineId];
      if (!buffer) return;

      const updatedLines = activeReceipt.lines.map(l => {
          if (l.id === lineId) {
              return { ...l, ...buffer };
          }
          return l;
      });

      const updatedReceipt = {
          ...activeReceipt,
          lines: updatedLines,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'User',
                  eventType: 'LOT_UPDATED',
                  refType: 'LINE',
                  refId: lineId,
                  message: `Updated line details (Qty/Lot)`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setValidationResult(null); 
      setRefreshKey(k => k + 1);
  };

  const handleToggleTrackability = (lineId: string) => {
      if (!activeReceipt || role !== UserRole.SYSTEM_ADMIN) return;

      const line = activeReceipt.lines.find(l => l.id === lineId);
      if (!line) return;

      const newStatus = line.trackability === ItemTrackability.TRACKABLE 
          ? ItemTrackability.NON_TRACKABLE 
          : ItemTrackability.TRACKABLE;

      const updatedLines = activeReceipt.lines.map(l => {
          if (l.id === lineId) return { ...l, trackability: newStatus };
          return l;
      });

      const updatedReceipt = {
          ...activeReceipt,
          lines: updatedLines,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'Admin',
                  eventType: 'TRACKABILITY_CHANGED',
                  refType: 'LINE',
                  refId: lineId,
                  message: `Changed trackability to ${newStatus}`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setRefreshKey(k => k + 1);
  };

  const handleOpenGeneration = (lineId: string, currentUnits: number, qtyReceived: number) => {
      setGenPanel({
          lineId,
          mode: 'RANGE',
          count: Math.max(0, qtyReceived - currentUnits)
      });
  };

  const handleConfirmGeneration = () => {
      if (!activeReceipt || !genPanel) return;

      const line = activeReceipt.lines.find(l => l.id === genPanel.lineId);
      if (!line) return;

      // Start sequence could be managed properly, for now using a random seed based on line count
      const startSeq = (line.units?.length || 0) + 1000 + Math.floor(Math.random() * 5000);
      const newUnits = generateS3Units(line.id, line.category, genPanel.count, startSeq, genPanel.mode);

      // Guard: Check for duplicate Enterprise Serials within the receipt
      const existingSerials = new Set<string>();
      activeReceipt.lines.forEach(l => l.units?.forEach(u => existingSerials.add(u.enterpriseSerial)));
      
      const duplicates = newUnits.filter(u => existingSerials.has(u.enterpriseSerial));
      if (duplicates.length > 0) {
          alert(`Generation failed: ${duplicates.length} duplicate enterprise serials detected.`);
          return;
      }

      const updatedLines = activeReceipt.lines.map(l => {
          if (l.id === genPanel.lineId) {
              return {
                  ...l,
                  units: [...(l.units || []), ...newUnits]
              };
          }
          return l;
      });

      const updatedReceipt = {
          ...activeReceipt,
          lines: updatedLines,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'User',
                  eventType: 'SERIALS_GENERATED',
                  refType: 'LINE',
                  refId: genPanel.lineId,
                  message: `Generated ${genPanel.count} serials (${genPanel.mode})`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setGenPanel(null);
      setRefreshKey(k => k + 1);
  };

  // Label Printing Handlers
  const handlePrintAllPending = (lineId: string) => {
      if (!activeReceipt) return;
      const line = activeReceipt.lines.find(l => l.id === lineId);
      if (!line || !line.units) return;
      
      const now = new Date().toISOString();
      let printedCount = 0;

      const updatedUnits = line.units.map(u => {
          if (u.labelStatus === LabelStatus.NOT_PRINTED) {
              printedCount++;
              return {
                  ...u,
                  labelStatus: LabelStatus.PRINTED,
                  lastPrintedAt: now,
                  printedCount: u.printedCount + 1,
                  state: u.state === UnitState.CREATED ? UnitState.LABELED : u.state
              };
          }
          return u;
      });

      if (printedCount === 0) return;

      const updatedLines = activeReceipt.lines.map(l => {
          if (l.id === lineId) return { ...l, units: updatedUnits };
          return l;
      });

      const updatedReceipt = {
          ...activeReceipt,
          lines: updatedLines,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: now,
                  actorRole: role,
                  actorLabel: 'User',
                  eventType: 'LABELS_PRINTED_BATCH',
                  refType: 'LINE',
                  refId: lineId,
                  message: `Printed ${printedCount} labels for Line ${line.itemName}`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setRefreshKey(k => k + 1);
  };

  // Supplier Serial Entry Handlers
  const handleOpenSerialEntry = (lineId: string) => {
    const line = activeReceipt?.lines.find(l => l.id === lineId);
    if (!line) return;
    setSerialEntryLineId(lineId);
    setSerialBuffer(JSON.parse(JSON.stringify(line.units || []))); // Deep copy
    setBulkText('');
    setSerialErrors([]);
  };

  const handleBulkApply = () => {
    if (!bulkText) return;
    const lines = bulkText.split('\n').map(s => s.trim()).filter(s => s !== '');
    if (lines.length === 0) return;

    const newBuffer = [...serialBuffer];
    let lineIdx = 0;
    
    for (let i = 0; i < newBuffer.length && lineIdx < lines.length; i++) {
        if (!newBuffer[i].supplierSerialRef) {
            newBuffer[i].supplierSerialRef = lines[lineIdx];
            lineIdx++;
        }
    }
    
    setSerialBuffer(newBuffer);
    setBulkText(''); 
  };

  const handleSaveUnits = () => {
    if (!activeReceipt || !serialEntryLineId) return;

    // Validation
    const errors: string[] = [];
    const seenInReceipt = new Set<string>();
    
    activeReceipt.lines.forEach(l => {
        if (l.id === serialEntryLineId) return; // Skip current line
        l.units?.forEach(u => {
            if (u.supplierSerialRef) seenInReceipt.add(u.supplierSerialRef);
        });
    });

    const seenInBuffer = new Set<string>();

    serialBuffer.forEach((u, idx) => {
        if (!u.supplierSerialRef) return;
        const ref = u.supplierSerialRef;
        if (seenInReceipt.has(ref)) {
            errors.push(`Row ${idx + 1}: Serial '${ref}' exists in another line.`);
        }
        if (seenInBuffer.has(ref)) {
             errors.push(`Row ${idx + 1}: Duplicate serial '${ref}' in this list.`);
        }
        seenInBuffer.add(ref);
    });

    if (errors.length > 0) {
        setSerialErrors(errors);
        return;
    }

    // Persist
    const updatedLines = activeReceipt.lines.map(l => {
        if (l.id === serialEntryLineId) {
            return { ...l, units: serialBuffer };
        }
        return l;
    });

    const updatedReceipt = {
        ...activeReceipt,
        lines: updatedLines,
        audit: [
            {
                id: `aud-${Date.now()}`,
                ts: new Date().toISOString(),
                actorRole: role,
                actorLabel: 'User',
                eventType: 'UNIT_UPDATE',
                refType: 'LINE',
                refId: serialEntryLineId,
                message: `Updated units (Supplier Serials / States)`
            },
            ...activeReceipt.audit
        ]
    } as S3Receipt;

    s3UpsertReceipt(updatedReceipt);
    setSerialEntryLineId(null);
    setRefreshKey(k => k + 1);
  };

  const handleUnitTransitionInModal = (index: number, toState: UnitState) => {
     // Updates the local buffer for the modal
     // Real persistence happens on "Save Changes"
     setSerialBuffer(prev => {
         const next = [...prev];
         next[index] = { ...next[index], state: toState };
         return next;
     });
  };

  // Immediate Modal Actions (Reprint/Void) - Commits directly to store
  const handleImmediateUnitAction = (index: number, action: 'REPRINT' | 'VOID') => {
    if (!activeReceipt || !serialEntryLineId) return;
    const unit = serialBuffer[index];
    if (!unit) return;

    if (action === 'VOID') {
        const reason = window.prompt("Enter reason for voiding label:");
        if (!reason) return;
        
        // Update store directly
        const line = activeReceipt.lines.find(l => l.id === serialEntryLineId);
        if(!line || !line.units) return;

        const updatedUnits = line.units.map(u => {
            if(u.id === unit.id) {
                return { ...u, labelStatus: LabelStatus.VOIDED };
            }
            return u;
        });

        const updatedReceipt = {
            ...activeReceipt,
            lines: activeReceipt.lines.map(l => l.id === serialEntryLineId ? { ...l, units: updatedUnits } : l),
            audit: [
                {
                    id: `aud-${Date.now()}`,
                    ts: new Date().toISOString(),
                    actorRole: role,
                    actorLabel: 'User',
                    eventType: 'LABEL_VOIDED',
                    refType: 'UNIT',
                    refId: unit.id,
                    message: `Label voided: ${reason}`
                },
                ...activeReceipt.audit
            ]
        } as S3Receipt;

        s3UpsertReceipt(updatedReceipt);
    } else if (action === 'REPRINT') {
        // Update store directly
        const line = activeReceipt.lines.find(l => l.id === serialEntryLineId);
        if(!line || !line.units) return;

        const updatedUnits = line.units.map(u => {
            if(u.id === unit.id) {
                return { 
                    ...u, 
                    labelStatus: LabelStatus.PRINTED, 
                    printedCount: u.printedCount + 1,
                    lastPrintedAt: new Date().toISOString()
                };
            }
            return u;
        });

        const updatedReceipt = {
            ...activeReceipt,
            lines: activeReceipt.lines.map(l => l.id === serialEntryLineId ? { ...l, units: updatedUnits } : l),
            audit: [
                {
                    id: `aud-${Date.now()}`,
                    ts: new Date().toISOString(),
                    actorRole: role,
                    actorLabel: 'User',
                    eventType: 'LABEL_REPRINTED',
                    refType: 'UNIT',
                    refId: unit.id,
                    message: `Label reprinted (Count: ${unit.printedCount + 1})`
                },
                ...activeReceipt.audit
            ]
        } as S3Receipt;

        s3UpsertReceipt(updatedReceipt);
    }

    // Refresh modal buffer from updated store
    const refreshedReceipt = s3GetActiveReceipt();
    if (refreshedReceipt) {
        const refreshedLine = refreshedReceipt.lines.find(l => l.id === serialEntryLineId);
        if (refreshedLine && refreshedLine.units) {
             setSerialBuffer(JSON.parse(JSON.stringify(refreshedLine.units)));
        }
        setActiveReceipt(refreshedReceipt); // Trigger re-render of main
    }
  };
  
  // QC Management Handlers
  const handleOpenQC = (lineId: string) => {
     if (!activeReceipt) return;
     const line = activeReceipt.lines.find(l => l.id === lineId);
     if (!line || !line.units) return;
     setQcLineId(lineId);
     setQcBuffer(JSON.parse(JSON.stringify(line.units))); // Deep copy
     setQcFilter('PENDING'); // Default to Pending
  };
  
  const handleApplyQCDecision = (unitId: string, decision: 'ACCEPT' | 'HOLD' | 'REJECT') => {
      let reason = '';
      if (decision === 'HOLD' || decision === 'REJECT') {
          const input = window.prompt(`Enter reason for ${decision}:`);
          if (input === null) return; // Cancelled
          reason = input;
      }
      
      const toState = decision === 'ACCEPT' ? UnitState.ACCEPTED : decision === 'HOLD' ? UnitState.QC_HOLD : UnitState.REJECTED;

      setQcBuffer(prev => prev.map(u => {
          if (u.id === unitId) {
             // Use transition logic to get object structure update, but apply to buffer
             const { unit } = transitionUnit(u, toState, role, activeReceipt?.id || '', reason);
             return unit;
          }
          return u;
      }));
  };
  
  const handleSaveQC = () => {
      if (!activeReceipt || !qcLineId) return;
      
      const updatedLines = activeReceipt.lines.map(l => {
          if (l.id === qcLineId) {
              return { ...l, units: qcBuffer };
          }
          return l;
      });

      // Count decisions for audit log
      let accepted = 0, held = 0, rejected = 0;
      qcBuffer.forEach(u => {
         // This is a naive diff, simply counting totals in the new buffer is easiest for summary
         if (u.state === UnitState.ACCEPTED) accepted++;
         if (u.state === UnitState.QC_HOLD) held++;
         if (u.state === UnitState.REJECTED) rejected++;
      });
      
      const updatedReceipt = {
          ...activeReceipt,
          lines: updatedLines,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'Quality',
                  eventType: 'QC_DECISION_BATCH',
                  refType: 'LINE',
                  refId: qcLineId,
                  message: `QC Update: ${accepted} Accepted, ${held} Held, ${rejected} Rejected`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setQcLineId(null);
      setRefreshKey(k => k + 1);
  };

  // Putaway Handlers
  const handlePutawaySelectAll = () => {
      if (!activeReceipt) return;
      const allIds = new Set<string>();
      activeReceipt.lines.forEach(line => {
         line.units?.forEach(u => {
             // Filter based on active tab
             let matches = false;
             if (putawayFilter === 'ALL') matches = true;
             else if (putawayFilter === 'ACCEPTED' && u.state === UnitState.ACCEPTED) matches = true;
             else if (putawayFilter === 'HOLD' && u.state === UnitState.QC_HOLD) matches = true;
             else if (putawayFilter === 'REJECTED' && u.state === UnitState.REJECTED) matches = true;

             if (matches) allIds.add(u.id);
         });
      });
      setPutawaySelection(allIds);
  };

  const handlePutawaySelectionToggle = (unitId: string) => {
      const newSet = new Set(putawaySelection);
      if (newSet.has(unitId)) newSet.delete(unitId);
      else newSet.add(unitId);
      setPutawaySelection(newSet);
  };

  const handleAssignPutaway = () => {
      if (!activeReceipt || putawaySelection.size === 0) return;
      if (!targetLocation.warehouse || !targetLocation.zone || !targetLocation.bin) {
          alert("Please define a complete target location (Warehouse, Zone, and Bin).");
          return;
      }

      const updatedLines = activeReceipt.lines.map(line => {
          if (!line.units) return line;
          const updatedUnits = line.units.map(u => {
              if (putawaySelection.has(u.id)) {
                  return {
                      ...u,
                      putaway: { ...targetLocation }
                  };
              }
              return u;
          });
          return { ...line, units: updatedUnits };
      });

      const updatedReceipt = {
          ...activeReceipt,
          lines: updatedLines,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'Stores',
                  eventType: 'PUTAWAY_ASSIGNED',
                  refType: 'RECEIPT',
                  refId: activeReceipt.id,
                  message: `Assigned ${putawaySelection.size} units to ${targetLocation.warehouse}/${targetLocation.zone}/${targetLocation.bin}`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;

      s3UpsertReceipt(updatedReceipt);
      setPutawaySelection(new Set()); // Clear selection
      setRefreshKey(k => k + 1);
  };

  const handleCompletePutaway = () => {
      if (!activeReceipt) return;
      try {
          const updatedReceipt = transitionReceipt(activeReceipt, ReceiptState.PUTAWAY_COMPLETE, role, 'User', 'Putaway process finalized');
          s3UpsertReceipt(updatedReceipt);
          setRefreshKey(k => k + 1);
      } catch (e) {
          alert("Could not complete putaway: " + e);
      }
  };


  const handleValidate = () => {
      if (!activeReceipt) return;
      const result = validateReceipt(activeReceipt, role);
      setValidationResult(result);
      
      const updatedReceipt = {
          ...activeReceipt,
          audit: [
              {
                  id: `aud-${Date.now()}`,
                  ts: new Date().toISOString(),
                  actorRole: role,
                  actorLabel: 'User',
                  eventType: 'VALIDATION_RUN',
                  refType: 'RECEIPT',
                  refId: activeReceipt.id,
                  message: `Validation run: ${result.ok ? 'PASSED' : 'FAILED'} (${result.errors.length} errors)`
              },
              ...activeReceipt.audit
          ]
      } as S3Receipt;
      
      s3UpsertReceipt(updatedReceipt);
      setRefreshKey(k => k + 1);
  };

  const handleAdvanceState = () => {
      if (!activeReceipt || !validationResult?.ok) return;
      
      let nextState: ReceiptState | undefined = undefined;

      // Special logic for QC Completion
      if (activeReceipt.state === ReceiptState.QC_PENDING) {
          // Check for pending QC on trackable units
          let pendingQC = 0;
          activeReceipt.lines.forEach(l => {
              if (l.trackability === ItemTrackability.TRACKABLE && l.units) {
                   pendingQC += l.units.filter(u => u.state === UnitState.VERIFIED || u.state === UnitState.SCANNED).length;
              }
          });
          
          if (pendingQC > 0) {
              setValidationResult({ ok: false, errors: [{ level: 'RECEIPT', code: 'QC_INCOMPLETE', message: `${pendingQC} units are pending QC disposition.` }] });
              return;
          }

          // Calculate outcome
          let totalTrackable = 0;
          let accepted = 0;
          let rejected = 0;
          
          activeReceipt.lines.forEach(l => {
              if (l.trackability === ItemTrackability.TRACKABLE && l.units) {
                  totalTrackable += l.units.length;
                  accepted += l.units.filter(u => u.state === UnitState.ACCEPTED).length;
                  rejected += l.units.filter(u => u.state === UnitState.REJECTED).length;
              }
          });

          if (totalTrackable > 0) {
              if (rejected === totalTrackable) nextState = ReceiptState.REJECTED;
              else if (accepted === totalTrackable) nextState = ReceiptState.ACCEPTED;
              else nextState = ReceiptState.PARTIAL_ACCEPTED;
          } else {
              // No trackable items, assume Accepted if no issues raised
              nextState = ReceiptState.ACCEPTED;
          }
      } 
      // Special logic for Closure
      else if (activeReceipt.state === ReceiptState.PUTAWAY_COMPLETE || activeReceipt.state === ReceiptState.REJECTED) {
          // Validate Closure Constraints
          const closureValidation = validateClosure(activeReceipt);
          if (!closureValidation.ok) {
              setValidationResult(closureValidation); // Show errors in UI
              return;
          }

          // GATE: Check preconditions
          if (!allPreconditionsMet) {
             alert('All Operational Preconditions must be met before closing the receipt.');
             return;
          }

          nextState = ReceiptState.CLOSED;

          // EMIT S4 UNLOCK CONTRACT
          saveS3Output(activeReceipt);
      }
      else {
          // Default linear progression
          const allowed = allowedReceiptTransitions[activeReceipt.state];
          if (allowed && allowed.length > 0) nextState = allowed[0];
      }

      if (nextState) {
          try {
              const updatedReceipt = transitionReceipt(activeReceipt, nextState, role, 'User', 'Advanced via UI');
              // Append unlock log if closing
              if (nextState === ReceiptState.CLOSED) {
                 updatedReceipt.audit.push({
                     id: `aud-${Date.now()}-S4`,
                     ts: new Date().toISOString(),
                     actorRole: role,
                     actorLabel: 'System',
                     eventType: 'S3_CLOSED_AND_UNLOCKED_FOR_S4',
                     refType: 'RECEIPT',
                     refId: activeReceipt.id,
                     message: 'Receipt closed. S3 contract emitted for S4 Production.'
                 });
              }
              s3UpsertReceipt(updatedReceipt);
              setValidationResult(null); 
              setRefreshKey(k => k + 1);
          } catch (e) {
              alert("State transition failed: " + e);
          }
      }
  };

  // Helper to check for unverified units
  const getUnverifiedCount = (): number => {
    if (!activeReceipt) return 0;
    let count = 0;
    activeReceipt.lines.forEach(line => {
        if (line.trackability === ItemTrackability.TRACKABLE && line.units) {
             count += line.units.filter(u => u.state !== UnitState.VERIFIED && u.state !== UnitState.ACCEPTED && u.state !== UnitState.QC_HOLD && u.state !== UnitState.REJECTED).length;
        }
    });
    return count;
  };

  const hasUnverifiedUnits = getUnverifiedCount() > 0;
  // Blocking condition logic: if we are trying to advance to QC, we should check this.
  // For now, it's a banner display.
  
  // -- EVIDENCE MAPPING HELPERS --
  const mappedEvidenceData = useMemo(() => {
      if (!activeReceipt) return [];
      const mapping = [];
      const supplierName = suppliers.find(s => s.id === activeReceipt.supplierId)?.name || 'Unknown';
      
      for (const line of activeReceipt.lines) {
          if (!line.units) continue;
          for (const unit of line.units) {
              mapping.push({
                  unitId: unit.id,
                  enterpriseSerial: unit.enterpriseSerial,
                  supplierSerialRef: unit.supplierSerialRef || '-',
                  lotRef: line.lotRef || 'N/A',
                  itemCategory: line.category,
                  itemName: line.itemName,
                  invoiceNo: activeReceipt.invoiceNo || 'PENDING',
                  poId: activeReceipt.poId || 'MANUAL',
                  supplierName,
                  status: unit.state,
                  verifiedAt: unit.verifiedAt,
                  putaway: unit.putaway
              });
          }
      }
      return mapping;
  }, [activeReceipt, suppliers]);

  const evidenceSummary = useMemo(() => {
      if (!activeReceipt) return null;
      const totalUnits = mappedEvidenceData.length;
      const verifiedUnits = mappedEvidenceData.filter(u => u.status === UnitState.VERIFIED || u.status === UnitState.ACCEPTED).length;
      
      const cellLines = activeReceipt.lines.filter(l => l.category === 'CELL');
      const cellLinesWithLot = cellLines.filter(l => !!l.lotRef);
      const lotCoverage = cellLines.length > 0 ? Math.round((cellLinesWithLot.length / cellLines.length) * 100) : 100;
      
      return {
          totalUnits,
          verifiedUnits,
          hasInvoice: !!activeReceipt.invoiceNo,
          lotCoverage
      };
  }, [activeReceipt, mappedEvidenceData]);

  // -- PUTAWAY HELPERS --
  const putawayReady = activeReceipt && (
      activeReceipt.state === ReceiptState.ACCEPTED || 
      activeReceipt.state === ReceiptState.PARTIAL_ACCEPTED || 
      activeReceipt.state === ReceiptState.PUTAWAY_IN_PROGRESS ||
      activeReceipt.state === ReceiptState.PUTAWAY_COMPLETE ||
      activeReceipt.state === ReceiptState.REJECTED // Allow putaway for rejected items too
  );

  const putawayData = useMemo(() => {
      return mappedEvidenceData.filter(u => {
          if (putawayFilter === 'ALL') return true;
          if (putawayFilter === 'ACCEPTED') return u.status === UnitState.ACCEPTED;
          if (putawayFilter === 'HOLD') return u.status === UnitState.QC_HOLD;
          if (putawayFilter === 'REJECTED') return u.status === UnitState.REJECTED;
          return true;
      });
  }, [mappedEvidenceData, putawayFilter]);
  
  const assignedCount = mappedEvidenceData.filter(u => !!u.putaway?.bin).length;

  const getStatusColor = (state: ReceiptState) => {
    switch (state) {
      case ReceiptState.DRAFT: return 'bg-slate-100 text-slate-700 border-slate-200';
      case ReceiptState.RECEIVING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ReceiptState.SERIALIZATION_IN_PROGRESS: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case ReceiptState.QC_PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ReceiptState.ACCEPTED: return 'bg-green-100 text-green-700 border-green-200';
      case ReceiptState.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      case ReceiptState.CLOSED: return 'bg-slate-800 text-slate-200 border-slate-700';
      case ReceiptState.PUTAWAY_IN_PROGRESS: return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case ReceiptState.PUTAWAY_COMPLETE: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getUnitStateBadge = (state: UnitState) => {
      switch (state) {
          case UnitState.CREATED: return 'bg-slate-100 text-slate-600 border-slate-200';
          case UnitState.LABELED: return 'bg-blue-50 text-blue-700 border-blue-200';
          case UnitState.SCANNED: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
          case UnitState.VERIFIED: return 'bg-blue-50 text-blue-700 border-blue-200';
          case UnitState.QC_HOLD: return 'bg-amber-50 text-amber-700 border-amber-200';
          case UnitState.ACCEPTED: return 'bg-green-100 text-green-800 border-green-200';
          case UnitState.REJECTED: return 'bg-red-50 text-red-700 border-red-200';
          default: return 'bg-slate-50 text-slate-400 border-slate-200';
      }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'CELL': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'BMS': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IOT': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'MODULE': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PACK': return 'bg-violet-50 text-violet-700 border-violet-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const canCreate = canS3(role, 'CREATE_RECEIPT');
  const canEdit = activeReceipt ? canS3(role, 'EDIT_RECEIPT', activeReceipt.state) : false;
  const isReadOnly = activeReceipt?.state === ReceiptState.CLOSED;

  const isAdmin = role === UserRole.SYSTEM_ADMIN;
  const isQA = role === UserRole.QA_ENGINEER;
  const canQC = isQA || isAdmin;
  const canPutaway = isAdmin || role === UserRole.STORES || role === UserRole.OPERATOR;

  const allowedNext = activeReceipt ? allowedReceiptTransitions[activeReceipt.state] : [];
  const nextStateLabel = allowedNext && allowedNext.length > 0 ? getReceiptNextActions(activeReceipt.state) : null;

  const trackableLines = activeReceipt?.lines.filter(l => l.trackability === ItemTrackability.TRACKABLE) || [];
  const nonTrackableLines = activeReceipt?.lines.filter(l => l.trackability === ItemTrackability.NON_TRACKABLE) || [];

  const renderLineItem = (line: S3ReceiptLine) => {
    const buffer = lineBuffers[line.id] || {};
    const isTrackable = line.trackability === ItemTrackability.TRACKABLE;
    const hasError = validationResult?.errors.some(e => e.refId === line.id);
    const unitsGenerated = line.units?.length || 0;
    const isGenOpen = genPanel?.lineId === line.id;
    
    // Print stats
    const printedCount = line.units?.filter(u => u.labelStatus === LabelStatus.PRINTED).length || 0;
    const notPrintedCount = line.units?.filter(u => u.labelStatus === LabelStatus.NOT_PRINTED).length || 0;
    const voidedCount = line.units?.filter(u => u.labelStatus === LabelStatus.VOIDED).length || 0;

    return (
        <div key={line.id} className={`p-3 border rounded-lg bg-white shadow-sm ${hasError ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getCategoryColor(line.category)}`}>
                            {line.category}
                        </span>
                        <button 
                           onClick={() => handleToggleTrackability(line.id)}
                           disabled={!isAdmin || isReadOnly}
                           className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1 ${
                               isTrackable 
                               ? 'bg-blue-50 text-blue-700 border-blue-200' 
                               : 'bg-slate-50 text-slate-500 border-slate-200'
                           } ${isAdmin && !isReadOnly ? 'hover:bg-opacity-80 cursor-pointer' : 'cursor-default'}`}
                           title={isAdmin ? "Click to toggle Trackability (Admin)" : "Trackability Status"}
                        >
                            {isTrackable ? <ScanBarcode size={10} /> : <Package size={10} />}
                            {isTrackable ? 'TRACKABLE' : 'BULK'}
                            {isAdmin && <Settings2 size={8} className="opacity-50" />}
                        </button>
                    </div>
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {line.itemName}
                        {hasError && <AlertTriangle size={12} className="text-red-500" />}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">SKU: {line.skuId || 'N/A'}</div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-700">
                        {line.qtyReceived} / {line.qtyExpected}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Received</div>
                </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                            Lot / Batch Ref {isTrackable && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <input 
                                className={`w-full text-xs p-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-brand-500 ${!buffer.lotRef && isTrackable ? 'border-amber-300 bg-amber-50' : 'border-slate-300'}`}
                                placeholder="Supplier Lot No."
                                value={buffer.lotRef || ''}
                                onChange={e => setLineBuffers(prev => ({...prev, [line.id]: {...prev[line.id], lotRef: e.target.value}}))}
                                disabled={!canEdit || isReadOnly}
                            />
                            <Tag size={12} className="absolute right-2 top-2 text-slate-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Qty Recvd</label>
                        <input 
                            type="number"
                            className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={buffer.qtyReceived}
                            onChange={e => setLineBuffers(prev => ({...prev, [line.id]: {...prev[line.id], qtyReceived: parseInt(e.target.value) || 0}}))}
                            disabled={!canEdit || isReadOnly}
                        />
                    </div>
                    <div>
                        {canEdit && !isReadOnly && (
                            <button 
                                onClick={() => handleUpdateLine(line.id)}
                                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded border border-slate-200 transition-colors"
                            >
                                Update
                            </button>
                        )}
                    </div>
                </div>
                
                {isTrackable && (
                   <div className="mt-3 bg-slate-50 rounded border border-slate-200 p-2">
                      <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                              <Barcode size={14} className="text-slate-500" />
                              <span className="text-xs font-bold text-slate-600">Serials: {unitsGenerated} / {buffer.qtyReceived}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {unitsGenerated > 0 && canEdit && !isReadOnly && (
                                <button
                                    onClick={() => handleOpenSerialEntry(line.id)}
                                    className="bg-white border border-slate-300 text-slate-600 text-[10px] font-bold px-2 py-1 rounded shadow-sm hover:bg-slate-50 flex items-center gap-1"
                                >
                                    <FileDigit size={10} /> Manage Units
                                </button>
                            )}
                            {/* QC Button */}
                            {unitsGenerated > 0 && (
                                <button
                                    onClick={() => handleOpenQC(line.id)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 ${
                                        canQC && !isReadOnly
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-white border border-slate-300 text-slate-500 cursor-not-allowed opacity-50' 
                                    }`}
                                    disabled={(!canQC && !isAdmin) || isReadOnly}
                                >
                                    <ShieldCheck size={10} /> Inspect
                                </button>
                            )}
                            
                            {buffer.qtyReceived > unitsGenerated && !isGenOpen && !isReadOnly && (
                                <button 
                                    onClick={() => handleOpenGeneration(line.id, unitsGenerated, buffer.qtyReceived)}
                                    className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm hover:bg-brand-700 flex items-center gap-1"
                                >
                                    <Plus size={10} /> Generate
                                </button>
                            )}
                          </div>
                      </div>

                      {/* Label Print Summary */}
                      {unitsGenerated > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                             <div className="flex items-center gap-3 text-[10px] font-mono">
                                 <div className="flex items-center gap-1 text-slate-400" title="Not Printed"><Printer size={10} /> {notPrintedCount}</div>
                                 <div className="flex items-center gap-1 text-green-600 font-bold" title="Printed"><CheckCircle2 size={10} /> {printedCount}</div>
                                 {voidedCount > 0 && <div className="flex items-center gap-1 text-red-600 font-bold" title="Voided"><Ban size={10} /> {voidedCount}</div>}
                             </div>
                             {notPrintedCount > 0 && canEdit && !isReadOnly && (
                                 <button 
                                    onClick={() => handlePrintAllPending(line.id)}
                                    className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 flex items-center gap-1"
                                 >
                                    <Printer size={10} /> Print All Pending
                                 </button>
                             )}
                          </div>
                      )}
                      
                      {isGenOpen && (
                          <div className="mt-2 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Count</label>
                                      <input 
                                          type="number" 
                                          className="w-full text-xs p-1 rounded border border-slate-300"
                                          value={genPanel?.count}
                                          onChange={e => setGenPanel(prev => prev ? {...prev, count: parseInt(e.target.value) || 0} : null)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Mode</label>
                                      <div className="flex rounded border border-slate-300 overflow-hidden">
                                          <button onClick={() => setGenPanel(p => p ? {...p, mode: 'RANGE'} : null)} className={`flex-1 text-[9px] font-bold py-1 ${genPanel?.mode === 'RANGE' ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-500'}`}>RANGE</button>
                                          <button onClick={() => setGenPanel(p => p ? {...p, mode: 'POOL'} : null)} className={`flex-1 text-[9px] font-bold py-1 ${genPanel?.mode === 'POOL' ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-500'}`}>POOL</button>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => setGenPanel(null)} className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded">Cancel</button>
                                  <button onClick={handleConfirmGeneration} className="text-[10px] font-bold bg-green-600 text-white px-3 py-1 rounded shadow-sm hover:bg-green-700">Confirm</button>
                              </div>
                          </div>
                      )}
                      
                      {unitsGenerated > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {line.units?.slice(0, 10).map(u => (
                                  <span key={u.id} className={`text-[9px] px-1 rounded font-mono border flex items-center gap-1 ${u.state === UnitState.VERIFIED ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                    {u.enterpriseSerial}
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.state === UnitState.VERIFIED ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                  </span>
                              ))}
                              {(line.units?.length || 0) > 10 && <span className="text-[9px] text-slate-400 italic">+{unitsGenerated - 10} more</span>}
                          </div>
                      )}
                   </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-300 relative">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              Procurement <span className="text-slate-300">/</span> Inbound
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Truck className="text-brand-600" size={24} />
             Inbound Receipt & Serialization (S3)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Manage material intake, unique serialization, and initial quality checks.</p>
        </div>
        {activeReceipt && activeReceipt.state === ReceiptState.CLOSED && (
           <div className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold border border-slate-600 flex items-center gap-2">
              <Lock size={12} /> CLOSED / READ-ONLY
           </div>
        )}
      </div>

      {/* OPERATIONAL PRECONDITIONS PANEL */}
      {activeReceipt && (
          <Section 
             title="Operational Preconditions" 
             icon={ListChecks} 
             isFocused={focusedSectionId === 'PRECONDITIONS'} 
             onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'PRECONDITIONS' ? null : 'PRECONDITIONS')}
             className="mb-6"
             rightSlot={
                 <div className="text-[10px] font-mono text-slate-400">
                    {preconditions.filter(p => p.status === 'MET').length}/{preconditions.length} MET
                 </div>
             }
          >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {preconditions.map(p => (
                      <div key={p.id} className={`p-3 rounded-lg border flex flex-col gap-2 ${p.status === 'MET' ? 'bg-green-50/50 border-green-200' : p.status === 'BLOCKED' ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'}`}>
                          <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold uppercase ${p.status === 'MET' ? 'text-green-700' : p.status === 'BLOCKED' ? 'text-red-700' : 'text-amber-700'}`}>{p.status}</span>
                              {p.status === 'MET' ? <CheckCircle2 size={14} className="text-green-600" /> : p.status === 'BLOCKED' ? <Ban size={14} className="text-red-600" /> : <AlertCircle size={14} className="text-amber-600" />}
                          </div>
                          <div>
                              <div className="text-xs font-bold text-slate-700 leading-tight">{p.label}</div>
                              <div className="text-[10px] text-slate-500 mt-1 leading-tight">{p.description}</div>
                          </div>
                      </div>
                  ))}
              </div>
          </Section>
      )}

      {/* Procurement Intake Panel */}
      {canCreate && !activeReceipt && (
        <div className={`border rounded-lg p-3 shadow-sm transition-colors ${intakeMode === 'MANUAL' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded mt-0.5 ${intakeMode === 'MANUAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                    {intakeMode === 'MANUAL' ? <FileWarning size={20} /> : <FileInput size={20} />}
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className={`text-sm font-bold ${intakeMode === 'MANUAL' ? 'text-amber-900' : 'text-slate-700'}`}>
                                {intakeMode === 'MANUAL' ? 'Manual Receipt (Exception)' : 'Procurement Intake'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {intakeMode === 'MANUAL' 
                                    ? 'Create ad-hoc receipt without PO linkage. Requires audit reason.' 
                                    : 'Link S2 Purchase Order to generate Receipt'}
                            </p>
                        </div>
                        <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                            <button 
                                onClick={() => setIntakeMode('PO')}
                                className={`px-3 py-1 text-xs font-bold rounded ${intakeMode === 'PO' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                PO Link
                            </button>
                            <button 
                                onClick={() => setIntakeMode('MANUAL')}
                                className={`px-3 py-1 text-xs font-bold rounded ${intakeMode === 'MANUAL' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>

                    {intakeMode === 'PO' ? (
                        <div className="flex items-center gap-4">
                            <select 
                                className="flex-1 text-sm border border-slate-300 rounded p-2 bg-white"
                                value={selectedPoId}
                                onChange={(e) => setSelectedPoId(e.target.value)}
                            >
                                <option value="">-- Select Open Order --</option>
                                {openOrders.map(po => (
                                    <option key={po.poId} value={po.poId}>
                                        {po.poCode} — {po.supplierName} ({po.items.length} Lines)
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={handleLoadPo}
                                disabled={!selectedPoId}
                                className="bg-brand-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                <Plus size={14} />
                                Load into Receipt
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">Supplier *</label>
                                    <select 
                                        className="w-full text-sm border border-amber-200 rounded p-2 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        value={manualSupplierId}
                                        onChange={(e) => setManualSupplierId(e.target.value)}
                                    >
                                        <option value="">-- Select Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">Reason (Audit Log) *</label>
                                    <input 
                                        type="text"
                                        className="w-full text-sm border border-amber-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        placeholder="Min 10 characters..."
                                        value={manualReason}
                                        onChange={(e) => setManualReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {!isAdmin && (
                                <div className="flex items-center gap-4 bg-amber-100/50 p-2 rounded border border-amber-200">
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">Supervisor Authorization</label>
                                        <select disabled className="w-full text-xs p-1.5 rounded border border-amber-300 bg-slate-50 text-slate-500">
                                            <option>System Admin (Demo Supervisor)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <input 
                                            type="checkbox" 
                                            id="ack" 
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                            checked={supervisorAck}
                                            onChange={(e) => setSupervisorAck(e.target.checked)}
                                        />
                                        <label htmlFor="ack" className="text-xs font-bold text-amber-900 cursor-pointer select-none">
                                            I confirm verbal approval
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button 
                                    onClick={handleCreateManualReceipt}
                                    disabled={!manualSupplierId || manualReason.length < 10 || (!isAdmin && !supervisorAck)}
                                    className="bg-amber-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-colors"
                                >
                                    <ShieldAlert size={14} />
                                    Create Manual Receipt
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Banner */}
      {activeReceipt && (
        <div className="bg-white border border-blue-200 bg-blue-50 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full border border-blue-200">
                    <Package size={24} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">{activeReceipt.code}</h2>
                        {!activeReceipt.poId && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                                <FileWarning size={10} /> Manual
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getStatusColor(activeReceipt.state)}`}>
                            {activeReceipt.state.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span>{activeReceipt.lines.length} Line Items</span>
                        {activeReceipt.poId && (
                            <>
                                <span className="text-slate-400">|</span>
                                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-blue-100 text-blue-700 font-bold">{activeReceipt.poId}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Actions: Validate & Advance */}
            <div className="flex flex-col items-end gap-2">
                {!isReadOnly && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleValidate}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <ShieldCheck size={14} /> Validate
                        </button>
                        {nextStateLabel && (
                            <div className="flex flex-col items-end">
                                <button 
                                    onClick={handleAdvanceState}
                                    disabled={(!validationResult?.ok && activeReceipt.state !== ReceiptState.PUTAWAY_COMPLETE && activeReceipt.state !== ReceiptState.REJECTED) || (activeReceipt.state === ReceiptState.PUTAWAY_COMPLETE && !allPreconditionsMet)}
                                    className="px-4 py-1.5 bg-brand-600 border border-brand-700 text-white rounded-md text-xs font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={!allPreconditionsMet && (activeReceipt.state === ReceiptState.PUTAWAY_COMPLETE || activeReceipt.state === ReceiptState.REJECTED) ? "Unmet Preconditions" : "Advance Workflow"}
                                >
                                    <PlayCircle size={14} /> {nextStateLabel}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {validationResult && !validationResult.ok && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={10} /> Fix {validationResult.errors.length} validation errors
                    </span>
                )}
            </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Left: Receipts List */}
          <div className="col-span-4 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <LayoutList size={16} /> Receipts
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{receipts.length} Active</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {receipts.map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => handleSelectReceipt(r.id)}
                        className={`p-3 rounded-md cursor-pointer border transition-all ${
                            activeReceipt?.id === r.id 
                            ? 'bg-brand-50 border-brand-200 shadow-sm' 
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                          <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-700 text-sm">{r.code}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${getStatusColor(r.state)}`}>
                                  {r.state.replace(/_/g, ' ')}
                              </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                              {!r.poId && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">MANUAL</span>}
                              <span>PO: {r.poId || 'N/A'}</span>
                              <span className="text-slate-300">•</span> 
                              <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                      </div>
                  ))}
                  {receipts.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm italic">
                          No receipts found. Create one from Open Orders.
                      </div>
                  )}
              </div>
          </div>

          {/* Right: Detail Placeholder */}
          <div className="col-span-8 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              {activeReceipt ? (
                  <div className="flex-1 flex flex-col">
                      
                      {/* Validation Panel */}
                      {validationResult && !validationResult.ok && (
                          <div className="bg-red-50 border-b border-red-200 p-4 animate-in slide-in-from-top-2">
                              <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
                                  <AlertTriangle size={16} /> Validation Failed
                              </div>
                              <ul className="space-y-1">
                                  {validationResult.errors.map((err, idx) => (
                                      <li key={idx} className="text-xs text-red-700 flex gap-2">
                                          <span className="font-mono font-bold">[{err.level}]</span> {err.message}
                                          {err.refId && <span className="text-red-400 font-mono">Ref: {err.refId}</span>}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}

                      {/* Tabs */}
                      <div className="flex border-b border-slate-100 bg-slate-50/50">
                          <button 
                            onClick={() => setActiveTab('LINES')}
                            className={`flex-1 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${activeTab === 'LINES' ? 'border-brand-500 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                          >
                             Line Items ({activeReceipt.lines.length})
                          </button>
                          <button 
                            onClick={() => setActiveTab('EVIDENCE')}
                            className={`flex-1 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${activeTab === 'EVIDENCE' ? 'border-brand-500 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                          >
                             Evidence & Docs
                          </button>
                          {putawayReady && (
                            <button 
                                onClick={() => setActiveTab('PUTAWAY')}
                                className={`flex-1 py-3 text-xs font-bold uppercase transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'PUTAWAY' ? 'border-cyan-500 text-cyan-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Archive size={14} /> Putaway
                            </button>
                          )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                          {activeTab === 'EVIDENCE' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                  {/* Doc Fields */}
                                  <Section 
                                      title="Commercial Documentation" 
                                      icon={FileText} 
                                      isFocused={focusedSectionId === 'EVIDENCE_DOCS'} 
                                      onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'EVIDENCE_DOCS' ? null : 'EVIDENCE_DOCS')}
                                  >
                                      <div className="grid grid-cols-2 gap-4 mb-4">
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice No</label>
                                              <input 
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.invoiceNo || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, invoiceNo: e.target.value }))}
                                                disabled={!canEdit || isReadOnly}
                                                placeholder="e.g. INV-2026-991"
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice Date</label>
                                              <input 
                                                type="date"
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.invoiceDate || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, invoiceDate: e.target.value }))}
                                                disabled={!canEdit || isReadOnly}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Packing List Ref</label>
                                              <input 
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.packingListRef || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, packingListRef: e.target.value }))}
                                                disabled={!canEdit || isReadOnly}
                                                placeholder="e.g. PKL-001"
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transport Doc</label>
                                              <input 
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.transportDocRef || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, transportDocRef: e.target.value }))}
                                                disabled={!canEdit || isReadOnly}
                                                placeholder="e.g. BL-7721"
                                              />
                                          </div>
                                      </div>
                                      {canEdit && !isReadOnly && (
                                          <div className="flex justify-end">
                                              <button onClick={handleSaveEvidence} className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded hover:bg-brand-700 shadow-sm">
                                                  <Save size={12} /> Save Changes
                                              </button>
                                          </div>
                                      )}
                                  </Section>

                                  {/* Attachments */}
                                  <Section 
                                      title="Attachments" 
                                      icon={Paperclip}
                                      isFocused={focusedSectionId === 'EVIDENCE_ATTACHMENTS'}
                                      onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'EVIDENCE_ATTACHMENTS' ? null : 'EVIDENCE_ATTACHMENTS')}
                                      rightSlot={
                                          canEdit && !isReadOnly && (
                                              <button onClick={handleAddAttachment} className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1">
                                                  <Plus size={12} /> Attach Document
                                              </button>
                                          )
                                      }
                                  >
                                      <div className="space-y-2">
                                          {activeReceipt.attachments && activeReceipt.attachments.length > 0 ? activeReceipt.attachments.map(att => (
                                              <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded">
                                                  <div className="flex items-center gap-3">
                                                      <div className="p-1.5 bg-white border border-slate-200 rounded text-slate-500">
                                                          <FileText size={14} />
                                                      </div>
                                                      <div>
                                                          <div className="text-sm font-medium text-slate-700">{att.filename}</div>
                                                          <div className="text-[10px] text-slate-400 uppercase">{att.type} • {new Date(att.uploadedAt).toLocaleDateString()}</div>
                                                      </div>
                                                  </div>
                                                  <a href="#" className="text-xs text-brand-600 hover:underline">View</a>
                                              </div>
                                          )) : (
                                              <div className="text-center py-4 text-xs text-slate-400 italic">No attachments yet.</div>
                                          )}
                                      </div>
                                  </Section>
                              </div>
                          )}

                          {activeTab === 'LINES' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
                                  
                                  {/* Serialization Evidence Summary Card */}
                                  {evidenceSummary && (
                                    <Section
                                        title="Serialization Evidence Summary"
                                        icon={Link}
                                        isFocused={focusedSectionId === 'EVIDENCE_SUMMARY'}
                                        onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'EVIDENCE_SUMMARY' ? null : 'EVIDENCE_SUMMARY')}
                                        rightSlot={
                                            <button 
                                              onClick={() => setShowTraceMapping(true)}
                                              className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                                            >
                                                <FileSearch size={12} /> Trace Map
                                            </button>
                                        }
                                    >
                                        <div className="grid grid-cols-4 gap-4 text-center">
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Units</div>
                                                <div className="text-lg font-mono font-bold text-slate-700">{evidenceSummary.totalUnits}</div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Verified</div>
                                                <div className={`text-lg font-mono font-bold ${evidenceSummary.verifiedUnits > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                    {evidenceSummary.verifiedUnits}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Invoice Linked</div>
                                                <div className={`text-lg font-bold ${evidenceSummary.hasInvoice ? 'text-green-600' : 'text-amber-500'}`}>
                                                    {evidenceSummary.hasInvoice ? 'YES' : 'NO'}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Lot Coverage (Cell)</div>
                                                <div className={`text-lg font-mono font-bold ${evidenceSummary.lotCoverage === 100 ? 'text-green-600' : 'text-amber-500'}`}>
                                                    {evidenceSummary.lotCoverage}%
                                                </div>
                                            </div>
                                        </div>
                                    </Section>
                                  )}

                                  {/* Trackable Items */}
                                  <Section
                                      title="Trackable Items (Serialization Required)"
                                      icon={ScanBarcode}
                                      isFocused={focusedSectionId === 'LINES_TRACKABLE'}
                                      onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'LINES_TRACKABLE' ? null : 'LINES_TRACKABLE')}
                                  >
                                      <div className="space-y-3">
                                          {trackableLines.length > 0 ? trackableLines.map(renderLineItem) : (
                                              <div className="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded">
                                                  No trackable items in this receipt.
                                              </div>
                                          )}
                                      </div>
                                  </Section>

                                  {/* Non-Trackable Items */}
                                  <Section
                                      title="Bulk / Non-Trackable Items"
                                      icon={Package}
                                      isFocused={focusedSectionId === 'LINES_BULK'}
                                      onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'LINES_BULK' ? null : 'LINES_BULK')}
                                  >
                                      <div className="space-y-3">
                                          {nonTrackableLines.length > 0 ? nonTrackableLines.map(renderLineItem) : (
                                              <div className="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded">
                                                  No bulk items in this receipt.
                                              </div>
                                          )}
                                      </div>
                                  </Section>

                                  {activeReceipt.lines.length === 0 && (
                                      <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                          <RefreshCcw className="opacity-20" size={32} />
                                          <p>No line items in this receipt.</p>
                                      </div>
                                  )}
                              </div>
                          )}

                          {activeTab === 'PUTAWAY' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 h-full flex flex-col">
                                  {/* Putaway Filters & Summary */}
                                  <Section
                                    title="Putaway Assignment"
                                    icon={Archive}
                                    isFocused={focusedSectionId === 'PUTAWAY_ASSIGN'}
                                    onToggleFocus={() => setFocusedSectionId(focusedSectionId === 'PUTAWAY_ASSIGN' ? null : 'PUTAWAY_ASSIGN')}
                                    rightSlot={
                                        <div className="text-xs text-slate-500 font-mono">
                                              Assigned: <span className="font-bold text-green-600">{assignedCount}</span> / {mappedEvidenceData.length}
                                          </div>
                                    }
                                  >
                                      
                                      <div className="flex gap-2 mb-4">
                                          <button onClick={() => setPutawayFilter('ALL')} className={`px-3 py-1 rounded-full text-xs font-bold ${putawayFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>All</button>
                                          <button onClick={() => setPutawayFilter('ACCEPTED')} className={`px-3 py-1 rounded-full text-xs font-bold ${putawayFilter === 'ACCEPTED' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Available (Accepted)</button>
                                          <button onClick={() => setPutawayFilter('HOLD')} className={`px-3 py-1 rounded-full text-xs font-bold ${putawayFilter === 'HOLD' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>On Hold</button>
                                          <button onClick={() => setPutawayFilter('REJECTED')} className={`px-3 py-1 rounded-full text-xs font-bold ${putawayFilter === 'REJECTED' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Rejected</button>
                                      </div>

                                      {/* Assignment Controls */}
                                      {activeReceipt.state !== ReceiptState.PUTAWAY_COMPLETE && activeReceipt.state !== ReceiptState.CLOSED && !isReadOnly && (
                                        <div className="bg-cyan-50/30 p-4 rounded-lg border border-cyan-200 mb-4">
                                            <div className="grid grid-cols-4 gap-4 items-end">
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Warehouse</label>
                                                    <select className="w-full text-xs p-2 border border-slate-300 rounded bg-white" value={targetLocation.warehouse} onChange={e => setTargetLocation(p => ({...p, warehouse: e.target.value}))}>
                                                        <option>Main Warehouse</option>
                                                        <option>Overflow Annex</option>
                                                        <option>Returns Center</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Zone</label>
                                                    <select className="w-full text-xs p-2 border border-slate-300 rounded bg-white" value={targetLocation.zone} onChange={e => setTargetLocation(p => ({...p, zone: e.target.value}))}>
                                                        <option>Zone A (Fast)</option>
                                                        <option>Zone B (Bulk)</option>
                                                        <option>Zone C (Cold)</option>
                                                        <option>Zone Q (Quarantine)</option>
                                                        <option>Zone R (Returns)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Bin Location</label>
                                                    <input className="w-full text-xs p-2 border border-slate-300 rounded" placeholder="e.g. A-01-04" value={targetLocation.bin} onChange={e => setTargetLocation(p => ({...p, bin: e.target.value}))} />
                                                </div>
                                                <button 
                                                    onClick={handleAssignPutaway}
                                                    disabled={!canPutaway || putawaySelection.size === 0}
                                                    className="bg-cyan-600 text-white text-xs font-bold py-2 rounded shadow-sm hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <MapPin size={14} /> Assign ({putawaySelection.size})
                                                </button>
                                            </div>
                                        </div>
                                      )}

                                      {/* Unit Table */}
                                      <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[400px]">
                                          <div className="overflow-auto">
                                              <table className="w-full text-left text-xs">
                                                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                                                      <tr>
                                                          <th className="px-4 py-2 w-10 text-center">
                                                              <input type="checkbox" onChange={handlePutawaySelectAll} checked={putawayData.length > 0 && putawaySelection.size === putawayData.length} disabled={isReadOnly} />
                                                          </th>
                                                          <th className="px-4 py-2 font-bold uppercase">Serial Number</th>
                                                          <th className="px-4 py-2 font-bold uppercase">Item</th>
                                                          <th className="px-4 py-2 font-bold uppercase text-center">Status</th>
                                                          <th className="px-4 py-2 font-bold uppercase">Current Location</th>
                                                      </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                      {putawayData.map(u => (
                                                          <tr key={u.unitId} className={`hover:bg-slate-50 ${putawaySelection.has(u.unitId) ? 'bg-cyan-50/50' : ''}`}>
                                                              <td className="px-4 py-2 text-center">
                                                                  <input type="checkbox" checked={putawaySelection.has(u.unitId)} onChange={() => handlePutawaySelectionToggle(u.unitId)} disabled={isReadOnly} />
                                                              </td>
                                                              <td className="px-4 py-2 font-mono text-slate-700">{u.enterpriseSerial}</td>
                                                              <td className="px-4 py-2 text-slate-600">{u.itemName} <span className="text-slate-400 text-[10px]">({u.itemCategory})</span></td>
                                                              <td className="px-4 py-2 text-center">
                                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getUnitStateBadge(u.status)}`}>{u.status}</span>
                                                              </td>
                                                              <td className="px-4 py-2">
                                                                  {u.putaway?.bin ? (
                                                                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                                                          {u.putaway.warehouse?.split(' ')[0]}/{u.putaway.zone?.split(' ')[1]}/{u.putaway.bin}
                                                                      </span>
                                                                  ) : <span className="text-slate-300 italic">-</span>}
                                                              </td>
                                                          </tr>
                                                      ))}
                                                      {putawayData.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No units match filter criteria.</td></tr>}
                                                  </tbody>
                                              </table>
                                          </div>
                                      </div>
                                  </Section>
                                  
                                  {/* Complete Action */}
                                  {activeReceipt.state !== ReceiptState.PUTAWAY_COMPLETE && activeReceipt.state !== ReceiptState.CLOSED && activeReceipt.state !== ReceiptState.REJECTED && (
                                    <div className="flex justify-end pt-2">
                                        <button 
                                            onClick={handleCompletePutaway}
                                            disabled={assignedCount < mappedEvidenceData.length || !canPutaway || isReadOnly}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            title={assignedCount < mappedEvidenceData.length ? "Assign all units first" : "Finalize Putaway"}
                                        >
                                            <Archive size={16} /> Complete Putaway Process
                                        </button>
                                    </div>
                                  )}
                                  
                                  {/* REJECTED Case Putaway handling */}
                                  {activeReceipt.state === ReceiptState.REJECTED && (
                                     <div className="flex justify-end pt-2">
                                         <p className="text-xs text-red-600 italic mr-4 flex items-center gap-1"><AlertCircle size={14} /> Receipt Rejected. Assign to Returns/Quarantine then Close.</p>
                                     </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                      <LayoutList size={48} className="opacity-10" />
                      <span className="text-sm font-medium">Select a receipt to view details</span>
                  </div>
              )}
          </div>
      </div>

      {/* Trace Mapping Modal */}
      {showTraceMapping && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowTraceMapping(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Link className="text-blue-600" size={20} />
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Traceability Evidence Map</h3>
                            <p className="text-xs text-slate-500">
                                {activeReceipt?.code} • {mappedEvidenceData.length} Tracked Units
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setShowTraceMapping(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center">#</th>
                                <th className="px-4 py-3 font-bold uppercase">Enterprise Serial</th>
                                <th className="px-4 py-3 font-bold uppercase">Supplier Serial</th>
                                <th className="px-4 py-3 font-bold uppercase">Lot / Batch</th>
                                <th className="px-4 py-3 font-bold uppercase">Invoice Ref</th>
                                <th className="px-4 py-3 font-bold uppercase">Supplier</th>
                                <th className="px-4 py-3 font-bold uppercase text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {mappedEvidenceData.map((row, idx) => (
                                <tr key={row.unitId} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{row.enterpriseSerial}</td>
                                    <td className="px-4 py-3 font-mono text-slate-600">{row.supplierSerialRef}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded ${!row.lotRef || row.lotRef === 'N/A' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                            {row.lotRef}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-600">
                                        {row.invoiceNo === 'PENDING' ? <span className="text-amber-500 font-bold">PENDING</span> : row.invoiceNo}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{row.supplierName}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getUnitStateBadge(row.status)}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {mappedEvidenceData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">No serialized units found for this receipt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center rounded-b-lg">
                    <div className="text-[10px] text-slate-400">
                        Generated from active operational context. Not a persistent report.
                    </div>
                    <button 
                        onClick={() => setShowTraceMapping(false)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        Close View
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Supplier Serial Entry Modal */}
      {serialEntryLineId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSerialEntryLineId(null)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <FileDigit className="text-blue-600" size={20} />
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Manage Units & Serials</h3>
                            <p className="text-xs text-slate-500">
                                {activeReceipt?.lines.find(l => l.id === serialEntryLineId)?.itemName}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSerialEntryLineId(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Bulk Paste */}
                    <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Copy size={12} /> Bulk Paste Supplier Serials
                            </label>
                            <span className="text-[10px] text-slate-400">One serial per line</span>
                        </div>
                        <textarea 
                            className="w-full text-xs p-3 border border-slate-300 rounded h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="Paste multiple serials here..."
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                        />
                        <div className="mt-2 flex justify-end">
                            <button 
                                onClick={handleBulkApply}
                                disabled={!bulkText}
                                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Apply to Empty Slots
                            </button>
                        </div>
                    </div>

                    {/* Unit List */}
                    <div>
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase">Unit List ({serialBuffer.length})</h4>
                            <span className="text-[10px] text-slate-400">Total Buffer Count</span>
                         </div>
                         <div className="border border-slate-200 rounded overflow-hidden">
                             <table className="w-full text-left text-xs">
                                 <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                     <tr>
                                         <th className="px-3 py-2 w-12 text-center">#</th>
                                         <th className="px-3 py-2">Enterprise Serial</th>
                                         <th className="px-3 py-2">Supplier Serial (Input)</th>
                                         <th className="px-3 py-2 text-center">State</th>
                                         <th className="px-3 py-2 text-center">Label</th>
                                         <th className="px-3 py-2 text-center">Actions</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {serialBuffer.map((unit, idx) => {
                                        const nextState = getNextUnitState(unit.state);
                                        // Permission Check (Simplified)
                                        const canAdvance = role === UserRole.SYSTEM_ADMIN || role === UserRole.STORES || (unit.state === UnitState.SCANNED && role === UserRole.QA_ENGINEER);
                                        const canPrint = role === UserRole.SYSTEM_ADMIN || role === UserRole.STORES;
                                        
                                        const isVoided = unit.labelStatus === LabelStatus.VOIDED;

                                        return (
                                         <tr key={unit.id} className={`hover:bg-slate-50 ${isVoided ? 'bg-red-50/50' : ''}`}>
                                             <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                                             <td className="px-3 py-2 font-mono text-slate-600">
                                                {unit.enterpriseSerial}
                                                {isVoided && <span className="ml-2 text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold">VOID</span>}
                                             </td>
                                             <td className="px-3 py-2">
                                                 <input 
                                                    className="w-full border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 font-mono text-slate-800"
                                                    placeholder="Scan or Enter..."
                                                    value={unit.supplierSerialRef || ''}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setSerialBuffer(prev => prev.map((u, i) => i === idx ? { ...u, supplierSerialRef: newVal } : u));
                                                        setSerialErrors([]); // Clear errors on edit
                                                    }}
                                                    disabled={isVoided}
                                                 />
                                             </td>
                                             <td className="px-3 py-2 text-center">
                                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getUnitStateBadge(unit.state)}`}>
                                                     {unit.state}
                                                 </span>
                                             </td>
                                             <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                    unit.labelStatus === LabelStatus.PRINTED ? 'bg-green-50 text-green-700 border-green-200' :
                                                    unit.labelStatus === LabelStatus.VOIDED ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-slate-50 text-slate-400 border-slate-200'
                                                }`}>
                                                    {unit.labelStatus === LabelStatus.NOT_PRINTED ? '-' : unit.labelStatus}
                                                </span>
                                             </td>
                                             <td className="px-3 py-2 text-center flex items-center justify-center gap-2">
                                                 {nextState && !isVoided && (
                                                     <button 
                                                        onClick={() => handleUnitTransitionInModal(idx, nextState)}
                                                        disabled={!canAdvance}
                                                        className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:bg-white hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        title={`Advance to ${nextState}`}
                                                     >
                                                        {nextState === UnitState.VERIFIED ? <ShieldCheck size={10} /> : <ArrowRightCircle size={10} />}
                                                     </button>
                                                 )}
                                                 {canPrint && !isVoided && (
                                                     <>
                                                        <button 
                                                            onClick={() => handleImmediateUnitAction(idx, 'REPRINT')}
                                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Reprint Label"
                                                        >
                                                            <RotateCcw size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleImmediateUnitAction(idx, 'VOID')}
                                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Void Label"
                                                        >
                                                            <Ban size={12} />
                                                        </button>
                                                     </>
                                                 )}
                                             </td>
                                         </tr>
                                        );
                                     })}
                                 </tbody>
                             </table>
                         </div>
                    </div>

                    {/* Validation Errors */}
                    {serialErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 space-y-1">
                            <div className="flex items-center gap-2 font-bold mb-1">
                                <AlertCircle size={14} /> Validation Failed
                            </div>
                            <ul className="list-disc pl-5">
                                {serialErrors.slice(0, 5).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                                {serialErrors.length > 5 && <li>...and {serialErrors.length - 5} more.</li>}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
                    <button 
                        onClick={() => setSerialEntryLineId(null)}
                        className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveUnits}
                        className="px-4 py-2 bg-green-600 text-white font-bold text-xs rounded hover:bg-green-700 shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Save size={14} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* QC Decision Modal */}
      {qcLineId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setQcLineId(null)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-purple-600" size={20} />
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Quality Control Inspection</h3>
                            <p className="text-xs text-slate-500">
                                {activeReceipt?.lines.find(l => l.id === qcLineId)?.itemName}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setQcLineId(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Filters */}
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setQcFilter('ALL')} className={`px-3 py-1 rounded-full text-xs font-bold ${qcFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>All</button>
                        <button onClick={() => setQcFilter('PENDING')} className={`px-3 py-1 rounded-full text-xs font-bold ${qcFilter === 'PENDING' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Pending (Verified)</button>
                        <button onClick={() => setQcFilter('HOLD')} className={`px-3 py-1 rounded-full text-xs font-bold ${qcFilter === 'HOLD' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>On Hold</button>
                        <button onClick={() => setQcFilter('FINAL')} className={`px-3 py-1 rounded-full text-xs font-bold ${qcFilter === 'FINAL' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Finalized</button>
                    </div>

                    {/* Unit List */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                         <table className="w-full text-left text-xs">
                             <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                 <tr>
                                     <th className="px-3 py-2 w-12 text-center">#</th>
                                     <th className="px-3 py-2">Enterprise Serial</th>
                                     <th className="px-3 py-2 text-center">Status</th>
                                     <th className="px-3 py-2 text-center">QC Decision</th>
                                     <th className="px-3 py-2">Reason / Notes</th>
                                     <th className="px-3 py-2 text-center">Action</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {qcBuffer.filter(u => {
                                     if (qcFilter === 'ALL') return true;
                                     if (qcFilter === 'PENDING') return u.state === UnitState.VERIFIED;
                                     if (qcFilter === 'HOLD') return u.state === UnitState.QC_HOLD;
                                     if (qcFilter === 'FINAL') return u.state === UnitState.ACCEPTED || u.state === UnitState.REJECTED;
                                     return true;
                                 }).map((unit, idx) => {
                                    const canAct = canQC; 
                                    return (
                                     <tr key={unit.id} className="hover:bg-slate-50">
                                         <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                                         <td className="px-3 py-2 font-mono text-slate-600">{unit.enterpriseSerial}</td>
                                         <td className="px-3 py-2 text-center">
                                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getUnitStateBadge(unit.state)}`}>
                                                 {unit.state}
                                             </span>
                                         </td>
                                         <td className="px-3 py-2 text-center font-bold">
                                             {unit.qcDecision || '-'}
                                         </td>
                                         <td className="px-3 py-2 text-slate-500 italic truncate max-w-xs" title={unit.qcReason}>
                                             {unit.qcReason || '-'}
                                         </td>
                                         <td className="px-3 py-2 text-center">
                                            {(unit.state === UnitState.VERIFIED || unit.state === UnitState.QC_HOLD) && canAct ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleApplyQCDecision(unit.id, 'ACCEPT')} className="p-1 text-slate-300 hover:text-green-600 hover:bg-green-50 rounded" title="Accept"><ThumbsUp size={14} /></button>
                                                    <button onClick={() => handleApplyQCDecision(unit.id, 'HOLD')} className="p-1 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded" title="Hold"><PauseCircle size={14} /></button>
                                                    <button onClick={() => handleApplyQCDecision(unit.id, 'REJECT')} className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded" title="Reject"><ThumbsDown size={14} /></button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-[10px]">-</span>
                                            )}
                                         </td>
                                     </tr>
                                    );
                                 })}
                                 {qcBuffer.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400 italic">No units available for inspection.</td></tr>}
                             </tbody>
                         </table>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
                    <button 
                        onClick={() => setQcLineId(null)}
                        className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    {canQC && (
                        <button 
                            onClick={handleSaveQC}
                            className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded hover:bg-purple-700 shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Save size={14} /> Commit Decisions
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
