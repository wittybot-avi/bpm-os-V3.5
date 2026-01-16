
import React, { useEffect, useState, useContext } from 'react';
import { Truck, Package, Activity, ArrowRight, LayoutList, Plus, FileInput, CheckCircle2, ShieldAlert, FileWarning, RefreshCcw } from 'lucide-react';
import { NavView, UserContext, UserRole } from '../types';
import { S3Receipt, ReceiptState, getReceiptNextActions, S3ReceiptLine, ItemTrackability, makeReceiptCode, canS3 } from '../stages/s3/contracts';
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

  const [refreshKey, setRefreshKey] = useState(0);

  // Initial load and sync
  useEffect(() => {
    setReceipts(s3ListReceipts());
    setActiveReceipt(s3GetActiveReceipt());
    setOpenOrders(s3ListOpenOrdersFromS2());
    setSuppliers(s3ListSuppliers());
  }, [refreshKey]);

  // Reset form when toggling mode
  useEffect(() => {
      setSelectedPoId('');
      setManualSupplierId('');
      setManualReason('');
      setSupervisorAck(false);
  }, [intakeMode]);

  const handleSelectReceipt = (id: string) => {
    s3SetActiveReceipt(id);
    setRefreshKey(k => k + 1);
  };

  const handleLoadPo = () => {
    if (!selectedPoId) return;
    const order = openOrders.find(o => o.poId === selectedPoId);
    if (!order) return;

    // Generate new Receipt from PO
    const newLines: S3ReceiptLine[] = order.items.map((item, idx) => ({
        id: `line-${Date.now()}-${idx}`,
        receiptId: '', // Set after receipt creation usually, but we'll do it in batch
        skuId: item.skuId,
        itemName: item.itemName,
        category: item.category,
        // Auto-determine trackability based on category
        trackability: ['CELL', 'BMS', 'IOT', 'MODULE', 'PACK'].includes(item.category) 
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

    // Fixup receiptId in lines
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
        // poId null indicates Manual
        createdAt: new Date().toISOString(),
        createdByRole: role,
        state: ReceiptState.DRAFT,
        lines: [], // Empty initially
        audit: [{
            id: `aud-${Date.now()}`,
            ts: new Date().toISOString(),
            actorRole: role,
            actorLabel: 'User',
            eventType: 'MANUAL_RECEIPT_CREATED',
            refType: 'RECEIPT',
            refId: '',
            message: `Manual Receipt created. Reason: ${manualReason}. Supervisor Ack: ${requiresAck ? 'YES' : 'AUTO (Admin)'}`
        }]
    };

    newReceipt.audit.forEach(a => a.refId = newReceipt.id);

    s3UpsertReceipt(newReceipt);
    s3SetActiveReceipt(newReceipt.id);
    
    // Reset Form
    setManualSupplierId('');
    setManualReason('');
    setSupervisorAck(false);
    setIntakeMode('PO'); // Switch back to default view
    setRefreshKey(k => k + 1);
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

  const canCreate = canS3(role, 'CREATE_RECEIPT');
  const isAdmin = role === UserRole.SYSTEM_ADMIN;

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

      {/* Procurement Intake Panel (Create Receipt) */}
      {canCreate && (
        <div className={`border rounded-lg p-3 shadow-sm transition-colors ${intakeMode === 'MANUAL' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded mt-0.5 ${intakeMode === 'MANUAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                    {intakeMode === 'MANUAL' ? <FileWarning size={20} /> : <FileInput size={20} />}
                </div>
                
                <div className="flex-1">
                    {/* Panel Header & Toggle */}
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

                    {/* Controls */}
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
            <div className="flex flex-col items-end">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Recommended Action</div>
                <div className="flex items-center gap-2 text-brand-700 font-bold">
                    {getReceiptNextActions(activeReceipt.state)}
                    <ArrowRight size={16} />
                </div>
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
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <h4 className="text-sm font-bold text-slate-700">Line Items</h4>
                          <span className="text-xs text-slate-400">{activeReceipt.lines.length} Lines</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {activeReceipt.lines.map(line => (
                              <div key={line.id} className="p-3 border border-slate-200 rounded-lg flex justify-between items-start bg-white">
                                  <div>
                                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                          {line.itemName}
                                          {line.trackability === 'TRACKABLE' && (
                                              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase border border-purple-200">
                                                  Trackable
                                              </span>
                                          )}
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
                          ))}
                          {activeReceipt.lines.length === 0 && (
                              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                <RefreshCcw className="opacity-20" size={32} />
                                <p>No line items in this receipt.</p>
                                {!activeReceipt.poId && <p className="text-xs text-amber-600">Manual receipts require manual line item addition (Coming soon in V35-S3-PP-08).</p>}
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
