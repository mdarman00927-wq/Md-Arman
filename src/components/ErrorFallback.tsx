import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface ErrorFallbackProps {
  error: Error | string | null;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
}

export default function ErrorFallback({
  error,
  resetErrorBoundary,
  title = "Unexpected Error Occurred",
  description = "Something went wrong while processing this section. Your other settings and data remain secure.",
  showHomeButton = false,
  onHomeClick
}: ErrorFallbackProps) {
  const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

  const handleReload = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      id="error-fallback-root" 
      className="p-6 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-[2rem] shadow-sm max-w-xl mx-auto my-6 space-y-5 text-left transition-all duration-350"
    >
      <div className="flex items-center gap-4">
        <div className="p-3.5 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/50 dark:border-rose-900/30 shadow-sm flex-shrink-0">
          <AlertTriangle size={24} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-slate-900/5 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850">
          <div className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
            Error Diagnostic Message
          </div>
          <div className="font-mono text-xs text-rose-700 dark:text-rose-400 font-medium break-words leading-relaxed">
            {errorMsg}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <RefreshCw size={13} className="animate-spin-slow" />
          <span>Try Again / Refresh</span>
        </button>

        {showHomeButton && (
          <button
            type="button"
            onClick={onHomeClick || (() => window.location.href = '/')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-[0.98] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Home size={13} />
            <span>Go to Dashboard</span>
          </button>
        )}
      </div>
    </div>
  );
}
