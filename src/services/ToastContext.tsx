import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextProps {
  toasts: ToastMessage[];
  showToast: (text: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((text: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, text, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      
      {/* Toast Render Stage Overlay */}
      <div id="toast-rendering-stage" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3.5 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let icon = <Info size={16} />;
            let bgStyle = "border-sky-200 bg-sky-50 dark:border-sky-950/40 dark:bg-sky-950/20 text-sky-850 dark:text-sky-300";
            
            if (toast.type === 'success') {
              icon = <CheckCircle2 size={16} className="text-emerald-500" />;
              bgStyle = "border-emerald-100 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/15 text-emerald-850 dark:text-emerald-400";
            } else if (toast.type === 'error') {
              icon = <AlertCircle size={16} className="text-rose-500" />;
              bgStyle = "border-rose-100 bg-rose-50/95 dark:border-rose-950/45 dark:bg-rose-950/15 text-rose-850 dark:text-rose-400";
            } else if (toast.type === 'warning') {
              icon = <AlertTriangle size={16} className="text-amber-500" />;
              bgStyle = "border-amber-100 bg-amber-50/95 dark:border-amber-950/40 dark:bg-amber-950/15 text-amber-850 dark:text-amber-400";
            } else if (toast.type === 'info') {
              icon = <Info size={16} className="text-indigo-500" />;
              bgStyle = "border-indigo-100 bg-indigo-50/95 dark:border-indigo-950/40 dark:bg-indigo-950/15 text-indigo-850 dark:text-indigo-400";
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2.5xl border backdrop-blur-md shadow-lg ${bgStyle}`}
              >
                <div id={`toast-icon-${toast.id}`} className="mt-0.5 flex-shrink-0">
                  {icon}
                </div>
                <div id={`toast-text-${toast.id}`} className="flex-1 text-[11px] font-semibold leading-relaxed text-left">
                  {toast.text}
                </div>
                <button
                  type="button"
                  id={`toast-dismiss-${toast.id}`}
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
