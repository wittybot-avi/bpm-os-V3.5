import React, { useContext, useState, useEffect } from 'react';
import { UserContext, UserRole, NavView } from '../types';
import { 
  ShieldAlert, 
  Factory, 
  Settings, 
  Globe, 
  Users, 
  Edit2,
  Plus,
  RefreshCw,
  Lock,
  History,
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
  Filter
} from 'lucide-react';
import { StageStateBanner } from './StageStateBanner';
import { PreconditionsPanel } from './PreconditionsPanel';
import { DisabledHint } from './DisabledHint';
import { getMockS0Context, S0Context, SystemFeatureFlag } from '../stages/s0/s0Contract';
import { getS0ActionState, S0ActionId } from '../stages/s0/s0Guards';
import { emitAuditEvent, getAuditEvents, AuditEvent } from '../utils/auditEvents';

interface SystemSetupProps {
  onNavigate?: (view: NavView) => void;
}

export const SystemSetup: React.FC<SystemSetupProps> = ({ onNavigate }) => {
  const { role } = useContext(UserContext);
  
  // Local State for Simulation
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

    const flag = s0Context.featureFlags.find(f => f.id === flagId);
    emitAuditEvent({
      stageId: 'S0',
      actionId: 'EDIT_PLANT_DETAILS',
      actorRole: role,
      message: `Toggled feature flag: ${flag?.label} to ${!flag?.isEnabled ? 'ON' : 'OFF'}`
    });
  };

  const handleNavToS1 = () => {
    if (onNavigate) onNavigate('sku_blueprint');
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
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
           <p className="text-slate-500 text-sm mt-1">Definition of authorized manufacturing capabilities and system topology.</p>
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

      <StageStateBanner stageId="S0" />
      <PreconditionsPanel stageId="S0" />

      {/* Configuration Milestone Guidance */}
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
        <div className="flex gap-3 w-full sm:w-auto">
           <button 
             onClick={handleNavToS1} 
             disabled={!isReadyForNext}
             className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
           >
             <Cpu size={14} /> SKU Master (S1)
           </button>
        </div>
      </div>

      {/* Capability Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isSimulating ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* 1. Plant Capabilities */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Factory size={20} className="text-brand-600" />
              <h2 className="font-bold">Plant Capabilities</h2>
            </div>
            <button 
              onClick={handleEditPlant}
              className="text-[10px] font-bold text-brand-600 hover:text-brand-800"
            >
              PROVISION
            </button>
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
                     <span key={cap} className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 rounded">
                       {cap}
                     </span>
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
              <h2 className="font-bold">Line Capabilities</h2>
            </div>
            <button className="text-[10px] font-bold text-brand-600 hover:text-brand-800">
              CONFIGURE
            </button>
          </div>

          <div className="space-y-3 flex-1">
             {s0Context.lines.map(line => (
               <div key={line.lineId} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800 text-xs">{line.name}</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded font-bold uppercase">{line.type}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                        <span>Provisioned Nodes:</span>
                        <span className="font-mono font-bold text-slate-700">{line.workstations.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Max Throughput Potential:</span>
                        <span className="font-mono font-bold text-slate-700">24 u/hr</span>
                    </div>
                  </div>
               </div>
             ))}
             <button className="w-full py-2 border-2 border-dashed border-slate-200 rounded text-[10px] font-bold text-slate-400 hover:text-brand-600 transition-colors">
                + REGISTER NEW LINE PROFILE
             </button>
          </div>
        </div>

        {/* 3. System Capability Flags (NEW) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col md:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Zap size={20} className="text-brand-600" />
              <h2 className="font-bold">System Capability Flags</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
               <ShieldCheck size={12} /> Root Auth Required to Toggle
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {s0Context.featureFlags.map(flag => (
               <div 
                 key={flag.id} 
                 className={`p-4 rounded-lg border transition-all ${
                   flag.isEnabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'
                 }`}
               >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{flag.label}</span>
                        <span className={`text-[8px] px-1 py-0.5 rounded font-bold border ${
                          flag.scope === 'GLOBAL' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          flag.scope === 'PLANT' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {flag.scope}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{flag.id}</div>
                    </div>
                    <button 
                      onClick={() => handleToggleFlag(flag.id)}
                      disabled={role !== UserRole.SYSTEM_ADMIN}
                      className={`transition-colors focus:outline-none ${role !== UserRole.SYSTEM_ADMIN ? 'cursor-not-allowed' : ''}`}
                    >
                      {flag.isEnabled ? (
                        <ToggleRight className="text-brand-600" size={24} />
                      ) : (
                        <ToggleLeft className="text-slate-300" size={24} />
                      )}
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
              <h2 className="font-bold">Workstation Capabilities</h2>
            </div>
          </div>

          <div className="space-y-4 flex-1">
             <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck size={14} className="text-green-600" />
                   <span className="text-xs font-bold text-slate-700 uppercase">Authorized Gating Logic</span>
                </div>
                <div className="space-y-1">
                   <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Scan-to-Proceed</span>
                      <span className="text-green-600 font-bold">SUPPORTED</span>
                   </div>
                   <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Torque-Tool Interlock</span>
                      <span className="text-green-600 font-bold">SUPPORTED</span>
                   </div>
                   <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Automatic EOL Rejection</span>
                      <span className="text-slate-300 font-bold italic">PLANNED</span>
                   </div>
                </div>
             </div>
             
             <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                   <Layout size={14} className="text-brand-600" />
                   <span className="text-xs font-bold text-slate-700 uppercase">Station Sequence Templates</span>
                </div>
                <div className="flex flex-wrap gap-2">
                   <span className="px-2 py-0.5 bg-white border border-slate-200 text-[9px] text-slate-600 rounded">Standard LFP-48V Flow</span>
                   <span className="px-2 py-0.5 bg-white border border-slate-200 text-[9px] text-slate-600 rounded">High Voltage (NMC) Flow</span>
                </div>
             </div>
          </div>
        </div>

        {/* 5. Device Class Capabilities */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Activity size={20} className="text-brand-600" />
              <h2 className="font-bold">Device Class Capabilities</h2>
            </div>
            <button className="text-[10px] font-bold text-brand-600 hover:text-brand-800">
              MANAGE CLASSES
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
             <div className="flex justify-between p-2 bg-slate-50 border border-slate-100 rounded text-xs">
                <span className="font-bold text-slate-700">BARCODE_SCANNER</span>
                <span className="text-slate-500 font-mono">USB / REST</span>
             </div>
             <div className="flex justify-between p-2 bg-slate-50 border border-slate-100 rounded text-xs">
                <span className="font-bold text-slate-700">DIGITAL_SCALE</span>
                <span className="text-slate-500 font-mono">MQTT</span>
             </div>
             <div className="flex justify-between p-2 bg-slate-50 border border-slate-100 rounded text-xs">
                <span className="font-bold text-slate-700">PLC_INTERLOCK</span>
                <span className="text-slate-500 font-mono">MODBUS-TCP</span>
             </div>
             <div className="flex justify-between p-2 bg-slate-50 border border-slate-100 rounded text-xs">
                <span className="font-bold text-slate-700">TORQUE_TOOL_BT</span>
                <span className="text-slate-300 font-mono">BTLE (Pending)</span>
             </div>
          </div>
        </div>

      </div>
      
      {/* Regulatory & Identity Sovereignty */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Globe size={20} className="text-brand-600" />
              <h2 className="font-bold">Regulatory & Sovereignty Compliance</h2>
            </div>
            <button 
              onClick={handleSyncRegs}
              className="text-[10px] font-bold text-brand-600"
            >
              SYNC MASTER
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
             <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex-1 min-w-[200px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Identity Sovereignty</span>
                <span className="text-sm font-bold text-slate-800">BATT-AADHAAR-V1</span>
                <p className="text-[10px] text-slate-500 mt-1">Authorized for national trace reporting.</p>
             </div>
             <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex-1 min-w-[200px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Safety Standard</span>
                <span className="text-sm font-bold text-slate-800">AIS-156 AMD 3</span>
                <p className="text-[10px] text-slate-500 mt-1">Gated validation for module welding.</p>
             </div>
             <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex-1 min-w-[200px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Passport Schema</span>
                <span className="text-sm font-bold text-slate-800">EU-2023/1542</span>
                <p className="text-[10px] text-slate-500 mt-1">Authorized for export carbon reporting.</p>
             </div>
          </div>
      </div>

      {/* User Capability Matrix */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-industrial-border">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <Users size={20} className="text-brand-600" />
            <h2 className="font-bold">User Capability Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Role Entity</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">System Access Scope</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Authorized Nodes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-4 py-3 font-bold">System Admin</td>
                  <td className="px-4 py-3">Global Configuration & Capability Provisioning</td>
                  <td className="px-4 py-3 font-mono text-right">GLOBAL</td>
                </tr>
                 <tr>
                  <td className="px-4 py-3 font-bold">Management</td>
                  <td className="px-4 py-3">Performance Audit & Operational Oversight</td>
                  <td className="px-4 py-3 font-mono text-right">PLANT_SCOPE</td>
                </tr>
                 <tr>
                  <td className="px-4 py-3 font-bold">Operator</td>
                  <td className="px-4 py-3">Task Execution & SOP Compliance</td>
                  <td className="px-4 py-3 font-mono text-right">ASSIGNED_NODES</td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};