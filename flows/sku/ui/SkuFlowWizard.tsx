/**
 * SKU Flow Wizard (FLOW-001)
 * A standardized step-wizard for SKU creation lifecycle.
 * @updated V35-S1-WIZ-PP-05 (Dynamic Blueprint Content & Validation)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  Save, 
  User, 
  ChevronRight, 
  AlertTriangle, 
  ShieldCheck,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Monitor,
  Tablet,
  Smartphone,
  Cloud,
  AlertCircle,
  Loader2,
  FilePlus,
  GitBranch,
  Battery,
  Cpu,
  Layers,
  Zap,
  Radio,
  Info,
  Beaker,
  Settings2,
  BoxSelect,
  Globe
} from 'lucide-react';
import { FlowShell, FlowStep, FlowFooter } from '../../../components/flow';
import { 
  getAllowedSkuActions, 
  isActionAllowed, 
  SkuDraft,
  SkuFlowRole,
  SKU_FLOW_ENDPOINTS,
  type CreateSkuFlowReq,
  type SubmitSkuForReviewReq,
  type ReviewSkuReq,
  type ApproveSkuReq,
  type SkuFlowInstance,
} from '../index';
import { 
  WizardModel, 
  createDefaultWizardModel, 
  resolveStepFromState,
  WizardStepId
} from './skuFlowWizardModel';
import { useDeviceLayout } from '../../../hooks/useDeviceLayout';
import { apiFetch } from '../../../services/apiHarness';
import { SkuType } from '../../../stages/s1/s1Contract';

interface SkuFlowWizardProps {
  instanceId?: string | null;
  onExit: () => void;
}

interface ExtendedWizardModel extends WizardModel {
  instanceId?: string;
  isSyncing?: boolean;
  isLoading?: boolean;
  error?: string | null;
  validationErrors: Record<string, string>;
}

export const SkuFlowWizard: React.FC<SkuFlowWizardProps> = ({ instanceId, onExit }) => {
  const layout = useDeviceLayout();
  const [model, setModel] = useState<ExtendedWizardModel>({
    ...createDefaultWizardModel(),
    validationErrors: {}
  });
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);

  const roles: SkuFlowRole[] = ["Maker", "Checker", "Approver"];
  const isMobile = layout === 'mobile';
  const isDesktop = layout === 'desktop';

  // Load existing instance if provided
  useEffect(() => {
    if (instanceId && !model.instanceId) {
      loadInstance(instanceId);
    }
  }, [instanceId]);

  const loadInstance = async (id: string) => {
    setModel(m => ({ ...m, isLoading: true, error: null }));
    try {
      const res = await apiFetch(`${SKU_FLOW_ENDPOINTS.get}?id=${id}`);
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

  const handleUpdateDraft = (field: keyof SkuDraft, value: any) => {
    setModel(m => ({
      ...m,
      draft: { ...m.draft, [field]: value },
      validationErrors: { ...m.validationErrors, [field]: '' }
    }));
  };

  const handleRoleChange = (role: SkuFlowRole) => {
    setModel(m => ({ ...m, role }));
  };

  const syncModel = (instance: SkuFlowInstance) => {
    setModel(m => ({
      ...m,
      instanceId: instance.instanceId,
      state: instance.state,
      step: resolveStepFromState(instance.state),
      draft: instance.draft,
      comment: instance.rejectionReason || m.comment,
      isSyncing: false,
      error: null,
      validationErrors: {}
    }));
  };

  const handleApiError = (err: any) => {
    const errString = err && typeof err === 'object' ? JSON.stringify(err) : String(err);
    console.error(`SKU Flow API Error Context: ${errString}`);
    let message = "Communication failure with simulated API.";
    if (typeof err === 'string') message = err;
    else if (err?.message) message = err.message;

    setModel(m => ({ ...m, isSyncing: false, error: message }));
  };

  // Validation Logic
  const validateStep = (step: WizardStepId): boolean => {
    const errors: Record<string, string> = {};
    const d = model.draft;

    if (step === 'GENERAL') {
      if (!d.skuCode) errors.skuCode = 'SKU Code is required';
      if (!d.skuName) errors.skuName = 'SKU Name is required';
    }

    if (step === 'TECHNICAL') {
      if (d.skuType === 'CELL') {
        if (!d.chemistry) errors.chemistry = 'Chemistry required';
        if (!d.nominalVoltage) errors.nominalVoltage = 'Voltage required';
        if (!d.capacityAh) errors.capacityAh = 'Capacity required';
      }
      if (d.skuType === 'MODULE') {
        if (!d.seriesConfig) errors.seriesConfig = 'Series config required';
        if (!d.parallelConfig) errors.parallelConfig = 'Parallel config required';
        if (!d.cellCount) errors.cellCount = 'Total cell count required';
      }
      if (d.skuType === 'PACK') {
        if (!d.nominalVoltage) errors.nominalVoltage = 'System voltage required';
        if (!d.energyKwh) errors.energyKwh = 'Target energy required';
      }
      if (d.skuType === 'BMS') {
        if (!d.hwVersion) errors.hwVersion = 'Hardware rev required';
        if (!d.protocol) errors.protocol = 'Communication protocol required';
      }
      if (d.skuType === 'IOT') {
        if (!d.commsType) errors.commsType = 'Communication type required';
        if (!d.fwBaseline) errors.fwBaseline = 'Firmware baseline required';
      }
    }

    setModel(m => ({ ...m, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (next: WizardStepId) => {
    if (validateStep(model.step)) {
      setModel(m => ({ ...m, step: next }));
    }
  };

  const handleSaveDraft = async () => {
    if (!validateStep(model.step)) return;
    if (model.isSyncing) return;
    setModel(m => ({ ...m, isSyncing: true, error: null }));

    try {
      if (!model.instanceId) {
        const payload: CreateSkuFlowReq = { draft: model.draft };
        const res = await apiFetch(SKU_FLOW_ENDPOINTS.create, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.ok) syncModel(result.data);
        else handleApiError(result.error);
      } else {
        // Update simulation
        setTimeout(() => setModel(m => ({ ...m, isSyncing: false, error: null })), 500);
      }
    } catch (e) {
      handleApiError(e);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(model.step)) return;
    if (!model.instanceId || model.isSyncing) return;
    setModel(m => ({ ...m, isSyncing: true, error: null }));

    try {
      const payload: SubmitSkuForReviewReq = { instanceId: model.instanceId };
      const res = await apiFetch(SKU_FLOW_ENDPOINTS.submit, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.ok) syncModel(result.data);
      else handleApiError(result.error);
    } catch (e) {
      handleApiError(e);
    }
  };

  const handleDecision = async (type: 'review' | 'approve', decision: string) => {
    if (!model.instanceId || model.isSyncing) return;
    setModel(m => ({ ...m, isSyncing: true, error: null }));

    try {
      const endpoint = type === 'review' ? SKU_FLOW_ENDPOINTS.review : SKU_FLOW_ENDPOINTS.approve;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ instanceId: model.instanceId, decision, comment: model.comment, reason: model.rejectionReason })
      });
      const result = await res.json();
      if (result.ok) syncModel(result.data);
      else handleApiError(result.error);
    } catch (e) {
      handleApiError(e);
    }
  };

  // UI Components
  const Field = ({ label, id, error, children }: { label: string, id: string, error?: string, children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
      {error && <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-left-1"><AlertCircle size={10} /> {error}</div>}
    </div>
  );

  const Summary = () => (
    <div className="bg-slate-50 p-4 rounded border border-slate-200 shadow-inner grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      <div>
        <label className="text-[9px] uppercase font-bold text-slate-400">SKU Profile</label>
        <div className="font-bold text-slate-800">{model.draft.skuCode} <span className="font-normal text-slate-400 ml-1">({model.draft.skuType})</span></div>
      </div>
      <div>
        <label className="text-[9px] uppercase font-bold text-slate-400">Intent</label>
        <div className="text-slate-600 font-medium">{model.draft.isRevision ? 'Revision' : 'Greenfield'}</div>
      </div>
      {model.draft.chemistry && (
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-400">Chemistry</label>
          <div className="text-slate-600 font-medium">{model.draft.chemistry}</div>
        </div>
      )}
      {model.draft.nominalVoltage && (
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-400">Voltage</label>
          <div className="text-slate-600 font-medium">{model.draft.nominalVoltage}V</div>
        </div>
      )}
    </div>
  );

  return (
    <FlowShell 
      title="SKU Flow Wizard (FLOW-001)" 
      subtitle={`V3.5 Blueprint Management • ${model.role.toUpperCase()} Phase`}
      rightSlot={(
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 select-none opacity-50">
            {isDesktop ? <Monitor size={10} /> : <Tablet size={10} />}
            <span className="uppercase">{layout}</span>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-md">
            {roles.map(r => (
              <button 
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${model.role === r ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    >
      <div className="h-full flex flex-col relative">
        <div className="px-6 py-1 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-[9px] font-mono text-slate-500">
           <div className="flex items-center gap-2">
              <Cloud size={10} className={model.instanceId ? "text-green-500" : "text-slate-300"} />
              <span>{model.instanceId ? `Connected: ${model.instanceId}` : 'Local Buffer'}</span>
           </div>
           {(model.isSyncing || model.isLoading) && <span className="animate-pulse text-brand-600 font-bold">COMMITTING...</span>}
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
              <p className="text-sm font-bold uppercase tracking-widest">Hydrating Blueprint...</p>
            </div>
          ) : (
            <>
              {model.step === "INIT" && (
                <FlowStep stepTitle="Intent & Taxonomy" stepHint="Declare engineering scope and SKU category.">
                  <div className="space-y-10 max-w-2xl mx-auto py-8">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleUpdateDraft('isRevision', false)}
                        className={`p-6 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${!model.draft.isRevision ? 'border-brand-500 bg-brand-50 shadow-md ring-4 ring-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                      >
                        <FilePlus size={32} className={!model.draft.isRevision ? 'text-brand-600' : 'text-slate-300'} />
                        <div className="text-center"><div className="font-bold text-slate-800">GREENFIELD SKU</div><div className="text-[10px] text-slate-500">New Product Definition</div></div>
                      </button>
                      <button 
                        onClick={() => handleUpdateDraft('isRevision', true)}
                        className={`p-6 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${model.draft.isRevision ? 'border-brand-500 bg-brand-50 shadow-md ring-4 ring-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                      >
                        <GitBranch size={32} className={model.draft.isRevision ? 'text-brand-600' : 'text-slate-300'} />
                        <div className="text-center"><div className="font-bold text-slate-800">BLUEPRINT REVISION</div><div className="text-[10px] text-slate-500">Iterate on Existing SKU</div></div>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest text-center">SKU Classification</label>
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { id: 'CELL', icon: Zap, label: 'Cell' },
                          { id: 'MODULE', icon: Layers, label: 'Module' },
                          { id: 'PACK', icon: Battery, label: 'Pack' },
                          { id: 'BMS', icon: Cpu, label: 'BMS' },
                          { id: 'IOT', icon: Radio, label: 'IoT' },
                        ].map((type) => (
                          <button 
                            key={type.id}
                            onClick={() => handleUpdateDraft('skuType', type.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${model.draft.skuType === type.id ? 'bg-slate-800 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                          >
                            <type.icon size={24} />
                            <span className="text-[10px] font-bold uppercase">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "GENERAL" && (
                <FlowStep stepTitle="General Identifiers" stepHint="Establish basic SKU metadata and identification strings.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                    <Field label="Canonical SKU Code" id="skuCode" error={model.validationErrors.skuCode}>
                      <input 
                        type="text" id="skuCode"
                        className={`w-full border rounded p-3 text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none transition-all ${model.validationErrors.skuCode ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                        placeholder="e.g. BP-LFP-48V-STD"
                        value={model.draft.skuCode}
                        onChange={e => handleUpdateDraft('skuCode', e.target.value)}
                      />
                    </Field>
                    <Field label="Display Name" id="skuName" error={model.validationErrors.skuName}>
                      <input 
                        type="text" id="skuName"
                        className={`w-full border rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all ${model.validationErrors.skuName ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                        placeholder="e.g. Standard 48V LFP Module"
                        value={model.draft.skuName}
                        onChange={e => handleUpdateDraft('skuName', e.target.value)}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Engineering Notes" id="notes">
                        <textarea 
                          id="notes" rows={3}
                          className="w-full border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="Special assembly instructions or design constraints..."
                          value={model.draft.notes}
                          onChange={e => handleUpdateDraft('notes', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "TECHNICAL" && (
                <FlowStep stepTitle={`${model.draft.skuType} Technical Blueprint`} stepHint="Specify immutable technical constants for this entity type.">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto py-4">
                    {/* CELL TYPE */}
                    {model.draft.skuType === 'CELL' && (
                      <>
                        <Field label="Chemistry" id="chemistry" error={model.validationErrors.chemistry}>
                          <select 
                            id="chemistry"
                            className="w-full border border-slate-300 rounded p-3 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-500"
                            value={model.draft.chemistry}
                            onChange={e => handleUpdateDraft('chemistry', e.target.value)}
                          >
                            <option value="">Select...</option>
                            <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                            <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
                            <option value="LTO">LTO (Lithium Titanate)</option>
                          </select>
                        </Field>
                        <Field label="Nominal Voltage (V)" id="nominalVoltage" error={model.validationErrors.nominalVoltage}>
                          <input type="number" step="0.01" className="w-full border border-slate-300 rounded p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500" value={model.draft.nominalVoltage || ''} onChange={e => handleUpdateDraft('nominalVoltage', parseFloat(e.target.value))} />
                        </Field>
                        <Field label="Nominal Capacity (Ah)" id="capacityAh" error={model.validationErrors.capacityAh}>
                          <input type="number" step="0.1" className="w-full border border-slate-300 rounded p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500" value={model.draft.capacityAh || ''} onChange={e => handleUpdateDraft('capacityAh', parseFloat(e.target.value))} />
                        </Field>
                      </>
                    )}

                    {/* MODULE TYPE */}
                    {model.draft.skuType === 'MODULE' && (
                      <>
                        <Field label="Series (S)" id="series" error={model.validationErrors.seriesConfig}>
                          <input type="number" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.seriesConfig || ''} onChange={e => handleUpdateDraft('seriesConfig', parseInt(e.target.value))} />
                        </Field>
                        <Field label="Parallel (P)" id="parallel" error={model.validationErrors.parallelConfig}>
                          <input type="number" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.parallelConfig || ''} onChange={e => handleUpdateDraft('parallelConfig', parseInt(e.target.value))} />
                        </Field>
                        <Field label="Total Cells" id="cellCount" error={model.validationErrors.cellCount}>
                          <input type="number" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.cellCount || ''} onChange={e => handleUpdateDraft('cellCount', parseInt(e.target.value))} />
                        </Field>
                      </>
                    )}

                    {/* PACK TYPE */}
                    {model.draft.skuType === 'PACK' && (
                      <>
                        <Field label="System Voltage (V)" id="nominalVoltage" error={model.validationErrors.nominalVoltage}>
                          <input type="number" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.nominalVoltage || ''} onChange={e => handleUpdateDraft('nominalVoltage', parseFloat(e.target.value))} />
                        </Field>
                        <Field label="Rated Energy (kWh)" id="energyKwh" error={model.validationErrors.energyKwh}>
                          <input type="number" step="0.1" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.energyKwh || ''} onChange={e => handleUpdateDraft('energyKwh', parseFloat(e.target.value))} />
                        </Field>
                        <Field label="Target Form Factor" id="formFactor">
                           <input type="text" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.formFactor || ''} onChange={e => handleUpdateDraft('formFactor', e.target.value)} placeholder="e.g. Standard Rack" />
                        </Field>
                      </>
                    )}

                    {/* BMS TYPE */}
                    {model.draft.skuType === 'BMS' && (
                      <>
                        <Field label="Hardware Rev" id="hwVersion" error={model.validationErrors.hwVersion}>
                          <input type="text" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.hwVersion || ''} onChange={e => handleUpdateDraft('hwVersion', e.target.value)} />
                        </Field>
                        <Field label="Protocol" id="protocol" error={model.validationErrors.protocol}>
                          <select className="w-full border border-slate-300 rounded p-3 text-sm bg-white" value={model.draft.protocol} onChange={e => handleUpdateDraft('protocol', e.target.value)}>
                            <option value="">Select...</option>
                            <option value="CAN">CAN-BUS</option>
                            <option value="RS485">RS485</option>
                            <option value="MODBUS">MODBUS-TCP</option>
                          </select>
                        </Field>
                      </>
                    )}

                    {/* IOT TYPE */}
                    {model.draft.skuType === 'IOT' && (
                      <>
                        <Field label="Comms Standard" id="commsType" error={model.validationErrors.commsType}>
                           <select className="w-full border border-slate-300 rounded p-3 text-sm bg-white" value={model.draft.commsType} onChange={e => handleUpdateDraft('commsType', e.target.value)}>
                            <option value="">Select...</option>
                            <option value="4G">4G LTE / Cat-M</option>
                            <option value="5G">5G Private</option>
                            <option value="NB-IOT">NB-IoT</option>
                          </select>
                        </Field>
                        <Field label="Firmware Baseline" id="fwBaseline" error={model.validationErrors.fwBaseline}>
                           <input type="text" className="w-full border border-slate-300 rounded p-3 text-sm" value={model.draft.fwBaseline || ''} onChange={e => handleUpdateDraft('fwBaseline', e.target.value)} />
                        </Field>
                      </>
                    )}
                  </div>

                  <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 max-w-4xl mx-auto flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Settings2 size={20} /></div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">Blueprint Inheritance</h4>
                      <p className="text-xs text-blue-700 mt-1">These constants will be used by the MES to validate assembly gates and IOT telemetry signatures downstream.</p>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "REVIEW" && (
                <FlowStep stepTitle="Engineering Review" stepHint="Validate blueprint schema before committing to technical review phase.">
                  <Summary />
                  <div className="mt-8 space-y-6 max-w-2xl mx-auto">
                    <Field label="Reviewer Notes (Checker Stage)" id="comment">
                      <textarea 
                        className="w-full border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        rows={3} placeholder="Verify specific technical edge-cases..."
                        value={model.comment}
                        onChange={e => setModel(m => ({ ...m, comment: e.target.value }))}
                      />
                    </Field>
                    {!isActionAllowed(model.role, model.state, "REVIEW_FORWARD") && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-xs shadow-sm">
                        <User size={16} className="shrink-0" />
                        <span>Current Role: <strong>{model.role}</strong>. Technical review actions require <strong>Checker</strong> authorization.</span>
                      </div>
                    )}
                  </div>
                </FlowStep>
              )}

              {model.step === "APPROVE" && (
                <FlowStep stepTitle="Final Engineering Sign-off" stepHint="Authorize this SKU revision for active procurement and production use.">
                  <Summary />
                  <div className="mt-8 space-y-6 max-w-2xl mx-auto">
                    <Field label="Final Approval Statement" id="reason">
                      <textarea 
                        className="w-full border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        rows={3} placeholder="Confirmation of regulatory and technical baseline compliance..."
                        value={model.rejectionReason}
                        onChange={e => setModel(m => ({ ...m, rejectionReason: e.target.value }))}
                      />
                    </Field>
                    {!isActionAllowed(model.role, model.state, "APPROVE_TO_ACTIVE") && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-xs shadow-sm">
                        <ShieldCheck size={16} className="shrink-0" />
                        <span>Authoritative action restricted to <strong>Approver</strong> role.</span>
                      </div>
                    )}
                  </div>
                </FlowStep>
              )}

              {model.step === "PUBLISH" && (
                <FlowStep stepTitle="Registration Success" stepHint="Blueprint is now part of the active Product Master Catalog.">
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl ring-8 ring-green-50 animate-in zoom-in-75 duration-500">
                      <Globe size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Blueprint Released</h3>
                    <p className="text-slate-500 max-w-md mt-3 text-sm">
                      SKU <strong>{model.draft.skuCode}</strong> is now live. Downstream procurement (S2) and batching (S4) can now reference this blueprint.
                    </p>
                    <div className="mt-10 w-full max-w-lg text-left">
                       <Summary />
                    </div>
                  </div>
                </FlowStep>
              )}
            </>
          )}
        </div>

        <FlowFooter 
          left={
            <button onClick={onExit} className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest">
              Exit
            </button>
          }
          right={
            <div className="flex items-center gap-4">
              {model.step === "INIT" && (
                <button 
                  onClick={() => handleNextStep('GENERAL')}
                  disabled={!model.draft.skuType}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                  Define General <ChevronRight size={18} />
                </button>
              )}

              {model.step === "GENERAL" && (
                <>
                  <button onClick={() => setModel(m => ({ ...m, step: "INIT" }))} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Back</button>
                  <button 
                    onClick={() => handleNextStep('TECHNICAL')}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-all shadow-lg active:scale-95"
                  >
                    Configure Blueprint <ChevronRight size={18} />
                  </button>
                </>
              )}

              {model.step === "TECHNICAL" && (
                <>
                  <button onClick={() => setModel(m => ({ ...m, step: "GENERAL" }))} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Back</button>
                  <button 
                    onClick={handleSaveDraft}
                    disabled={model.isSyncing}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Save size={18} /> Save Buffer
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={!isActionAllowed(model.role, model.state, "SUBMIT_FOR_REVIEW") || model.isSyncing}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                  >
                    Release to Review <Send size={18} />
                  </button>
                </>
              )}

              {model.step === "REVIEW" && (
                <>
                  <button onClick={() => handleDecision('review', 'SEND_BACK')} disabled={!isActionAllowed(model.role, model.state, "REVIEW_SEND_BACK") || model.isSyncing} className="flex items-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition-all">
                    <XCircle size={18} /> Recalibrate
                  </button>
                  <button onClick={() => handleDecision('review', 'FORWARD')} disabled={!isActionAllowed(model.role, model.state, "REVIEW_FORWARD") || model.isSyncing} className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg">
                    Verify & Forward <ChevronRight size={18} />
                  </button>
                </>
              )}

              {model.step === "APPROVE" && (
                <>
                  <button onClick={() => handleDecision('approve', 'REJECT')} disabled={!isActionAllowed(model.role, model.state, "REJECT") || model.isSyncing} className="flex items-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition-all">
                    <XCircle size={18} /> Reject
                  </button>
                  <button onClick={() => handleDecision('approve', 'APPROVE')} disabled={!isActionAllowed(model.role, model.state, "APPROVE_TO_ACTIVE") || model.isSyncing} className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg">
                    Final Sign-off <CheckCircle2 size={18} />
                  </button>
                </>
              )}

              {model.step === "PUBLISH" && (
                <button onClick={() => setModel({ ...createDefaultWizardModel(), validationErrors: {} })} className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-all shadow-lg active:scale-95">
                  <FilePlus size={18} /> New Definition
                </button>
              )}
            </div>
          }
        />
      </div>
    </FlowShell>
  );
};