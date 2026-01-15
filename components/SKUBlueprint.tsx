import React, { useContext, useState, useEffect } from 'react';
import { UserContext, UserRole, NavView, AnyFlowInstance } from '../types';
import { 
  ShieldAlert, 
  Cpu, 
  Battery, 
  Zap, 
  Scale, 
  Database, 
  Edit2, 
  ThumbsUp, 
  Plus, 
  CheckCircle2, 
  ArrowRight, 
  Wand2, 
  X, 
  FlaskConical, 
  ShieldCheck, 
  Archive, 
  Fingerprint, 
  Globe, 
  ClipboardList, 
  FileText,
  Lock,
  Stamp,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { getMockS1Context, S1Context, SkuMasterData } from '../stages/s1/s1Contract';
import { getS1ActionState, S1ActionId } from '../stages/s1/s1Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { SkuFlowWizard } from '../flows/sku/ui/SkuFlowWizard';
import { FlowInstanceList } from './flow';
import { apiFetch } from '../services/apiHarness';
import { SKU_FLOW_ENDPOINTS } from '../flows/sku';

interface SKUBlueprintProps {
  onNavigate?: (view: NavView) => void;
}

export const SKUBlueprint: React.FC<SKUBlueprintProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Master Data State
  const [s1Context, setS1Context] = useState<S1Context>(getMockS1Context());
  const [selectedSku, setSelectedSku] = useState<SkuMasterData>(s1Context.skus[0]);
  
  // Workflow State
  const [showWizard, setShowWizard] = useState(false);
  const [resumeInstanceId, setResumeInstanceId] = useState<string | null>(null);
  const [apiFlows, setApiFlows] = useState<AnyFlowInstance[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchApiFlows = async () => {
    setIsLoadingFlows(true);
    try {
      const res = await apiFetch(SKU_FLOW_ENDPOINTS.list);
      const result = await res.json();
      if (result.ok) {
        setApiFlows(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch S1 flows:", e);
    } finally {
      setIsLoadingFlows(false);
    }
  };

  useEffect(() => {
    fetchApiFlows();
  }, []);

  // Handlers
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

  const handleApproveCatalog = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setS1Context(prev => ({ ...prev, approvalStatus: 'APPROVED' }));
      emitAuditEvent({
        stageId: 'S1',
        actionId: 'APPROVE_BLUEPRINT',
        actorRole: role,
        message: `Validated Product Master Revision: ${s1Context.activeRevision}`
      });
      setIsSimulating(false);
    }, 800);
  };

  const handleNavToS2 = () => {
    if (onNavigate) onNavigate('procurement');
  };

  const hasAccess = role === UserRole.SYSTEM_ADMIN || role === UserRole.ENGINEERING || role === UserRole.MANAGEMENT || role === UserRole.QA_ENGINEER;

  if (!hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p>Your role ({role}) does not have permission to view Product Master Data.</p>
      </div>
    );
  }

  const isReadyForNext = s1Context.approvalStatus === 'APPROVED';

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-300 pb-12">
      {/* Header - Flow Home Unified CTA */}
      <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              Master Data <span className="text-slate-300">/</span> Product Blueprints
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Cpu className="text-brand-600" size={24} />
             Product Master (S1)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Definition of technical SKU profiles and regulatory blueprints.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button 
              className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 border transition-all ${
                showWizard 
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                : 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700 shadow-sm'
              }`}
              onClick={showWizard ? handleWizardExit : handleStartNewWizard}
            >
              {showWizard ? <X size={16} /> : <Wand2 size={16} />}
              <span>{showWizard ? 'EXIT WIZARD' : 'START SKU FLOW WIZARD'}</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-1">
            <Database size={10} /> 
            <span>Catalog ID: {s1Context.activeCatalogId}</span>
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

          {/* Catalog Guidance */}
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-3 ${!onNavigate ? 'hidden' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">Active Product Catalog</h3>
                <p className="text-xs text-blue-700 mt-1 max-w-lg">
                  {isReadyForNext 
                    ? "Product specifications are verified in the master ledger. S2 Procurement can now execute against these blueprints." 
                    : "The master catalog is currently under engineering review. Approve the catalog to lock definitions."}
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
               {!isReadyForNext && (
                 <button 
                   onClick={handleApproveCatalog}
                   disabled={role !== UserRole.SYSTEM_ADMIN && role !== UserRole.MANAGEMENT}
                   className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-xs font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                 >
                   <ThumbsUp size={14} /> APPROVE CATALOG
                 </button>
               )}
               <button 
                 onClick={handleNavToS2} 
                 disabled={!isReadyForNext}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
               >
                 <span>S2 PROCUREMENT</span>
                 <ArrowRight size={14} />
               </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left: Pilot Flow Summary */}
            <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
                <FlowInstanceList 
                   title="Active SKU Flows"
                   flowId="FLOW-001"
                   instances={apiFlows}
                   isLoading={isLoadingFlows}
                   onRefresh={fetchApiFlows}
                   onSelect={handleResumeWizard}
                   onStartNew={handleStartNewWizard}
                   emptyMessage="No SKU creations in progress."
                />
            </div>

            {/* Right: Read-Only Dossier */}
            <div className="col-span-9 grid grid-cols-12 gap-6 min-h-0">
                {/* Dossier Selector */}
                <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
                    <div className="bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider text-xs">
                                    <Archive size={14} className="text-brand-600" />
                                    Master Ledger
                                </h3>
                            </div>
                            <span className="text-[10px] bg-white border px-2 py-0.5 rounded font-mono text-slate-500">{s1Context.skus.length} SKUs</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                            {s1Context.skus.map(sku => (
                                <div 
                                    key={sku.skuId}
                                    onClick={() => setSelectedSku(sku)}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                        selectedSku.skuId === sku.skuId 
                                        ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-100' 
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">REV {sku.revision.id}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                                            sku.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>{sku.status}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-0.5">{sku.skuCode}</h4>
                                    <p className="text-xs text-slate-500 truncate uppercase tracking-tight">{sku.type}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dossier Body */}
                <div className="col-span-8 bg-white rounded-lg shadow-sm border border-industrial-border flex flex-col overflow-hidden relative">
                    {/* Watermark/Stamp */}
                    <div className="absolute top-24 right-8 opacity-5 pointer-events-none -rotate-12">
                        <Stamp size={180} />
                    </div>

                    {/* Dossier Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 z-10">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-brand-600">
                                {selectedSku.type === 'CELL' ? <Zap size={32} /> : <Battery size={32} />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{selectedSku.skuCode}</h2>
                                <p className="text-sm text-slate-600 font-medium">{selectedSku.name}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border px-2 py-0.5 rounded flex items-center gap-1">
                                        <Lock size={10} /> {selectedSku.skuId}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border px-2 py-0.5 rounded">REV {selectedSku.revision.id}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold uppercase tracking-widest">
                                <ShieldCheck size={12} /> Blueprint Dossier
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono italic">Locked for Operations</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar z-10">
                        
                        {/* 1. Technical Attributes */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <Zap size={16} className="text-amber-500" />
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical Attributes</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Chemistry</span>
                                    <span className="font-bold text-slate-800">{selectedSku.technicalProfile.chemistry || 'N/A'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Voltage (Nominal)</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedSku.technicalProfile.nominalVoltage || '0'} V</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Capacity</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedSku.technicalProfile.nominalCapacity || '0'} Ah</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Form Factor</span>
                                    <span className="text-xs font-bold text-slate-700">{selectedSku.technicalProfile.formFactor || 'N/A'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Standard Config</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedSku.technicalProfile.configuration || 'N/A'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Entity Type</span>
                                    <span className="text-xs font-bold text-slate-700 uppercase">{selectedSku.type}</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. Regulatory Footprint */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <Scale size={16} className="text-blue-500" />
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Regulatory Footprint</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-lg border flex items-center justify-between ${selectedSku.complianceProfile.requiresBatteryAadhaar ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <div className="flex items-center gap-3">
                                        <Fingerprint size={18} className={selectedSku.complianceProfile.requiresBatteryAadhaar ? 'text-purple-600' : 'text-slate-300'} />
                                        <span className="text-xs font-bold text-slate-700">India Battery Aadhaar</span>
                                    </div>
                                    <span className={`text-[10px] font-bold ${selectedSku.complianceProfile.requiresBatteryAadhaar ? 'text-green-600' : 'text-slate-400'}`}>
                                        {selectedSku.complianceProfile.requiresBatteryAadhaar ? 'MANDATORY' : 'OPTIONAL'}
                                    </span>
                                </div>
                                
                                <div className={`p-3 rounded-lg border flex items-center justify-between ${selectedSku.complianceProfile.requiresEuPassport ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <div className="flex items-center gap-3">
                                        <Globe size={18} className={selectedSku.complianceProfile.requiresEuPassport ? 'text-blue-600' : 'text-slate-300'} />
                                        <span className="text-xs font-bold text-slate-700">EU Battery Passport</span>
                                    </div>
                                    <span className={`text-[10px] font-bold ${selectedSku.complianceProfile.requiresEuPassport ? 'text-green-600' : 'text-slate-400'}`}>
                                        {selectedSku.complianceProfile.requiresEuPassport ? 'MANDATORY' : 'OPTIONAL'}
                                    </span>
                                </div>

                                <div className={`p-3 rounded-lg border flex items-center justify-between ${selectedSku.complianceProfile.requiresBisCertification ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck size={18} className={selectedSku.complianceProfile.requiresBisCertification ? 'text-green-600' : 'text-slate-300'} />
                                        <span className="text-xs font-bold text-slate-700">BIS / AIS-156 Safety</span>
                                    </div>
                                    <span className={`text-[10px] font-bold ${selectedSku.complianceProfile.requiresBisCertification ? 'text-green-600' : 'text-slate-400'}`}>
                                        {selectedSku.complianceProfile.requiresBisCertification ? 'MANDATORY' : 'OPTIONAL'}
                                    </span>
                                </div>

                                <div className="p-3 rounded-lg border bg-white border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700">UN38.3 Certified</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-green-600">VERIFIED</span>
                                </div>
                            </div>
                        </section>

                        {/* 3. Manufacturing Readiness */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <FlaskConical size={16} className="text-purple-500" />
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Readiness</h3>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-800 pb-1.5">
                                    <span className="text-slate-500 uppercase">Precondition Check</span>
                                    <span className="text-green-400 font-bold">[READY]</span>
                                </div>
                                <div className="space-y-1">
                                    {selectedSku.preconditions.map(p => (
                                        <div key={p} className="flex items-center gap-2 text-[10px] text-slate-300 font-mono">
                                            <div className="w-1 h-1 rounded-full bg-brand-500"></div>
                                            {p}
                                        </div>
                                    ))}
                                    {selectedSku.preconditions.length === 0 && (
                                        <div className="text-[10px] text-slate-600 italic font-mono">No mandatory preconditions defined.</div>
                                    )}
                                </div>
                                <div className="pt-2 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                    <span>Facility Compatibility</span>
                                    <span className="text-blue-400">Validated @ S0</span>
                                </div>
                            </div>
                        </section>

                        {/* 4. Revision History Summary */}
                        <section className="bg-amber-50/30 border border-amber-100 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={14} className="text-amber-600" />
                                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Revision Context</span>
                            </div>
                            <div className="text-[11px] text-amber-900 leading-relaxed italic">
                                "{selectedSku.revision.changeLog}"
                            </div>
                            <div className="mt-2 text-[9px] text-amber-700/60 font-mono">
                                Effective Date: {new Date(selectedSku.revision.effectiveDate).toLocaleDateString()}
                            </div>
                        </section>

                    </div>
                    
                    {/* Dossier Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 font-medium"><Lock size={10} /> Immutable Dossier Record</span>
                            <span>Engineered By: {s1Context.engineeringSignoff}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-green-500"></div>
                             <span className="font-bold uppercase tracking-widest">Ledger Active</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};