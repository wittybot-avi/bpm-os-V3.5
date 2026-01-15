/**
 * Dispatch & Custody Wizard (FLOW-005)
 * Step-wizard for S11 Outbound Logistics.
 * Wired to simulated /api/flows/dispatch/* endpoints.
 * @foundation V34-S11-FLOW-005-PP-03
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  CheckCircle2, 
  ChevronRight, 
  Package, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Monitor, 
  Tablet, 
  Smartphone,
  CreditCard,
  ClipboardCheck,
  Zap,
  RotateCcw,
  LogOut,
  Fingerprint,
  Info,
  Lock,
  Cloud,
  Loader2,
  AlertCircle,
  XCircle,
  // Added FileText and Archive imports
  FileText,
  Archive
} from 'lucide-react';
import { FlowShell, FlowStep, FlowFooter } from '../../../components/flow';
import { useDeviceLayout } from '../../../hooks/useDeviceLayout';
import { 
  type DispatchRole, 
  type DispatchFlowState, 
  type DispatchDraft,
  createDefaultDispatchWizardModel,
  resolveDispatchStepFromState
} from './dispatchWizardModel';

import {
  type DispatchFlowInstance,
  DISPATCH_FLOW_ENDPOINTS
} from '../index';

import { apiFetch } from '../../../services/apiHarness';

interface DispatchWizardProps {
  instanceId?: string | null;
  onExit: () => void;
}

interface ExtendedDispatchWizardModel extends ReturnType<typeof createDefaultDispatchWizardModel> {
  instanceId?: string;
  isSyncing?: boolean;
  isLoading?: boolean;
  error?: string | null;
  invoiceInput?: string;
  transporterInput?: string;
  vehicleInput?: string;
  driverInput?: string;
}

export const DispatchWizard: React.FC<DispatchWizardProps> = ({ instanceId, onExit }) => {
  const layout = useDeviceLayout();
  const [model, setModel] = useState<ExtendedDispatchWizardModel>(() => ({
    ...createDefaultDispatchWizardModel(),
    isLoading: !!instanceId
  }));

  const isDesktop = layout === 'desktop';
  const isMobile = layout === 'mobile';

  // Load existing instance if provided
  useEffect(() => {
    if (instanceId && !model.instanceId) {
      loadInstance(instanceId);
    }
  }, [instanceId]);

  const loadInstance = async (id: string) => {
    setModel(m => ({ ...m, isLoading: true, error: null }));
    try {
      const res = await apiFetch(`${DISPATCH_FLOW_ENDPOINTS.get}?id=${id}`);
      const result = await res.json();
      if (result.ok) {
        syncModel(result.data);
      } else {
        handleApiError(result.error);
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setModel(m => ({ ...m, isLoading: false }));
    }
  };

  const syncModel = (instance: DispatchFlowInstance) => {
    setModel(m => ({
      ...m,
      instanceId: instance.instanceId,
      state: instance.state,
      step: resolveDispatchStepFromState(instance.state),
      draft: instance.draft,
      invoiceInput: instance.draft.invoiceNumber || m.invoiceInput,
      transporterInput: instance.draft.transporter || m.transporterInput,
      vehicleInput: instance.draft.vehicleNo || m.vehicleInput,
      driverInput: instance.draft.driverName || m.driverInput,
      isSyncing: false,
      error: null
    }));
  };

  const handleApiError = (err: any) => {
    const errString = err && typeof err === 'object' ? JSON.stringify(err) : String(err);
    console.error(`Dispatch Flow API Error Context: ${errString}`);
    
    let message = "Logistics communication failure.";
    if (typeof err === 'string') {
      message = err;
    } else if (err && typeof err === 'object') {
      if (err.message && typeof err.message === 'string') {
        message = err.message;
      } else if (err.error?.message && typeof err.error.message === 'string') {
        message = err.error.message;
      } else {
        message = err.code ? `Error: ${err.code}` : `Technical Error: ${errString}`;
      }
    }

    setModel(m => ({
      ...m,
      isSyncing: false,
      error: message
    }));
  };

  const handleUpdateDraft = (field: keyof DispatchDraft, value: any) => {
    setModel(m => ({
      ...m,
      draft: { ...m.draft, [field]: value }
    }));
  };

  const handleNext = async () => {
    if (model.step === "DRAFT") {
      setModel(m => ({ ...m, isSyncing: true, error: null }));
      try {
        const res = await apiFetch(DISPATCH_FLOW_ENDPOINTS.create, {
          method: 'POST',
          body: JSON.stringify({ draft: model.draft })
        });
        const result = await res.json();
        if (result.ok) syncModel(result.data);
        else handleApiError(result.error);
      } catch (e) {
        handleApiError(e);
      }
    } else if (model.step === "APPROVAL") {
      if (!model.instanceId) return;
      setModel(m => ({ ...m, isSyncing: true, error: null }));
      try {
        const res = await apiFetch(DISPATCH_FLOW_ENDPOINTS.approve, {
          method: 'POST',
          body: JSON.stringify({ 
            instanceId: model.instanceId, 
            approvedBy: model.role,
            invoiceNumber: model.invoiceInput
          })
        });
        const result = await res.json();
        if (result.ok) syncModel(result.data);
        else handleApiError(result.error);
      } catch (e) {
        handleApiError(e);
      }
    } else if (model.step === "EXECUTION") {
      if (!model.instanceId) return;
      setModel(m => ({ ...m, isSyncing: true, error: null }));
      try {
        const res = await apiFetch(DISPATCH_FLOW_ENDPOINTS.dispatch, {
          method: 'POST',
          body: JSON.stringify({ 
            instanceId: model.instanceId, 
            dispatchedBy: model.role,
            transporter: model.transporterInput,
            vehicleNo: model.vehicleInput,
            driverName: model.driverInput
          })
        });
        const result = await res.json();
        if (result.ok) syncModel(result.data);
        else handleApiError(result.error);
      } catch (e) {
        handleApiError(e);
      }
    } else if (model.step === "DELIVERY") {
      if (!model.instanceId) return;
      setModel(m => ({ ...m, isSyncing: true, error: null }));
      try {
        const res = await apiFetch(DISPATCH_FLOW_ENDPOINTS.deliver, {
          method: 'POST',
          body: JSON.stringify({ 
            instanceId: model.instanceId, 
            handoverProof: "OTP-VERIFIED-SIM",
            deliveredAt: new Date().toISOString()
          })
        });
        const result = await res.json();
        if (result.ok) syncModel(result.data);
        else handleApiError(result.error);
      } catch (e) {
        handleApiError(e);
      }
    }
  };

  const handleFinalize = async () => {
    if (!model.instanceId || model.isSyncing) return;
    setModel(m => ({ ...m, isSyncing: true, error: null }));
    try {
      const res = await apiFetch(DISPATCH_FLOW_ENDPOINTS.close, {
        method: 'POST',
        body: JSON.stringify({ instanceId: model.instanceId, closedBy: model.role })
      });
      const result = await res.json();
      if (result.ok) syncModel(result.data);
      else handleApiError(result.error);
    } catch (e) {
      handleApiError(e);
    }
  };

  const handleReset = () => {
    setModel({
      ...createDefaultDispatchWizardModel(),
      isLoading: false
    });
  };

  const DeviceIndicator = (
    <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 mr-4 select-none opacity-50">
      {isDesktop ? <Monitor size={10} /> : layout === 'tablet' ? <Tablet size={10} /> : <Smartphone size={10} />}
      <span className="uppercase">{layout}</span>
    </div>
  );

  const RoleSwitcher = (
    <div className="flex bg-slate-200 p-1 rounded-md">
      {(["SCM", "Finance", "Logistics"] as DispatchRole[]).map(r => (
        <button 
          key={r}
          onClick={() => setModel(m => ({ ...m, role: r }))}
          className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${
            model.role === r 
            ? 'bg-white text-brand-600 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {r.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const SummaryPill = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 min-w-[120px]">
      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-slate-700 font-mono truncate">{value}</div>
    </div>
  );

  return (
    <FlowShell 
      title="Dispatch & Custody (FLOW-005)" 
      subtitle="Outbound Logistics and Legal Transfer"
      rightSlot={(
        <div className="flex items-center">
          {DeviceIndicator}
          {RoleSwitcher}
        </div>
      )}
    >
      <div className="h-full flex flex-col relative">
        <div className="px-6 py-1 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-[9px] font-mono text-slate-500">
           <div className="flex items-center gap-2">
              <Cloud size={10} className={model.instanceId ? "text-green-500" : "text-slate-300"} />
              <span>API: {model.instanceId ? `Connected (${model.instanceId})` : 'Local Draft'}</span>
           </div>
           {(model.isSyncing || model.isLoading) && <span className="animate-pulse text-brand-600 font-bold uppercase">Syncing...</span>}
        </div>

        {model.error && (
          <div className="px-6 py-2 bg-red-50 text-red-700 text-xs border-b border-red-100 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span className="font-medium">{model.error}</span>
          </div>
        )}

        <div className={`flex-1 ${(model.isSyncing || model.isLoading) ? 'opacity-50 pointer-events-none' : ''}`}>
          {model.isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-brand-500" />
              <p className="text-sm font-bold uppercase tracking-widest">Loading Consignment...</p>
            </div>
          ) : (
            <>
              {model.step === "DRAFT" && (
                <FlowStep 
                  stepTitle="Draft Consignment" 
                  stepHint="Specify customer destination and allocate serialized inventory."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Name</label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="e.g. EcoRide Fleet Solutions"
                          value={model.draft.customerName}
                          onChange={e => handleUpdateDraft('customerName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Destination</label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full border border-slate-300 rounded p-2.5 pl-9 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Warehouse B, Hub North..."
                            value={model.draft.destination}
                            onChange={e => handleUpdateDraft('destination', e.target.value)}
                          />
                          <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Allocated Items</label>
                      <div className="space-y-2">
                        {model.draft.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                              <Package size={20} className="text-brand-500" />
                              <div>
                                <div className="text-xs font-bold text-slate-800 font-mono">{item.batteryId}</div>
                                <div className="text-[10px] text-slate-500 uppercase">{item.skuCode}</div>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400">QTY: {item.qty}</span>
                          </div>
                        ))}
                        <button className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[10px] font-bold text-slate-400 hover:text-brand-500 hover:border-brand-300 transition-all flex items-center justify-center gap-1 mt-2">
                          <Plus size={12} /> ADD ITEM FROM INVENTORY
                        </button>
                      </div>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "APPROVAL" && (
                <FlowStep 
                  stepTitle="Commercial Approval" 
                  stepHint="Verify commercial documents and invoice generation."
                >
                  <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    <SummaryPill label="Consignment" value={model.draft.consignmentId} />
                    <SummaryPill label="Customer" value={model.draft.customerName} />
                    <SummaryPill label="Total Items" value={model.draft.items.length.toString()} />
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-brand-600" />
                        <span className="text-xs font-bold text-slate-700">INVOICE DETAILS</span>
                      </div>
                      <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">AUTO-DRAFTED</span>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoice Number (Finance Entry)</label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded p-2.5 text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="INV-2026-XXXX"
                          value={model.invoiceInput || ""}
                          onChange={e => setModel(m => ({ ...m, invoiceInput: e.target.value }))}
                        />
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded text-[11px] text-blue-700 flex gap-2">
                        <Info size={14} className="shrink-0" />
                        <span>Invoicing triggers a tax-compliance check against the Digital Identity (Battery Aadhaar).</span>
                      </div>
                    </div>
                  </div>
                  
                  {model.role !== 'Finance' && (
                    <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>Switch role to <strong>Finance</strong> to authorize this dispatch.</span>
                    </div>
                  )}
                </FlowStep>
              )}

              {model.step === "EXECUTION" && (
                <FlowStep 
                  stepTitle="Dispatch Execution" 
                  stepHint="Log physical loading and transporter assignment."
                >
                  <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    <SummaryPill label="Consignment" value={model.draft.consignmentId} />
                    <SummaryPill label="Customer" value={model.draft.customerName} />
                    <SummaryPill label="Invoice" value={model.invoiceInput || "--"} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transporter / Fleet</label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="e.g. BlueDart Prime"
                          value={model.transporterInput || ""}
                          onChange={e => setModel(m => ({ ...m, transporterInput: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vehicle Registration</label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded p-2.5 text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none uppercase"
                          placeholder="WB-01-XXXX"
                          value={model.vehicleInput || ""}
                          onChange={e => setModel(m => ({ ...m, vehicleInput: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Driver Name</label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="Enter full name..."
                          value={model.driverInput || ""}
                          onChange={e => setModel(m => ({ ...m, driverInput: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Truck size={64} />
                        </div>
                        <div className="relative z-10">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Gate Pass Generator</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] text-slate-500">Security Gate</span>
                              <span className="text-xs font-bold text-emerald-400">AUTHORIZED</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] text-slate-500">Hazmat Checklist</span>
                              <span className="text-xs font-bold text-emerald-400">PASSED</span>
                            </div>
                          </div>
                          <p className="mt-6 text-[10px] text-slate-400 italic">Gate pass will be issued to driver upon physical loading confirmation.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {model.role !== 'Logistics' && (
                    <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>Switch role to <strong>Logistics</strong> to confirm loading and departure.</span>
                    </div>
                  )}
                </FlowStep>
              )}

              {model.step === "DELIVERY" && (
                <FlowStep 
                  stepTitle="Delivery Confirmation" 
                  stepHint="Verify handover to customer and transition liability."
                >
                  <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    <SummaryPill label="Driver" value={model.driverInput || "--"} />
                    <SummaryPill label="Vehicle" value={model.vehicleInput || "--"} />
                    <SummaryPill label="Status" value="IN-TRANSIT" />
                  </div>

                  <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                      <Truck size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Shipment is En-Route</h3>
                    <p className="text-slate-500 text-sm text-center max-w-md mt-2">
                      The customer must provide the verification token or digital signature to acknowledge receipt.
                    </p>
                    
                    <div className="mt-8 w-full max-w-xs space-y-4">
                      <div className="space-y-1.5 text-center">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handover Verification Code</label>
                        <input 
                          type="text"
                          className="w-full text-center text-2xl font-bold tracking-[0.5em] border-2 border-brand-500 rounded-xl p-3 focus:ring-4 focus:ring-brand-100 outline-none"
                          placeholder="••••••"
                          maxLength={6}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider font-bold">Generated at Customer Portal</p>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "COMPLETION" && (
                <FlowStep 
                  stepTitle="Dispatch Complete" 
                  stepHint="Chain of custody has been formally closed."
                >
                  <div className="flex flex-col items-center py-10">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-md">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Custody Transferred</h3>
                    <p className="text-slate-500 text-sm text-center max-w-md mt-2 leading-relaxed">
                      Legal title and safety liability for consignment <strong>{model.draft.consignmentId}</strong> has been transferred to <strong>{model.draft.customerName}</strong>.
                    </p>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <ShieldCheck size={24} className="mx-auto text-blue-500 mb-2" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trace Record</div>
                        <div className="text-xs font-bold text-slate-700">LIFECYCLE: FIELD</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <Fingerprint size={24} className="mx-auto text-purple-500 mb-2" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Identity</div>
                        <div className="text-xs font-bold text-slate-700">CUSTODIAN: CUSTOMER</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <FileText size={24} className="mx-auto text-slate-500 mb-2" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ledger</div>
                        <div className="text-xs font-bold text-slate-700">STATUS: CLOSED</div>
                      </div>
                    </div>
                  </div>
                </FlowStep>
              )}
            </>
          )}
        </div>

        <FlowFooter 
          left={
            <button 
              onClick={onExit}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Exit
            </button>
          }
          right={
            <div className="flex items-center gap-3">
              {model.step === "DRAFT" && (
                <>
                  <button onClick={handleReset} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Reset</button>
                  <button 
                    onClick={handleNext}
                    disabled={!model.draft.customerName || !model.draft.destination || model.isSyncing}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-brand-600 text-white rounded font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    Next: Finance Review <ChevronRight size={16} />
                  </button>
                </>
              )}

              {model.step === "APPROVAL" && (
                <>
                  <button onClick={() => setModel(m => ({ ...m, step: "DRAFT" }))} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Back</button>
                  <button 
                    onClick={handleNext}
                    disabled={model.role !== 'Finance' || !model.invoiceInput || model.isSyncing}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-brand-600 text-white rounded font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    Authorize Dispatch <Lock size={16} />
                  </button>
                </>
              )}

              {model.step === "EXECUTION" && (
                <>
                  <button onClick={() => setModel(m => ({ ...m, step: "APPROVAL" }))} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Back</button>
                  <button 
                    onClick={handleNext}
                    disabled={model.role !== 'Logistics' || !model.transporterInput || model.isSyncing}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-brand-600 text-white rounded font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    Release & Ship <Truck size={16} />
                  </button>
                </>
              )}

              {model.step === "DELIVERY" && (
                <>
                  <button 
                    onClick={handleNext}
                    disabled={model.role !== 'Logistics' || model.isSyncing}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-brand-600 text-white rounded font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    Confirm Handover <CheckCircle2 size={16} />
                  </button>
                </>
              )}

              {model.step === "COMPLETION" && (
                <>
                  <button 
                    onClick={handleFinalize}
                    disabled={model.state === 'Closed' || model.isSyncing}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-800 text-white rounded font-bold text-sm hover:bg-slate-900 disabled:opacity-50 transition-all shadow-sm"
                  >
                    Final Archive <Archive size={16} />
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-brand-600 text-white rounded font-bold text-sm hover:bg-brand-700 transition-all shadow-sm"
                  >
                    New Consignment <Plus size={16} />
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>
    </FlowShell>
  );
};