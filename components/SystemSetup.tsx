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
  Cpu
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
        message: 'Updated facility configuration timestamp'
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
        message: `Provisioned new production line (Total: ${s0Context.activeLines + 1})`
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
        message: 'Synchronized regulatory definitions from cloud'
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
        message: `Published SOP Revision ${nextVer}`
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
        message: 'Navigated to S1: SKU & Blueprint from S0'
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
        <p>Your role ({role}) does not have permission to view System Setup.</p>
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
      {/* Standard Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              System Setup <span className="text-slate-300">/</span> Overview
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Settings className="text-brand-600" size={24} />
             System Setup (S0)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Plant configuration, regulatory context, and user registry.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded text-xs font-bold border border-amber-200">
            READ ONLY MODE
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Database size={10} /> Context Loaded: {s0Context.status}
          </div>
        </div>
      </div>

      <StageStateBanner stageId="S0" />
      <PreconditionsPanel stageId="S0" />

      {/* Recent Local Activity Panel */}
      {localEvents.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-6 animate-in slide-in-from-top-2">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
              <History size={14} /> Recent S0 Activity (Session)
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
                ? "System configuration is valid. Proceed to Product Definition (S1) to define SKUs and blueprints." 
                : "Configuration pending. Complete S0 setup actions to unlock downstream stages."}
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
               <Cpu size={14} /> Go to S1: Blueprint
             </button>
             {!isReadyForNext && (
                <span className="text-[9px] text-red-500 mt-1 font-medium">Preconditions Not Met</span>
             )}
           </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* Plant Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-brand-700">
              <Factory size={20} />
              <h2 className="font-bold">Plant / Facility Overview</h2>
            </div>
            <button 
              disabled={!editPlantState.enabled}
              onClick={handleEditPlant}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-brand-600 font-medium transition-colors"
              title={editPlantState.reason}
            >
              <Edit2 size={12} /> Edit
            </button>
          </div>
          
          <div className="space-y-3 text-sm flex-1">
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Facility Name</span>
                <span className="font-medium text-slate-800">{s0Context.plantName}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-800">{s0Context.region}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Facility ID</span>
                <span className="font-mono text-slate-600">{s0Context.plantId}</span>
             </div>
             <div className="flex justify-between pt-1">
                <span className="text-slate-500">Config Last Updated</span>
                <span className="font-mono text-xs text-slate-400">{s0Context.configLastUpdated}</span>
             </div>
          </div>
          
          {!editPlantState.enabled && (
             <DisabledHint reason={editPlantState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

        {/* Manufacturing Lines */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-brand-700">
              <Settings size={20} />
              <h2 className="font-bold">Manufacturing Lines</h2>
            </div>
            <button 
              disabled={!manageLinesState.enabled}
              onClick={handleAddLine}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-medium transition-colors border border-transparent disabled:border-slate-200"
              title={manageLinesState.reason}
            >
              <Plus size={12} /> Add Line
            </button>
          </div>

          <div className="space-y-3 flex-1">
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                <span className="font-medium text-slate-700">Pack Assembly Line A</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">ACTIVE</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 opacity-75">
                <span className="font-medium text-slate-700">Module Assembly Line B</span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full font-bold">MAINTENANCE</span>
             </div>
             {s0Context.activeLines > 2 && (
               <div className="p-2 text-center text-xs text-slate-500 italic bg-slate-50 rounded border border-dashed border-slate-200">
                 + {s0Context.activeLines - 2} Additional Lines Provisioned
               </div>
             )}
          </div>

          {!manageLinesState.enabled && (
             <DisabledHint reason={manageLinesState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

        {/* Regulatory Context */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
           <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-brand-700">
              <Globe size={20} />
              <h2 className="font-bold">Regulatory Context</h2>
            </div>
            <button 
              disabled={!updateRegsState.enabled}
              onClick={handleSyncRegs}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors"
              title={updateRegsState.reason}
            >
              <RefreshCw size={12} /> Sync
            </button>
          </div>

          <div className="flex flex-wrap gap-2 flex-1 content-start">
             <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">AIS-156 Amd 3</span>
             <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">EU Battery Reg 2023/1542</span>
             <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">PLI Scheme Compliant</span>
             <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-semibold">Battery Aadhaar Enabled</span>
          </div>

          {!updateRegsState.enabled && (
             <DisabledHint reason={updateRegsState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

        {/* SOP Version & Governance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
           <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-brand-700">
              <FileText size={20} />
              <h2 className="font-bold">SOP Governance</h2>
            </div>
            <button 
              disabled={!syncSopState.enabled}
              onClick={handlePublishSOP}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 font-medium transition-colors"
              title={syncSopState.reason}
            >
              <Lock size={12} /> Publish
            </button>
          </div>

           <div className="space-y-3 text-sm flex-1">
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Active SOP Version</span>
                <span className="font-mono font-bold text-brand-600">{APP_VERSION}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Internal Revision</span>
                <span className="font-mono text-slate-600">{s0Context.activeSopVersion}</span>
             </div>
             <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Last Audit</span>
                <span className="font-medium text-slate-800">2025-12-15</span>
             </div>
          </div>

          {!syncSopState.enabled && (
             <DisabledHint reason={syncSopState.reason || 'Blocked'} className="mt-3 justify-end" />
          )}
        </div>

      </div>
      
      {/* Role Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
          <div className="flex items-center gap-2 mb-4 text-brand-700">
            <Users size={20} />
            <h2 className="font-bold">User Role Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Access Level</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Active Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 text-slate-800 font-medium">System Admin</td>
                  <td className="px-4 py-3 text-slate-600">Full Access</td>
                  <td className="px-4 py-3 font-mono text-right">1</td>
                </tr>
                 <tr>
                  <td className="px-4 py-3 text-slate-800 font-medium">Management</td>
                  <td className="px-4 py-3 text-slate-600">Read / Audit</td>
                  <td className="px-4 py-3 font-mono text-right">2</td>
                </tr>
                 <tr>
                  <td className="px-4 py-3 text-slate-800 font-medium">Operator</td>
                  <td className="px-4 py-3 text-slate-600">Execution Only</td>
                  <td className="px-4 py-3 font-mono text-right">14</td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};
