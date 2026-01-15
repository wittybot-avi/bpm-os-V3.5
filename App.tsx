import React, { useState, useMemo } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ControlTower } from './components/ControlTower';
import { RunbookDetail } from './components/RunbookDetail';
import { ExceptionsView } from './components/ExceptionsView';
import { SystemSetup } from './components/SystemSetup';
import { SKUBlueprint } from './components/SKUBlueprint';
import { Procurement } from './components/Procurement';
// Import the new S3 screen wrapper
import { S3InboundScreen } from './screens/s3/S3InboundScreen';
import { BatchPlanning } from './components/BatchPlanning';
import { ModuleAssembly } from './components/ModuleAssembly';
import { ModuleQA } from './components/ModuleQA';
import { PackAssembly } from './components/PackAssembly';
import { PackReview } from './components/PackReview';
// Updated S9 Wrapper
import { S9FinalQaScreen } from './screens/s9/S9FinalQaScreen';
import { BMSProvisioning } from './components/BMSProvisioning';
// Updated S11 Wrapper
import { S11DispatchScreen } from './screens/s11/S11DispatchScreen';
import { FinishedGoods } from './components/FinishedGoods';
import { PackagingAggregation } from './components/PackagingAggregation';
import { DispatchAuthorization } from './components/DispatchAuthorization';
import { DispatchExecution } from './components/DispatchExecution';
import { ServiceWarranty } from './components/ServiceWarranty';
import { RecyclingRecovery } from './components/RecyclingRecovery';
import { ComplianceAudit } from './components/ComplianceAudit';
import { Documentation } from './components/Documentation';
import { LiveStatus } from './components/LiveStatus';
import { SystemInventory } from './components/SystemInventory';
import { ProductionLine } from './components/ProductionLine';
import { SystemLogs } from './components/SystemLogs';
import { SystemReports } from './components/SystemReports';
// V34 Diagnostics
import { RegressionSmokePanel } from './screens/debug';
import { UserRole, UserContextType, UserContext, NavView } from './types';
import { canAccess } from './utils/rbac';

const App: React.FC = () => {
  // PP-010: View State
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  
  // EXT-BP-004: Runbook Context State
  const [activeRunbookId, setActiveRunbookId] = useState<string | null>(null);
  
  // BP-002: Dynamic Role State
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.SYSTEM_ADMIN);

  // Derive user identity based on role for demo purposes
  const userContextValue: UserContextType = useMemo(() => {
    return {
      id: `usr_${currentRole.toLowerCase().replace(/ /g, '_')}`,
      name: `${currentRole} User`, // Generic name based on role
      role: currentRole,
      isDemo: true,
      setRole: (role: UserRole) => setCurrentRole(role),
      checkAccess: (featureId: string) => canAccess(currentRole, featureId)
    };
  }, [currentRole]);

  // Handler for deep linking to runbooks
  const handleRunbookNavigation = (runbookId: string) => {
    setActiveRunbookId(runbookId);
    setCurrentView('runbook_detail');
  };

  return (
    <ErrorBoundary onNavigate={setCurrentView}>
      <UserContext.Provider value={userContextValue}>
        <Layout currentView={currentView} onNavigate={setCurrentView}>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'control_tower' && <ControlTower onNavigate={handleRunbookNavigation} onViewExceptions={() => setCurrentView('exceptions_view')} />}
          {currentView === 'runbook_detail' && <RunbookDetail runbookId={activeRunbookId} onNavigate={setCurrentView} />}
          {currentView === 'exceptions_view' && <ExceptionsView onNavigate={setCurrentView} />}
          
          {currentView === 'system_setup' && <SystemSetup onNavigate={setCurrentView} />}
          {currentView === 'sku_blueprint' && <SKUBlueprint onNavigate={setCurrentView} />}
          {currentView === 'procurement' && <Procurement onNavigate={setCurrentView} />}
          {currentView === 'inbound_receipt' && <S3InboundScreen onNavigate={setCurrentView} />}
          {currentView === 'batch_planning' && <BatchPlanning onNavigate={setCurrentView} />}
          {currentView === 'module_assembly' && <ModuleAssembly onNavigate={setCurrentView} />}
          {currentView === 'module_qa' && <ModuleQA onNavigate={setCurrentView} />}
          {currentView === 'pack_assembly' && <PackAssembly onNavigate={setCurrentView} />}
          {currentView === 'pack_review' && <PackReview onNavigate={setCurrentView} />}
          {currentView === 'battery_registry' && <S9FinalQaScreen onNavigate={setCurrentView} />}
          {currentView === 'bms_provisioning' && <BMSProvisioning onNavigate={setCurrentView} />}
          {currentView === 'finished_goods' && <S11DispatchScreen onNavigate={setCurrentView} />}
          {currentView === 'packaging_aggregation' && <PackagingAggregation />}
          {currentView === 'dispatch_authorization' && <DispatchAuthorization />}
          {currentView === 'dispatch_execution' && <DispatchExecution />}
          {currentView === 'service_warranty' && <ServiceWarranty onNavigate={setCurrentView} />}
          {currentView === 'recycling_recovery' && <RecyclingRecovery onNavigate={setCurrentView} />}
          {currentView === 'compliance_audit' && <ComplianceAudit onNavigate={setCurrentView} />}
          {currentView === 'documentation' && <Documentation />}
          {currentView === 'live_status' && <LiveStatus />}
          {currentView === 'system_inventory' && <SystemInventory />}
          {currentView === 'production_line' && <ProductionLine />}
          {currentView === 'system_logs' && <SystemLogs onNavigate={setCurrentView} />}
          {currentView === 'system_reports' && <SystemReports onNavigate={setCurrentView} />}
          
          {/* Debug Views */}
          {currentView === 'debug_smoke' && <RegressionSmokePanel onNavigate={setCurrentView} />}
        </Layout>
      </UserContext.Provider>
    </ErrorBoundary>
  );
};

export default App;