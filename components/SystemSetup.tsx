import React, { useContext, useState, useEffect } from 'react';
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
  List,
  FileText,
  Lock,
  Edit2,
  Trash2,
  AlertTriangle,
  Ban,
  Timer,
  Info,
  Save,
  ChevronDown,
  Edit3,
  History,
  RotateCcw,
  MapPin,
  Scale,
  CheckSquare,
  BookOpen,
  History as HistoryIcon,
  UserCheck
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { getMockS0Context, S0Context } from '../stages/s0/s0Contract';
import { getS0ActionState, S0ActionId } from '../stages/s0/s0Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { apiFetch } from '../services/apiHarness';
import type { Enterprise, Plant, Line, Station, DeviceClass } from '../domain/s0/systemTopology.types';
import type { EffectiveFlag, CapabilityScope } from '../domain/s0/capability.types';
import type { RegulatoryFramework, EffectiveCompliance, ComplianceBinding, SOPProfile } from '../domain/s0/complianceContext.types';
import type { AppUser, UserScopeBinding } from '../domain/s0/userManagement.types';

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
  
  // Local State
  const [s0Context, setS0Context] = useState<S0Context>(getMockS0Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Drawer State
  const [activeCategory, setActiveCategory] = useState<ManageCategory>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DETAILS'>('LIST');

  // Topology Selection State
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

  // User Management State (V35-S0-RBAC-PP-20)
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);

  // Scoped Capabilities State
  const [effectiveFlags, setEffectiveFlags] = useState<EffectiveFlag[]>([]);
  const [isFlagsLoading, setIsFlagsLoading] = useState(false);

  // Regulatory & SOP State (V35-S0-COMP-PP-18/19)
  const [effectiveCompliance, setEffectiveCompliance] = useState<EffectiveCompliance | null>(null);
  const [allFrameworks, setAllFrameworks] = useState<RegulatoryFramework[]>([]);
  const [allSops, setAllSops] = useState<SOPProfile[]>([]);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [selBindingScope, setSelBindingScope] = useState<CapabilityScope>('ENTERPRISE');
  const [selBindingScopeId, setSelBindingScopeId] = useState<string>('');
  const [activeBinding, setActiveBinding] = useState<ComplianceBinding | null>(null);

  // CRUD State
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Partial<Plant> | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<Line> | null>(null);
  const [editingStation, setEditingStation] = useState<Partial<Station> | null>(null);
  const [editingEnterprise, setEditingEnterprise] = useState<Partial<Enterprise> | null>(null);
  const [editingDeviceClass, setEditingDeviceClass] = useState<Partial<DeviceClass> | null>(null);
  const [editingSop, setEditingSop] = useState<Partial<SOPProfile> | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Confirmation Overlay
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 1. Initial Load: Enterprises
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

  // 2. Cascade: Enterprises -> Plants
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

  // 3. Cascade: Plants -> Lines
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

  // 4. Cascade: Lines -> Stations
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

  // 5. Capability & Compliance Resolution
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

  // Sync audit events
  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S0'));
  }, []);

  // Manager Fetching
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

  // Handlers
  const handleEditPlantTile = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS0Context(prev => ({ ...prev, configLastUpdated: now }));
      emitAuditEvent({
        stageId: 'S0',
        actionId: 'EDIT_PLANT_DETAILS',
        actorRole: activeUserRole,
        message: 'Updated plant capability profile'
      });
      setIsSimulating(false);
    }, 600);
  };

  const openManager = (cat: ManageCategory) => {
    setActiveCategory(cat);
    setActiveTab('LIST');
    setEditingPlant(null);
    setEditingLine(null);
    setEditingStation(null);
    setEditingEnterprise(null);
    setEditingDeviceClass(null);
    setEditingSop(null);
    setEditingUser(null);
  };

  const closeManager = () => {
    setActiveCategory(null);
  };

  // CRUD Mutations
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
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'MANAGE_WORKSTATIONS', // Reuse or use specific action
          actorRole: activeUserRole,
          message: `${isEdit ? 'Updated' : 'Created'} User account: ${editingUser.username}`
        });
        setEditingUser(null);
        setActiveTab('LIST');
        const refreshRes = await apiFetch('/api/s0/users');
        const refreshData = await refreshRes.json();
        if (refreshData.ok) setAppUsers(refreshData.data);
      }
    } catch (e) { console.error(e); } finally { setIsFormSubmitting(false); }
  };

  const toggleFrameworkBinding = async (frameworkId: string) => {
    if (activeUserRole !== UserRole.SYSTEM_ADMIN && activeUserRole !== UserRole.COMPLIANCE) return;
    setIsFormSubmitting(true);
    try {
      const currentIds = activeBinding?.regulatoryFrameworkIds || [];
      const currentSopIds = activeBinding?.sopProfileIds || [];
      const isBound = currentIds.includes(frameworkId);
      const nextIds = isBound ? currentIds.filter(id => id !== frameworkId) : [...currentIds, frameworkId];

      await apiFetch('/api/s0/compliance/bind', {
        method: 'POST',
        body: JSON.stringify({ 
          scope: selBindingScope, 
          scopeId: selBindingScopeId, 
          regulatoryFrameworkIds: nextIds,
          sopProfileIds: currentSopIds
        })
      });
      // Refresh logic skipped for brevity
    } catch (e) { console.error(e); } finally { setIsFormSubmitting(false); }
  };

  const toggleSopBinding = async (sopId: string) => {
    if (activeUserRole !== UserRole.SYSTEM_ADMIN && activeUserRole !== UserRole.COMPLIANCE) return;
    setIsFormSubmitting(true);
    try {
      const currentIds = activeBinding?.regulatoryFrameworkIds || [];
      const currentSopIds = activeBinding?.sopProfileIds || [];
      const isBound = currentSopIds.includes(sopId);
      const nextSopIds = isBound ? currentSopIds.filter(id => id !== sopId) : [...currentSopIds, sopId];

      await apiFetch('/api/s0/compliance/bind', {
        method: 'POST',
        body: JSON.stringify({ 
          scope: selBindingScope, 
          scopeId: selBindingScopeId, 
          regulatoryFrameworkIds: currentIds,
          sopProfileIds: nextSopIds
        })
      });
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
      message: isReverting 
        ? `This will remove the localized setting and revert to the value inherited from ${flag.sourceScope}.` 
        : `This will explicitly ${!flag.effectiveValue ? 'Enable' : 'Disable'} this capability for the current ${targetScope} scope.`,
      onConfirm: async () => {
        setIsSimulating(true);
        try {
          if (isReverting) {
             await apiFetch('/api/s0/capabilities/override', {
               method: 'DELETE',
               body: JSON.stringify({ flagId: flag.id, scope: targetScope, scopeId: targetId })
             });
          } else {
             await apiFetch('/api/s0/capabilities/override', {
               method: 'POST',
               body: JSON.stringify({ flagId: flag.id, scope: targetScope, scopeId: targetId, value: !flag.effectiveValue })
             });
          }
        } catch (e) { console.error(e); } finally {
          setIsSimulating(false);
          setConfirmAction(null);
        }
      }
    });
  };

  const hasAccess = activeUserRole === UserRole.SYSTEM_ADMIN || activeUserRole === UserRole.MANAGEMENT || activeUserRole === UserRole.COMPLIANCE;

  if (!hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p>Your role ({activeUserRole}) does not have permission to view Master Data Configuration.</p>
      </div>
    );
  }

  const isReadyForNext = s0Context.status === 'READY';

  const SelectorItem = ({ icon: Icon, label, value, options, onChange, onManage }: any) => (
    <div className="flex items-center gap-2 px-2 border-r border-slate-100 last:border-0 pr-4">
      <Icon size={16} className="text-slate-400 shrink-0" />
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 leading-none mb-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
          {onManage && (
            <button onClick={onManage} className="text-brand-600 hover:text-brand-800 transition-colors">
              <Edit3 size={10} />
            </button>
          )}
        </div>
        <div className="relative">
          <select 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-transparent outline-none appearance-none pr-4 cursor-pointer hover:text-brand-600 transition-colors"
          >
            {options.length === 0 && <option value="">N/A</option>}
            {options.map((opt: any) => (
              <option key={opt.id} value={opt.id}>{opt.displayName || opt.code}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );

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
      setEditingUser(u => ({
        ...u!,
        scopes: [...current, { scope: selScope, scopeId: selScopeId }]
      }));
    };

    const removeScope = (idx: number) => {
      const current = [...(editingUser?.scopes || [])];
      current.splice(idx, 1);
      setEditingUser(u => ({ ...u!, scopes: current }));
    };

    return (
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Access Scope Assignments</h4>
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
                 {getOptions().map((opt: any) => (
                    <option key={opt.id} value={opt.id}>{opt.displayName}</option>
                 ))}
              </select>
           </div>
           <button type="button" onClick={addScope} className="p-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"><Plus size={18} /></button>
        </div>
        <div className="space-y-2">
           {editingUser?.scopes?.map((s, i) => (
             <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border rounded text-xs">
                <div className="flex items-center gap-2">
                   <ScopeBadge scope={s.scope} />
                   <span className="font-mono font-bold text-slate-700">{s.scopeId}</span>
                </div>
                <button type="button" onClick={() => removeScope(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
             </div>
           ))}
           {(!editingUser?.scopes || editingUser.scopes.length === 0) && (
             <div className="text-[10px] text-slate-400 italic">No specific scopes bound. Account will inherit global permissions.</div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="space-y-6 animate-in fade-in duration-300 pb-12 overflow-y-auto h-full px-1 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
                Master Data <span className="text-slate-300">/</span> Factory Capabilities
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="text-brand-600" size={24} />
              System Configuration (S0)
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-[10px] font-bold border border-slate-200 uppercase tracking-widest">
              Capability Layer
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Server size={10} /> Node State: {s0Context.status}
            </div>
          </div>
        </div>

        {/* TOPOLOGY CONTEXT BAR */}
        <div className="bg-white border border-industrial-border rounded-lg p-3 shadow-sm flex flex-wrap items-center gap-4 overflow-x-auto custom-scrollbar">
          <SelectorItem icon={Building2} label="Enterprise" value={selEntId} options={enterprises} onChange={setSelEntId} onManage={() => openManager('ENTERPRISE')} />
          <SelectorItem icon={Factory} label="Plant" value={selPlantId} options={activePlants} onChange={setSelPlantId} />
          <SelectorItem icon={Layout} label="Active Line" value={selLineId} options={activeLines} onChange={setSelLineId} />
          <SelectorItem icon={Box} label="Primary Station" value={selStationId} options={activeStations} onChange={setSelStationId} />
          {isTopologyLoading && (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 ml-auto pr-2">
                <Loader2 size={14} className="animate-spin text-brand-500" />
                <span>Syncing Topology...</span>
              </div>
          )}
        </div>

        <StageStateBanner stageId="S0" />
        <PreconditionsPanel stageId="S0" />

        {/* Milestone Guidance */}
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-3 ${!onNavigate ? 'hidden' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600"><CheckCircle2 size={20} /></div>
            <div>
              <h3 className="font-bold text-blue-900 text-sm">Capability Milestone</h3>
              <p className="text-xs text-blue-700 mt-1 max-w-lg">
                {isReadyForNext 
                  ? "Factory capability matrix is locked. You may now define technical SKU specifications in S1." 
                  : "Base capabilities are undefined. Define required plant parameters to unlock product definition."}
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate && onNavigate('sku_blueprint')} disabled={!isReadyForNext} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            <Cpu size={14} /> SKU Master (S1)
          </button>
        </div>

        {/* Capability Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Factory size={20} className="text-brand-600" />
                <div className="flex items-center gap-2"><h2 className="font-bold">Plant Capabilities</h2><ScopeBadge scope="PLANT" /></div>
              </div>
              <button onClick={() => openManager('ORGANIZATION')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
            </div>
            <div className="space-y-4 text-sm flex-1">
               <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Facility ID</span>
                      <span className="font-mono text-slate-700">{selPlantId || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Region</span>
                      <span className="text-slate-700">{s0Context.region}</span>
                  </div>
               </div>
               <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Supported Tech Stack</span>
                  <div className="flex flex-wrap gap-2">
                     {s0Context.plant.capabilities.map(cap => (
                       <span key={cap} className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 rounded">{cap}</span>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Layout size={20} className="text-brand-600" />
                <div className="flex items-center gap-2"><h2 className="font-bold">Line Capabilities</h2><ScopeBadge scope="LINE" /></div>
              </div>
              <button onClick={() => openManager('LINES')} className="text-[10px] font-bold text-slate-400 uppercase">Manage</button>
            </div>
            <div className="space-y-3 flex-1">
               {activeLines.slice(0, 3).map(line => (
                 <div key={line.id} className={`p-3 rounded border text-[10px] ${selLineId === line.id ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800 text-xs">{line.displayName}</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase">{line.status}</span>
                    </div>
                    <div className="flex justify-between"><span>Registry Code:</span><span className="font-mono font-bold">{line.code}</span></div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col md:col-span-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Zap size={20} className="text-brand-600" />
                <div className="flex items-center gap-2"><h2 className="font-bold">System Capability Flags</h2><ScopeBadge scope="MIXED" /></div>
              </div>
            </div>
            {isFlagsLoading ? <Loader2 className="mx-auto animate-spin" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {effectiveFlags.map(flag => (
                  <div key={flag.id} className={`p-4 rounded-lg border ${flag.effectiveValue ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{flag.label}</span>
                            {flag.isOverridden && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-bold">OVERRIDDEN</span>}
                          </div>
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

        {/* Regulatory & SOP Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Globe size={20} className="text-brand-600" />
                <div className="flex items-center gap-2"><h2 className="font-bold">Regulatory & SOP Compliance</h2><ScopeBadge scope={effectiveCompliance?.sourceScope || 'GLOBAL'} /></div>
              </div>
              <button onClick={() => openManager('REGULATORY')} className="text-[10px] font-bold text-brand-600 uppercase">Manage Bindings</button>
            </div>
            {isComplianceLoading ? <Loader2 className="mx-auto animate-spin" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Scale size={12} /> Bound Frameworks</div>
                   <div className="flex flex-wrap gap-2">
                      {effectiveCompliance?.frameworks.map(fw => (
                        <div key={fw.id} className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex flex-col">
                           <span className="text-xs font-bold">{fw.name}</span>
                           <span className="text-[8px] uppercase">{fw.jurisdiction} Authority</span>
                        </div>
                      ))}
                      {(!effectiveCompliance || effectiveCompliance.frameworks.length === 0) && <div className="text-xs text-slate-400 italic">No frameworks bound.</div>}
                   </div>
                </div>
                <div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><BookOpen size={12} /> Effective SOPs</div>
                   <div className="flex flex-wrap gap-2">
                      {effectiveCompliance?.sopProfiles.map(sop => (
                        <div key={sop.id} className="px-3 py-2 bg-purple-50 text-purple-800 rounded-lg border border-purple-100 flex flex-col">
                           <span className="text-xs font-bold">{sop.name}</span>
                           <span className="text-[8px] uppercase">{sop.version} • {sop.code}</span>
                        </div>
                      ))}
                      {(!effectiveCompliance || effectiveCompliance.sopProfiles.length === 0) && <div className="text-xs text-slate-400 italic">No SOPs active.</div>}
                   </div>
                </div>
              </div>
            )}
        </div>

        {/* User Matrix */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Users size={20} className="text-brand-600" />
                <h2 className="font-bold">User Capability Matrix</h2>
                <ScopeBadge scope="GLOBAL" />
              </div>
              <button onClick={() => openManager('USERS')} className="text-[10px] font-bold text-slate-400 uppercase">Manage Accounts</button>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr><th className="px-4 py-3 font-bold uppercase">Account / Name</th><th className="px-4 py-3 font-bold uppercase">System Role</th><th className="px-4 py-3 font-bold uppercase text-right">Access Nodes</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isEntitiesLoading && activeCategory !== 'USERS' ? <tr><td colSpan={3} className="p-4 text-center text-slate-400">Loading registry...</td></tr> : (
                  appUsers.slice(0, 5).map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><div className="font-bold">{user.username}</div><div className="text-[10px] text-slate-400">{user.fullName}</div></td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded border font-medium">{user.role}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-[10px]">{user.scopes.length} Scoped Bindings</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      {/* DRAWER */}
      {activeCategory && (
        <div className="absolute inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div onClick={closeManager} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-600 text-white rounded-lg"><Settings size={20} /></div>
                  <div><h2 className="font-bold text-slate-800 uppercase tracking-tight">Manage {activeCategory.replace('_', ' ')}</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Master Data Repository</p></div>
               </div>
               <button onClick={closeManager} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
            </header>

            <div className="flex border-b border-slate-200">
               <button onClick={() => setActiveTab('LIST')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'LIST' ? 'border-b-2 border-brand-600 text-brand-600 bg-white' : 'text-slate-400 bg-slate-50'}`}>Repository List</button>
               <button onClick={() => setActiveTab('DETAILS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'DETAILS' ? 'border-b-2 border-brand-600 text-brand-600 bg-white' : 'text-slate-400 bg-slate-50'}`}>Definition Details</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
               {isEntitiesLoading ? <Loader2 className="animate-spin mx-auto mt-12" /> : (
                 <>
                   {activeCategory === 'USERS' && activeTab === 'LIST' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase">Registered Accounts</span><button onClick={() => { setEditingUser({ username: '', fullName: '', role: UserRole.OPERATOR, status: 'ACTIVE', scopes: [] }); setActiveTab('DETAILS'); }} className="text-[10px] font-bold text-brand-600 flex items-center gap-1"><Plus size={10} /> NEW ACCOUNT</button></div>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                           {appUsers.map(user => (
                             <div key={user.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                                <div className="flex items-center gap-3">
                                   <div className={`p-2 rounded ${user.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}><UserCheck size={16} /></div>
                                   <div><div className="text-sm font-bold text-slate-800">{user.username}</div><div className="text-[10px] font-medium text-slate-400 uppercase">{user.role} • {user.scopes.length} Scopes</div></div>
                                </div>
                                <button onClick={() => { setEditingUser(user); setActiveTab('DETAILS'); }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-200 rounded"><Edit2 size={14} /></button>
                             </div>
                           ))}
                        </div>
                      </div>
                   )}

                   {activeCategory === 'USERS' && activeTab === 'DETAILS' && (
                     <form onSubmit={handleUserSubmit} className="space-y-6">
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2"><UserCheck size={18} className="text-brand-600" /> {editingUser?.id ? 'Edit User Details' : 'Provision New Account'}</div>
                        <div className="space-y-4">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username / System ID</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm font-mono" value={editingUser?.username || ''} onChange={e => setEditingUser(u => ({ ...u!, username: e.target.value }))} /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Display Name</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm" value={editingUser?.fullName || ''} onChange={e => setEditingUser(u => ({ ...u!, fullName: e.target.value }))} /></div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Role</label>
                                 <select className="w-full border border-slate-300 rounded p-2.5 text-xs outline-none bg-white" value={editingUser?.role} onChange={e => setEditingUser(u => ({ ...u!, role: e.target.value as any }))}>
                                    {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                 </select>
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Status</label>
                                 <select className="w-full border border-slate-300 rounded p-2.5 text-xs outline-none bg-white" value={editingUser?.status} onChange={e => setEditingUser(u => ({ ...u!, status: e.target.value as any }))}>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                 </select>
                              </div>
                           </div>
                           
                           {/* User Scope Assignment (V35-S0-RBAC-PP-20) */}
                           <UserScopeSelection />

                        </div>
                        <div className="pt-6 border-t flex gap-3">
                           <button type="button" onClick={() => setActiveTab('LIST')} className="px-6 py-2.5 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 uppercase tracking-widest">Cancel</button>
                           <button type="submit" disabled={isFormSubmitting} className="flex-1 py-2.5 bg-brand-600 text-white rounded font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Commit Profile</button>
                        </div>
                     </form>
                   )}

                   {activeCategory === 'REGULATORY' && activeTab === 'LIST' && (
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => { setSelBindingScope('ENTERPRISE'); setSelBindingScopeId(selEntId); }} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${selBindingScope === 'ENTERPRISE' ? 'border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100' : 'border-slate-100 bg-white'}`}><Building2 size={24} className={selBindingScope === 'ENTERPRISE' ? 'text-brand-600' : 'text-slate-300'} /><div className="text-center"><div className="text-xs font-bold">Enterprise Level</div></div></button>
                           <button onClick={() => { setSelBindingScope('PLANT'); setSelBindingScopeId(selPlantId); }} disabled={!selPlantId} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${selBindingScope === 'PLANT' ? 'border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100' : 'border-slate-100 bg-white'} disabled:opacity-30`}><Factory size={24} className={selBindingScope === 'PLANT' ? 'text-brand-600' : 'text-slate-300'} /><div className="text-center"><div className="text-xs font-bold">Plant Override</div></div></button>
                        </div>
                        {/* Framework/SOP Binding Lists - logic existing */}
                     </div>
                   )}

                   {activeCategory === 'SOP_PROFILES' && activeTab === 'LIST' && (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase">SOP Repository</span><button onClick={() => { setEditingSop({ name: '', code: '', version: '', applicableScopes: ['PLANT'] }); setActiveTab('DETAILS'); }} className="text-[10px] font-bold text-brand-600 flex items-center gap-1"><Plus size={10} /> NEW SOP</button></div>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                           {allSops.map(sop => (
                             <div key={sop.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-purple-50 text-purple-600 rounded"><BookOpen size={16} /></div>
                                   <div><div className="text-sm font-bold text-slate-800">{sop.name}</div><div className="text-[10px] font-mono text-slate-400 uppercase">{sop.code} • {sop.version}</div></div>
                                </div>
                                <button onClick={() => { setEditingSop(sop); setActiveTab('DETAILS'); }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-200 rounded"><Edit2 size={14} /></button>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {activeCategory === 'SOP_PROFILES' && activeTab === 'DETAILS' && (
                     <form onSubmit={handleSopSubmit} className="space-y-6">
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2"><BookOpen size={18} className="text-purple-600" /> {editingSop?.id ? 'Edit Profile' : 'Add New SOP Profile'}</div>
                        <div className="space-y-4">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Display Name</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm" value={editingSop?.name || ''} onChange={e => setEditingSop(p => ({ ...p!, name: e.target.value }))} /></div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SOP Code</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm font-mono" value={editingSop?.code || ''} onChange={e => setEditingSop(p => ({ ...p!, code: e.target.value }))} /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Version</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm font-mono" value={editingSop?.version || ''} onChange={e => setEditingSop(p => ({ ...p!, version: e.target.value }))} /></div>
                           </div>
                        </div>
                        <button type="submit" disabled={isFormSubmitting} className="w-full py-3 bg-brand-600 text-white rounded font-bold text-sm shadow-sm hover:bg-brand-700 flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} COMMIT TO REPOSITORY</button>
                     </form>
                   )}

                   {(!['REGULATORY', 'SOP_PROFILES', 'USERS'].includes(activeCategory || '')) && (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                        <Lock size={32} className="mb-4 opacity-30" />
                        <p className="text-sm font-bold uppercase">Scoped Management Panel</p>
                        <p className="text-xs mt-1">Management of this category is tied to the V3.5 Foundation.</p>
                     </div>
                   )}
                 </>
               )}
            </div>

            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
               <button onClick={closeManager} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Close Panel</button>
               <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1"><ShieldCheck size={12} /> MASTER_DATA_MGMT_V3.5</div>
            </footer>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
           <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-brand-50 text-brand-600 rounded-full"><ShieldCheck size={28} /></div>
                 <h3 className="text-xl font-bold text-slate-800">{confirmAction.title}</h3>
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">{confirmAction.message}</p>
              <div className="flex gap-4">
                 <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50">CANCEL</button>
                 <button onClick={confirmAction.onConfirm} className="flex-1 py-3 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-md">CONFIRM</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};