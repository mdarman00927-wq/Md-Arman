import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ArrowLeft, AlertTriangle, ShieldCheck, Mail, Check, Sparkles, LogOut } from 'lucide-react';
import { View } from '../types';
import { useAuth } from '../services/AuthContext';
import { db, isFirebaseConfigured, shouldUseFirebase } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/dataService';

interface DataDeletionProps {
  onNavigate: (view: View) => void;
  onPurgeOfflineData?: () => Promise<void> | void;
}

export default function DataDeletion({ onNavigate, onPurgeOfflineData }: DataDeletionProps) {
  const { user, logout } = useAuth();
  
  // Data Deletion request fields
  const [email, setEmail] = useState('');
  const [consequentConsent1, setConsequentConsent1] = useState(false);
  const [consequentConsent2, setConsequentConsent2] = useState(false);
  const [verificationWord, setVerificationWord] = useState('');
  
  // Status controls
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDeletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!email.trim() || !consequentConsent1 || !consequentConsent2) {
      setStatus('error');
      setErrorMessage('You must acknowledge all consequences and enter an account email.');
      return;
    }

    if (verificationWord.toUpperCase() !== 'DELETE') {
      setStatus('error');
      setErrorMessage("Please type the confirmation word 'DELETE' exactly inside the security box.");
      return;
    }

    setStatus('processing');
    setErrorMessage('');

    try {
      const payload = {
        requestedEmail: email,
        requesterUid: user?.uid || 'guest',
        timestamp: new Date().toISOString(),
        initiatedFromCurrentSession: email.toLowerCase() === (user?.email || '').toLowerCase()
      };

      if (shouldUseFirebase(user?.uid)) {
        // Save deletion request to cloud database collection
        try {
          await addDoc(collection(db, 'deletion_requests'), payload);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, 'deletion_requests');
        }
      } else {
        // Save request locally
        const requests = localStorage.getItem('nextask_deletion_requests') || '[]';
        const parsed = JSON.parse(requests);
        parsed.push({ id: Math.random().toString(36).substr(2, 9), ...payload });
        localStorage.setItem('nextask_deletion_requests', JSON.stringify(parsed));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setStatus('success');
    } catch (err: any) {
      console.error("Data deletion dispatch failed:", err);
      setStatus('error');
      try {
        const parsed = JSON.parse(err.message);
        setErrorMessage(parsed.error || 'Firestore Connection/Permission Failed.');
      } catch {
        setErrorMessage(err.message || 'An error occurred during secure transmittal. Try again.');
      }
    }
  };

  const executeCompletePurgeAndExit = async () => {
    try {
      // 1. Wipe local browser databases if they matched current authenticated user
      if (email.toLowerCase() === (user?.email || '').toLowerCase()) {
        if (onPurgeOfflineData) {
          await onPurgeOfflineData();
        } else {
          // Fallback manual storage reset
          if (user?.uid) {
            localStorage.removeItem(`tasks_${user.uid}`);
            localStorage.removeItem(`notes_${user.uid}`);
            localStorage.removeItem(`notif_settings_${user.uid}`);
          }
          localStorage.removeItem('nextask_pin');
          localStorage.removeItem('nextask_pin_enabled');
        }
      }
      
      // 2. Perform account sign out
      await logout();
      onNavigate('dashboard');
    } catch (e) {
      console.error("Wipe failed during deletion exit:", e);
      onNavigate('dashboard');
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24 relative">
      {/* Upper Navigation Header */}
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
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">Data Control Rights</span>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Delete Data</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/20 to-transparent dark:from-rose-950/10 text-center flex flex-col items-center space-y-4"
          >
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 rounded-full text-rose-500 shadow-lg shadow-rose-500/10">
              <ShieldCheck size={36} className="animate-pulse text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-1.5 text-center">
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Deletion Request Recorded</h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
                Your data deletion request of account <strong className="text-rose-600 dark:text-rose-400 font-bold">{email}</strong> has been successfully placed into our server queue. Account credentials and all database archives are set for permanent removal within 72 hours.
              </p>
              
              {email.toLowerCase() === (user?.email || '').toLowerCase() && (
                <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-200/30 text-rose-700 dark:text-rose-400 text-[10.5px] leading-relaxed max-w-xs mx-auto font-medium">
                  We detected this is your currently signed-in account. Click the button below to immediately purge local browser caches and log out.
                </div>
              )}
            </div>
            
            {email.toLowerCase() === (user?.email || '').toLowerCase() ? (
              <button
                onClick={executeCompletePurgeAndExit}
                className="mt-2 w-full max-w-xs py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10.5px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut size={13} />
                <span>Wipe Cache & Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setStatus('idle')}
                className="mt-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Back to Dashboard
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Warning disclosure banners */}
            <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 p-4 rounded-3xl flex gap-3 text-left">
              <AlertTriangle size={18} className="text-amber-500 dark:text-amber-450 flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-amber-500 dark:text-amber-450 uppercase tracking-wider">Critical Warning</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold leading-relaxed">
                  Proceeding with a deletion request of your authenticated NexTask identity will immediately begin the permanent, irreversible destruction of your notebooks, tasks, calendar agendas, custom PIN passwords, and profile settings.
                </p>
              </div>
            </div>

            {status === 'error' && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/60 p-4 rounded-2xl flex gap-2 text-left">
                <AlertTriangle size={15} className="text-rose-600 dark:text-rose-450 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Request Blocked</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Main Interactive Form */}
            <form onSubmit={handleDeletionSubmit} className="glass p-5 rounded-[2.2rem] border border-white/50 dark:border-slate-800/25 shadow-xs space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 px-1 flex items-center gap-2">
                <Trash2 size={13} className="text-rose-500" /> Data Purging Console
              </h3>

              <div className="space-y-4">
                {/* 1. Email matching confirmation */}
                <div className="space-y-1.5">
                  <label htmlFor="delete-email" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Account Email to Purge</label>
                  <input
                    id="delete-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={user?.email || "Enter your account email"}
                    className="w-full glass-input px-4 py-3.5 text-xs font-medium text-slate-850 dark:text-slate-100 focus:outline-hidden"
                    required
                  />
                </div>

                {/* 2. Consent checklists */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Required Legal Confirmations</span>
                  
                  {/* Checklist 1 */}
                  <label htmlFor="consent-check-1" className="flex gap-3 items-start cursor-pointer select-none">
                    <input
                      id="consent-check-1"
                      type="checkbox"
                      checked={consequentConsent1}
                      onChange={(e) => setConsequentConsent1(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4 flex-shrink-0"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      I acknowledge that all tasks, lists, notes, and calendar events stored in the cloud will be permanently deleted and cannot be restored.
                    </span>
                  </label>

                  {/* Checklist 2 */}
                  <label htmlFor="consent-check-2" className="flex gap-3 items-start cursor-pointer select-none">
                    <input
                      id="consent-check-2"
                      type="checkbox"
                      checked={consequentConsent2}
                      onChange={(e) => setConsequentConsent2(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4 flex-shrink-0"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      I understand that active device caches (offline databases) will be locally cleared on confirmation, immediately dropping this session.
                    </span>
                  </label>
                </div>

                {/* 3. Security confirmation text entry */}
                <div className="space-y-1.5 pt-2">
                  <label htmlFor="deletion-confirm-text" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 leading-relaxed">
                    Confirm by typing '<span className="text-rose-600 dark:text-rose-400 font-black">DELETE</span>'
                  </label>
                  <input
                    id="deletion-confirm-text"
                    type="text"
                    value={verificationWord}
                    onChange={(e) => setVerificationWord(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full glass-input px-4 py-3.5 text-xs text-rose-600 dark:text-rose-405 font-mono font-bold tracking-widest focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Secure Deletion Dispatch Initiator */}
              <button
                type="submit"
                disabled={status === 'processing'}
                className="w-full mt-2 py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-md shadow-rose-500/10 flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Purge Request...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Execute Purge Request</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
