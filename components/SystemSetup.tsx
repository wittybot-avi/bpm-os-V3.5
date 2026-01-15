import React, { useContext, useState, useEffect } from 'react';
import { UserContext, UserRole, APP_VERSION, NavView } from '../types';
import { 
  ShieldAlert, 
  Factory, 
  Settings, 
  FileText, 
  Globe, 
  Users, 
  Database,
  Edit2,
  Plus,
  RefreshCw,
  Lock,
  History,
  CheckCircle2,
  ArrowRight,
  Radar,
  Cpu,
  Layout,
  Server
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { DisabledHint } from './DisabledHint';
import { getMockS0Context, S0Context } from '../stages/s0/s0Contract';
import { getS0ActionState, S0ActionId } from '../stages/s0/s0Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';

interface SystemSetupProps {
  onNavigate?: (view: NavView) => void;
}

export const SystemSetup: React.FC<SystemSetupProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Local State for Simulation (instead of static mock)
  const [s0Context, setS0Context] = useState<S0Context>(getMockS0Context());
  const [localEvents, setLocalEvents] = useState<AuditEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load events on mount
  useEffect(() => {
    setLocalEvents(getAuditEvents().filter(e => e.stageId === 'S0'));
  }, []);

  // Helper to resolve action state for UI
  const getAction = (actionId: S0ActionId) => getS0ActionState(role, s0Context, actionId);

  // Action Handlers
  const handleEditPlant = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS0Context(prev => ({ ...prev, configLastUpdated: now }));
      
      const evt = emitAuditEvent({
        stageId: 'S0',
        actionId: 'EDIT_PLANT_DETAILS',
        actorRole: role,
        message: 'Updated facility configuration hierarchy'
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 600);
  };

  const handleAddLine = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setS0Context(prev => ({ ...prev, activeLines: prev.activeLines + 1 }));
      
      const evt = emitAuditEvent({
        stageId: 'S0',
        actionId: 'MANAGE_LINES',
        actorRole: role,
        message: `Provisioned new manufacturing line configuration (Total: ${s0Context.activeLines + 1})`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 800);
  };

  const handleSyncRegs = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' IST';
      setS0Context(prev => ({ ...prev, configLastUpdated: now }));

      const evt = emitAuditEvent({
        stageId: 'S0',
        actionId: 'UPDATE_REGULATIONS',
        actorRole: role,
        message: 'Synchronized regulatory master definitions'
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1000);
  };

  const handlePublishSOP = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const nextVer = s0Context.activeSopVersion.split('-')[0] + '-RC' + (parseInt(s0Context.activeSopVersion.split('-RC')[1] || '1') + 1);
      setS0Context(prev => ({ ...prev, activeSopVersion: nextVer }));

      const evt = emitAuditEvent({
        stageId: 'S0',
        actionId: 'SYNC_SOP',
        actorRole: role,
        message: `Locked System Baseline Version ${nextVer}`
      });
      setLocalEvents(prev => [evt, ...prev]);
      setIsSimulating(false);
    }, 1200);
  };

  const handleNavToS1 = () => {
    if (onNavigate) {
      emitAuditEvent({
        stageId: 'S0',
        actionId: 'NAV_NEXT_STAGE',
        actorRole: role,
        message: 'Navigated to S1: SKU Master from S0 Configuration'
      });
      onNavigate('sku_blueprint');
    }
  };

  const handleNavToControlTower = () => {
    if (onNavigate) {
      onNavigate('control_tower');
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

  // Pre-calculate action states
  const editPlantState = getAction('EDIT_PLANT_DETAILS');
  const manageLinesState = getAction('MANAGE_LINES');
  const updateRegsState = getAction('UPDATE_REGULATIONS');
  const syncSopState = getAction('SYNC_SOP');

  const isReadyForNext = s0Context.status === 'READY';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Configuration Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              Master Data <span className="text-slate-300">/</span> System Topology
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Settings className="text-brand-600" size={24} />
             System Configuration (S0)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Authorized plant topology, capability matrix, and regulatory foundations.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-[10px] font-bold border border-slate-200 uppercase tracking-widest">
            Configuration Layer
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Server size={10} /> Node State: {s0Context.status}
          </div>
        </div>
      </div>

      <StageStateBanner stageId="S0" />
      <PreconditionsPanel stageId="S0" />

      {/* Recent Config Activity Panel */}
      {localEvents.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-6 animate-in slide-in-from-top-2">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
              <History size={14} /> System Configuration Log
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

      {/* Configuration Milestone Guidance */}
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-3 ${!onNavigate ? 'hidden' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full text-blue-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-sm">Configuration Milestone</h3>
            <p className="text-xs text-blue-700 mt-1 max-w-lg">
              {isReadyForNext 
                ? "Plant topology is validated. You may now define technical SKU specifications in Product Master (S1)." 
                : "Base configuration is incomplete. Define required facility parameters to unlock product definition."}
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
               onClick={handleNavToS1} 
               disabled={!isReadyForNext}
               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
             >
               <Cpu size={14} /> Open SKU Master (S1)
             </button>
             {!isReadyForNext && (
                <span className="text-[9px] text-red-500 mt-1 font-medium">Config Incomplete</span>
             )}
           </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* Plant Hierarchy */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Factory size={20} />
              <h2 className="font-bold">Facility Hierarchy</h2>
            </div>
            <button 
              disabled={!editPlantState.enabled}
              onClick={handleEditPlant}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-brand-600 font-bold transition-colors"
              title={editPlantState.reason}
            >
              <Edit2 size={12} /> PROVISION
            </button>
          </div>
          
          <div className="space-y-3 text-sm flex-1">
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Identity</span>
                <span className="font-medium text-slate-800">{s0Context.plantName}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Node Location</span>
                <span className="font-medium text-slate-800">{s0Context.region}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Master Record ID</span>
                <span className="font-mono text-slate-600 text-xs">{s0Context.plantId}</span>
             </div>
             <div className="flex justify-between pt-1">
                <span className="text-slate-500">Last Baseline Update</span>
                <span className="font-mono text-[10px] text-slate-400">{s0Context.configLastUpdated}</span>
             </div>
          </div>
          
          {!editPlantState.enabled && (
             <DisabledHint reason={editPlantState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

        {/* Manufacturing Line Definitions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Layout size={20} />
              <h2 className="font-bold">Manufacturing Topology</h2>
            </div>
            <button 
              disabled={!manageLinesState.enabled}
              onClick={handleAddLine}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-bold transition-colors border border-transparent disabled:border-slate-200"
              title={manageLinesState.reason}
            >
              <Plus size={12} /> ADD LINE CONFIG
            </button>
          </div>

          <div className="space-y-3 flex-1">
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                <div>
                   <div className="font-bold text-slate-700 text-xs">Pack Assembly Line A</div>
                   <div className="text-[10px] text-slate-400">UID: LINE-A | Capability: LFP/NMC</div>
                </div>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold">READY</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 opacity-75">
                <div>
                   <div className="font-bold text-slate-700 text-xs">Module Assembly Line B</div>
                   <div className="text-[10px] text-slate-400">UID: LINE-B | Capability: PRISMATIC</div>
                </div>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] rounded-full font-bold">LOCKED</span>
             </div>
             {s0Context.activeLines > 2 && (
               <div className="p-2 text-center text-[10px] text-slate-500 font-bold uppercase bg-slate-50 rounded border border-dashed border-slate-200">
                 + {s0Context.activeLines - 2} Additional Definitions Provisioned
               </div>
             )}
          </div>

          {!manageLinesState.enabled && (
             <DisabledHint reason={manageLinesState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

        {/* Regulatory Definitions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
           <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Globe size={20} />
              <h2 className="font-bold">Regulatory Framework</h2>
            </div>
            <button 
              disabled={!updateRegsState.enabled}
              onClick={handleSyncRegs}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 font-bold transition-colors"
              title={updateRegsState.reason}
            >
              <RefreshCw size={12} /> SYNC MASTER
            </button>
          </div>

          <div className="flex flex-wrap gap-2 flex-1 content-start">
             <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">AIS-156 Amd 3</span>
             <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">EU-2023/1542</span>
             <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">PLI-ELIGIBLE</span>
             <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold uppercase">BATT-AADHAAR-V1</span>
          </div>

          {!updateRegsState.enabled && (
             <DisabledHint reason={updateRegsState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

        {/* System Baseline */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
           <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <FileText size={20} />
              <h2 className="font-bold">System Baseline</h2>
            </div>
            <button 
              disabled={!syncSopState.enabled}
              onClick={handlePublishSOP}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-bold transition-colors shadow-sm"
              title={syncSopState.reason}
            >
              <Lock size={12} /> FREEZE CONFIG
            </button>
          </div>

           <div className="space-y-3 text-sm flex-1">
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Active SOP Release</span>
                <span className="font-mono font-bold text-brand-600">{APP_VERSION}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Topology Revision</span>
                <span className="font-mono text-slate-600 text-xs">{s0Context.activeSopVersion}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Config Maturity</span>
                <span className="font-bold text-green-600 text-[10px] uppercase">Validated</span>
             </div>
          </div>

          {!syncSopState.enabled && (
             <DisabledHint reason={syncSopState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

      </div>
      
      {/* Role Configuration Map */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <Users size={20} />
            <h2 className="font-bold">User Capability Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Role Entity</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">System Access Scope</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Provisioned Nodes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-4 py-3 font-bold">System Admin</td>
                  <td className="px-4 py-3">Authored Configuration / Topology Control</td>
                  <td className="px-4 py-3 font-mono text-right">GLOBAL</td>
                </tr>
                 <tr>
                  <td className="px-4 py-3 font-bold">Management</td>
                  <td className="px-4 py-3">Performance Audit / Topology Oversight</td>
                  <td className="px-4 py-3 font-mono text-right">PLANT-1</td>
                </tr>
                 <tr>
                  <td className="px-4 py-3 font-bold">Operator</td>
                  <td className="px-4 py-3">Task Execution / SOP Compliance</td>
                  <td className="px-4 py-3 font-mono text-right">STATION-LEVEL</td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};