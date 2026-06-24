import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Exception captured by NexTask ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    try {
      // Clear specific items or hard reset
      localStorage.removeItem('nextask_pin');
      localStorage.removeItem('nextask_pin_enabled');
      // Reload page to start fresh
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  private copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const textToCopy = `NexTask Error Diagnostic Report:
Message: ${error.message}
Stack: ${error.stack || 'No Stack Available'}
Component Stack: ${errorInfo?.componentStack || 'No Component Stack'}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unknown Application Error';
      
      return (
        <div id="error-boundary-root" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-slate-800 dark:text-slate-200 font-sans selection:bg-indigo-500/10 transition-colors duration-300">
          <div className="w-full max-w-md space-y-6 text-center">
            {/* Visual Header */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div id="error-pulse-bg" className="absolute inset-0 bg-rose-500/10 rounded-full blur-xl scale-125 animate-pulse" />
                <div id="error-badge-icon" className="relative p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-3xl border border-rose-500/20 shadow-md">
                  <ShieldAlert size={36} />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-[0.2em] font-mono">System Integrity Guard</span>
                <h1 className="text-2xl font-black font-display tracking-tight mt-1 text-slate-900 dark:text-white">Unexpected Failure</h1>
              </div>
            </div>

            {/* Error main description card */}
            <div id="error-desc-card" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-[2rem] shadow-xl text-left space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Diagnostic Verdict</h4>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                  NexTask suffered a critical runtime exception from which it could not recover. Your data is likely protected inside secure caches.
                </p>
              </div>

              {/* Encapsulated error message codeblock */}
              <div className="p-3.5 bg-rose-500/5 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-950/40 text-left">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="font-mono text-xs text-rose-700 dark:text-rose-400 font-medium break-all">{errorMsg}</p>
                </div>
              </div>

              {/* Expandable Technical Details Drawer */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="error-details-toggle"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-850/50 p-2 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <span>{this.state.showDetails ? 'Hide Technical Stack' : 'Show Technical Stack'}</span>
                  {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {this.state.showDetails && (
                  <div id="error-details-content" className="p-4 bg-slate-900/5 dark:bg-black/40 rounded-2xl border border-slate-200/50 dark:border-slate-850/40 font-mono text-[9.5px] leading-relaxed select-all overflow-x-auto max-h-[140px] text-slate-500 dark:text-slate-450 space-y-3">
                    <div className="flex justify-between items-center bg-slate-200/40 dark:bg-slate-900 px-2 py-1 rounded-md">
                      <span className="font-sans font-bold uppercase text-[8px] text-slate-450">Diagnostic String</span>
                      <button
                        type="button"
                        id="error-copy-stack"
                        onClick={this.copyErrorToClipboard}
                        className="p-1 hover:bg-slate-300 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy Stack to Clipboard"
                      >
                        {this.state.copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        <span className="font-sans text-[8px] font-bold">{this.state.copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="whitespace-pre break-words">
                      {this.state.error?.stack || 'No direct stack trace available.'}
                      {this.state.errorInfo?.componentStack}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons CTAs */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                id="error-reset-button"
                onClick={this.handleReset}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-650 text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2"
              >
                <RefreshCw size={13} className="animate-spin-slow" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                id="error-offline-help"
                onClick={() => window.location.href = '/'}
                className="w-full py-3.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-850/50 rounded-2xl text-[11px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
              >
                Return to Safestate
              </button>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">
              NexTask Safe-recovery Layer
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
