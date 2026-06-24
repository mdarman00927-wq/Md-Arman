import React from 'react';
import { HelpCircle, ArrowLeft, Home, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';

interface NotFoundProps {
  onNavigate: (view: View) => void;
}

export default function NotFound({ onNavigate }: NotFoundProps) {
  return (
    <div id="not-found-view" className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-slate-800 dark:text-slate-200">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="relative inline-flex flex-col items-center">
          <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl scale-150 animate-pulse" />
          <div className="relative p-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-3xl border border-indigo-500/20 shadow-md mb-2">
            <Compass size={40} className="animate-spin-slow text-indigo-500" />
          </div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em] font-mono">
            404 - Area Uncharted
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white font-display">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed max-w-sm mx-auto">
            The page view you are looking for does not exist or has been relocated within our secure network.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-[2rem] shadow-sm text-left space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
            Suggested Solutions
          </h4>
          <ul className="text-xs text-slate-650 dark:text-slate-350 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Double-check the website URL path spelling.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Use the bottom navigation rail to switch views safely.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Reset the local cache if you encounter persistent page load errors.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-650 text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2"
          >
            <Home size={13} />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('help')}
            className="w-full py-3.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[11px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Visit Help Center</span>
          </button>
        </div>
      </div>
    </div>
  );
}
