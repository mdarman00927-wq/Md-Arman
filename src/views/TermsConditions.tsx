import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft, ShieldCheck, Scale, AlertTriangle, HelpCircle, Calendar } from 'lucide-react';
import { View } from '../types';

interface TermsConditionsProps {
  onNavigate: (view: View) => void;
}

export default function TermsConditions({ onNavigate }: TermsConditionsProps) {
  return (
    <div className="p-6 space-y-6 pb-24 relative">
      {/* Sticky/Upper Navigation Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="p-2.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 border border-white/40 dark:border-slate-850/30 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-350 active:scale-95 flex items-center justify-center"
          title="Back to Settings"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">Legal & Agreements</span>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Terms & Conditions</h1>
        </div>
      </div>

      {/* Hero Badge card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-white/40 dark:border-slate-850/30 bg-gradient-to-br from-indigo-50/20 via-transparent to-indigo-50/10 dark:from-indigo-950/20 dark:to-transparent flex items-start gap-4"
      >
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400 flex-shrink-0">
          <Scale size={22} className="animate-pulse" />
        </div>
        <div className="space-y-1.5 text-left">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Our Terms of Service</h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            By accessing or synchronizing with our application, you agree to comply with our Terms, service rules, and data liability standards. Please read thoroughly.
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest pt-1">
            <Calendar size={10} />
            <span>Last Updated: June 7, 2026</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content Sections */}
      <div className="space-y-4 text-left">
        {/* Section 1 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-5 rounded-3xl border border-white/40 dark:border-slate-800/25 space-y-3"
        >
          <div className="flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <ShieldCheck size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">1. Use of the Service</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            NexTask Organizer provides organizational aids, scheduling canvases, notes databases, and visual analytics for personal productivity optimization. You agree to use the service ethically, and promise not to intercept database sockets, distribute spam feeds, run bot nets, or overload Cloud endpoints.
          </p>
        </motion.div>

        {/* Section 2 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass p-5 rounded-3xl border border-white/40 dark:border-slate-800/25 space-y-3"
        >
          <div className="flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <FileText size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">2. Account Credentials & Security</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            If you create an account to activate cloud-synchronized vaults, you are fully responsible for preserving the confidentiality of your credentials, custom security PIN passcodes, and local session safety settings. NexTask Organizer is not liable for unauthorized access stemming from negligent login leaks.
          </p>
        </motion.div>

        {/* Section 3 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-5 rounded-3xl border border-white/40 dark:border-slate-800/25 space-y-3"
        >
          <div className="flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <AlertTriangle size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">3. Intellectual Property Rights</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            All codebases, color palettes, visual designs, motion curves, icons, and systems are protected under intellectual property mandates. However, your user-generated documents (tasks, thoughts, note contents, Excel or PDF exported arrays) remain exclusively your personal intellectual property.
          </p>
        </motion.div>

        {/* Section 4 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass p-5 rounded-3xl border border-white/40 dark:border-slate-800/25 space-y-3"
        >
          <div className="flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <HelpCircle size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">4. Service Terminus & Liabilities</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            We render NexTask "as-is" and "as-available" without specific operational warranties. In no event shall our developers be held liable for temporary server offline outages, data buffer resets, or auxiliary data transfer errors under extreme device network shifts. We advise downloaded offline backups periodically.
          </p>
        </motion.div>
      </div>

      {/* Action to accept */}
      <button
        onClick={() => onNavigate('settings')}
        className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-indigo-600/10"
      >
        Accept Terms of Service
      </button>
    </div>
  );
}
