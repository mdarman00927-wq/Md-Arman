import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Server, 
  Database, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Copy, 
  RefreshCw, 
  ArrowLeft, 
  Lock, 
  User, 
  Mail,
  AlertTriangle,
  Github,
  Award
} from 'lucide-react';
import { 
  isFirebaseConfigured, 
  isFirestoreConnected, 
  firebaseConnectionError, 
  testFirestoreConnection,
  firebaseConfig,
  messagingSupported
} from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { View } from '../types';

interface FirebaseStatusProps {
  onNavigate: (view: View) => void;
}

export default function FirebaseStatus({ onNavigate }: FirebaseStatusProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [testing, setTesting] = useState(false);
  const [localConnectionState, setLocalConnectionState] = useState({
    configured: isFirebaseConfigured,
    connected: isFirestoreConnected,
    err: firebaseConnectionError
  });

  const runDiagnostics = async () => {
    setTesting(true);
    showToast("Starting Firebase connection metrics test...", "info");
    try {
      await testFirestoreConnection();
      // Wait momentarily for state propagation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update local copy
      setLocalConnectionState({
        configured: isFirebaseConfigured,
        connected: isFirestoreConnected,
        err: firebaseConnectionError
      });

      if (isFirestoreConnected) {
        showToast("Firebase Database connected successfully!", "success");
      } else {
        showToast("Firebase reached with connectivity anomalies.", "warning");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Diagnostics check failed";
      setLocalConnectionState(prev => ({ ...prev, err: msg, connected: false }));
      showToast("Diagnostics verification failed.", "error");
    } finally {
      setTesting(false);
    }
  };

  const copyDiagnosticJSON = () => {
    const diagData = {
      project_id: firebaseConfig.projectId || "Not Loaded",
      auth_domain: firebaseConfig.authDomain || "Not Loaded",
      storage_bucket: firebaseConfig.storageBucket || "Not Loaded",
      active_database: firebaseConfig.firestoreDatabaseId || "(default)",
      client_side_configured: isFirebaseConfigured,
      server_connection_established: localConnectionState.connected,
      messaging_api_supported: messagingSupported,
      diagnostics_error_log: localConnectionState.err,
      user_authenticated: !!user,
      user_uid_masked: user ? `${user.uid.substring(0, 8)}...` : null,
      environment_platform: "AI Studio Sandboxed Container"
    };

    navigator.clipboard.writeText(JSON.stringify(diagData, null, 2));
    showToast("Diagnostics JSON copied to clipboard", "success");
  };

  return (
    <div id="firebase-status-screen" className="pb-24 pt-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 active:scale-95 transition-all cursor-pointer"
            title="Return to Settings"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">Firebase Setup Portal</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cloud Integrations Status</p>
          </div>
        </div>

        <button
          type="button"
          onClick={runDiagnostics}
          disabled={testing}
          className="p-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl active:rotate-180 transition-all duration-300 disabled:opacity-50 cursor-pointer"
          title="Run diagnostics test"
        >
          <RefreshCw size={16} className={testing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main Connection Visualizer */}
      <div id="status-overview-card" className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-850 p-6 shadow-sm">
        {/* Glow Effects */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -z-10 opacity-20 ${
          localConnectionState.connected && localConnectionState.configured
            ? 'bg-emerald-500'
            : 'bg-rose-500'
        }`} />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Integrations Hub
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white font-display">
              System Core Health
            </h2>
          </div>
          
          <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
            localConnectionState.connected && localConnectionState.configured
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              localConnectionState.connected && localConnectionState.configured
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-rose-500'
            }`} />
            {localConnectionState.connected && localConnectionState.configured ? 'Online' : 'Halted'}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center py-4 text-center space-y-3">
          <div className={`relative p-5 rounded-full ring-4 ${
            localConnectionState.connected && localConnectionState.configured
              ? 'bg-emerald-50 dark:bg-slate-950 text-emerald-500 ring-emerald-500/10'
              : 'bg-rose-50 dark:bg-slate-950 text-rose-500 ring-rose-500/10'
          }`}>
            <Server size={32} />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {localConnectionState.connected && localConnectionState.configured
                ? 'Firebase Connected Successfully'
                : 'Firebase Setup Incomplete'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              {localConnectionState.connected && localConnectionState.configured
                ? 'Your NexTask app has successfully established a high-security link to real Firebase Cloud services.'
                : 'Firebase is currently offline or unreachable. Please verify environment keys and configurations.'}
            </p>
          </div>
        </div>

        {/* Error message slot if any */}
        {localConnectionState.err && (
          <div className="mt-4 p-4 bg-rose-500/5 border border-rose-100 dark:border-rose-950/40 rounded-2xl flex items-start gap-2.5">
            <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={14} />
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 tracking-wider">
                Exception Log Trace
              </span>
              <p className="font-mono text-[9px] text-rose-600 dark:text-rose-400 leading-tight break-all">
                {localConnectionState.err}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Connection Variables / Keys Table */}
      <div id="service-keys-card" className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-150 dark:border-slate-850 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Key className="text-indigo-500" size={16} />
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white font-display uppercase tracking-wider">
            Bootstrap Manifest Check
          </h3>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-850/50 text-[11px]">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Project Identifier</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {firebaseConfig.projectId || <span className="text-rose-500 font-bold">MISSING</span>}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Active Database ID</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {firebaseConfig.firestoreDatabaseId || "(default)"}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Vite Key Injection Mode</span>
            <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 font-bold">
              {(import.meta as any).env.VITE_FIREBASE_API_KEY ? 'Public Env Variable' : 'Applet Config File'}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Storage Active Bucket</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 break-all text-right max-w-[200px]">
              {firebaseConfig.storageBucket || "Not Configured"}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 font-semibold">App ID Handshake</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 16)}...` : <span className="text-rose-500 font-bold">MISSING</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Capabilities Checklist */}
      <div id="capabilities-checklist-card" className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-150 dark:border-slate-850 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="text-indigo-500" size={16} />
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white font-display uppercase tracking-wider">
            Configured Services
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Auth Service */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Lock size={14} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">Authentication Service</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">Google Popup, Email + Details</p>
              </div>
            </div>
            {localConnectionState.configured ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-rose-500" />
            )}
          </div>

          {/* Firestore Service */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Database size={14} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">Firestore Database</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">Persistent sync and server-test read</p>
              </div>
            </div>
            {localConnectionState.connected ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-rose-500 animate-pulse" />
            )}
          </div>

          {/* Storage Service */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-850 opacity-60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-500/10 rounded-lg text-slate-500 font-bold">
                <Server size={14} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">Cloud Storage</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">Disabled as per current plan tier limits</p>
              </div>
            </div>
            <span className="text-[8px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase rounded-md tracking-widest">
              Inactive
            </span>
          </div>

          {/* FCM Service */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Info size={14} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">Cloud Push Messaging</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">Browser / Sandboxed IFrame Compatibility</p>
              </div>
            </div>
            {messagingSupported ? (
              <span className="text-[8px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase rounded-md tracking-widest">
                Supported
              </span>
            ) : (
              <span className="text-[8px] px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-extrabold uppercase rounded-md tracking-widest" title="Browser sandboxing prevents FCM initialization. Highly standard.">
                Sandboxed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User Session Metadata */}
      {user && (
        <div id="authenticated-session-card" className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-150 dark:border-slate-850 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="text-indigo-500" size={16} />
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white font-display uppercase tracking-wider">
              Active User Metadata
            </h3>
          </div>

          <div className="flex items-center gap-4 py-1">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Active Profile avatar" 
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl border border-slate-150 dark:border-slate-800 object-cover" 
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg font-black font-display">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {user.displayName || 'Unset Display Name'}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <Mail size={10} />
                <span>{user.email || 'No email attached'}</span>
              </div>
              <div className="text-[9px] text-slate-405 dark:text-slate-405 font-mono">
                UID: {user.uid}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Buttons */}
      <div id="diagnostics-actions" className="flex items-center gap-3">
        <button
          type="button"
          onClick={copyDiagnosticJSON}
          className="flex-1 py-3.5 bg-slate-105 hover:bg-slate-150 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-850 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Copy size={12} />
          <span>Copy Diagnostics JSON</span>
        </button>
      </div>
    </div>
  );
}
