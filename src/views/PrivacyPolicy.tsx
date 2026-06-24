import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, Mail, FileText, Lock, Eye, Calendar } from 'lucide-react';
import { View } from '../types';

interface PrivacyPolicyProps {
  onNavigate: (view: View) => void;
}

export default function PrivacyPolicy({ onNavigate }: PrivacyPolicyProps) {
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
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">Legal & Trust</span>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Privacy Policy</h1>
        </div>
      </div>

      {/* Hero Badge card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-white/40 dark:border-slate-850/30 bg-gradient-to-br from-indigo-50/30 via-transparent to-indigo-50/10 dark:from-indigo-950/20 dark:to-transparent flex items-start gap-4"
      >
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400 flex-shrink-0">
          <Shield size={22} className="animate-pulse" />
        </div>
        <div className="space-y-1.5 text-left">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Our Privacy Guarantee</h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Your notes, thoughts, lists, and scheduling events belong to you. We secure your information with high-end, device-bound local encryption and end-to-end cloud sync architectures.
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest pt-1">
            <Calendar size={10} />
            <span>Effective Date: June 7, 2026</span>
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
            <FileText size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">1. Information We Collect</h2>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium space-y-2 leading-relaxed">
            <p>
              NexTask Organizer collects minimum metadata necessary to maintain your task schedules and thought databases securely:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong className="text-slate-700 dark:text-slate-350">Account Profile:</strong> Name, email address, and avatar photo used explicitly for sync profile identity.</li>
              <li><strong className="text-slate-700 dark:text-slate-350">Application Content:</strong> Encoded titles, tags, content body, times, and metadata of your tasks and notes.</li>
              <li><strong className="text-slate-700 dark:text-slate-350">Technical Settings:</strong> Preference states (quiet hours, lock passcodes, custom layouts) stored inside local browser files.</li>
            </ul>
          </div>
        </motion.div>

        {/* Section 2 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass p-5 rounded-3xl border border-white/40 dark:border-slate-800/25 space-y-3"
        >
          <div className="flex items-center gap-2 text-slate-850 dark:text-slate-200">
            <Eye size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">2. How We Use Data</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            All gathered data is applied purely to render organizer dashboards, automate native device alarms, and synchronize documents seamlessly across device boundaries. We never monetize, package, analyze, or distribute your private database logs to commercial agencies or data aggregate marketing syndicates.
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
            <Lock size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">3. Advanced Encryption & Safety</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Data saved inside our local databases (Draft Mode) are sandbox-isolated. When connecting to Google Cloud Firestore servers under verified authentication, documents are transferred exclusively over secure SSL sockets with Advanced Encryption Standard (AES) protocols.
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
            <Shield size={16} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest">4. Your Compliance Rights (GDPR & CCPA)</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Under international guidelines, you hold the full right to inspect, export, restrict, update, or completely erase and wipe clean every dataset associated with your authenticated identity. You can fulfill these actions using our interactive JSON download exports, database purges, or submitting requests on our dedicated Deletion page.
          </p>
        </motion.div>

        {/* Section 5 (Contact) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 border border-white/40 dark:border-slate-800/25 flex flex-col sm:flex-row items-center gap-3.5 bg-gradient-to-r from-transparent to-indigo-50/10 dark:to-indigo-950/10"
        >
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Mail size={16} />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-0.5">
            <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Privacy Compliance Helpline</h4>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">Have queries regarding site-level encryption or regulatory policies?</p>
            <p className="text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-455 mt-1">legal@nextaskorganizer.com</p>
          </div>
        </motion.div>
      </div>

      {/* Button to navigate back */}
      <button
        onClick={() => onNavigate('settings')}
        className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-indigo-600/10"
      >
        I Understand
      </button>
    </div>
  );
}
