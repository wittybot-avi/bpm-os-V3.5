
import React, { useEffect, useState, useContext } from 'react';
import { Truck, Package, Activity, ArrowRight, LayoutList, Plus, FileInput, CheckCircle2, ShieldAlert, FileWarning, RefreshCcw, Paperclip, FileText, Calendar, Tag, Save, X, AlertTriangle, PlayCircle, ShieldCheck, ScanBarcode, Settings2, Barcode, Database } from 'lucide-react';
import { NavView, UserContext, UserRole } from '../types';
import { S3Receipt, ReceiptState, getReceiptNextActions, S3ReceiptLine, ItemTrackability, makeReceiptCode, canS3, S3Attachment, AttachmentType, validateReceipt, ValidationResult, transitionReceipt, allowedReceiptTransitions, generateS3Units } from '../stages/s3/contracts';
import { s3ListReceipts, s3GetActiveReceipt, s3SetActiveReceipt, s3UpsertReceipt } from '../sim/api/s3/s3Inbound.handlers';
import { s3ListOpenOrdersFromS2, S3MockOrder, s3ListSuppliers, S3Supplier } from '../sim/api/s3/s3S2Adapter';

interface InboundReceiptProps {
  onNavigate?: (view: NavView) => void;
}

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
  const [activeTab, setActiveTab] = useState<'LINES' | 'EVIDENCE'>('LINES');
  
  // Validation State
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // Edit Buffers
  const [evidenceBuffer, setEvidenceBuffer] = useState<Partial<S3Receipt>>({});
  const [lineBuffers, setLineBuffers] = useState<Record<string, Partial<S3ReceiptLine>>>({});

  // Serial Generation State
  const [genPanel, setGenPanel] = useState<{ lineId: string, mode: 'RANGE' | 'POOL', count: number } | null>(null);

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
      }
  }, [activeReceipt]);

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
      
      const allowed = allowedReceiptTransitions[activeReceipt.state];
      if (!allowed || allowed.length === 0) return;
      
      const nextState = allowed[0];

      try {
          const updatedReceipt = transitionReceipt(activeReceipt, nextState, role, 'User', 'Advanced via UI');
          s3UpsertReceipt(updatedReceipt);
          setValidationResult(null); // Reset on transition
          setRefreshKey(k => k + 1);
      } catch (e) {
          alert("State transition failed: " + e);
      }
  };

  const getStatusColor = (state: ReceiptState) => {
    switch (state) {
      case ReceiptState.DRAFT: return 'bg-slate-100 text-slate-700 border-slate-200';
      case ReceiptState.RECEIVING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ReceiptState.SERIALIZATION_IN_PROGRESS: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case ReceiptState.QC_PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ReceiptState.ACCEPTED: return 'bg-green-100 text-green-700 border-green-200';
      case ReceiptState.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      case ReceiptState.CLOSED: return 'bg-slate-800 text-slate-200 border-slate-700';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
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
  const isAdmin = role === UserRole.SYSTEM_ADMIN;

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
                           disabled={!isAdmin}
                           className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1 ${
                               isTrackable 
                               ? 'bg-blue-50 text-blue-700 border-blue-200' 
                               : 'bg-slate-50 text-slate-500 border-slate-200'
                           } ${isAdmin ? 'hover:bg-opacity-80 cursor-pointer' : 'cursor-default'}`}
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
                                disabled={!canEdit}
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
                            disabled={!canEdit}
                        />
                    </div>
                    <div>
                        {canEdit && (
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
                          {buffer.qtyReceived > unitsGenerated && !isGenOpen && (
                             <button 
                               onClick={() => handleOpenGeneration(line.id, unitsGenerated, buffer.qtyReceived)}
                               className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm hover:bg-brand-700 flex items-center gap-1"
                             >
                                <Plus size={10} /> Generate
                             </button>
                          )}
                      </div>
                      
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
                                  <span key={u.id} className="text-[9px] bg-white border border-slate-200 px-1 rounded text-slate-500 font-mono">{u.enterpriseSerial}</span>
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
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-300">
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
      </div>

      {/* Procurement Intake Panel */}
      {canCreate && (
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
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleValidate}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <ShieldCheck size={14} /> Validate
                    </button>
                    {nextStateLabel && (
                        <button 
                            onClick={handleAdvanceState}
                            disabled={!validationResult?.ok}
                            className="px-4 py-1.5 bg-brand-600 border border-brand-700 text-white rounded-md text-xs font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PlayCircle size={14} /> {nextStateLabel}
                        </button>
                    )}
                </div>
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
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                          {activeTab === 'EVIDENCE' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                  {/* Doc Fields */}
                                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                          <FileText size={16} className="text-blue-600" />
                                          <h3 className="font-bold text-slate-700 text-sm">Commercial Documentation</h3>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 mb-4">
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice No</label>
                                              <input 
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.invoiceNo || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, invoiceNo: e.target.value }))}
                                                disabled={!canEdit}
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
                                                disabled={!canEdit}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Packing List Ref</label>
                                              <input 
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.packingListRef || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, packingListRef: e.target.value }))}
                                                disabled={!canEdit}
                                                placeholder="e.g. PKL-001"
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transport Doc</label>
                                              <input 
                                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                value={evidenceBuffer.transportDocRef || ''}
                                                onChange={e => setEvidenceBuffer(prev => ({ ...prev, transportDocRef: e.target.value }))}
                                                disabled={!canEdit}
                                                placeholder="e.g. BL-7721"
                                              />
                                          </div>
                                      </div>
                                      {canEdit && (
                                          <div className="flex justify-end">
                                              <button onClick={handleSaveEvidence} className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded hover:bg-brand-700 shadow-sm">
                                                  <Save size={12} /> Save Changes
                                              </button>
                                          </div>
                                      )}
                                  </div>

                                  {/* Attachments */}
                                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                                          <div className="flex items-center gap-2">
                                              <Paperclip size={16} className="text-slate-500" />
                                              <h3 className="font-bold text-slate-700 text-sm">Attachments</h3>
                                          </div>
                                          {canEdit && (
                                              <button onClick={handleAddAttachment} className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1">
                                                  <Plus size={12} /> Attach Document
                                              </button>
                                          )}
                                      </div>
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
                                  </div>
                              </div>
                          )}

                          {activeTab === 'LINES' && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
                                  {/* Trackable Items */}
                                  <div>
                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                          <ScanBarcode size={14} /> Trackable Items (Serialization Required)
                                      </h4>
                                      <div className="space-y-3">
                                          {trackableLines.length > 0 ? trackableLines.map(renderLineItem) : (
                                              <div className="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded">
                                                  No trackable items in this receipt.
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  {/* Non-Trackable Items */}
                                  <div>
                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                          <Package size={14} /> Bulk / Non-Trackable Items
                                      </h4>
                                      <div className="space-y-3">
                                          {nonTrackableLines.length > 0 ? nonTrackableLines.map(renderLineItem) : (
                                              <div className="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded">
                                                  No bulk items in this receipt.
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  {activeReceipt.lines.length === 0 && (
                                      <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                          <RefreshCcw className="opacity-20" size={32} />
                                          <p>No line items in this receipt.</p>
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
    </div>
  );
};
