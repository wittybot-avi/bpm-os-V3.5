import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, LayoutDashboard, FileText, Copy, Terminal } from 'lucide-react';
import { NavView, PATCH_ID } from '../types';

interface Props {
  children?: ReactNode;
  onNavigate?: (view: NavView) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    this.handleReset();
    if (this.props.onNavigate) {
        this.props.onNavigate('dashboard');
    } else {
        window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                    <ShieldAlert size={32} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-red-900">System Application Error</h1>
                    <p className="text-red-700 mt-1">
                        The application encountered an unexpected state and has suspended execution for safety.
                    </p>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        <Terminal size={14} /> Diagnostic Trace
                    </div>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-auto max-h-64 border border-slate-700 relative group">
                        <button 
                            onClick={() => navigator.clipboard.writeText(this.state.error?.toString() + "\n" + this.state.errorInfo?.componentStack)}
                            className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy Stack Trace"
                        >
                            <Copy size={12} />
                        </button>
                        <div className="text-red-400 font-bold mb-2">
                            {this.state.error?.toString()}
                        </div>
                        <div className="opacity-75 whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                        <span className="text-slate-400 text-xs font-bold uppercase block mb-1">Patch Version</span>
                        <span className="font-mono text-slate-700">{PATCH_ID}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                        <span className="text-slate-400 text-xs font-bold uppercase block mb-1">Session Timestamp</span>
                        <span className="font-mono text-slate-700">{new Date().toISOString()}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center">
                <div className="flex gap-3">
                    <button 
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw size={16} />
                        Try Again
                    </button>
                    <button 
                        onClick={this.handleGoHome}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white border border-brand-700 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm"
                    >
                        <LayoutDashboard size={16} />
                        Return to Dashboard
                    </button>
                </div>
                <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                    <FileText size={16} />
                    Report Issue
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}