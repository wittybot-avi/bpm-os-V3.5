
import React, { useEffect, useState } from 'react';
import { Truck, Package, Activity, ArrowRight, LayoutList } from 'lucide-react';
import { NavView } from '../types';
import { S3Receipt, ReceiptState, getReceiptNextActions } from '../stages/s3/contracts';
import { s3ListReceipts, s3GetActiveReceipt, s3SetActiveReceipt } from '../sim/api/s3/s3Inbound.handlers';

interface InboundReceiptProps {
  onNavigate?: (view: NavView) => void;
}

export const InboundReceipt: React.FC<InboundReceiptProps> = ({ onNavigate }) => {
  const [receipts, setReceipts] = useState<S3Receipt[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<S3Receipt | undefined>(undefined);
  // Simple force-update mechanism for demo interactivity when store changes
  const [refreshKey, setRefreshKey] = useState(0);

  // Initial load and sync
  useEffect(() => {
    setReceipts(s3ListReceipts());
    setActiveReceipt(s3GetActiveReceipt());
  }, [refreshKey]);

  const handleSelectReceipt = (id: string) => {
    s3SetActiveReceipt(id);
    setRefreshKey(k => k + 1);
  };

  const getStatusColor = (state: ReceiptState) => {
    switch (state) {
      case ReceiptState.DRAFT: return 'bg-slate-100 text-slate-700 border-slate-200';
      case ReceiptState.RECEIVING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ReceiptState.SERIALIZATION_IN_PROGRESS: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case ReceiptState.QC_PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ReceiptState.ACCEPTED: return 'bg-green-100 text-green-700 border-green-200';
      case ReceiptState.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      case ReceiptState.CLOSED: return 'bg-slate-800 text-slate-200 border-slate-700';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-4">
        <div>
           <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
              Procurement <span className="text-slate-300">/</span> Inbound
           </div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Truck className="text-brand-600" size={24} />
             Inbound Receipt & Serialization (S3)
           </h1>
           <p className="text-slate-500 text-sm mt-1">Manage material intake, unique serialization, and initial quality checks.</p>
        </div>
      </div>

      {/* Banner */}
      {activeReceipt && (
        <div className="bg-white border border-blue-200 bg-blue-50 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full border border-blue-200">
                    <Package size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{activeReceipt.code}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getStatusColor(activeReceipt.state)}`}>
                            {activeReceipt.state.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span>{activeReceipt.lines.length} Line Items</span>
                        {activeReceipt.invoiceNo && (
                            <>
                                <span className="text-slate-400">|</span>
                                <span className="font-mono text-xs">{activeReceipt.invoiceNo}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Recommended Action</div>
                <div className="flex items-center gap-2 text-brand-700 font-bold">
                    {getReceiptNextActions(activeReceipt.state)}
                    <ArrowRight size={16} />
                </div>
            </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Left: Receipts List */}
          <div className="col-span-4 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <LayoutList size={16} /> Receipts
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{receipts.length} Active</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {receipts.map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => handleSelectReceipt(r.id)}
                        className={`p-3 rounded-md cursor-pointer border transition-all ${
                            activeReceipt?.id === r.id 
                            ? 'bg-brand-50 border-brand-200 shadow-sm' 
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                          <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-700 text-sm">{r.code}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${getStatusColor(r.state)}`}>
                                  {r.state.replace(/_/g, ' ')}
                              </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                              PO: {r.poId || 'N/A'} • {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                      </div>
                  ))}
                  {receipts.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm italic">
                          No receipts found.
                      </div>
                  )}
              </div>
          </div>

          {/* Right: Detail Placeholder */}
          <div className="col-span-8 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              {activeReceipt ? (
                  <div className="flex-1 p-8 flex flex-col items-center justify-center text-slate-400">
                      <div className="p-6 rounded-full bg-slate-50 mb-4">
                        <Activity size={48} className="opacity-20 text-slate-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                          Viewing <strong>{activeReceipt.code}</strong>
                      </p>
                      <p className="text-xs mt-2 opacity-60 max-w-md text-center">
                          Select an action from the toolbar or review line items. 
                          Detailed processing view coming in next update.
                      </p>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                      <LayoutList size={48} className="opacity-10" />
                      <span className="text-sm font-medium">Select a receipt to view details</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
