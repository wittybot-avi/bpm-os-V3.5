import React, { useContext, useState, useEffect, useMemo } from 'react';
import { UserContext, UserRole, NavView } from '../types';
import { 
  ShieldAlert, 
  Factory, 
  Settings, 
  Globe, 
  Users, 
  CheckCircle2, 
  Radar, 
  Cpu, 
  Layout, 
  Server, 
  Wrench, 
  Activity, 
  Zap, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  ChevronRight, 
  Building2,
  Loader2,
  Box,
  X,
  Plus,
  Lock,
  Edit2,
  Trash2,
  AlertTriangle,
  Ban,
  Save,
  ChevronDown,
  Edit3,
  History as HistoryIcon,
  RotateCcw,
  MapPin,
  Scale,
  CheckSquare,
  BookOpen,
  UserCheck,
  Shield,
  Search,
  Settings2,
  Mail,
  Fingerprint
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { getMockS0Context, S0Context } from '../stages/s0/s0Contract';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { apiFetch } from '../services/apiHarness';
import { resetS0UIState } from '../sim/api/s0/systemTopology.store';
import type { Enterprise, Plant, Line, Station, DeviceClass } from '../domain/s0/systemTopology.types';
import type { EffectiveFlag, CapabilityScope, CapabilityFlag } from '../domain/s0/capability.types';
import type { RegulatoryFramework, EffectiveCompliance, ComplianceBinding, SOPProfile } from '../domain/s0/complianceContext.types';
import type { AppUser, EffectivePermissions } from '../domain/s0/userManagement.types';

interface SystemSetupProps {
  onNavigate?: (view: NavView) => void;
}

const ScopeBadge: React.FC<{ scope: string }> = ({ scope }) => (
  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-50 text-slate-400 border-slate-200 tracking-tighter shrink-0">
    {scope.toUpperCase()}
  </span>
);

type ManageCategory = 
  | 'ORG' 
  | 'PLANTS' 
  | 'LINES' 
  | 'STATIONS' 
  | 'USERS' 
  | 'SOP_PROFILES' 
  | 'REGULATORY' 
  | 'DEVICE_CLASSES' 
  | 'CAPABILITY_FLAGS' 
  | null;

export const SystemSetup: React.FC<SystemSetupProps> = ({ onNavigate }) => {
  const user = useContext(UserContext);
  const activeUserRole = user.role;
  const isSystemAdmin = activeUserRole === UserRole.SYSTEM_ADMIN;
  
  const [s0Context, setS0Context] = useState<S0Context>(getMockS0Context());
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState<ManageCategory>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DETAILS'>('LIST');

  // Master Data State
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [activePlants, setActivePlants] = useState<Plant[]>([]);
  const [activeLines, setActiveLines] = useState<Line[]>([]);
  const [activeStations, setActiveStations] = useState<Station[]>([]);
  const [deviceClasses, setDeviceClasses] = useState<DeviceClass[]>([]);
  const [allFrameworks, setAllFrameworks] = useState<RegulatoryFramework[]>([]);
  const [allSops, setAllSops] = useState<SOPProfile[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);

  // Selection Context
  const [selEntId, setSelEntId] = useState<string>('');
  const [selPlantId, setSelPlantId] = useState<string>('');
  const [selLineId, setSelLineId] = useState<string>('');
  const [selStationId, setSelStationId] = useState<string>('');
  
  // Loading States
  const [isTopologyLoading, setIsTopologyLoading] = useState(true);
  const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isFlagsLoading, setIsFlagsLoading] = useState(false);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [isPermsLoading, setIsPermsLoading] = useState(false);

  // Form States (Editing Buffers)
  const [editingEnterprise, setEditingEnterprise] = useState<Partial<Enterprise> | null>(null);
  const [editingPlant, setEditingPlant] = useState<Partial<Plant> | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<Line> | null>(null);
  const [editingStation, setEditingStation] = useState<Partial<Station> | null>(null);
  const [editingDeviceClass, setEditingDeviceClass] = useState<Partial<DeviceClass> | null>(null);
  const [editingSop, setEditingSop] = useState<Partial<SOPProfile> | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [editingFramework, setEditingFramework] = useState<Partial<RegulatoryFramework> | null>(null);
  const [editingFlag, setEditingFlag] = useState<Partial<CapabilityFlag> | null>(null);
  
  const [effectiveFlags, setEffectiveFlags] = useState<EffectiveFlag[]>([]);
  const [effectiveCompliance, setEffectiveCompliance] = useState<EffectiveCompliance | null>(null);
  const [effectivePerms, setEffectivePerms] = useState<EffectivePermissions | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // V35-S0-STATE-RESET-PP-26A: Clean preview env
  useEffect(() => {
    const s0Keys = ["bpmos.s0.drawerState", "bpmos.s0.selectedEntity", "bpmos.s0.selectedNode", "bpmos.s0.lastManageKey"];
    s0Keys.forEach(key => localStorage.removeItem(key));
    resetS0UIState();
  }, []);

  // Registry Loading Controller
  const loadRegistryData = async () => {
    if (!activeCategory) return;
    setIsEntitiesLoading(true);
    try {
      let endpoint = '';
      if (activeCategory === 'PLANTS') endpoint = '/api/s0/plants';
      else if (activeCategory === 'LINES') endpoint = `/api/s0/lines?plantId=${selPlantId}`;
      else if (activeCategory === 'STATIONS') endpoint = `/api/s0/stations?lineId=${selLineId}`;
      else if (activeCategory === 'ORG') endpoint = '/api/s0/enterprises';
      else if (activeCategory === 'DEVICE_CLASSES') endpoint = '/api/s0/device-classes';
      else if (activeCategory === 'SOP_PROFILES') endpoint = '/api/s0/compliance/sop-profiles';
      else if (activeCategory === 'USERS') endpoint = '/api/s0/users';
      else if (activeCategory === 'REGULATORY') endpoint = '/api/s0/compliance/frameworks';
      else if (activeCategory === 'CAPABILITY_FLAGS') endpoint = '/api/s0/capabilities/effective?scope=GLOBAL&scopeId=GLOBAL';
      
      if (endpoint) {
        const res = await apiFetch(endpoint);
        const result = await res.json();
        if (result.ok) {
          if (activeCategory === 'PLANTS') setActivePlants(result.data);
          if (activeCategory === 'LINES') setActiveLines(result.data);
          if (activeCategory === 'STATIONS') setActiveStations(result.data);
          if (activeCategory === 'ORG') setEnterprises(result.data);
          if (activeCategory === 'DEVICE_CLASSES') setDeviceClasses(result.data);
          if (activeCategory === 'SOP_PROFILES') setAllSops(result.data);
          if (activeCategory === 'USERS') setAppUsers(result.data);
          if (activeCategory === 'REGULATORY') setAllFrameworks(result.data);
          if (activeCategory === 'CAPABILITY_FLAGS') setEffectiveFlags(result.data);
        }
      }
    } catch (e) { console.error(e); } finally { setIsEntitiesLoading(false); }
  };

  useEffect(() => { loadRegistryData(); }, [activeCategory, selPlantId, selLineId, selEntId]);

  // Topology Sync
  useEffect(() => {
    const init = async () => {
      setIsTopologyLoading(true);
      try {
        const res = await apiFetch('/api/s0/enterprises');
        const data = await res.json();
        if (data.ok && data.data.length > 0) {
          setEnterprises(data.data);
          setSelEntId(data.data[0].id);
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selEntId) return;
    const fetchPlants = async () => {
      try {
        const res = await apiFetch(`/api/s0/plants?enterpriseId=${selEntId}`);
        const data = await res.json();
        if (data.ok) {
          setActivePlants(data.data);
          if (data.data.length > 0 && !data.data.find((p: any) => p.id === selPlantId)) setSelPlantId(data.data[0].id);
        }
      } catch (e) { console.error(e); }
    };
    fetchPlants();
  }, [selEntId]);

  useEffect(() => {
    if (!selPlantId) { setActiveLines([]); setSelLineId(''); return; }
    const fetchLines = async () => {
      try {
        const res = await apiFetch(`/api/s0/lines?plantId=${selPlantId}`);
        const data = await res.json();
        if (data.ok) {
          setActiveLines(data.data);
          if (data.data.length > 0 && !data.data.find((l: any) => l.id === selLineId)) setSelLineId(data.data[0].id);
        }
      } catch (e) { console.error(e); }
    };
    fetchLines();
  }, [selPlantId]);

  useEffect(() => {
    if (!selLineId) { setActiveStations([]); setSelStationId(''); return; }
    const fetchStations = async () => {
      try {
        const res = await apiFetch(`/api/s0/stations?lineId=${selLineId}`);
        const data = await res.json();
        if (data.ok) {
          setActiveStations(data.data);
          if (data.data.length > 0 && !data.data.find((s: any) => s.id === selStationId)) setSelStationId(data.data[0].id);
        }
      } catch (e) { console.error(e); } finally { setIsTopologyLoading(false); }
    };
    fetchStations();
  }, [selLineId]);

  // Effective state resolution for landing page cards
  useEffect(() => {
    const resolveScopedStates = async () => {
      let scope: CapabilityScope = 'GLOBAL';
      let scopeId = 'GLOBAL';
      if (selStationId) { scope = 'STATION'; scopeId = selStationId; }
      else if (selLineId) { scope = 'LINE'; scopeId = selLineId; }
      else if (selPlantId) { scope = 'PLANT'; scopeId = selPlantId; }
      else if (selEntId) { scope = 'ENTERPRISE'; scopeId = selEntId; }
      if (!scopeId) return;
      setIsFlagsLoading(true);
      setIsComplianceLoading(true);
      try {
        const [capRes, compRes] = await Promise.all([
          apiFetch(`/api/s0/capabilities/effective?scope=${scope}&scopeId=${scopeId}`),
          apiFetch(`/api/s0/compliance/effective?scope=${scope}&scopeId=${scopeId}`)
        ]);
        const capData = await capRes.json();
        const compData = await compRes.json();
        if (capData.ok) setEffectiveFlags(capData.data);
        if (compData.ok) setEffectiveCompliance(compData.data);
      } catch (e) { console.error(e); } finally {
        setIsFlagsLoading(false);
        setIsComplianceLoading(false);
      }
    };
    resolveScopedStates();
  }, [selEntId, selPlantId, selLineId, selStationId]);

  // Generic Submit Wrapper
  const handleEntitySubmit = async (type: string, payload: any, id?: string) => {
    setIsFormSubmitting(true);
    try {
      const isEdit = !!id;
      const baseUrl = `/api/s0/${type}`;
      const url = isEdit ? `${baseUrl}/update` : `${baseUrl}/create`;
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(isEdit ? { id, updates: payload } : payload)
      });
      const data = await res.json();
      if (data.ok) {
        emitAuditEvent({ stageId: 'S0', actionId: `MANAGE_${type.toUpperCase().replace('/', '_')}`, actorRole: activeUserRole, message: `${isEdit ? 'Updated' : 'Created'} ${type}: ${payload.displayName || payload.username || payload.name || id}` });
        setActiveTab('LIST');
        loadRegistryData();
      } else {
        alert(`Failed to save: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (e) { console.error(e); alert("Network failure."); } finally { setIsFormSubmitting(false); }
  };

  const openManager = (cat: ManageCategory) => {
    setActiveCategory(cat);
    setActiveTab('LIST');
    setEditingUser(null); 
    setEditingSop(null); 
    setEditingPlant(null); 
    setEditingLine(null); 
    setEditingStation(null); 
    setEditingEnterprise(null); 
    setEditingDeviceClass(null);
    setEditingFramework(null);
    setEditingFlag(null);
  };

  const closeManager = () => setActiveCategory(null);

  const toggleFlag = (flag: EffectiveFlag) => {
    if (!isSystemAdmin) return;
    let targetScope: CapabilityScope = 'GLOBAL';
    let targetId = 'GLOBAL';
    if (selStationId) { targetScope = 'STATION'; targetId = selStationId; }
    else if (selLineId) { targetScope = 'LINE'; targetId = selLineId; }
    else if (selPlantId) { targetScope = 'PLANT'; targetId = selPlantId; }
    else if (selEntId) { targetScope = 'ENTERPRISE'; targetId = selEntId; }
    const isReverting = flag.isOverridden;
    setConfirmAction({
      title: isReverting ? 'Revert to Inherited State?' : `Override Capability for ${targetScope}?`,
      message: isReverting ? `Revert to inherited value from ${flag.sourceScope}.` : `Explicitly ${!flag.effectiveValue ? 'Enable' : 'Disable'} for current scope.`,
      onConfirm: async () => {
        setIsSimulating(true);
        try {
          if (isReverting) { await apiFetch('/api/s0/capabilities/override', { method: 'DELETE', body: JSON.stringify({ flagId: flag.id, scope: targetScope, scopeId: targetId }) }); }
          else { await apiFetch('/api/s0/capabilities/override', { method: 'POST', body: JSON.stringify({ flagId: flag.id, scope: targetScope, scopeId: targetId, value: !flag.effectiveValue }) }); }
          loadRegistryData();
        } catch (e) { console.error(e); } finally { setIsSimulating(false); setConfirmAction(null); }
      }
    });
  };

  const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );

  const SelectorItem = ({ icon: Icon, label, value, options, onChange, onManage }: any) => (
    <div className="flex items-center gap-2 px-2 border-r border-slate-100 last:border-0 pr-4">
      <Icon size={16} className="text-slate-400 shrink-0" />
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 leading-none mb-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
          {onManage && (<button onClick={onManage} className="text-brand-600 hover:text-brand-800 transition-colors"><Edit3 size={10} /></button>)}
        </div>
        <div className="relative">
          <select value={value} onChange={(e) => onChange(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent outline-none appearance-none pr-4 cursor-pointer hover:text-brand-600 transition-colors">
            {options.length === 0 && <option value="">N/A</option>}
            {options.map((opt: any) => (<option key={opt.id} value={opt.id}>{opt.displayName || opt.code}</option>))}
          </select>
          <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );

  const canManageS0 = user.checkAccess('S0_MANAGE_MASTER_DATA');

  if (!canManageS0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" /><h2 className="text-xl font-bold text-slate-700">Access Restricted</h2><p>Insufficient permissions to view Master Data.</p>
      </div>
    );
  }

  const isReadyForNext = s0Context.status === 'READY';

  return (
    <div className="relative h-full overflow-hidden">
      <div className="space-y-6 animate-in fade-in duration-300 pb-12 overflow-y-auto h-full px-1 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Master Data <span className="text-slate-300">/</span> Factory Capabilities</div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings className="text-brand-600" size={24} />System Configuration (S0)</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-[10px] font-bold border border-slate-200 uppercase tracking-widest">Capability Layer</div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Server size={10} /> Node State: {s0Context.status}</div>
          </div>
        </div>

        {/* Restore Rich Topology Selector */}
        <div className="bg-white border border-industrial-border rounded-lg p-3 shadow-sm flex flex-wrap items-center gap-4 overflow-x-auto custom-scrollbar">
          <SelectorItem icon={Building2} label="Enterprise" value={selEntId} options={enterprises} onChange={setSelEntId} onManage={() => openManager('ORG')} />
          <SelectorItem icon={Factory} label="Plant" value={selPlantId} options={activePlants} onChange={setSelPlantId} onManage={() => openManager('PLANTS')} />
          <SelectorItem icon={Layout} label="Active Line" value={selLineId} options={activeLines} onChange={setSelLineId} onManage={() => openManager('LINES')} />
          <SelectorItem icon={Box} label="Primary Station" value={selStationId} options={activeStations} onChange={setSelStationId} onManage={() => openManager('STATIONS')} />
          {isTopologyLoading && (<div className="flex items-center gap-2 text-xs font-medium text-slate-400 ml-auto pr-2"><Loader2 size={14} className="animate-spin text-brand-500" /><span>Syncing Topology...</span></div>)}
        </div>

        <StageStateBanner stageId="S0" />
        <PreconditionsPanel stageId="S0" />

        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-3 ${!onNavigate ? 'hidden' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600"><CheckCircle2 size={20} /></div>
            <div><h3 className="font-bold text-blue-900 text-sm">Capability Milestone</h3><p className="text-xs text-blue-700 mt-1 max-w-lg">Factory capability matrix is locked. Define SKUs in S1.</p></div>
          </div>
          <button onClick={() => onNavigate && onNavigate('sku_blueprint')} disabled={!isReadyForNext} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Cpu size={14} /> SKU Master (S1)</button>
        </div>

        {/* Restore Full Dashboard Grid Layout */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Factory size={20} className="text-brand-600" /><h2 className="font-bold">Plant Capabilities</h2><ScopeBadge scope="PLANT" /></div>
              <button onClick={() => openManager('PLANTS')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
            </div>
            <div className="space-y-4 text-sm flex-1">
               <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded"><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Facility ID</span><span className="font-mono text-slate-700">{selPlantId || 'N/A'}</span></div>
                  <div className="bg-slate-50 p-2 rounded"><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Region</span><span className="text-slate-700">{s0Context.region}</span></div>
               </div>
               <div><span className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Tech Stack</span><div className="flex flex-wrap gap-2">{s0Context.plant.capabilities.map(cap => (<span key={cap} className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 rounded">{cap}</span>))}</div></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Layout size={20} className="text-brand-600" /><h2 className="font-bold">Line Capabilities</h2><ScopeBadge scope="LINE" /></div>
              <button onClick={() => openManager('LINES')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
            </div>
            <div className="space-y-3 flex-1">{activeLines.slice(0, 3).map(line => (<div key={line.id} className={`p-3 rounded border text-[10px] ${selLineId === line.id ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}><div className="flex justify-between items-start mb-1"><span className="font-bold text-slate-800 text-xs">{line.displayName}</span><span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase">{line.status}</span></div><div className="flex justify-between"><span>Code:</span><span className="font-mono font-bold">{line.code}</span></div></div>))}</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col md:col-span-2">
            <div className="flex justify-between mb-4 border-b pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Zap size={20} className="text-brand-600" /><h2 className="font-bold">Capability Flags</h2><ScopeBadge scope="MIXED" /></div>
              <button onClick={() => openManager('CAPABILITY_FLAGS')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
            </div>
            {isFlagsLoading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-brand-500" /></div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {effectiveFlags.map(flag => (
                  <div key={flag.id} className={`p-4 rounded-lg border ${flag.effectiveValue ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2"><span className="font-bold text-slate-800 text-sm">{flag.label}</span>{flag.isOverridden && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-bold">OVERRIDDEN</span>}</div>
                          <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1"><Globe size={8} /> Source: {flag.sourceScope}</span>
                        </div>
                        <button onClick={() => toggleFlag(flag)}>{flag.effectiveValue ? <ToggleRight className="text-brand-600" size={24} /> : <ToggleLeft className="text-slate-300" size={24} />}</button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{flag.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border md:col-span-1">
            <div className="flex justify-between mb-4 border-b pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Globe size={20} className="text-brand-600" /><h2 className="font-bold">Compliance</h2><ScopeBadge scope={effectiveCompliance?.sourceScope || 'GLOBAL'} /></div>
              <button onClick={() => openManager('REGULATORY')} className="text-[10px] font-bold text-brand-600 uppercase">Manage</button>
            </div>
            {isComplianceLoading ? <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-brand-500" /></div> : (
              <div className="space-y-4">
                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Frameworks</div><div className="flex flex-wrap gap-2">{effectiveCompliance?.frameworks.map(fw => (<div key={fw.id} className="px-3 py-1 bg-blue-50 text-blue-800 rounded border border-blue-100 text-xs font-bold">{fw.name}</div>))}</div></div>
                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-2">SOPs</div><div className="flex flex-wrap gap-2">{effectiveCompliance?.sopProfiles.map(sop => (<div key={sop.id} className="px-3 py-1 bg-purple-50 text-purple-800 rounded border border-purple-100 text-xs font-bold">{sop.name}</div>))}</div></div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border md:col-span-1">
            <div className="flex justify-between mb-4 border-b pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Users size={20} className="text-brand-600" /><h2 className="font-bold">User Matrix</h2><ScopeBadge scope="GLOBAL" /></div>
              <button onClick={() => openManager('USERS')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
            </div>
            <div className="space-y-2">
               {appUsers.slice(0, 4).map(u => (
                 <div key={u.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-slate-700">{u.username}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{u.role}</span>
                 </div>
               ))}
               {appUsers.length === 0 && <div className="text-xs text-slate-400 italic py-2">Loading users...</div>}
            </div>
          </div>
        </div>
      </div>

      {/* S0 Management Drawer */}
      {activeCategory && (
        <div className="absolute inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div onClick={closeManager} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-600 text-white rounded-lg"><Settings2 size={20} /></div>
                <div><h2 className="font-bold text-slate-800 uppercase tracking-tight">Manage {activeCategory}</h2></div>
              </div>
              <button onClick={closeManager} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
            </header>
            
            <div className="flex border-b border-slate-200">
              <button onClick={() => setActiveTab('LIST')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'LIST' ? 'border-b-2 border-brand-600 text-brand-600 bg-white' : 'text-slate-400 bg-slate-50'}`}>Directory</button>
              <button onClick={() => setActiveTab('DETAILS')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'DETAILS' ? 'border-b-2 border-brand-600 text-brand-600 bg-white' : 'text-slate-400 bg-slate-50'}`}>Form View</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
               {isEntitiesLoading ? <div className="flex flex-col items-center mt-12 gap-3"><Loader2 className="animate-spin text-brand-600" /><span className="text-xs text-slate-400">Loading Registry...</span></div> : (
                 <>
                   {activeTab === 'LIST' && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                           <div className="text-xs font-bold text-slate-500 uppercase">Registry Directory</div>
                           {isSystemAdmin && (
                            <button onClick={() => { 
                                if (activeCategory === 'PLANTS') setEditingPlant({ displayName: '', code: '', status: 'ACTIVE', enterpriseId: selEntId });
                                if (activeCategory === 'LINES') setEditingLine({ displayName: '', code: '', status: 'ACTIVE', plantId: selPlantId, supportedOperations: [], supportedSkuTypes: [] });
                                if (activeCategory === 'STATIONS') setEditingStation({ displayName: '', code: '', status: 'ACTIVE', lineId: selLineId, stationType: 'ASSEMBLY', supportedOperations: [] });
                                if (activeCategory === 'DEVICE_CLASSES') setEditingDeviceClass({ displayName: '', code: '', status: 'ACTIVE', category: 'OTHER', supportedProtocols: [] });
                                if (activeCategory === 'USERS') setEditingUser({ username: '', fullName: '', email: '', role: UserRole.OPERATOR, status: 'ACTIVE', scopes: [] });
                                if (activeCategory === 'ORG') setEditingEnterprise({ displayName: '', code: '', status: 'ACTIVE', timezone: 'UTC' });
                                if (activeCategory === 'SOP_PROFILES') setEditingSop({ name: '', code: '', version: '1.0' });
                                if (activeCategory === 'REGULATORY') setEditingFramework({ name: '', code: '', jurisdiction: 'INDIA', mandatory: true, status: 'DRAFT' });
                                if (activeCategory === 'CAPABILITY_FLAGS') setEditingFlag({}); 
                                setActiveTab('DETAILS');
                            }} className="bg-brand-600 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 hover:bg-brand-700 shadow-sm"><Plus size={14} /> NEW ENTRY</button>
                           )}
                        </div>
                        
                        <div className="divide-y bg-white border rounded-xl overflow-hidden shadow-sm">
                           {activeCategory === 'PLANTS' && activePlants.map(p => (
                             <div key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{p.displayName}</div><div className="text-[10px] font-mono text-slate-400">{p.code}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingPlant(p); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'LINES' && activeLines.map(l => (
                             <div key={l.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{l.displayName}</div><div className="text-[10px] font-mono text-slate-400">{l.code}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingLine(l); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'STATIONS' && activeStations.map(s => (
                             <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{s.displayName}</div><div className="text-[10px] font-mono text-slate-400 uppercase">{s.stationType}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingStation(s); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'USERS' && appUsers.map(u => (
                             <div key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{u.username}</div><div className="text-[10px] font-mono text-slate-400 uppercase">{u.role}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingUser(u); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'ORG' && enterprises.map(e => (
                             <div key={e.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{e.displayName}</div><div className="text-[10px] font-mono text-slate-400">{e.id}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingEnterprise(e); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'REGULATORY' && allFrameworks.map(f => (
                             <div key={f.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{f.name}</div><div className="text-[10px] font-mono text-slate-400 uppercase">{f.jurisdiction}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingFramework(f); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'CAPABILITY_FLAGS' && effectiveFlags.map(f => (
                             <div key={f.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{f.label}</div><div className="text-[10px] font-mono text-slate-400 uppercase">{f.category}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingFlag(f); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                           {activeCategory === 'SOP_PROFILES' && allSops.map(s => (
                             <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                               <div><div className="font-bold text-slate-800 text-sm">{s.name}</div><div className="text-[10px] font-mono text-slate-400 uppercase">V{s.version}</div></div>
                               {isSystemAdmin && <button onClick={() => { setEditingSop(s); setActiveTab('DETAILS'); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-brand-600"><Edit2 size={16} /></button>}
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {activeTab === 'DETAILS' && (
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200">
                        {isSystemAdmin ? (
                            <>
                                {activeCategory === 'PLANTS' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('plants', editingPlant, editingPlant?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Factory size={18} className="text-brand-600" /> Plant Definition</h3>
                                    <div className="space-y-4">
                                    <Field label="Display Name"><input required className="w-full border rounded p-3 text-sm" value={editingPlant?.displayName || ''} onChange={ev => setEditingPlant(p => ({ ...p!, displayName: ev.target.value }))} /></Field>
                                    <Field label="Plant Code"><input required className="w-full border rounded p-3 text-sm font-mono uppercase" value={editingPlant?.code || ''} onChange={ev => setEditingPlant(p => ({ ...p!, code: ev.target.value }))} /></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'LINES' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('lines', editingLine, editingLine?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Layout size={18} className="text-brand-600" /> Production Line</h3>
                                    <div className="space-y-4">
                                    <Field label="Display Name"><input required className="w-full border rounded p-3 text-sm" value={editingLine?.displayName || ''} onChange={ev => setEditingLine(p => ({ ...p!, displayName: ev.target.value }))} /></Field>
                                    <Field label="Line Code"><input required className="w-full border rounded p-3 text-sm font-mono uppercase" value={editingLine?.code || ''} onChange={ev => setEditingLine(p => ({ ...p!, code: ev.target.value }))} /></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'STATIONS' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('stations', editingStation, editingStation?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Box size={18} className="text-brand-600" /> Workstation</h3>
                                    <div className="space-y-4">
                                    <Field label="Station Name"><input required className="w-full border rounded p-3 text-sm" value={editingStation?.displayName || ''} onChange={ev => setEditingStation(p => ({ ...p!, displayName: ev.target.value }))} /></Field>
                                    <Field label="Station Code"><input required className="w-full border rounded p-3 text-sm font-mono uppercase" value={editingStation?.code || ''} onChange={ev => setEditingStation(p => ({ ...p!, code: ev.target.value }))} /></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'ORG' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('enterprises', editingEnterprise, editingEnterprise?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-brand-600" /> Enterprise Entity</h3>
                                    <div className="space-y-4">
                                    <Field label="Display Name"><input required className="w-full border rounded p-3 text-sm" value={editingEnterprise?.displayName || ''} onChange={ev => setEditingEnterprise(p => ({ ...p!, displayName: ev.target.value }))} /></Field>
                                    <Field label="Org Code"><input required className="w-full border rounded p-3 text-sm font-mono uppercase" value={editingEnterprise?.code || ''} onChange={ev => setEditingEnterprise(p => ({ ...p!, code: ev.target.value }))} /></Field>
                                    <Field label="Timezone"><input className="w-full border rounded p-3 text-sm font-mono" value={editingEnterprise?.timezone || 'UTC'} onChange={ev => setEditingEnterprise(p => ({ ...p!, timezone: ev.target.value }))} /></Field>
                                    <Field label="Status"><select className="w-full border rounded p-3 text-sm bg-white" value={editingEnterprise?.status} onChange={ev => setEditingEnterprise(p => ({ ...p!, status: ev.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'USERS' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('users', editingUser, editingUser?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserCheck size={18} className="text-brand-600" /> User Profile</h3>
                                    <div className="space-y-4">
                                    <Field label="Full Name"><input required className="w-full border rounded p-3 text-sm" value={editingUser?.fullName || ''} onChange={ev => setEditingUser(p => ({ ...p!, fullName: ev.target.value }))} /></Field>
                                    <Field label="Email"><input required type="email" className="w-full border rounded p-3 text-sm" value={editingUser?.email || ''} onChange={ev => setEditingUser(p => ({ ...p!, email: ev.target.value }))} /></Field>
                                    <Field label="Username"><input required className="w-full border rounded p-3 text-sm font-mono" value={editingUser?.username || ''} onChange={ev => setEditingUser(p => ({ ...p!, username: ev.target.value }))} /></Field>
                                    <Field label="Role"><select className="w-full border rounded p-3 text-sm bg-white" value={editingUser?.role} onChange={ev => setEditingUser(p => ({ ...p!, role: ev.target.value as any }))}>{Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
                                    <Field label="Status"><select className="w-full border rounded p-3 text-sm bg-white" value={editingUser?.status} onChange={ev => setEditingUser(p => ({ ...p!, status: ev.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'REGULATORY' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('compliance/frameworks', editingFramework, editingFramework?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Globe size={18} className="text-brand-600" /> Regulatory Framework</h3>
                                    <div className="space-y-4">
                                    <Field label="Standard Name"><input required className="w-full border rounded p-3 text-sm" value={editingFramework?.name || ''} onChange={ev => setEditingFramework(p => ({ ...p!, name: ev.target.value }))} /></Field>
                                    <Field label="Legal Code"><input required className="w-full border rounded p-3 text-sm font-mono uppercase" value={editingFramework?.code || ''} onChange={ev => setEditingFramework(p => ({ ...p!, code: ev.target.value }))} /></Field>
                                    <Field label="Jurisdiction"><select className="w-full border rounded p-3 text-sm bg-white" value={editingFramework?.jurisdiction} onChange={ev => setEditingFramework(p => ({ ...p!, jurisdiction: ev.target.value }))}><option value="INDIA">INDIA</option><option value="EU">EU</option><option value="GLOBAL">GLOBAL</option></select></Field>
                                    <Field label="Mandatory"><select className="w-full border rounded p-3 text-sm bg-white" value={String(editingFramework?.mandatory)} onChange={ev => setEditingFramework(p => ({ ...p!, mandatory: ev.target.value === 'true' }))}><option value="true">YES</option><option value="false">NO</option></select></Field>
                                    <Field label="Status"><select className="w-full border rounded p-3 text-sm bg-white" value={editingFramework?.status} onChange={ev => setEditingFramework(p => ({ ...p!, status: ev.target.value as any }))}><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="RETIRED">RETIRED</option></select></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'CAPABILITY_FLAGS' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('capabilities', editingFlag, editingFlag?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Zap size={18} className="text-brand-600" /> Feature Capability</h3>
                                    <div className="space-y-4">
                                    <Field label="Feature Label"><input required className="w-full border rounded p-3 text-sm" value={editingFlag?.label || ''} onChange={ev => setEditingFlag(p => ({ ...p!, label: ev.target.value }))} /></Field>
                                    <Field label="Description"><textarea required className="w-full border rounded p-3 text-sm" rows={2} value={editingFlag?.description || ''} onChange={ev => setEditingFlag(p => ({ ...p!, description: ev.target.value }))}></textarea></Field>
                                    <Field label="Default Value"><select className="w-full border rounded p-3 text-sm bg-white" value={String(editingFlag?.defaultValue)} onChange={ev => setEditingFlag(p => ({ ...p!, defaultValue: ev.target.value === 'true' }))}><option value="true">ENABLED</option><option value="false">DISABLED</option></select></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE</button></div>
                                </form>
                                )}
                                {activeCategory === 'DEVICE_CLASSES' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('device-classes', editingDeviceClass, editingDeviceClass?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Zap size={18} className="text-brand-600" /> Device Class Definition</h3>
                                    <div className="space-y-4">
                                    <Field label="Class Name"><input required className="w-full border rounded p-3 text-sm" value={editingDeviceClass?.displayName || ''} onChange={ev => setEditingDeviceClass(p => ({ ...p!, displayName: ev.target.value }))} /></Field>
                                    <Field label="Category"><select className="w-full border rounded p-3 text-sm bg-white" value={editingDeviceClass?.category} onChange={ev => setEditingDeviceClass(p => ({ ...p!, category: ev.target.value }))}><option value="SCANNER">SCANNER</option><option value="SCALE">SCALE</option><option value="TORQUE_TOOL">TORQUE TOOL</option><option value="PRINTER">PRINTER</option><option value="TESTER">TESTER</option></select></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE CHANGES</button></div>
                                </form>
                                )}
                                {activeCategory === 'SOP_PROFILES' && (
                                <form onSubmit={(e) => { e.preventDefault(); handleEntitySubmit('compliance/sop-profiles', editingSop, editingSop?.id); }} className="space-y-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen size={18} className="text-brand-600" /> SOP Profile Definition</h3>
                                    <div className="space-y-4">
                                        <Field label="Profile Name"><input required className="w-full border rounded p-3 text-sm" value={editingSop?.name || ''} onChange={ev => setEditingSop(p => ({ ...p!, name: ev.target.value }))} /></Field>
                                        <Field label="SOP Code"><input required className="w-full border rounded p-3 text-sm font-mono" value={editingSop?.code || ''} onChange={ev => setEditingSop(p => ({ ...p!, code: ev.target.value }))} /></Field>
                                        <Field label="Revision Version"><input required className="w-full border rounded p-3 text-sm font-mono" value={editingSop?.version || ''} onChange={ev => setEditingSop(p => ({ ...p!, version: ev.target.value }))} /></Field>
                                    </div>
                                    <div className="pt-6 flex gap-3 border-t"><button type="button" onClick={() => setActiveTab('LIST')} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-[2] py-3 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE CHANGES</button></div>
                                </form>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48">
                                <Lock className="text-red-400 mb-2" />
                                <p className="text-sm font-bold text-slate-700">Modification Restricted</p>
                                <p className="text-[10px] text-slate-500">Only System Admin can modify registry entries.</p>
                            </div>
                        )}
                     </div>
                   )}
                 </>
               )}
            </div>
            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center"><button onClick={closeManager} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Close</button><div className="text-[10px] font-mono text-slate-400 flex items-center gap-1"><ShieldCheck size={12} /> V3.5-HOTFIX-29</div></footer>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
           <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-brand-50 text-brand-600 rounded-full">
                    <ShieldCheck size={28} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">{confirmAction.title}</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">{confirmAction.message}</p>
              <div className="flex gap-4">
                 <button 
                   onClick={() => setConfirmAction(null)} 
                   className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={confirmAction.onConfirm} 
                   className="flex-1 py-3 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-md"
                 >
                   CONFIRM
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SystemSetup;