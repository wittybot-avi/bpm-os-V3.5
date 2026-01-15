/**
 * SKU Flow Wizard (FLOW-001)
 * A standardized step-wizard for SKU creation lifecycle.
 * @updated V35-S1-WIZ-FIX-06 (Step Pruning & UX Focus)
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
  Globe,
  Lock,
  Unlock,
  Link2,
  FileSignature,
  ArrowRight,
  ArrowLeft,
  Gavel,
  ClipboardCheck,
  Ban,
  Activity,
  Construction,
  FlaskConical,
  Wind,
  Cable
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
  WizardStepId,
  getNextStepId,
  getPrevStepId
} from './skuFlowWizardModel';
import { useDeviceLayout } from '../../../hooks/useDeviceLayout';
import { apiFetch } from '../../../services/apiHarness';
import { SkuType } from '../../../stages/s1/s1Contract';

interface Precondition {
  id: string;
  label: string;
  status: 'MET' | 'NOT_MET';
  severity: 'HARD' | 'SOFT';
  description: string;
}

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

  // Mock Preconditions State
  const [preconditions, setPreconditions] = useState<Precondition[]>([
    { id: 'ecr', label: 'ECR Approval', status: 'MET', severity: 'HARD', description: 'Engineering Change Request must be formally approved in PLM.' },
    { id: 'plm', label: 'PLM Sync', status: 'MET', severity: 'HARD', description: 'Master Data synchronization with legacy PLM baseline.' },
    { id: 'reg', label: 'Regulatory DB', status: 'NOT_MET', severity: 'SOFT', description: 'External Regulatory Database connectivity (Optional for Draft).' },
  ]);

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
    // Only Maker can update draft
    if (model.role !== 'Maker' && model.state === 'Draft') return;
    
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

    if (step === 'BASE_SKU_METADATA') {
      if (!d.skuCode) errors.skuCode = 'SKU Code is required';
      if (!d.skuName) errors.skuName = 'SKU Name is required';
    }

    if (step === 'TECH_CELL_SCAFFOLD') {
      if (!d.chemistry) errors.chemistry = 'Chemistry required';
      if (!d.nominalVoltage) errors.nominalVoltage = 'Voltage required';
      if (!d.capacityAh) errors.capacityAh = 'Capacity required';
    }
    if (step === 'TECH_MODULE_SCAFFOLD') {
      if (!d.cellTypeRef) errors.cellTypeRef = 'Cell Type Ref required';
      if (!d.seriesConfig) errors.seriesConfig = 'Series config required';
    }
    if (step === 'TECH_PACK_SCAFFOLD') {
      if (!d.nominalVoltage) errors.nominalVoltage = 'System voltage required';
      if (!d.energyKwh) errors.energyKwh = 'Target energy required';
    }
    if (step === 'TECH_BMS_SCAFFOLD') {
      if (!d.chemistry) errors.chemistry = 'Cell Chemistry required';
      if (!d.voltageMax) errors.voltageMax = 'Max voltage required';
    }
    if (step === 'TECH_IOT_SCAFFOLD') {
      if (!d.commsType) errors.commsType = 'Comms Type required';
    }

    setModel(m => ({ ...m, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(model.step)) {
      const next = getNextStepId(model.step, model.draft.isRevision, model.draft.skuType);
      setModel(m => ({ ...m, step: next }));
    }
  };

  const handlePrevStep = () => {
    const prev = getPrevStepId(model.step, model.draft.isRevision, model.draft.skuType);
    setModel(m => ({ ...m, step: prev }));
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

  // Precondition Logic
  const areHardGatesMet = preconditions.filter(p => p.severity === 'HARD').every(p => p.status === 'MET');

  // Task Instruction Generation
  const taskInstruction = useMemo(() => {
    const s = model.state;
    const r = model.role;
    
    if (s === 'Draft') {
      if (r === 'Maker') return "Define technical specifications and release for review.";
      return `Waiting for ${roles[0]} to submit draft.`;
    }
    if (s === 'Review') {
      if (r === 'Checker') return "Perform Technical Verification and choose Forward or Send Back.";
      return `Waiting for Technical Review (${roles[1]}).`;
    }
    if (s === 'Approved') {
      if (r === 'Approver') return "Review entire blueprint dossier for final management sign-off.";
      return `Awaiting Management Authorization (${roles[2]}).`;
    }
    if (s === 'Rejected') {
      if (r === 'Maker') return "Recalibrate specifications based on rejection feedback and resubmit.";
      return "Flow rejected. Pending Maker recalibration.";
    }
    if (s === 'Active') return "Blueprint is active in the catalog.";
    return "Initialize SKU definition.";
  }, [model.state, model.role]);

  // UI Components
  const Field = ({ label, id, error, children, icon: Icon }: { label: string, id: string, error?: string, children: React.ReactNode, icon?: React.ElementType }) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {Icon && <Icon size={10} className="text-slate-400" />}
        {label}
      </label>
      {children}
      {error && <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-left-1"><AlertCircle size={10} /> {error}</div>}
    </div>
  );

  const Summary = () => (
    <div className="bg-slate-50 p-4 rounded border border-slate-200 shadow-inner grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      <div>
        <label className="text-[9px] uppercase font-bold text-slate-400">SKU Profile</label>
        <div className="font-bold text-slate-800">{model.draft.skuCode || '--'} <span className="font-normal text-slate-400 ml-1">({model.draft.skuType})</span></div>
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

  const TaskBanner = (
    <div className="px-6 py-2 bg-slate-900 text-white flex items-center justify-between gap-4">
       <div className="flex items-center gap-3">
          <div className="p-1.5 bg-brand-500/20 rounded-md text-brand-400 border border-brand-500/30">
             <Activity size={14} />
          </div>
          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Current Directive</span>
             <span className="text-xs font-medium text-slate-200">{taskInstruction}</span>
          </div>
       </div>
       <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">FLOW: {model.state.toUpperCase()}</span>
          <div className={`w-2 h-2 rounded-full ${
            model.state === 'Draft' ? 'bg-blue-400 animate-pulse' :
            model.state === 'Review' ? 'bg-amber-400 animate-pulse' :
            model.state === 'Approved' ? 'bg-purple-400 animate-pulse' :
            model.state === 'Active' ? 'bg-green-400' :
            'bg-red-400'
          }`}></div>
       </div>
    </div>
  );

  // Helper to determine if we are at the end of the Maker's path
  const isSubmissionPoint = useMemo(() => {
    const next = getNextStepId(model.step, model.draft.isRevision, model.draft.skuType);
    return next === "REVIEW";
  }, [model.step, model.draft.isRevision, model.draft.skuType]);

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
           {(model.isSyncing || model.isLoading) && <span className="animate-pulse text-brand-600 font-bold uppercase">COMMITTING...</span>}
        </div>

        {TaskBanner}

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
                  <div className="space-y-10 max-w-2xl mx-auto py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleUpdateDraft('isRevision', false)}
                        disabled={model.role !== 'Maker'}
                        className={`p-6 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${!model.draft.isRevision ? 'border-brand-500 bg-brand-50 shadow-md ring-4 ring-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'} ${model.role !== 'Maker' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <FilePlus size={32} className={!model.draft.isRevision ? 'text-brand-600' : 'text-slate-300'} />
                        <div className="text-center"><div className="font-bold text-slate-800">GREENFIELD SKU</div><div className="text-[10px] text-slate-500">New Product Definition</div></div>
                      </button>
                      <button 
                        onClick={() => handleUpdateDraft('isRevision', true)}
                        disabled={model.role !== 'Maker'}
                        className={`p-6 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${model.draft.isRevision ? 'border-brand-500 bg-brand-50 shadow-md ring-4 ring-brand-50' : 'border-slate-100 bg-white hover:border-slate-200'} ${model.role !== 'Maker' ? 'cursor-not-allowed opacity-50' : ''}`}
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
                            disabled={model.role !== 'Maker'}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${model.draft.skuType === type.id ? 'bg-slate-800 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'} ${model.role !== 'Maker' ? 'cursor-not-allowed' : ''}`}
                          >
                            <type.icon size={24} />
                            <span className="text-[10px] font-bold uppercase">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preconditions Panel */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-brand-600" />
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Operational Preconditions</h3>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${areHardGatesMet ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {areHardGatesMet ? 'GATE OPEN' : 'GATE LOCKED'}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {preconditions.map(p => (
                                <div key={p.id} className={`flex items-start gap-4 p-3 rounded-xl border transition-all ${p.status === 'MET' ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-amber-200 shadow-sm'}`}>
                                    <div className="mt-0.5">
                                        {p.status === 'MET' ? (
                                            <CheckCircle2 size={16} className="text-green-500" />
                                        ) : (
                                            p.severity === 'HARD' ? <Lock size={16} className="text-red-500" /> : <AlertTriangle size={16} className="text-amber-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800">{p.label}</span>
                                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${p.severity === 'HARD' ? 'bg-red-600 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {p.severity}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{p.description}</p>
                                    </div>
                                    {p.status === 'NOT_MET' && p.id === 'ecr' && model.role === 'Maker' && (
                                        <button className="text-[9px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 shrink-0 uppercase">
                                            <FileSignature size={10} /> Sign ECR
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "BASE_SKU_METADATA" && (
                <FlowStep stepTitle="General Identifiers" stepHint="Establish basic SKU metadata and identification strings.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                    <Field label="Canonical SKU Code" id="skuCode" error={model.validationErrors.skuCode}>
                      <input 
                        type="text" id="skuCode"
                        disabled={model.role !== 'Maker'}
                        className={`w-full border rounded p-3 text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none transition-all ${model.validationErrors.skuCode ? 'border-red-300 bg-red-50' : 'border-slate-300'} ${model.role !== 'Maker' ? 'bg-slate-50 opacity-80' : ''}`}
                        placeholder="e.g. BP-LFP-48V-STD"
                        value={model.draft.skuCode}
                        onChange={e => handleUpdateDraft('skuCode', e.target.value)}
                      />
                    </Field>
                    <Field label="Display Name" id="skuName" error={model.validationErrors.skuName}>
                      <input 
                        type="text" id="skuName"
                        disabled={model.role !== 'Maker'}
                        className={`w-full border rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all ${model.validationErrors.skuName ? 'border-red-300 bg-red-50' : 'border-slate-300'} ${model.role !== 'Maker' ? 'bg-slate-50 opacity-80' : ''}`}
                        placeholder="e.g. Standard 48V LFP Module"
                        value={model.draft.skuName}
                        onChange={e => handleUpdateDraft('skuName', e.target.value)}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Engineering Notes" id="notes">
                        <textarea 
                          id="notes" rows={3}
                          disabled={model.role !== 'Maker'}
                          className={`w-full border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none ${model.role !== 'Maker' ? 'bg-slate-50 opacity-80' : ''}`}
                          placeholder="Special assembly instructions or design constraints..."
                          value={model.draft.notes}
                          onChange={e => handleUpdateDraft('notes', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                </FlowStep>
              )}

              {model.step === "TECH_CELL_SCAFFOLD" && (
                <FlowStep stepTitle="Cell Technical Blueprint" stepHint="Configure chemical and physical energy unit parameters.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                     <Field label="Cell Chemistry" id="chemistry" icon={FlaskConical} error={model.validationErrors.chemistry}>
                        <select 
                          id="chemistry"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.chemistry || ""}
                          onChange={e => handleUpdateDraft('chemistry', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                          <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
                          <option value="LTO">LTO (Lithium Titanate)</option>
                        </select>
                     </Field>
                     <Field label="Form Factor" id="formFactor" icon={BoxSelect}>
                        <select 
                          id="formFactor"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.formFactor || ""}
                          onChange={e => handleUpdateDraft('formFactor', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="Cylindrical">Cylindrical (e.g. 21700)</option>
                          <option value="Prismatic">Prismatic</option>
                          <option value="Pouch">Pouch</option>
                        </select>
                     </Field>
                     <Field label="Nominal Voltage (V)" id="nominalVoltage" icon={Zap} error={model.validationErrors.nominalVoltage}>
                        <input 
                          type="number" step="0.01"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm"
                          value={model.draft.nominalVoltage || ""}
                          onChange={e => handleUpdateDraft('nominalVoltage', parseFloat(e.target.value))}
                        />
                     </Field>
                     <Field label="Nominal Capacity (Ah)" id="capacityAh" icon={Battery} error={model.validationErrors.capacityAh}>
                        <input 
                          type="number" step="0.1"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500" 
                          value={model.draft.capacityAh || ''} 
                          onChange={e => handleUpdateDraft('capacityAh', parseFloat(e.target.value))} 
                        />
                    </Field>
                  </div>
                </FlowStep>
              )}

              {model.step === "TECH_MODULE_SCAFFOLD" && (
                <FlowStep stepTitle="Module Technical Blueprint" stepHint="Define grouped cell configuration and busbar specifications.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                     <Field label="Cell Type Reference" id="cellTypeRef" icon={Link2} error={model.validationErrors.cellTypeRef}>
                        <input 
                          type="text"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm font-mono"
                          placeholder="Link to S1 Cell SKU Code"
                          value={model.draft.cellTypeRef || ""}
                          onChange={e => handleUpdateDraft('cellTypeRef', e.target.value)}
                        />
                     </Field>
                     <Field label="Series Config (S)" id="seriesConfig" icon={Layers} error={model.validationErrors.seriesConfig}>
                        <input 
                          type="number"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm"
                          value={model.draft.seriesConfig || ""}
                          onChange={e => handleUpdateDraft('seriesConfig', parseInt(e.target.value))}
                        />
                     </Field>
                     <Field label="Parallel Config (P)" id="parallelConfig" icon={Layers}>
                        <input 
                          type="number"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm"
                          value={model.draft.parallelConfig || ""}
                          onChange={e => handleUpdateDraft('parallelConfig', parseInt(e.target.value))}
                        />
                     </Field>
                     <Field label="Total Cell Count" id="cellCount" icon={BoxSelect} error={model.validationErrors.cellCount}>
                        <input 
                          type="number" 
                          disabled={model.role !== 'Maker'} 
                          className="w-full border border-slate-300 rounded p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500" 
                          value={model.draft.cellCount || ''} 
                          onChange={e => handleUpdateDraft('cellCount', parseInt(e.target.value))} 
                        />
                    </Field>
                  </div>
                </FlowStep>
              )}

              {model.step === "TECH_PACK_SCAFFOLD" && (
                <FlowStep stepTitle="Pack Technical Blueprint" stepHint="Establish full integrated battery assembly constraints.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                     <Field label="System Nominal Voltage (V)" id="nominalVoltage" icon={Zap} error={model.validationErrors.nominalVoltage}>
                        <input 
                          type="number"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm"
                          value={model.draft.nominalVoltage || ""}
                          onChange={e => handleUpdateDraft('nominalVoltage', parseFloat(e.target.value))}
                        />
                     </Field>
                     <Field label="Target Energy (kWh)" id="energyKwh" icon={Battery} error={model.validationErrors.energyKwh}>
                        <input 
                          type="number" step="0.1"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm"
                          value={model.draft.energyKwh || ""}
                          onChange={e => handleUpdateDraft('energyKwh', parseFloat(e.target.value))}
                        />
                     </Field>
                     <Field label="Thermal Cooling Type" id="coolingType" icon={Wind}>
                        <select 
                          id="coolingType"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.coolingType || ""}
                          onChange={e => handleUpdateDraft('coolingType', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="Passive">Passive (Air)</option>
                          <option value="Active_Air">Active Air</option>
                          <option value="Liquid">Liquid Cooled</option>
                          <option value="Phase_Change">Phase Change Material</option>
                        </select>
                     </Field>
                  </div>
                </FlowStep>
              )}

              {model.step === "TECH_BMS_SCAFFOLD" && (
                <FlowStep stepTitle="BMS Technical Blueprint" stepHint="Configure controller hardware and communication protocols.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                     <Field label="Supported Cell Chemistry" id="chemistry" icon={FlaskConical} error={model.validationErrors.chemistry}>
                        <select 
                          id="chemistry"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.chemistry || ""}
                          onChange={e => handleUpdateDraft('chemistry', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="Multi">Multi-Chemistry</option>
                          <option value="LFP">LFP Dedicated</option>
                          <option value="NMC">NMC Dedicated</option>
                        </select>
                     </Field>
                     <div className="grid grid-cols-2 gap-4">
                        <Field label="Min Voltage (V)" id="voltageMin" icon={Zap}>
                            <input 
                              type="number" step="0.1"
                              disabled={model.role !== 'Maker'}
                              className="w-full border border-slate-300 rounded p-3 text-sm"
                              value={model.draft.voltageMin || ""}
                              onChange={e => handleUpdateDraft('voltageMin', parseFloat(e.target.value))}
                            />
                        </Field>
                        <Field label="Max Voltage (V)" id="voltageMax" icon={Zap} error={model.validationErrors.voltageMax}>
                            <input 
                              type="number" step="0.1"
                              disabled={model.role !== 'Maker'}
                              className="w-full border border-slate-300 rounded p-3 text-sm"
                              value={model.draft.voltageMax || ""}
                              onChange={e => handleUpdateDraft('voltageMax', parseFloat(e.target.value))}
                            />
                        </Field>
                     </div>
                     <Field label="Comms Protocol" id="protocol" icon={Cable}>
                        <select 
                          id="protocol"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.protocol || ""}
                          onChange={e => handleUpdateDraft('protocol', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="CAN_2.0">CAN 2.0B</option>
                          <option value="RS485">RS485 / Modbus</option>
                          <option value="SMBus">SMBus / I2C</option>
                        </select>
                     </Field>
                  </div>
                </FlowStep>
              )}

              {model.step === "TECH_IOT_SCAFFOLD" && (
                <FlowStep stepTitle="IoT Technical Blueprint" stepHint="Specify telemetry hardware and network baseline.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
                     <Field label="Connectivity Type" id="commsType" icon={Radio} error={model.validationErrors.commsType}>
                        <select 
                          id="commsType"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.commsType || ""}
                          onChange={e => handleUpdateDraft('commsType', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="4G_LTE">4G LTE (Global)</option>
                          <option value="5G_IOT">5G NB-IoT</option>
                          <option value="LoRaWAN">LoRaWAN</option>
                          <option value="WiFi">Industrial WiFi</option>
                        </select>
                     </Field>
                     <Field label="Primary Power Source" id="powerSource" icon={Zap}>
                        <select 
                          id="powerSource"
                          disabled={model.role !== 'Maker'}
                          className="w-full border border-slate-300 rounded p-3 text-sm bg-white"
                          value={model.draft.powerSource || ""}
                          onChange={e => handleUpdateDraft('powerSource', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="Internal_Bat">Internal Backup Battery</option>
                          <option value="Bus_Powered">Main Bus Powered</option>
                          <option value="Hybrid">Hybrid Source</option>
                        </select>
                     </Field>
                  </div>
                </FlowStep>
              )}

              {model.step === "REVIEW" && (
                <FlowStep stepTitle="Engineering Review" stepHint="Validate blueprint schema before committing to technical review phase.">
                  <Summary />
                  <div className="mt-8 space-y-6 max-w-2xl mx-auto">
                    <Field label="Technical Verification Remarks" id="comment">
                      <textarea 
                        className={`w-full border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none ${model.role !== 'Checker' ? 'bg-slate-50 opacity-80' : ''}`}
                        rows={3} placeholder="Verify specific technical edge-cases..."
                        value={model.comment}
                        disabled={model.role !== 'Checker'}
                        onChange={e => setModel(m => ({ ...m, comment: e.target.value }))}
                      />
                    </Field>
                    {model.role !== 'Checker' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 text-slate-500 text-xs italic">
                        <Lock size={16} className="shrink-0" />
                        <span>Action locked. Current role <strong>{model.role}</strong> cannot perform technical review.</span>
                      </div>
                    )}
                  </div>
                </FlowStep>
              )}

              {model.step === "APPROVE" && (
                <FlowStep stepTitle="Final Engineering Sign-off" stepHint="Authorize this SKU revision for active procurement and production use.">
                  <Summary />
                  <div className="mt-8 space-y-6 max-w-2xl mx-auto">
                    {model.comment && (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                         <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <ClipboardCheck size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Checker Observations</span>
                         </div>
                         <p className="text-sm text-blue-900 italic">"{model.comment}"</p>
                      </div>
                    )}
                    <Field label="Management Authorization Statement" id="reason">
                      <textarea 
                        className={`w-full border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none ${model.role !== 'Approver' ? 'bg-slate-50 opacity-80' : ''}`}
                        rows={3} placeholder="Confirmation of regulatory and technical baseline compliance..."
                        value={model.rejectionReason}
                        disabled={model.role !== 'Approver'}
                        onChange={e => setModel(m => ({ ...m, rejectionReason: e.target.value }))}
                      />
                    </Field>
                    {model.role !== 'Approver' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 text-slate-500 text-xs italic">
                        <Lock size={16} className="shrink-0" />
                        <span>Sign-off locked. Awaiting <strong>Approver</strong> authorization.</span>
                      </div>
                    )}
                  </div>
                </FlowStep>
              )}

              {model.step === "PUBLISH" && (
                <FlowStep stepTitle="Blueprint Active" stepHint="The SKU profile is released and ready for MES operations.">
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl ring-8 ring-green-50 animate-in zoom-in-75 duration-500">
                      <ShieldCheck size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Active Catalog Record</h3>
                    <p className="text-slate-500 max-w-md mt-3 text-sm">
                      SKU <strong>{model.draft.skuCode}</strong> is now live. Registry ID and Trace lineage established.
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
            <button onClick={onExit} className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft size={14} /> Exit
            </button>
          }
          right={
            <div className="flex items-center gap-3">
              {model.step === "INIT" && (
                <button 
                  onClick={handleNextStep}
                  disabled={!model.draft.skuType || !areHardGatesMet || model.role !== 'Maker'}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                  {model.role === 'Maker' ? 'Define Specifications' : 'Awaiting Maker'} <ChevronRight size={18} />
                </button>
              )}

              {(model.step === "BASE_SKU_METADATA" || model.step.startsWith("TECH_") || model.step === "TECHNICAL") && (
                <>
                  <button onClick={handlePrevStep} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Back</button>
                  {model.role === 'Maker' && (
                    <>
                      <button 
                        onClick={handleSaveDraft}
                        disabled={model.isSyncing}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Save size={18} /> Save Buffer
                      </button>
                      <button 
                        onClick={() => isSubmissionPoint ? handleSubmit() : handleNextStep()}
                        className={`flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-all shadow-lg active:scale-95`}
                      >
                        {isSubmissionPoint ? 'Release to Review' : 'Next Step'} <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                  {model.role !== 'Maker' && (
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-md border border-slate-200">
                       <Lock size={14} /> View Only (Maker Action Req)
                    </div>
                  )}
                </>
              )}

              {model.step === "REVIEW" && (
                <>
                  {model.role === 'Checker' ? (
                    <>
                      <button onClick={() => handleDecision('review', 'SEND_BACK')} disabled={model.isSyncing} className="flex items-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-all">
                        <RotateCcw size={18} /> Send Back
                      </button>
                      <button onClick={() => handleDecision('review', 'FORWARD')} disabled={model.isSyncing} className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 shadow-lg">
                        Verify & Forward <ChevronRight size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-md border border-slate-200">
                       <Lock size={14} /> Awaiting Technical Verification
                    </div>
                  )}
                </>
              )}

              {model.step === "APPROVE" && (
                <>
                  {model.role === 'Approver' ? (
                    <>
                      <button onClick={() => handleDecision('approve', 'REJECT')} disabled={model.isSyncing} className="flex items-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-all">
                        <Ban size={18} /> Reject
                      </button>
                      <button onClick={() => handleDecision('approve', 'APPROVE')} disabled={model.isSyncing} className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-lg">
                        Final Sign-off <ShieldCheck size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-md border border-slate-200">
                       <Lock size={14} /> Awaiting Management Approval
                    </div>
                  )}
                </>
              )}

              {model.step === "PUBLISH" && (
                <button onClick={() => setModel({ ...createDefaultWizardModel(), validationErrors: {} })} className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-all shadow-lg active:scale-95">
                  <FilePlus size={18} /> Define New SKU
                </button>
              )}
            </div>
          }
        />
      </div>
    </FlowShell>
  );
};