import React, { useContext, useState, useEffect } from 'react';
import { UserContext, UserRole, NavView } from '../types';
import { 
  ShieldAlert, 
  Cpu, 
  Battery, 
  Zap, 
  Scale, 
  CheckCircle, 
  AlertCircle,
  FileBadge,
  Globe,
  Settings,
  Box,
  Layers,
  Database,
  GitCommit,
  Edit2,
  Send,
  ThumbsUp,
  UploadCloud,
  Plus,
  History,
  CheckCircle2,
  ArrowRight,
  Radar,
  ShoppingCart,
  Wand2,
  X,
  RefreshCw,
  Clock
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { DisabledHint } from './DisabledHint';
import { getMockS1Context, S1Context } from '../stages/s1/s1Contract';
import { getS1ActionState, S1ActionId } from '../stages/s1/s1Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { SkuFlowWizard } from '../flows/sku/ui/SkuFlowWizard';
import { apiFetch } from '../services/apiHarness';
import { SKU_FLOW_ENDPOINTS, type SkuFlowInstance } from '../flows/sku';

// Mock Data Types
interface SKU {
  id: string;
  code: string;
  name: string;
  chemistry: 'LFP' | 'NMC' | 'LTO';
  formFactor: 'Prismatic' | 'Cylindrical 21700' | 'Pouch';
  voltage: string;
  capacity: string;
  status: 'Draft' | 'Approved' | 'Obsolete';
  compliance: {
    batteryAadhaar: boolean;
    euPassport: boolean;
    bisCertified: boolean;
  };
}

// Mock Data
const MOCK_SKUS: SKU[] = [
  {
    id: 'sku-001',
    code: 'BP-LFP-48V-2.5K',
    name: 'E-Scooter Standard Pack',
    chemistry: 'LFP',
    formFactor: 'Cylindrical 21700',
    voltage: '48V',
    capacity: '2.5 kWh',
    status: 'Approved',
    compliance: {
      batteryAadhaar: true,
      euPassport: false,
      bisCertified: true
    }
  },
  {
    id: 'sku-002',
    code: 'BP-NMC-800V-75K',
    name: 'EV High Performance Pack',
    chemistry: 'NMC',
    formFactor: 'Prismatic',
    voltage: '800V',
    capacity: '75 kWh',
    status: 'Draft',
    compliance: {
      batteryAadhaar: true,
      euPassport: true,
      bisCertified: false
    }
  },
  {
    id: 'sku-003',
    code: 'BP-LTO-24V-1K',
    name: 'AGV Fast Charge Pack',
    chemistry: 'LTO',
    formFactor: 'Pouch',
    voltage: '24V',
    capacity: '1 kWh',
    status: 'Approved',
    compliance: {
      batteryAadhaar: false,
      euPassport: false,
      bisCertified: true
    }
  }
];

interface SKUBlueprintProps {
  onNavigate?: (view: NavView) => void;
}

export const SKUBlueprint: React.FC<SKUBlueprintProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  const [selectedSku, setSelectedSku] = useState<SKU>(MOCK_SKUS[0]);
  const [showWizard, setShowWizard] = useState(false);
  const [resumeInstanceId, setResumeInstanceId] = useState<string | null>(null);

  // V3.4 Simulated API State
  const [apiFlows, setApiFlows] = useState<SkuFlowInstance[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local State for S1 Context Simulation
  const [s1Context, setS1Context] = useState<S1Context>(getMockS1Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchApiFlows = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch(SKU_FLOW_ENDPOINTS.list);
      const result = await res.json();
      if (result.ok) {
        setApiFlows(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch S1 flows:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load events and api flows on mount
  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S1'));
    fetchApiFlows();
  }, []);

  // Helper to resolve action state
  const getAction = (actionId: S1ActionId) => getS1ActionState(role, s1Context, actionId);

  // Action Handlers
  const handleStartNewWizard = () => {
    setResumeInstanceId(null);
    setShowWizard(true);
  };

  const handleResumeWizard = (instanceId: string) => {
    setResumeInstanceId(instanceId);
    setShowWizard(true);
  };

  const handleWizardExit = () => {
    setShowWizard(false);
    setResumeInstanceId(null);
    fetchApiFlows();
  };

  const handleCreateSku = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setS1Context(prev => ({ ...prev, totalSkus: prev.totalSkus + 1 }));
      const evt = emitAuditEvent({
        stageId: 'S1',
        actionId: 'CREATE_SKU',
        actorRole: role,
        message: 'Defined new SKU configuration draft'
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 600);
  };

  const handleEditBlueprint = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS1Context(prev => ({ ...prev, lastBlueprintUpdate: now }));
      
      const evt = emitAuditEvent({
        stageId: 'S1',
        actionId: 'EDIT_BLUEPRINT',
        actorRole: role,
        message: `Updated blueprint specs for ${s1Context.activeRevision}`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 800);
  };

  const handleSubmitReview = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setS1Context(prev => ({ ...prev, approvalStatus: 'REVIEW' }));
      
      const evt = emitAuditEvent({
        stageId: 'S1',
        actionId: 'SUBMIT_FOR_REVIEW',
        actorRole: role,
        message: `Submitted ${s1Context.activeRevision} for engineering approval`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  };

  const handleApprove = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS1Context(prev => ({ 
        ...prev, 
        approvalStatus: 'APPROVED', 
        engineeringSignoff: role === UserRole.SYSTEM_ADMIN ? 'SYS-ADMIN-OVERRIDE' : 'QA-LEAD-SIG',
        lastBlueprintUpdate: now
      }));
      
      const evt = emitAuditEvent({
        stageId: 'S1',
        actionId: 'APPROVE_BLUEPRINT',
        actorRole: role,
        message: `Blueprint ${s1Context.activeRevision} formally approved`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1200);
  };

  const handlePublish = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const evt = emitAuditEvent({
        stageId: 'S1',
        actionId: 'PUBLISH_SKU_BLUEPRINT',
        actorRole: role,
        message: `Published SKU Catalog ${s1Context.activeRevision} to manufacturing`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  };

  const handleNavToS2 = () => {
    if (onNavigate) {
      emitAuditEvent({
        stageId: 'S1',
        actionId: 'NAV_NEXT_STAGE',
        actorRole: role,
        message: 'Navigated to S2: Procurement from S1'
      });
      onNavigate('procurement');
    }
  };

  const handleNavToControlTower = () => {
    if (onNavigate) {
      onNavigate('control_tower');
    }
  };

  // Pre-calculate action states
  const createSkuState = getAction('CREATE_SKU');
  const editBlueprintState = getAction('EDIT_BLUEPRINT');
  const submitReviewState = getAction('SUBMIT_FOR_REVIEW');
  const approveState = getAction('APPROVE_BLUEPRINT');
  const publishState = getAction('PUBLISH_SKU_BLUEPRINT');

  const isReadyForNext = s1Context.approvalStatus === 'APPROVED';

  // RBAC Access Check
  const hasAccess = 
    role === UserRole.SYSTEM_ADMIN || 
    role === UserRole.ENGINEERING || 
    role === UserRole.MANAGEMENT ||
    role === UserRole.QA_ENGINEER;

  if (!hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p>Your role ({role}) does not have permission to view SKU Blueprints.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-300 pb-12">
      {/* Standard Header */}
      <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              System Setup <span className="text-slate-300">/</span> SKU Master
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Cpu className="text-brand-600" size={24} />
             SKU & Regulatory Blueprint (S1)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Define battery chemistry, electrical specs, and regulatory compliance.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {/* New V3.4 Wizard Toggle */}
            <button 
              className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 border transition-all ${
                showWizard 
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                : 'bg-white border-brand-200 text-brand-600 hover:bg-brand-50'
              }`}
              onClick={showWizard ? handleWizardExit : handleStartNewWizard}
            >
              {showWizard ? <X size={16} /> : <Wand2 size={16} />}
              <span>{showWizard ? 'Exit Wizard' : 'Start SKU Flow Wizard'}</span>
            </button>

            <button 
              className="bg-brand-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!createSkuState.enabled || isSimulating || showWizard}
              onClick={handleCreateSku}
              title={createSkuState.reason}
            >
              <Plus size={16} />
              <span>Create New SKU</span>
            </button>
          </div>
          {!createSkuState.enabled && !showWizard && (
             <DisabledHint reason={createSkuState.reason || 'Blocked'} className="mt-1" />
          )}
          
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-1">
            <Database size={10} /> 
            <span>Ctx: {s1Context.activeRevision}</span>
            <span className="text-slate-300">|</span>
            <span className={`font-bold ${s1Context.approvalStatus === 'APPROVED' ? 'text-green-600' : 'text-amber-600'}`}>{s1Context.approvalStatus}</span>
          </div>
        </div>
      </div>

      {showWizard ? (
        <div className="flex-1 min-h-0">
           <SkuFlowWizard instanceId={resumeInstanceId} onExit={handleWizardExit} />
        </div>
      ) : (
        <>
          <StageStateBanner stageId="S1" />
          <PreconditionsPanel stageId="S1" />

          {/* Recent Local Activity Panel (Reused Pattern) */}
          {localEvents.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-6 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                  <History size={14} /> Recent S1 Activity (Session)
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
                    ? "Blueprint is approved. Proceed to Commercial Procurement (S2) to initiate sourcing." 
                    : "Blueprint approval pending. Complete S1 review actions to unlock downstream procurement."}
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
                  onClick={handleNavToS2} 
                  disabled={!isReadyForNext}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ShoppingCart size={14} /> Go to S2: Procurement
                </button>
                {!isReadyForNext && (
                    <span className="text-[9px] text-red-500 mt-1 font-medium">Preconditions Not Met</span>
                )}
              </div>
            </div>
          </div>

          {/* Content Split View */}
          <div className={`flex-1 grid grid-cols-12 gap-6 min-h-0 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
            
            {/* Left: Master List */}
            <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
              
              {/* V3.4 In-Progress Flows Section */}
              <div className="bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col h-1/2 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-brand-50/30 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Wand2 size={16} className="text-brand-600" />
                      Active SKU Flows
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Simulated API (In-Memory)</span>
                  </div>
                  <button 
                    onClick={fetchApiFlows}
                    className={`p-1.5 rounded hover:bg-slate-100 text-slate-400 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh Flow List"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                  {apiFlows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center opacity-60">
                      <Clock className="text-slate-300 mb-2" size={24} />
                      <p className="text-xs text-slate-500 font-medium">No active flows in sim storage.</p>
                      <button 
                        onClick={handleStartNewWizard}
                        className="text-[10px] text-brand-600 font-bold uppercase mt-2 hover:underline"
                      >
                        Create First SKU Flow
                      </button>
                    </div>
                  ) : (
                    apiFlows.map(flow => (
                      <div 
                        key={flow.instanceId}
                        onClick={() => handleResumeWizard(flow.instanceId)}
                        className="p-3 bg-white border border-slate-200 rounded-md hover:border-brand-300 hover:shadow-sm cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-slate-800 text-xs font-mono">{flow.instanceId}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            flow.state === 'Active' ? 'bg-green-100 text-green-700' : 
                            flow.state === 'Review' ? 'bg-blue-100 text-blue-700' :
                            flow.state === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {flow.state}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-700 truncate">{flow.draft.skuCode || 'Unnamed Flow'}</div>
                        <div className="flex justify-between items-center mt-2">
                           <span className="text-[9px] text-slate-400 font-mono italic">Upd: {new Date(flow.updatedAt).toLocaleTimeString()}</span>
                           <span className="text-[9px] text-brand-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">RESUME <ArrowRight size={10} /></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Legacy Master List */}
              <div className="bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col h-1/2 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-700">Static Blueprint Catalog</h3>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">V3.3 Baseline Records</span>
                  </div>
                  <div className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
                    {MOCK_SKUS.length} Total
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                  {MOCK_SKUS.map((sku) => (
                    <div 
                      key={sku.id}
                      onClick={() => setSelectedSku(sku)}
                      className={`p-3 rounded-md cursor-pointer border transition-all ${
                        selectedSku.id === sku.id 
                          ? 'bg-brand-50 border-brand-200 shadow-sm' 
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800 text-sm">{sku.code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          sku.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                          sku.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {sku.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">{sku.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="bg-slate-100 px-1 rounded">{sku.chemistry}</span>
                        <span className="bg-slate-100 px-1 rounded">{sku.voltage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right: Detail View / Blueprint */}
            <div className="col-span-8 bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden">
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-slate-900">{selectedSku.name}</h2>
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-mono">{selectedSku.code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <GitCommit size={14} />
                      <span>Blueprint: {s1Context.activeRevision}</span>
                      <span className="text-slate-300">•</span>
                      <span>Signoff: {s1Context.engineeringSignoff}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <button 
                      className="text-brand-600 text-sm font-medium hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1" 
                      disabled={!editBlueprintState.enabled}
                      onClick={handleEditBlueprint}
                      title={editBlueprintState.reason}
                    >
                      <Edit2 size={14} /> Edit Blueprint
                    </button>
                    {!editBlueprintState.enabled && (
                      <DisabledHint reason={editBlueprintState.reason || 'Blocked'} />
                    )}
                  </div>
                </div>

                {/* Lifecycle Action Toolbar */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                    <button 
                      disabled={!submitReviewState.enabled}
                      onClick={handleSubmitReview}
                      title={submitReviewState.reason}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 text-xs font-bold transition-colors"
                    >
                      <Send size={14} /> Submit for Review
                    </button>
                    
                    <button 
                      disabled={!approveState.enabled}
                      onClick={handleApprove}
                      title={approveState.reason}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 text-xs font-bold transition-colors"
                    >
                      <ThumbsUp size={14} /> Approve Blueprint
                    </button>

                    <button 
                      disabled={!publishState.enabled}
                      onClick={handlePublish}
                      title={publishState.reason}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-100 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 text-xs font-bold transition-colors"
                    >
                      <UploadCloud size={14} /> Publish to Production
                    </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* 1. Electrical & Chemistry */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-brand-500" />
                    Electrical & Core Chemistry
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Chemistry</div>
                      <div className="font-semibold text-slate-800">{selectedSku.chemistry}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Nominal Voltage</div>
                      <div className="font-semibold text-slate-800">{selectedSku.voltage}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Energy Capacity</div>
                      <div className="font-semibold text-slate-800">{selectedSku.capacity}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Cell Configuration</div>
                      <div className="font-semibold text-slate-800 font-mono">16S4P</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">BMS Master</div>
                      <div className="font-semibold text-slate-800">Orion BMS 2</div>
                    </div>
                  </div>
                </section>

                {/* 2. Mechanical & Form Factor */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Battery size={16} className="text-brand-500" />
                    Mechanical & Form Factor
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Pack Architecture</div>
                      <div className="font-semibold text-slate-800">{selectedSku.formFactor}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <div className="text-xs text-slate-400 mb-1">Cooling Strategy</div>
                      <div className="font-semibold text-slate-800">Liquid Active Cooling</div>
                    </div>
                    
                    {/* Type B Empty State for Missing Content */}
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 col-span-2 flex flex-col justify-center items-center h-32 border-dashed border-slate-300">
                      <div className="bg-slate-100 p-2 rounded-full mb-2">
                          <Layers className="text-slate-300" size={20} />
                      </div>
                      <h3 className="text-sm font-medium text-slate-600 mb-1">Nothing to display yet</h3>
                      <p className="text-xs text-slate-400">Mechanical CAD preview requires backend integration.</p>
                    </div>
                  </div>
                </section>

                {/* 3. Regulatory Compliance */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Scale size={16} className="text-brand-500" />
                    Regulatory Blueprint
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {/* Battery Aadhaar */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${selectedSku.compliance.batteryAadhaar ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <FileBadge size={20} className={selectedSku.compliance.batteryAadhaar ? 'text-purple-600' : 'text-slate-400'} />
                        <div>
                          <div className={`font-bold text-sm ${selectedSku.compliance.batteryAadhaar ? 'text-purple-900' : 'text-slate-500'}`}>Battery Aadhaar</div>
                          <div className="text-xs text-slate-500">{selectedSku.compliance.batteryAadhaar ? 'Digital Twin Ready' : 'Not Configured'}</div>
                        </div>
                        {selectedSku.compliance.batteryAadhaar && <CheckCircle size={16} className="text-purple-600 ml-2" />}
                    </div>

                    {/* EU Passport */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${selectedSku.compliance.euPassport ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <Globe size={20} className={selectedSku.compliance.euPassport ? 'text-blue-600' : 'text-slate-400'} />
                        <div>
                          <div className={`font-bold text-sm ${selectedSku.compliance.euPassport ? 'text-blue-900' : 'text-slate-500'}`}>EU Battery Passport</div>
                          <div className="text-xs text-slate-500">{selectedSku.compliance.euPassport ? 'DPP Data Schema' : 'Not Required'}</div>
                        </div>
                        {selectedSku.compliance.euPassport && <CheckCircle size={16} className="text-blue-600 ml-2" />}
                    </div>

                    {/* BIS */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${selectedSku.compliance.bisCertified ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <ShieldAlert size={20} className={selectedSku.compliance.bisCertified ? 'text-green-600' : 'text-slate-400'} />
                        <div>
                          <div className={`font-bold text-sm ${selectedSku.compliance.bisCertified ? 'text-green-900' : 'text-slate-500'}`}>AIS-156 / BIS</div>
                          <div className="text-xs text-slate-500">{selectedSku.compliance.bisCertified ? 'Certified' : 'Pending Test'}</div>
                        </div>
                        {selectedSku.compliance.bisCertified ? <CheckCircle size={16} className="text-green-600 ml-2" /> : <AlertCircle size={16} className="text-amber-500 ml-2" />}
                    </div>
                  </div>
                </section>

                {/* 4. Manufacturing Readiness */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={16} className="text-brand-500" />
                    Manufacturing Readiness
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium border border-slate-200">Line A Compatible</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium border border-slate-200">Line B Compatible</span>
                    <span className="px-3 py-1 bg-white text-slate-400 text-xs rounded-full font-medium border border-dashed border-slate-300">Procurement Check Pending</span>
                  </div>
                </section>

              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};