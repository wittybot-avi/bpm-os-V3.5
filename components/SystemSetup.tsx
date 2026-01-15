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
  Edit3
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { getMockS0Context, S0Context } from '../stages/s0/s0Contract';
import { getS0ActionState, S0ActionId } from '../stages/s0/s0Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { apiFetch } from '../services/apiHarness';
import type { Enterprise, Plant, Line, Station } from '../domain/s0/systemTopology.types';

interface SystemSetupProps {
  onNavigate?: (view: NavView) => void;
}

const ScopeBadge: React.FC<{ scope: string }> = ({ scope }) => (
  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-50 text-slate-400 border-slate-200 tracking-tighter shrink-0">
    {scope.toUpperCase()}
  </span>
);

type ManageCategory = 'ORGANIZATION' | 'LINES' | 'WORKSTATIONS' | 'DEVICES' | 'REGULATORY' | 'USERS' | 'ENTERPRISE' | null;

export const SystemSetup: React.FC<SystemSetupProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Local State
  const [s0Context, setS0Context] = useState<S0Context>(getMockS0Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Drawer State
  const [activeCategory, setActiveCategory] = useState<ManageCategory>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DETAILS'>('LIST');

  // Topology Selection State (V35-S0-CRUD-PP-12)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [activePlants, setActivePlants] = useState<Plant[]>([]);
  const [activeLines, setActiveLines] = useState<Line[]>([]);
  const [activeStations, setActiveStations] = useState<Station[]>([]);

  const [selEntId, setSelEntId] = useState<string>('');
  const [selPlantId, setSelPlantId] = useState<string>('');
  const [selLineId, setSelLineId] = useState<string>('');
  const [selStationId, setSelStationId] = useState<string>('');
  
  const [isTopologyLoading, setIsTopologyLoading] = useState(true);

  // CRUD State
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Partial<Plant> | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<Line> | null>(null);
  const [editingStation, setEditingStation] = useState<Partial<Station> | null>(null);
  const [editingEnterprise, setEditingEnterprise] = useState<Partial<Enterprise> | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

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
            if (!data.data.find((p: any) => p.id === selPlantId)) {
               setSelPlantId(data.data[0].id);
            }
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
            if (!data.data.find((l: any) => l.id === selLineId)) {
               setSelLineId(data.data[0].id);
            }
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
            if (!data.data.find((s: any) => s.id === selStationId)) {
               setSelStationId(data.data[0].id);
            }
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

  // Sync audit events
  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S0'));
  }, []);

  // Fetch for Manager
  useEffect(() => {
    if (activeCategory === 'ORGANIZATION') {
      const loadPlants = async () => {
        setIsEntitiesLoading(true);
        try {
          const res = await apiFetch('/api/s0/plants');
          const result = await res.json();
          if (result.ok) setPlants(result.data);
        } catch (e) { console.error(e); } finally { setIsEntitiesLoading(false); }
      };
      loadPlants();
    } else if (activeCategory === 'LINES') {
      const loadLines = async () => {
        if (!selPlantId) return;
        setIsEntitiesLoading(true);
        try {
          const res = await apiFetch(`/api/s0/lines?plantId=${selPlantId}`);
          const result = await res.json();
          if (result.ok) setActiveLines(result.data);
        } catch (e) { console.error(e); } finally { setIsEntitiesLoading(false); }
      };
      loadLines();
    } else if (activeCategory === 'WORKSTATIONS') {
      const loadStations = async () => {
        if (!selLineId) return;
        setIsEntitiesLoading(true);
        try {
          const res = await apiFetch(`/api/s0/stations?lineId=${selLineId}`);
          const result = await res.json();
          if (result.ok) setActiveStations(result.data);
        } catch (e) { console.error(e); } finally { setIsEntitiesLoading(false); }
      };
      loadStations();
    } else if (activeCategory === 'ENTERPRISE') {
       const loadEnterprises = async () => {
          setIsEntitiesLoading(true);
          try {
             const res = await apiFetch('/api/s0/enterprises');
             const data = await res.json();
             if (data.ok) setEnterprises(data.data);
          } catch (e) { console.error(e); } finally { setIsEntitiesLoading(false); }
       };
       loadEnterprises();
    }
  }, [activeCategory, selPlantId, selLineId]);

  // Handlers
  const handleEditPlantTile = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS0Context(prev => ({ ...prev, configLastUpdated: now }));
      emitAuditEvent({
        stageId: 'S0',
        actionId: 'EDIT_PLANT_DETAILS',
        actorRole: role,
        message: 'Updated plant capability profile'
      });
      setIsSimulating(false);
    }, 600);
  };

  const handleSyncRegs = () => {
    setIsSimulating(true);
    setTimeout(() => {
      emitAuditEvent({
        stageId: 'S0',
        actionId: 'UPDATE_REGULATIONS',
        actorRole: role,
        message: 'Synchronized regulatory capability requirements'
      });
      setIsSimulating(false);
    }, 1000);
  };

  const handleToggleFlag = (flagId: string) => {
    if (role !== UserRole.SYSTEM_ADMIN) return;
    setS0Context(prev => ({
      ...prev,
      featureFlags: prev.featureFlags.map(f => 
        f.id === flagId ? { ...f, isEnabled: !f.isEnabled } : f
      )
    }));
  };

  const handleNavToS1 = () => {
    if (onNavigate) onNavigate('sku_blueprint');
  };

  const openManager = (cat: ManageCategory) => {
    setActiveCategory(cat);
    setActiveTab('LIST');
    setEditingPlant(null);
    setEditingLine(null);
    setEditingStation(null);
    setEditingEnterprise(null);
  };

  const closeManager = () => {
    setActiveCategory(null);
    setEditingPlant(null);
    setEditingLine(null);
    setEditingStation(null);
    setEditingEnterprise(null);
  };

  // Enterprise CRUD (V35-S0-CRUD-PP-15)
  const handleUpdateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnterprise || !editingEnterprise.id || isFormSubmitting) return;
    setIsFormSubmitting(true);

    try {
      const res = await apiFetch('/api/s0/enterprises/update', {
        method: 'PATCH',
        body: JSON.stringify({ id: editingEnterprise.id, updates: editingEnterprise })
      });
      const result = await res.json();
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'UPDATE_ENTERPRISE',
          actorRole: role,
          message: `Updated Enterprise Metadata: ${result.data.displayName}`
        });
        setEditingEnterprise(null);
        setActiveTab('LIST');
        // Refresh local list and main context bar
        const entRes = await apiFetch('/api/s0/enterprises');
        const entData = await entRes.json();
        if (entData.ok) setEnterprises(entData.data);
      }
    } catch (e) { console.error(e); } finally { setIsFormSubmitting(false); }
  };

  // Plant CRUD
  const handleCreateOrUpdatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlant || isFormSubmitting) return;
    setIsFormSubmitting(true);

    try {
      const isEdit = !!editingPlant.id;
      const endpoint = isEdit ? '/api/s0/plants/update' : '/api/s0/plants/create';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit ? { id: editingPlant.id, updates: editingPlant } : editingPlant;

      const res = await apiFetch(endpoint, { method, body: JSON.stringify(body) });
      const result = await res.json();
      
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'EDIT_PLANT_DETAILS',
          actorRole: role,
          message: `${isEdit ? 'Updated' : 'Created'} plant: ${result.data.displayName}`
        });
        setEditingPlant(null);
        setActiveTab('LIST');
        const plantRes = await apiFetch(`/api/s0/plants?enterpriseId=${selEntId}`);
        const plantData = await plantRes.json();
        if (plantData.ok) setActivePlants(plantData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleSuspendPlant = async (id: string) => {
    if (isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const res = await apiFetch('/api/s0/plants/update', {
        method: 'PATCH',
        body: JSON.stringify({ id, updates: { status: 'SUSPENDED' } })
      });
      const result = await res.json();
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'EDIT_PLANT_DETAILS',
          actorRole: role,
          message: `Suspended plant: ${result.data.displayName}`
        });
        const plantRes = await apiFetch(`/api/s0/plants?enterpriseId=${selEntId}`);
        const plantData = await plantRes.json();
        if (plantData.ok) setActivePlants(plantData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Line CRUD (V35-S0-CRUD-PP-13)
  const handleCreateOrUpdateLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine || isFormSubmitting || !selPlantId) return;
    setIsFormSubmitting(true);

    try {
      const isEdit = !!editingLine.id;
      const endpoint = isEdit ? '/api/s0/lines/update' : '/api/s0/lines/create';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit 
        ? { id: editingLine.id, updates: editingLine } 
        : { ...editingLine, plantId: selPlantId };

      const res = await apiFetch(endpoint, { method, body: JSON.stringify(body) });
      const result = await res.json();
      
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'MANAGE_LINES',
          actorRole: role,
          message: `${isEdit ? 'Updated' : 'Created'} line: ${result.data.displayName}`
        });
        setEditingLine(null);
        setActiveTab('LIST');
        const lineRes = await apiFetch(`/api/s0/lines?plantId=${selPlantId}`);
        const lineData = await lineRes.json();
        if (lineData.ok) setActiveLines(lineData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleSuspendLine = async (id: string) => {
    if (isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const res = await apiFetch('/api/s0/lines/update', {
        method: 'PATCH',
        body: JSON.stringify({ id, updates: { status: 'SUSPENDED' } })
      });
      const result = await res.json();
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'MANAGE_LINES',
          actorRole: role,
          message: `Suspended line: ${result.data.displayName}`
        });
        const lineRes = await apiFetch(`/api/s0/lines?plantId=${selPlantId}`);
        const lineData = await lineRes.json();
        if (lineData.ok) setActiveLines(lineData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Station CRUD (V35-S0-CRUD-PP-14)
  const handleCreateOrUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation || isFormSubmitting || !selLineId) return;
    setIsFormSubmitting(true);

    try {
      const isEdit = !!editingStation.id;
      const endpoint = isEdit ? '/api/s0/stations/update' : '/api/s0/stations/create';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit 
        ? { id: editingStation.id, updates: editingStation } 
        : { ...editingStation, lineId: selLineId };

      const res = await apiFetch(endpoint, { method, body: JSON.stringify(body) });
      const result = await res.json();
      
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'MANAGE_WORKSTATIONS',
          actorRole: role,
          message: `${isEdit ? 'Updated' : 'Created'} station: ${result.data.displayName}`
        });
        setEditingStation(null);
        setActiveTab('LIST');
        const stRes = await apiFetch(`/api/s0/stations?lineId=${selLineId}`);
        const stData = await stRes.json();
        if (stData.ok) setActiveStations(stData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleSuspendStation = async (id: string) => {
    if (isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const res = await apiFetch('/api/s0/stations/update', {
        method: 'PATCH',
        body: JSON.stringify({ id, updates: { status: 'SUSPENDED' } })
      });
      const result = await res.json();
      if (result.ok) {
        emitAuditEvent({
          stageId: 'S0',
          actionId: 'MANAGE_WORKSTATIONS',
          actorRole: role,
          message: `Suspended station: ${result.data.displayName}`
        });
        const stRes = await apiFetch(`/api/s0/stations?lineId=${selLineId}`);
        const stData = await stRes.json();
        if (stData.ok) setActiveStations(stData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const hasAccess = role === UserRole.SYSTEM_ADMIN || role === UserRole.MANAGEMENT || role === UserRole.COMPLIANCE;

  if (!hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <ShieldAlert size={64} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p>Your role ({role}) does not have permission to view Master Data Configuration.</p>
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

  return (
    <div className="relative h-full overflow-hidden">
      <div className="space-y-6 animate-in fade-in duration-300 pb-12 overflow-y-auto h-full px-1 custom-scrollbar">
        {/* Configuration Header */}
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
          <SelectorItem 
            icon={Building2} 
            label="Enterprise" 
            value={selEntId} 
            options={enterprises} 
            onChange={setSelEntId} 
            onManage={() => openManager('ENTERPRISE')}
          />
          <SelectorItem 
            icon={Factory} 
            label="Plant" 
            value={selPlantId} 
            options={activePlants} 
            onChange={setSelPlantId} 
          />
          <SelectorItem 
            icon={Layout} 
            label="Active Line" 
            value={selLineId} 
            options={activeLines} 
            onChange={setSelLineId} 
          />
          <SelectorItem 
            icon={Box} 
            label="Primary Station" 
            value={selStationId} 
            options={activeStations} 
            onChange={setSelStationId} 
          />
          
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
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 text-sm">Capability Milestone</h3>
              <p className="text-xs text-blue-700 mt-1 max-w-lg">
                {isReadyForNext 
                  ? "Factory capability matrix is locked. You may now define technical SKU specifications in S1." 
                  : "Base capabilities are undefined. Define required plant parameters to unlock product definition."}
              </p>
            </div>
          </div>
          <button 
            onClick={handleNavToS1} 
            disabled={!isReadyForNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Cpu size={14} /> SKU Master (S1)
          </button>
        </div>

        {/* Capability Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
          
          {/* 1. Plant Capabilities */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Factory size={20} className="text-brand-600" />
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">Plant Capabilities</h2>
                  <ScopeBadge scope="PLANT" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleEditPlantTile} className="text-[10px] font-bold text-brand-600 hover:text-brand-800">PROVISION</button>
                <button onClick={() => openManager('ORGANIZATION')} className="text-[10px] font-bold text-slate-400 hover:text-brand-600 uppercase">Manage</button>
              </div>
            </div>
            <div className="space-y-4 text-sm flex-1">
               <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Facility ID</span>
                      <span className="font-mono text-slate-700">{selPlantId || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Region</span>
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

          {/* 2. Line Capabilities */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Layout size={20} className="text-brand-600" />
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">Line Capabilities</h2>
                  <ScopeBadge scope="LINE" />
                </div>
              </div>
              <div className="flex gap-3">
                <button className="text-[10px] font-bold text-brand-600 hover:text-brand-800 uppercase">Configure</button>
                <button onClick={() => openManager('LINES')} className="text-[10px] font-bold text-slate-400 hover:text-brand-600 uppercase">Manage</button>
              </div>
            </div>
            <div className="space-y-3 flex-1">
               {activeLines.length === 0 && <div className="text-xs text-slate-400 italic py-4">No lines provisioned for this plant.</div>}
               {activeLines.map(line => (
                 <div key={line.id} className={`p-3 rounded border transition-all text-[10px] ${selLineId === line.id ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-xs">{line.displayName}</span>
                      <span className={`px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase ${line.status === 'SUSPENDED' ? 'opacity-50' : ''}`}>{line.status}</span>
                    </div>
                    <div className="flex justify-between"><span>Provisioned Code:</span><span className="font-mono font-bold">{line.code}</span></div>
                 </div>
               ))}
               <button onClick={() => { setEditingLine({ displayName: '', code: '', status: 'ACTIVE', supportedOperations: [], supportedSkuTypes: [] }); setActiveTab('DETAILS'); openManager('LINES'); }} className="w-full py-2 border-2 border-dashed border-slate-200 rounded text-[10px] font-bold text-slate-400 hover:text-brand-600 transition-colors">+ REGISTER NEW LINE</button>
            </div>
          </div>

          {/* 3. System Capability Flags */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col md:col-span-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Zap size={20} className="text-brand-600" />
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">System Capability Flags</h2>
                  <ScopeBadge scope="MIXED" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {s0Context.featureFlags.map(flag => (
                 <div key={flag.id} className={`p-4 rounded-lg border transition-all ${flag.isEnabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2"><span className="font-bold text-slate-800 text-sm">{flag.label}</span><span className="text-[8px] px-1 py-0.5 rounded font-bold border border-slate-200">{flag.scope}</span></div>
                      <button onClick={() => handleToggleFlag(flag.id)} disabled={role !== UserRole.SYSTEM_ADMIN}>
                        {flag.isEnabled ? <ToggleRight className="text-brand-600" size={24} /> : <ToggleLeft className="text-slate-300" size={24} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{flag.description}</p>
                 </div>
               ))}
            </div>
          </div>

          {/* 4. Workstation Capabilities */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Wrench size={20} className="text-brand-600" />
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">Workstation Capabilities</h2>
                  <ScopeBadge scope="STATION" />
                </div>
              </div>
              <button onClick={() => openManager('WORKSTATIONS')} className="text-[10px] font-bold text-slate-400 hover:text-brand-600 uppercase">Manage</button>
            </div>
            <div className="space-y-4 flex-1">
               {activeStations.length === 0 && <div className="text-xs text-slate-400 italic py-4">No workstations found for this line.</div>}
               {activeStations.map(station => (
                 <div key={station.id} className={`p-3 rounded border border-slate-200 transition-all ${selStationId === station.id ? 'bg-brand-50 border-brand-300' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={14} className="text-green-600" />
                      <span className="text-xs font-bold text-slate-700 uppercase">{station.displayName}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-500">
                       <div className="flex justify-between"><span>Station Type</span><span className="font-bold">{station.stationType}</span></div>
                       <div className="flex justify-between"><span>Status</span><span className={`font-bold ${station.status === 'SUSPENDED' ? 'text-slate-400' : 'text-green-600'}`}>{station.status}</span></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* 5. Device Class Capabilities */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Activity size={20} className="text-brand-600" />
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">Device Class Capabilities</h2>
                  <ScopeBadge scope="STATION" />
                </div>
              </div>
              <button onClick={() => openManager('DEVICES')} className="text-[10px] font-bold text-brand-600 hover:text-brand-800 uppercase">Manage Classes</button>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
               <div className="flex justify-between p-2 bg-slate-50 border border-slate-100 rounded text-xs font-bold text-slate-700"><span>BARCODE_SCANNER</span><span className="font-mono text-slate-400">USB / REST</span></div>
               <div className="flex justify-between p-2 bg-slate-50 border border-slate-100 rounded text-xs font-bold text-slate-700"><span>DIGITAL_SCALE</span><span className="font-mono text-slate-400">MQTT</span></div>
            </div>
          </div>

        </div>
        
        {/* Regulatory */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Globe size={20} className="text-brand-600" />
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">Regulatory & Sovereignty Compliance</h2>
                  <ScopeBadge scope="REGULATORY" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSyncRegs} className="text-[10px] font-bold text-brand-600 uppercase">Sync Master</button>
                <button onClick={() => openManager('REGULATORY')} className="text-[10px] font-bold text-slate-400 hover:text-brand-600 uppercase">Manage</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
               <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex-1 min-w-[200px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Identity Sovereignty</span>
                  <span className="text-sm font-bold text-slate-800">BATT-AADHAAR-V1</span>
               </div>
               <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex-1 min-w-[200px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Safety Standard</span>
                  <span className="text-sm font-bold text-slate-800">AIS-156 AMD 3</span>
               </div>
            </div>
        </div>

        {/* User Capability Matrix */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                  <Users size={20} className="text-brand-600" />
                  <div className="flex items-center gap-2">
                      <h2 className="font-bold">User Capability Matrix</h2>
                      <ScopeBadge scope="GLOBAL" />
                  </div>
              </div>
              <button onClick={() => openManager('USERS')} className="text-[10px] font-bold text-slate-400 hover:text-brand-600 uppercase">Manage Roles</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr><th className="px-4 py-3 font-bold uppercase">Role Entity</th><th className="px-4 py-3 font-bold uppercase">System Access Scope</th><th className="px-4 py-3 font-bold uppercase text-right">Authorized Nodes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr><td className="px-4 py-3 font-bold">System Admin</td><td className="px-4 py-3">Global Configuration</td><td className="px-4 py-3 font-mono text-right">GLOBAL</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Operator</td><td className="px-4 py-3">Task Execution</td><td className="px-4 py-3 font-mono text-right">ASSIGNED_NODES</td></tr>
                </tbody>
              </table>
            </div>
        </div>
      </div>

      {/* SCAFFOLDED MANAGEMENT DRAWER */}
      {activeCategory && (
        <div className="absolute inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div onClick={closeManager} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" />
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-600 text-white rounded-lg"><Settings size={20} /></div>
                  <div>
                    <h2 className="font-bold text-slate-800">Manage {activeCategory === 'ORGANIZATION' ? 'Plants' : activeCategory === 'LINES' ? 'Lines' : activeCategory === 'WORKSTATIONS' ? 'Stations' : activeCategory === 'ENTERPRISE' ? 'Enterprises' : activeCategory}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Data Management</p>
                  </div>
               </div>
               <button onClick={closeManager} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 shrink-0">
               <button 
                 onClick={() => { setActiveTab('LIST'); setEditingPlant(null); setEditingLine(null); setEditingStation(null); setEditingEnterprise(null); }}
                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'LIST' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 bg-slate-50'}`}
               >
                 <List size={14} /> Repository List
               </button>
               <button 
                 onClick={() => setActiveTab('DETAILS')}
                 disabled={!['ORGANIZATION', 'LINES', 'WORKSTATIONS', 'ENTERPRISE'].includes(activeCategory || '')}
                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'DETAILS' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed'}`}
               >
                 <FileText size={14} /> Definition Details
               </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {activeCategory === 'ORGANIZATION' ? (
                 <>
                   {activeTab === 'LIST' ? (
                     <div className="p-0">
                       <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Entities</span>
                          <button 
                            onClick={() => { setEditingPlant({ displayName: '', code: '', status: 'ACTIVE' }); setActiveTab('DETAILS'); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-800"
                          >
                            <Plus size={12} /> ADD NEW PLANT
                          </button>
                       </div>
                       {isEntitiesLoading ? (
                         <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                           <Loader2 size={24} className="animate-spin" />
                           <span className="text-xs font-bold uppercase">Fetching Registry...</span>
                         </div>
                       ) : (
                         <div className="divide-y divide-slate-100">
                           {plants.map(p => (
                             <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                   <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-green-50' : 'bg-amber-500'}`} />
                                   <div>
                                      <div className="text-sm font-bold text-slate-800">{p.displayName}</div>
                                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Code: {p.code} • ID: {p.id}</div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { setEditingPlant(p); setActiveTab('DETAILS'); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit Definition"><Edit2 size={14} /></button>
                                   {p.status === 'ACTIVE' && <button onClick={() => handleSuspendPlant(p.id)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Suspend Capability"><Ban size={14} /></button>}
                                </div>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   ) : (
                     <form onSubmit={handleCreateOrUpdatePlant} className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-brand-50 rounded text-brand-600"><Factory size={18} /></div><h3 className="font-bold text-slate-700">{editingPlant?.id ? 'Edit Plant Definition' : 'Add New Plant Entity'}</h3></div>
                        <div className="space-y-4">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plant Display Name</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Gigafactory 2 - Mumbai" value={editingPlant?.displayName || ''} onChange={e => setEditingPlant(p => ({ ...p!, displayName: e.target.value }))} /></div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plant Code</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono uppercase" placeholder="PL-MUM-01" value={editingPlant?.code || ''} onChange={e => setEditingPlant(p => ({ ...p!, code: e.target.value }))} /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Status</label><select className="w-full border border-slate-300 rounded p-2.5 text-sm outline-none bg-white" value={editingPlant?.status || 'ACTIVE'} onChange={e => setEditingPlant(p => ({ ...p!, status: e.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></div>
                           </div>
                           <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex gap-3 mt-4"><Info size={18} className="text-slate-400 shrink-0" /><p className="text-[11px] text-slate-600 leading-relaxed">Creating a new plant establishes a root node for manufacturing topology. Once active, lines can be provisioned within this facility.</p></div>
                        </div>
                        <div className="pt-6 flex gap-3"><button type="button" onClick={() => { setEditingPlant(null); setActiveTab('LIST'); }} className="px-6 py-2.5 rounded text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">CANCEL</button><button type="submit" disabled={isFormSubmitting} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-sm py-2.5 shadow-sm transition-all flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editingPlant?.id ? 'UPDATE DEFINITION' : 'CREATE PLANT ENTITY'}</button></div>
                     </form>
                   )}
                 </>
               ) : activeCategory === 'LINES' ? (
                 <>
                   {activeTab === 'LIST' ? (
                     <div className="p-0">
                       <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Lines for Selected Plant</span>
                          <button 
                            disabled={!selPlantId}
                            onClick={() => { setEditingLine({ displayName: '', code: '', status: 'ACTIVE', supportedOperations: [], supportedSkuTypes: [] }); setActiveTab('DETAILS'); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-800 disabled:opacity-50"
                          >
                            <Plus size={12} /> ADD NEW LINE
                          </button>
                       </div>
                       {isEntitiesLoading ? (
                         <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                           <Loader2 size={24} className="animate-spin" />
                           <span className="text-xs font-bold uppercase">Fetching Registry...</span>
                         </div>
                       ) : (
                         <div className="divide-y divide-slate-100">
                           {activeLines.map(l => (
                             <div key={l.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                   <div className={`w-2 h-2 rounded-full ${l.status === 'ACTIVE' ? 'bg-green-50' : 'bg-amber-500'}`} />
                                   <div>
                                      <div className="text-sm font-bold text-slate-800">{l.displayName}</div>
                                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Code: {l.code} • ID: {l.id}</div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { setEditingLine(l); setActiveTab('DETAILS'); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit Definition"><Edit2 size={14} /></button>
                                   {l.status === 'ACTIVE' && <button onClick={() => handleSuspendLine(l.id)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Suspend Capability"><Ban size={14} /></button>}
                                </div>
                             </div>
                           ))}
                           {activeLines.length === 0 && (
                             <div className="p-12 text-center text-slate-400 italic text-sm">No lines provisioned for this facility.</div>
                           )}
                         </div>
                       )}
                     </div>
                   ) : (
                     <form onSubmit={handleCreateOrUpdateLine} className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-brand-50 rounded text-brand-600"><Layout size={18} /></div><h3 className="font-bold text-slate-700">{editingLine?.id ? 'Edit Line Definition' : 'Add New Line Entity'}</h3></div>
                        <div className="space-y-4 text-sm">
                           <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between mb-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Parent Plant Binding</span>
                              <span className="font-bold text-brand-700">{activePlants.find(p => p.id === selPlantId)?.displayName || selPlantId}</span>
                           </div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line Display Name</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Pack Assembly Line B" value={editingLine?.displayName || ''} onChange={e => setEditingLine(l => ({ ...l!, displayName: e.target.value }))} /></div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line Code</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none font-mono uppercase" placeholder="LN-PK-02" value={editingLine?.code || ''} onChange={e => setEditingLine(l => ({ ...l!, code: e.target.value }))} /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Status</label><select className="w-full border border-slate-300 rounded p-2.5 outline-none bg-white" value={editingLine?.status || 'ACTIVE'} onChange={e => setEditingLine(l => ({ ...l!, status: e.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></div>
                           </div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supported Sku Types (Comma separated)</label><input type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="PACK, MODULE" value={editingLine?.supportedSkuTypes?.join(', ') || ''} onChange={e => setEditingLine(l => ({ ...l!, supportedSkuTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} /></div>
                        </div>
                        <div className="pt-6 flex gap-3"><button type="button" onClick={() => { setEditingLine(null); setActiveTab('LIST'); }} className="px-6 py-2.5 rounded text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">CANCEL</button><button type="submit" disabled={isFormSubmitting} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-sm py-2.5 shadow-sm transition-all flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editingLine?.id ? 'UPDATE DEFINITION' : 'CREATE LINE ENTITY'}</button></div>
                     </form>
                   )}
                 </>
               ) : activeCategory === 'WORKSTATIONS' ? (
                 <>
                   {activeTab === 'LIST' ? (
                     <div className="p-0">
                       <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Stations for Selected Line</span>
                          <button 
                            disabled={!selLineId}
                            onClick={() => { setEditingStation({ displayName: '', code: '', status: 'ACTIVE', stationType: 'ASSEMBLY', supportedOperations: [] }); setActiveTab('DETAILS'); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-800 disabled:opacity-50"
                          >
                            <Plus size={12} /> ADD NEW STATION
                          </button>
                       </div>
                       {isEntitiesLoading ? (
                         <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                           <Loader2 size={24} className="animate-spin" />
                           <span className="text-xs font-bold uppercase">Fetching Registry...</span>
                         </div>
                       ) : (
                         <div className="divide-y divide-slate-100">
                           {activeStations.map(s => (
                             <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                   <div className={`w-2 h-2 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                   <div>
                                      <div className="text-sm font-bold text-slate-800">{s.displayName}</div>
                                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Code: {s.code} • Type: {s.stationType}</div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { setEditingStation(s); setActiveTab('DETAILS'); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit Station"><Edit2 size={14} /></button>
                                   {s.status === 'ACTIVE' && <button onClick={() => handleSuspendStation(s.id)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Suspend Station"><Ban size={14} /></button>}
                                </div>
                             </div>
                           ))}
                           {activeStations.length === 0 && (
                             <div className="p-12 text-center text-slate-400 italic text-sm">No stations defined for this line.</div>
                           )}
                         </div>
                       )}
                     </div>
                   ) : (
                     <form onSubmit={handleCreateOrUpdateStation} className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-brand-50 rounded text-brand-600"><Wrench size={18} /></div><h3 className="font-bold text-slate-700">{editingStation?.id ? 'Edit Station Definition' : 'Add New Station Entity'}</h3></div>
                        <div className="space-y-4 text-sm">
                           <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between mb-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Parent Line Binding</span>
                              <span className="font-bold text-brand-700">{activeLines.find(l => l.id === selLineId)?.displayName || selLineId}</span>
                           </div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Station Name</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Module Insertion Station" value={editingStation?.displayName || ''} onChange={e => setEditingStation(s => ({ ...s!, displayName: e.target.value }))} /></div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Station Code</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none font-mono uppercase" placeholder="STN-A-01" value={editingStation?.code || ''} onChange={e => setEditingStation(s => ({ ...s!, code: e.target.value }))} /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Station Type</label><select className="w-full border border-slate-300 rounded p-2.5 outline-none bg-white" value={editingStation?.stationType || 'ASSEMBLY'} onChange={e => setEditingStation(s => ({ ...s!, stationType: e.target.value }))}><option value="ASSEMBLY">ASSEMBLY</option><option value="TESTING">TESTING</option><option value="PACKAGING">PACKAGING</option></select></div>
                           </div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Status</label><select className="w-full border border-slate-300 rounded p-2.5 outline-none bg-white" value={editingStation?.status || 'ACTIVE'} onChange={e => setEditingStation(s => ({ ...s!, status: e.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supported Ops (Comma separated)</label><input type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="INSERT_CELL, WELD_BUSBAR" value={editingStation?.supportedOperations?.join(', ') || ''} onChange={e => setEditingStation(s => ({ ...s!, supportedOperations: e.target.value.split(',').map(op => op.trim()).filter(Boolean) }))} /></div>
                        </div>
                        <div className="pt-6 flex gap-3"><button type="button" onClick={() => { setEditingStation(null); setActiveTab('LIST'); }} className="px-6 py-2.5 rounded text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">CANCEL</button><button type="submit" disabled={isFormSubmitting} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-sm py-2.5 shadow-sm transition-all flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editingStation?.id ? 'UPDATE DEFINITION' : 'CREATE STATION ENTITY'}</button></div>
                     </form>
                   )}
                 </>
               ) : activeCategory === 'ENTERPRISE' ? (
                  <>
                    {activeTab === 'LIST' ? (
                      <div className="p-0">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Enterprises</span>
                        </div>
                        {isEntitiesLoading ? (
                          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 size={24} className="animate-spin" />
                            <span className="text-xs font-bold uppercase">Fetching Enterprises...</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {enterprises.map(e => (
                              <div key={e.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${e.status === 'ACTIVE' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                    <div>
                                       <div className="text-sm font-bold text-slate-800">{e.displayName}</div>
                                       <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Code: {e.code} • Timezone: {e.timezone || 'N/A'}</div>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingEnterprise(e); setActiveTab('DETAILS'); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit Enterprise Metadata"><Edit2 size={14} /></button>
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateEnterprise} className="p-6 space-y-6">
                         <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-brand-50 rounded text-brand-600"><Building2 size={18} /></div><h3 className="font-bold text-slate-700">Edit Enterprise Metadata</h3></div>
                         <div className="space-y-4 text-sm">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enterprise Name</label><input required type="text" className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. BPM Global Group" value={editingEnterprise?.displayName || ''} onChange={e => setEditingEnterprise(ent => ({ ...ent!, displayName: e.target.value }))} /></div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Timezone</label><select className="w-full border border-slate-300 rounded p-2.5 outline-none bg-white" value={editingEnterprise?.timezone || 'UTC'} onChange={e => setEditingEnterprise(ent => ({ ...ent!, timezone: e.target.value }))}><option value="UTC">UTC</option><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="Europe/Berlin">Europe/Berlin (CET)</option><option value="America/New_York">America/New_York (EST)</option></select></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operational Status</label><select className="w-full border border-slate-300 rounded p-2.5 outline-none bg-white" value={editingEnterprise?.status || 'ACTIVE'} onChange={e => setEditingEnterprise(ent => ({ ...ent!, status: e.target.value as any }))}><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex gap-3 mt-4"><Info size={18} className="text-slate-400 shrink-0" /><p className="text-[11px] text-slate-600 leading-relaxed">Enterprise metadata is for multi-region coordination and audit purposes. Structural changes to topology (Plants) are not permitted in this view.</p></div>
                         </div>
                         <div className="pt-6 flex gap-3"><button type="button" onClick={() => { setEditingEnterprise(null); setActiveTab('LIST'); }} className="px-6 py-2.5 rounded text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">CANCEL</button><button type="submit" disabled={isFormSubmitting} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-sm py-2.5 shadow-sm transition-all flex items-center justify-center gap-2">{isFormSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}UPDATE ENTERPRISE</button></div>
                      </form>
                    )}
                  </>
               ) : (
                 <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-300 mb-4"><Lock size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Management Framework Scoped</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">The management interface for <strong>{activeCategory}</strong> is wired to the V3.5 Foundation. Entity CRUD forms are coming in the next incremental patch.</p>
                    <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs"><div className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex flex-col items-center"><Plus size={20} className="text-slate-300 mb-1" /><span className="text-[10px] font-bold text-slate-400 uppercase">Add Entry</span></div><div className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex flex-col items-center"><Settings size={20} className="text-slate-300 mb-1" /><span className="text-[10px] font-bold text-slate-400 uppercase">Configuration</span></div></div>
                 </div>
               )}
            </div>

            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
               <button onClick={closeManager} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider">Close Panel</button>
               <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <ShieldCheck size={12} />
                  {['ORGANIZATION', 'LINES', 'WORKSTATIONS', 'ENTERPRISE'].includes(activeCategory || '') ? 'MASTER_DATA_CRUD_V1' : 'READ_ONLY_SCAFFOLD_V1'}
               </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};