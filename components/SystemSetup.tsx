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
  Shield
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { getMockS0Context, S0Context } from '../stages/s0/s0Contract';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { apiFetch } from '../services/apiHarness';
import type { Enterprise, Plant, Line, Station, DeviceClass } from '../domain/s0/systemTopology.types';
import type { EffectiveFlag, CapabilityScope } from '../domain/s0/capability.types';
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

type ManageCategory = 'ORGANIZATION' | 'LINES' | 'WORKSTATIONS' | 'DEVICES' | 'REGULATORY' | 'USERS' | 'ENTERPRISE' | 'CAPABILITIES' | 'SOP_PROFILES' | null;

export const SystemSetup: React.FC<SystemSetupProps> = ({ onNavigate }) => {
  const { role: activeUserRole } = useContext(UserContext);
  
  const [s0Context, setS0Context] = useState<S0Context>(getMockS0Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState<ManageCategory>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DETAILS'>('LIST');

  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [activePlants, setActivePlants] = useState<Plant[]>([]);
  const [activeLines, setActiveLines] = useState<Line[]>([]);
  const [activeStations, setActiveStations] = useState<Station[]>([]);
  const [deviceClasses, setDeviceClasses] = useState<DeviceClass[]>([]);

  const [selEntId, setSelEntId] = useState<string>('');
  const [selPlantId, setSelPlantId] = useState<string>('');
  const [selLineId, setSelLineId] = useState<string>('');
  const [selStationId, setSelStationId] = useState<string>('');
  
  const [isTopologyLoading, setIsTopologyLoading] = useState(true);

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [effectivePerms, setEffectivePerms] = useState<EffectivePermissions | null>(null);
  const [isPermsLoading, setIsPermsLoading] = useState(false);

  const [effectiveFlags, setEffectiveFlags] = useState<EffectiveFlag[]>([]);
  const [isFlagsLoading, setIsFlagsLoading] = useState(false);

  const [effectiveCompliance, setEffectiveCompliance] = useState<EffectiveCompliance | null>(null);
  const [allFrameworks, setAllFrameworks] = useState<RegulatoryFramework[]>([]);
  const [allSops, setAllSops] = useState<SOPProfile[]>([]);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [selBindingScope, setSelBindingScope] = useState<CapabilityScope>('ENTERPRISE');
  const [selBindingScopeId, setSelBindingScopeId] = useState<string>('');
  const [activeBinding, setActiveBinding] = useState<ComplianceBinding | null>(null);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);
  const [editingSop, setEditingSop] = useState<Partial<SOPProfile> | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
          if (data.data.length > 0) {
            const found = data.data.find((p: any) => p.id === selPlantId);
            if (!found) setSelPlantId(data.data[0].id);
          } else {
            setSelPlantId('');
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchPlants();
  }, [selEntId]);

  useEffect(() => {
    if (!selPlantId) {
      setActiveLines([]);
      setSelLineId('');
      return;
    }
    const fetchLines = async () => {
      try {
        const res = await apiFetch(`/api/s0/lines?plantId=${selPlantId}`);
        const data = await res.json();
        if (data.ok) {
          setActiveLines(data.data);
          if (data.data.length > 0) {
            const found = data.data.find((l: any) => l.id === selLineId);
            if (!found) setSelLineId(data.data[0].id);
          } else {
            setSelLineId('');
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchLines();
  }, [selPlantId]);

  useEffect(() => {
    if (!selLineId) {
      setActiveStations([]);
      setSelStationId('');
      return;
    }
    const fetchStations = async () => {
      try {
        const res = await apiFetch(`/api/s0/stations?lineId=${selLineId}`);
        const data = await res.json();
        if (data.ok) {
          setActiveStations(data.data);
          if (data.data.length > 0) {
            const found = data.data.find((s: any) => s.id === selStationId);
            if (!found) setSelStationId(data.data[0].id);
          } else {
            setSelStationId('');
          }
        }
      } catch (e) { console.error(e); } finally {
        setIsTopologyLoading(false);
      }
    };
    fetchStations();
  }, [selLineId]);

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

  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S0'));
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    const loadRegistryData = async () => {
      setIsEntitiesLoading(true);
      try {
        let endpoint = '';
        if (activeCategory === 'ORGANIZATION') endpoint = '/api/s0/plants';
        else if (activeCategory === 'LINES') endpoint = `/api/s0/lines?plantId=${selPlantId}`;
        else if (activeCategory === 'WORKSTATIONS') endpoint = `/api/s0/stations?lineId=${selLineId}`;
        else if (activeCategory === 'ENTERPRISE') endpoint = '/api/s0/enterprises';
        else if (activeCategory === 'DEVICES') endpoint = '/api/s0/device-classes';
        else if (activeCategory === 'SOP_PROFILES') endpoint = '/api/s0/compliance/sop-profiles';
        else if (activeCategory === 'USERS') endpoint = '/api/s0/users';
        else if (activeCategory === 'REGULATORY') {
          const [fRes, sRes] = await Promise.all([
            apiFetch('/api/s0/compliance/frameworks'),
            apiFetch('/api/s0/compliance/sop-profiles')
          ]);
          const fData = await fRes.json();
          const sData = await sRes.json();
          if (fData.ok) setAllFrameworks(fData.data);
          if (sData.ok) setAllSops(sData.data);
          setSelBindingScope('ENTERPRISE');
          setSelBindingScopeId(selEntId);
          setIsEntitiesLoading(false);
          return;
        }
        if (endpoint) {
          const res = await apiFetch(endpoint);
          const result = await res.json();
          if (result.ok) {
            if (activeCategory === 'ORGANIZATION') setPlants(result.data);
            if (activeCategory === 'LINES') setActiveLines(result.data);
            if (activeCategory === 'WORKSTATIONS') setActiveStations(result.data);
            if (activeCategory === 'ENTERPRISE') setEnterprises(result.data);
            if (activeCategory === 'DEVICES') setDeviceClasses(result.data);
            if (activeCategory === 'SOP_PROFILES') setAllSops(result.data);
            if (activeCategory === 'USERS') setAppUsers(result.data);
          }
        }
      } catch (e) { console.error(e); } finally { setIsEntitiesLoading(false); }
    };
    loadRegistryData();
  }, [activeCategory, selPlantId, selLineId, selEntId]);

  useEffect(() => {
    if (activeCategory === 'USERS' && activeTab === 'DETAILS' && editingUser?.id) {
      const resolvePerms = async () => {
        let scope: CapabilityScope = 'GLOBAL';
        let scopeId = 'GLOBAL';
        if (selStationId) { scope = 'STATION'; scopeId = selStationId; }
        else if (selLineId) { scope = 'LINE'; scopeId = selLineId; }
        else if (selPlantId) { scope = 'PLANT'; scopeId = selPlantId; }
        else if (selEntId) { scope = 'ENTERPRISE'; scopeId = selEntId; }
        setIsPermsLoading(true);
        try {
          const res = await apiFetch(`/api/s0/users/permissions?userId=${editingUser.id}&scope=${scope}&scopeId=${scopeId}`);
          const data = await res.json();
          if (data.ok) setEffectivePerms(data.data);
        } catch (e) { console.error(e); } finally { setIsPermsLoading(false); }
      };
      resolvePerms();
    } else { setEffectivePerms(null); }
  }, [activeCategory, activeTab, editingUser?.id, selEntId, selPlantId, selLineId, selStationId]);

  const handleEditPlantTile = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS0Context(prev => ({ ...prev, configLastUpdated: now }));
      emitAuditEvent({ stageId: 'S0', actionId: 'EDIT_PLANT_DETAILS', actorRole: activeUserRole, message: 'Updated plant capability profile' });
      setIsSimulating(false);
    }, 600);
  };

  const openManager = (cat: ManageCategory) => {
    setActiveCategory(cat);
    setActiveTab('LIST');
    setEditingSop(null);
    setEditingUser(null);
  };

  const closeManager = () => setActiveCategory(null);

  const handleSopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSop || isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const isEdit = !!editingSop.id;
      const res = await apiFetch(isEdit ? '/api/s0/compliance/sop-profiles/update' : '/api/s0/compliance/sop-profiles/create', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(isEdit ? { id: editingSop.id, updates: editingSop } : editingSop)
      });
      const data = await res.json();
      if (data.ok) {
        setEditingSop(null);
        setActiveTab('LIST');
        const refreshRes = await apiFetch('/api/s0/compliance/sop-profiles');
        const refreshData = await refreshRes.json();
        if (refreshData.ok) setAllSops(refreshData.data);
      }
    } catch (e) { console.error(e); } finally { setIsFormSubmitting(false); }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const isEdit = !!editingUser.id;
      const res = await apiFetch(isEdit ? '/api/s0/users/update' : '/api/s0/users/create', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(isEdit ? { id: editingUser.id, updates: editingUser } : editingUser)
      });
      const data = await res.json();
      if (data.ok) {
        emitAuditEvent({ stageId: 'S0', actionId: 'MANAGE_USERS', actorRole: activeUserRole, message: `${isEdit ? 'Updated' : 'Created'} User: ${editingUser.username}` });
        setEditingUser(null);
        setActiveTab('LIST');
        const refreshRes = await apiFetch('/api/s0/users');
        const refreshData = await refreshRes.json();
        if (refreshData.ok) setAppUsers(refreshData.data);
      }
    } catch (e) { console.error(e); } finally { setIsFormSubmitting(false); }
  };

  const toggleFlag = (flag: EffectiveFlag) => {
    if (activeUserRole !== UserRole.SYSTEM_ADMIN) return;
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
        } catch (e) { console.error(e); } finally { setIsSimulating(false); setConfirmAction(null); }
      }
    });
  };

  const UserScopeSelection = () => {
    const [selScope, setSelScope] = useState<CapabilityScope>('PLANT');
    const [selScopeId, setSelScopeId] = useState('');
    const getOptions = () => {
      if (selScope === 'ENTERPRISE') return enterprises;
      if (selScope === 'PLANT') return plants;
      if (selScope === 'LINE') return activeLines;
      if (selScope === 'STATION') return activeStations;
      return [];
    };
    const addScope = () => {
      if (!selScopeId) return;
      const current = editingUser?.scopes || [];
      if (current.find(s => s.scope === selScope && s.scopeId === selScopeId)) return;
      setEditingUser(u => ({ ...u!, scopes: [...current, { scope: selScope, scopeId: selScopeId }] }));
    };
    const removeScope = (idx: number) => {
      const current = [...(editingUser?.scopes || [])];
      current.splice(idx, 1);
      setEditingUser(u => ({ ...u!, scopes: current }));
    };
    return (
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Access Scopes</h4>
        <div className="flex gap-2 items-end">
           <div className="flex-1 space-y-1">
              <label className="text-[9px] font-bold text-slate-400">Level</label>
              <select className="w-full border rounded p-2 text-xs outline-none bg-white" value={selScope} onChange={e => setSelScope(e.target.value as any)}>
                 <option value="ENTERPRISE">Enterprise</option>
                 <option value="PLANT">Plant</option>
                 <option value="LINE">Line</option>
                 <option value="STATION">Station</option>
              </select>
           </div>
           <div className="flex-[2] space-y-1">
              <label className="text-[9px] font-bold text-slate-400">Entity Instance</label>
              <select className="w-full border rounded p-2 text-xs outline-none bg-white" value={selScopeId} onChange={e => setSelScopeId(e.target.value)}>
                 <option value="">Select Target...</option>
                 {getOptions().map((opt: any) => (<option key={opt.id} value={opt.id}>{opt.displayName}</option>))}
              </select>
           </div>
           <button type="button" onClick={addScope} className="p-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"><Plus size={18} /></button>
        </div>
        <div className="space-y-2">
           {editingUser?.scopes?.map((s, i) => (
             <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border rounded text-xs">
                <div className="flex items-center gap-2"><ScopeBadge scope={s.scope} /><span className="font-mono font-bold text-slate-700">{s.scopeId}</span></div>
                <button type="button" onClick={() => removeScope(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
             </div>
           ))}
           {(!editingUser?.scopes || editingUser.scopes.length === 0) && (<div className="text-[10px] text-slate-400 italic">No specific scopes bound.</div>)}
        </div>
      </div>
    );
  };

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

  if (!(activeUserRole === UserRole.SYSTEM_ADMIN || activeUserRole === UserRole.MANAGEMENT || activeUserRole === UserRole.COMPLIANCE)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" /><h2 className="text-xl font-bold text-slate-700">Access Restricted</h2><p>Insufficient permissions.</p>
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

        <div className="bg-white border border-industrial-border rounded-lg p-3 shadow-sm flex flex-wrap items-center gap-4 overflow-x-auto custom-scrollbar">
          <SelectorItem icon={Building2} label="Enterprise" value={selEntId} options={enterprises} onChange={setSelEntId} onManage={() => openManager('ENTERPRISE')} />
          <SelectorItem icon={Factory} label="Plant" value={selPlantId} options={activePlants} onChange={setSelPlantId} />
          <SelectorItem icon={Layout} label="Active Line" value={selLineId} options={activeLines} onChange={setSelLineId} />
          <SelectorItem icon={Box} label="Primary Station" value={selStationId} options={activeStations} onChange={setSelStationId} />
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

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Factory size={20} className="text-brand-600" /><h2 className="font-bold">Plant Capabilities</h2><ScopeBadge scope="PLANT" /></div>
              <button onClick={() => openManager('ORGANIZATION')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
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
            </div>
            {isFlagsLoading ? <Loader2 className="mx-auto animate-spin" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {effectiveFlags.map(flag => (
                  <div key={flag.id} className={`p-4 rounded-lg border ${flag.effectiveValue ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
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
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
            <div className="flex justify-between mb-4 border-b pb-2">
              <div className="flex items-center gap-2 text-slate-700"><Globe size={20} className="text-brand-600" /><h2 className="font-bold">Compliance</h2><ScopeBadge scope={effectiveCompliance?.sourceScope || 'GLOBAL'} /></div>
              <button onClick={() => openManager('REGULATORY')} className="text-[10px] font-bold text-brand-600 uppercase">Manage</button>
            </div>
            {isComplianceLoading ? <Loader2 className="mx-auto animate-spin" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Frameworks</div><div className="flex flex-wrap gap-2">{effectiveCompliance?.frameworks.map(fw => (<div key={fw.id} className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex flex-col"><span className="text-xs font-bold">{fw.name}</span></div>))}</div></div>
                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-3">SOPs</div><div className="flex flex-wrap gap-2">{effectiveCompliance?.sopProfiles.map(sop => (<div key={sop.id} className="px-3 py-2 bg-purple-50 text-purple-800 rounded-lg border border-purple-100 flex flex-col"><span className="text-xs font-bold">{sop.name}</span></div>))}</div></div>
              </div>
            )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
            <div className="flex justify-between mb-4"><div className="flex items-center gap-2 text-slate-700"><Users size={20} className="text-brand-600" /><h2 className="font-bold">Users</h2><ScopeBadge scope="GLOBAL" /></div><button onClick={() => openManager('USERS')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button></div>
            <table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-4 py-3 font-bold uppercase">User</th><th className="px-4 py-3 font-bold uppercase">Role</th><th className="px-4 py-3 font-bold uppercase text-right">Nodes</th></tr></thead><tbody className="divide-y divide-slate-100 text-slate-700">{appUsers.slice(0, 5).map(u => (<tr key={u.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold">{u.username}</td><td className="px-4 py-3">{u.role}</td><td className="px-4 py-3 text-right">{u.scopes.length}</td></tr>))}</tbody></table>
        </div>
      </div>

      {activeCategory && (
        <div className="absolute inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div onClick={closeManager} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-brand-600 text-white rounded-lg"><Settings size={20} /></div><div><h2 className="font-bold text-slate-800 uppercase tracking-tight">Manage {activeCategory}</h2></div></div><button onClick={closeManager} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button></header>
            <div className="flex border-b border-slate-200"><button onClick={() => setActiveTab('LIST')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'LIST' ? 'border-b-2 border-brand-600 text-brand-600 bg-white' : 'text-slate-400 bg-slate-50'}`}>List</button><button onClick={() => setActiveTab('DETAILS')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'DETAILS' ? 'border-b-2 border-brand-600 text-brand-600 bg-white' : 'text-slate-400 bg-slate-50'}`}>Details</button></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
               {isEntitiesLoading ? <Loader2 className="animate-spin mx-auto mt-12" /> : (
                 <>
                   {activeCategory === 'USERS' && activeTab === 'LIST' && (
                      <div className="space-y-4"><button onClick={() => { setEditingUser({ username: '', fullName: '', role: UserRole.OPERATOR, status: 'ACTIVE', scopes: [] }); setActiveTab('DETAILS'); }} className="text-brand-600 font-bold text-xs">+ NEW ACCOUNT</button><div className="divide-y border rounded-lg overflow-hidden">{appUsers.map(u => (<div key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group"><div><div className="text-sm font-bold">{u.username}</div><div className="text-[10px]">{u.role}</div></div><button onClick={() => { setEditingUser(u); setActiveTab('DETAILS'); }} className="p-2 hover:bg-slate-200 rounded"><Edit2 size={14} /></button></div>))}</div></div>
                   )}
                   {activeCategory === 'USERS' && activeTab === 'DETAILS' && (
                     <div className="space-y-6">
                        <form onSubmit={handleUserSubmit} className="space-y-6">
                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2"><UserCheck size={18} className="text-brand-600" /> {editingUser?.id ? 'Edit User' : 'Provision User'}</div>
                            <div className="space-y-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</label><input required type="text" className="w-full border rounded p-2.5 text-sm font-mono" value={editingUser?.username || ''} onChange={e => setEditingUser(u => ({ ...u!, username: e.target.value }))} /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Display Name</label><input required type="text" className="w-full border rounded p-2.5 text-sm" value={editingUser?.fullName || ''} onChange={e => setEditingUser(u => ({ ...u!, fullName: e.target.value }))} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</label><select className="w-full border rounded p-2.5 text-xs outline-none bg-white" value={editingUser?.role} onChange={e => setEditingUser(u => ({ ...u!, role: e.target.value as any }))}>{Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label><select className="w-full border rounded p-2.5 text-xs outline-none bg-white" value={editingUser?.status} onChange={e => setEditingUser(u => ({ ...u!, status: e.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
                            </div>
                            <UserScopeSelection />
                            </div>
                            <div className="pt-6 border-t flex gap-3"><button type="button" onClick={() => setActiveTab('LIST')} className="px-6 py-2.5 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 uppercase">Cancel</button><button type="submit" disabled={isFormSubmitting} className="flex-1 py-2.5 bg-brand-600 text-white rounded font-bold text-xs uppercase shadow-sm hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save</button></div>
                        </form>
                        {editingUser?.id && (
                           <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl overflow-hidden relative">
                              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Shield size={64} className="text-white" /></div>
                              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-400" /><h4 className="text-xs font-bold text-white uppercase tracking-widest">Effective Permissions</h4></div></div>
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between text-[10px] text-slate-400"><span>Target: <span className="text-emerald-400 font-bold">{selStationId || selLineId || selPlantId || selEntId || 'Global'}</span></span><span>Role: <span className="text-emerald-400 font-bold">{editingUser.role?.toUpperCase()}</span></span></div>
                                 {isPermsLoading ? (<div className="py-4 flex flex-col items-center gap-2"><Loader2 size={16} className="animate-spin text-emerald-400" /><span className="text-[9px] text-slate-500 uppercase font-bold">Resolving...</span></div>) : effectivePerms ? (
                                    <div className="space-y-1.5">{effectivePerms.allowedActions.length > 0 ? (effectivePerms.allowedActions.map(action => (<div key={action} className="flex items-center gap-2 text-[10px] text-slate-300 font-mono"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span>{action}</span></div>))) : (<div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-[10px] text-red-400 font-bold uppercase italic"><Ban size={12} /> Access Denied</div>)}</div>
                                 ) : (<div className="text-[10px] text-slate-600 italic">Select context.</div>)}
                              </div>
                           </div>
                        )}
                     </div>
                   )}
                   {(!['REGULATORY', 'SOP_PROFILES', 'USERS'].includes(activeCategory || '')) && (<div className="h-full flex flex-col items-center justify-center text-slate-400 py-12"><Lock size={32} className="mb-4 opacity-30" /><p className="text-sm font-bold uppercase">Access Restricted</p></div>)}
                 </>
               )}
            </div>
            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center"><button onClick={closeManager} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Close</button><div className="text-[10px] font-mono text-slate-400 flex items-center gap-1"><ShieldCheck size={12} /> V3.5</div></footer>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" /><div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 p-8 max-w-md w-full animate-in zoom-in-95 duration-200"><div className="flex items-center gap-4 mb-6"><div className="p-3 bg-brand-50 text-brand-600 rounded-full"><ShieldCheck size={28} /></div><h3 className="text-xl font-bold text-slate-800">{confirmAction.title}</h3></div><p className="text-slate-600 mb-8 leading-relaxed">{confirmAction.message}</p><div className="flex gap-4"><button onClick={() => setConfirmAction(null)} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50">CANCEL</button><button onClick={confirmAction.onConfirm} className="flex-1 py-3 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-md">CONFIRM</button></div></div>
        </div>
      )}
    </div>
  );
};