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
  // Fix: Added missing Info and Save icons from lucide-react
  Info,
  Save
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { getMockS0Context, S0Context } from '../stages/s0/s0Contract';
import { getS0ActionState, S0ActionId } from '../stages/s0/s0Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';
import { apiFetch } from '../services/apiHarness';
import type { Plant } from '../domain/s0/systemTopology.types';

interface SystemSetupProps {
  onNavigate?: (view: NavView) => void;
}

const ScopeBadge: React.FC<{ scope: string }> = ({ scope }) => (
  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-50 text-slate-400 border-slate-200 tracking-tighter shrink-0">
    {scope.toUpperCase()}
  </span>
);

type ManageCategory = 'ORGANIZATION' | 'LINES' | 'WORKSTATIONS' | 'DEVICES' | 'REGULATORY' | 'USERS' | null;

export const SystemSetup: React.FC<SystemSetupProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Local State
  const [s0Context, setS0Context] = useState<S0Context>(getMockS0Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Drawer State
  const [activeCategory, setActiveCategory] = useState<ManageCategory>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DETAILS'>('LIST');

  // Plant CRUD State
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isPlantsLoading, setIsPlantsLoading] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Partial<Plant> | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Topology State
  const [topology, setTopology] = useState<{
    enterprise?: any;
    plant?: any;
    line?: any;
    station?: any;
  }>({});
  const [isTopologyLoading, setIsTopologyLoading] = useState(true);

  const fetchTopology = async () => {
    setIsTopologyLoading(true);
    try {
      const entRes = await apiFetch('/api/s0/enterprises');
      const entData = await entRes.json();
      const activeEnt = entData.data?.[0];

      if (activeEnt) {
        const plantRes = await apiFetch(`/api/s0/plants?enterpriseId=${activeEnt.id}`);
        const plantData = await plantRes.json();
        const activePlant = plantData.data?.[0];

        if (activePlant) {
          const lineRes = await apiFetch(`/api/s0/lines?plantId=${activePlant.id}`);
          const lineData = await lineRes.json();
          const activeLine = lineData.data?.[0];

          if (activeLine) {
            const stRes = await apiFetch(`/api/s0/stations?lineId=${activeLine.id}`);
            const stData = await stRes.json();
            const activeStation = stData.data?.[0];

            setTopology({
              enterprise: activeEnt,
              plant: activePlant,
              line: activeLine,
              station: activeStation
            });
          } else {
            setTopology({ enterprise: activeEnt, plant: activePlant });
          }
        } else {
          setTopology({ enterprise: activeEnt });
        }
      }
    } catch (e) {
      console.error("Failed to fetch topology context:", e);
    } finally {
      setIsTopologyLoading(false);
    }
  };

  const fetchPlants = async () => {
    setIsPlantsLoading(true);
    try {
      const res = await apiFetch('/api/s0/plants');
      const result = await res.json();
      if (result.ok) {
        setPlants(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch plants", e);
    } finally {
      setIsPlantsLoading(false);
    }
  };

  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S0'));
    fetchTopology();
  }, []);

  useEffect(() => {
    if (activeCategory === 'ORGANIZATION') {
      fetchPlants();
    }
  }, [activeCategory]);

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
  };

  const closeManager = () => {
    setActiveCategory(null);
    setEditingPlant(null);
  };

  const handleCreateOrUpdatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlant || isFormSubmitting) return;
    setIsFormSubmitting(true);

    try {
      const isEdit = !!editingPlant.id;
      const endpoint = isEdit ? '/api/s0/plants/update' : '/api/s0/plants/create';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit ? { id: editingPlant.id, updates: editingPlant } : editingPlant;

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(body)
      });
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
        fetchPlants();
        fetchTopology(); // Refresh the context bar
      }
    } catch (err) {
      console.error("Plant save failure", err);
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
        fetchPlants();
        fetchTopology();
      }
    } catch (e) {
      console.error("Suspend failed", e);
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
        <div className="bg-white border border-industrial-border rounded-lg p-3 shadow-sm flex flex-wrap items-center gap-6 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2 px-2 border-r border-slate-100 last:border-0 pr-4">
              <Building2 size={16} className="text-slate-400" />
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Enterprise</div>
                <div className="text-xs font-bold text-slate-700">{isTopologyLoading ? '...' : topology.enterprise?.displayName || 'N/A'}</div>
              </div>
          </div>
          <div className="flex items-center gap-2 px-2 border-r border-slate-100 last:border-0 pr-4">
              <Factory size={16} className="text-slate-400" />
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Plant</div>
                <div className="text-xs font-bold text-slate-700">{isTopologyLoading ? '...' : topology.plant?.displayName || 'N/A'}</div>
              </div>
          </div>
          <div className="flex items-center gap-2 px-2 border-r border-slate-100 last:border-0 pr-4">
              <Layout size={16} className="text-slate-400" />
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Line</div>
                <div className="text-xs font-bold text-slate-700">{isTopologyLoading ? '...' : topology.line?.displayName || 'N/A'}</div>
              </div>
          </div>
          <div className="flex items-center gap-2 px-2 border-r border-slate-100 last:border-0 pr-4">
              <Box size={16} className="text-brand-500" />
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Primary Station</div>
                <div className="text-xs font-bold text-slate-700">{isTopologyLoading ? '...' : topology.station?.displayName || 'N/A'}</div>
              </div>
          </div>
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
                      <span className="font-mono text-slate-700">{s0Context.plantId}</span>
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
               {s0Context.lines.map(line => (
                 <div key={line.lineId} className="p-3 bg-slate-50 rounded border border-slate-200 text-[10px]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-xs">{line.name}</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase">{line.type}</span>
                    </div>
                    <div className="flex justify-between"><span>Provisioned Nodes:</span><span className="font-mono font-bold">{line.workstations.length}</span></div>
                 </div>
               ))}
               <button className="w-full py-2 border-2 border-dashed border-slate-200 rounded text-[10px] font-bold text-slate-400 hover:text-brand-600 transition-colors">+ REGISTER NEW LINE</button>
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
               <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="flex items-center gap-2 mb-2"><ShieldCheck size={14} className="text-green-600" /><span className="text-xs font-bold text-slate-700 uppercase">Authorized Gating</span></div>
                  <div className="space-y-1 text-[10px] text-slate-500">
                     <div className="flex justify-between"><span>Scan-to-Proceed</span><span className="text-green-600 font-bold">SUPPORTED</span></div>
                     <div className="flex justify-between"><span>Torque-Tool Interlock</span><span className="text-green-600 font-bold">SUPPORTED</span></div>
                  </div>
               </div>
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

      {/* SCAFFOLDED MANAGEMENT DRAWER (V35-S0-CRUD-BP-10) */}
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
                    <h2 className="font-bold text-slate-800">Manage {activeCategory === 'ORGANIZATION' ? 'Plants' : activeCategory}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Data Management</p>
                  </div>
               </div>
               <button onClick={closeManager} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 shrink-0">
               <button 
                 onClick={() => { setActiveTab('LIST'); setEditingPlant(null); }}
                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'LIST' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 bg-slate-50'}`}
               >
                 <List size={14} /> Repository List
               </button>
               <button 
                 onClick={() => setActiveTab('DETAILS')}
                 disabled={activeCategory !== 'ORGANIZATION'}
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
                       {isPlantsLoading ? (
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
                                   <button 
                                      onClick={() => { setEditingPlant(p); setActiveTab('DETAILS'); }}
                                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                      title="Edit Definition"
                                   >
                                      <Edit2 size={14} />
                                   </button>
                                   {p.status === 'ACTIVE' && (
                                     <button 
                                        onClick={() => handleSuspendPlant(p.id)}
                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                        title="Suspend Capability"
                                     >
                                        <Ban size={14} />
                                     </button>
                                   )}
                                </div>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   ) : (
                     <form onSubmit={handleCreateOrUpdatePlant} className="p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-brand-50 rounded text-brand-600"><Factory size={18} /></div>
                           <h3 className="font-bold text-slate-700">{editingPlant?.id ? 'Edit Plant Definition' : 'Add New Plant Entity'}</h3>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plant Display Name</label>
                              <input 
                                required
                                type="text"
                                className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="e.g. Gigafactory 2 - Mumbai"
                                value={editingPlant?.displayName || ''}
                                onChange={e => setEditingPlant(p => ({ ...p!, displayName: e.target.value }))}
                              />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plant Code</label>
                                 <input 
                                    required
                                    type="text"
                                    className="w-full border border-slate-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono uppercase"
                                    placeholder="PL-MUM-01"
                                    value={editingPlant?.code || ''}
                                    onChange={e => setEditingPlant(p => ({ ...p!, code: e.target.value }))}
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Status</label>
                                 <select 
                                    className="w-full border border-slate-300 rounded p-2.5 text-sm outline-none bg-white"
                                    value={editingPlant?.status || 'ACTIVE'}
                                    onChange={e => setEditingPlant(p => ({ ...p!, status: e.target.value as any }))}
                                 >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                 </select>
                              </div>
                           </div>

                           <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex gap-3 mt-4">
                              {/* Fix: Info icon is now imported */}
                              <Info size={18} className="text-slate-400 shrink-0" />
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Creating a new plant establishes a root node for manufacturing topology. Once active, lines can be provisioned within this facility.
                              </p>
                           </div>
                        </div>

                        <div className="pt-6 flex gap-3">
                           <button 
                              type="button"
                              onClick={() => { setEditingPlant(null); setActiveTab('LIST'); }}
                              className="px-6 py-2.5 rounded text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                           >
                              CANCEL
                           </button>
                           <button 
                              type="submit"
                              disabled={isFormSubmitting}
                              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-sm py-2.5 shadow-sm transition-all flex items-center justify-center gap-2"
                           >
                              {/* Fix: Save icon is now imported */}
                              {isFormSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              {editingPlant?.id ? 'UPDATE DEFINITION' : 'CREATE PLANT ENTITY'}
                           </button>
                        </div>
                     </form>
                   )}
                 </>
               ) : (
                 <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Management Framework Scoped</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
                        The management interface for <strong>{activeCategory}</strong> is wired to the V3.5 Foundation. Entity CRUD forms are coming in the next incremental patch.
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs">
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex flex-col items-center">
                            <Plus size={20} className="text-slate-300 mb-1" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Add Entry</span>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex flex-col items-center">
                            <Settings size={20} className="text-slate-300 mb-1" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Configuration</span>
                        </div>
                    </div>
                 </div>
               )}
            </div>

            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
               <button onClick={closeManager} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider">Close Panel</button>
               <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <ShieldCheck size={12} />
                  {activeCategory === 'ORGANIZATION' ? 'MASTER_DATA_CRUD_V1' : 'READ_ONLY_SCAFFOLD_V1'}
               </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
