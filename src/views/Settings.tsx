import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useTheme } from '../services/ThemeContext';
import EditProfileModal from '../components/EditProfileModal';
import { useNotification } from '../services/NotificationContext';
import { 
  Bell, 
  ChevronRight, 
  Globe, 
  Lock, 
  Moon, 
  Sun,
  Shield, 
  User, 
  LogOut, 
  Info,
  Database,
  FileDown,
  FileSpreadsheet,
  Smartphone,
  Check,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Server,
  Clock,
  Layout,
  Settings as SettingsIcon,
  BookOpen,
  ArrowRight,
  Eye,
  EyeOff,
  Users,
  Tv,
  Share2,
  MessageSquare,
  Activity,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Note, View } from '../types';
import { pdfService } from '../services/pdfService';
import { excelService } from '../services/excelService';

interface SettingsProps {
  tasks: Task[];
  notes: Note[];
  isOnline?: boolean;
  deferredPrompt?: any;
  onInstallApp?: () => void;
  onImportRestore?: (tasks: Task[], notes: Note[]) => void;
  onResetDatabase?: () => void;
  onRefreshPinSettings?: () => void;
  onNavigate?: (view: View) => void;
  onCustomizeSettings?: () => void;
}

export default function Settings({ 
  tasks, 
  notes, 
  isOnline = true, 
  deferredPrompt, 
  onInstallApp,
  onImportRestore,
  onResetDatabase,
  onRefreshPinSettings,
  onNavigate,
  onCustomizeSettings
}: SettingsProps) {
  const { user, logout, isDemoMode } = useAuth();
  const { theme, toggleTheme: rawToggleTheme } = useTheme();
  const { settings, permissionStatus, requestPermission, updateSettings: rawUpdateSettings } = useNotification();
  
  const toggleTheme = () => {
    rawToggleTheme();
    onCustomizeSettings?.();
  };

  const updateSettings = (val: any) => {
    rawUpdateSettings(val);
    onCustomizeSettings?.();
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Active sub-section filtering tab
  const [activeTab, setActiveTab] = useState<'preference' | 'privacy' | 'backup' | 'monetization' | 'admin'>('preference');

  // Monetization State Controls
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem(`nextask_premium_${user?.uid}`) === 'true';
  });
  const [adsEnabled, setAdsEnabled] = useState<boolean>(() => {
    return localStorage.getItem(`nextask_ads_enabled`) !== 'false';
  });
  const [showAdOverlay, setShowAdOverlay] = useState<'interstitial' | 'rewarded' | null>(null);
  const [adTimer, setAdTimer] = useState(0);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referrals, setReferrals] = useState([
    { name: 'Michael Scott', date: 'June 4, 2026', status: 'Completed', reward: '+3 Premium Days' },
    { name: 'Sarah Connor', date: 'June 8, 2026', status: 'Completed', reward: '+3 Premium Days' },
    { name: 'Dwight Schrute', date: 'June 9, 2026', status: 'Pending', reward: 'Awaiting Verification' }
  ]);

  // Admin Panel State Controls
  const [adminUsers, setAdminUsers] = useState([
    { uid: 'demo-user-alex', displayName: 'Alex Johnson', email: 'demo@nextask.com', isPremium: false, banned: false, role: 'User' },
    { uid: 'admin-nextask', displayName: 'MD Arman', email: 'mdarman000732@gmail.com', isPremium: true, banned: false, role: 'Chief Architect' },
    { uid: 'user-sarah-k', displayName: 'Sarah Connor', email: 'sarah.k@gmail.com', isPremium: true, banned: false, role: 'User' },
    { uid: 'user-bob-v', displayName: 'Bob Vance', email: 'bob@dundermifflin.com', isPremium: false, banned: true, role: 'User' }
  ]);
  const [adminTickets, setAdminTickets] = useState([
    { id: '1', user: 'sarah.k@gmail.com', message: 'The voice task creation feature is absolutely stellar! I use it daily.', rating: 5, date: 'June 8, 2026', resolved: false, reply: '' },
    { id: '2', user: 'bob@dundermifflin.com', message: 'Can we add custom sounds to Pomodoro timer focus blocks? That would really help.', rating: 4, date: 'June 9, 2026', resolved: false, reply: '' },
    { id: '3', user: 'jane_doe_90@yahoo.com', message: 'Offline sync operates extremely fast and smoothly!', rating: 5, date: 'June 10, 2026', resolved: true, reply: 'Thank you for your review!' }
  ]);
  const [ticketReplyInputs, setTicketReplyInputs] = useState<{[key: string]: string}>({});
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'SYSTEM: Port 3000 online routing to static assets...',
    'DATABASE: Cache buffer successfully instantiated.',
    'SECURITY: Session cryptographic parameters validated.',
    'SERVER: Node CJS process starting listener on host 0.0.0.0...',
    'GEMINI: API model parameters verified (gemini-3.5-flash)'
  ]);

  // Live system updates ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const operations = [
        'DB: Syncing Firestore collections...',
        'SESSION: Token refresh hook completed.',
        'MONETIZATION: Checked AdMob active placement quotas...',
        'PWA: Asset package integrity check... OK',
        'SYSTEM: Garbage collection freed 0.4MB buffers.',
        'GEMINI: Interaction API latency query: 154ms'
      ];
      const randomMsg = operations[Math.floor(Math.random() * operations.length)];
      setSystemLogs(prev => [randomMsg, ...prev.slice(0, 4)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle premium upgrade
  const handlePurchasePremium = () => {
    localStorage.setItem(`nextask_premium_${user?.uid}`, 'true');
    setIsPremium(true);
    // also update in mock users list
    setAdminUsers(prev => prev.map(u => u.uid === user?.uid ? { ...u, isPremium: true } : u));
  };

  // Handle toggle premium from admin
  const handleTogglePremiumAdmin = (uid: string) => {
    setAdminUsers(prev => prev.map(u => {
      if (u.uid === uid) {
        const nextPrem = !u.isPremium;
        if (uid === user?.uid) {
          localStorage.setItem(`nextask_premium_${uid}`, String(nextPrem));
          setIsPremium(nextPrem);
        }
        return { ...u, isPremium: nextPrem };
      }
      return u;
    }));
  };

  // Handle ban user
  const handleToggleBanAdmin = (uid: string) => {
    if (uid === user?.uid) {
      alert("Error: You cannot ban your own active administrator account.");
      return;
    }
    setAdminUsers(prev => prev.map(u => u.uid === uid ? { ...u, banned: !u.banned } : u));
  };

  // JSON Import & Export Backup State
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  // Diagnostics and AI Processing Consent State
  const [privacyConsent, setPrivacyConsent] = useState(() => {
    return localStorage.getItem('nextask_privacy_ai_consent') !== 'false';
  });
  const [diagnosticConsent, setDiagnosticConsent] = useState(() => {
    return localStorage.getItem('nextask_privacy_diagnostic') === 'true';
  });

  // Quiet Hours Timing
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(() => {
    return localStorage.getItem('nextask_quiet_hours_enabled') === 'true';
  });
  const [quietHoursStart, setQuietHoursStart] = useState(() => {
    return localStorage.getItem('nextask_quiet_hours_start') || '22:00';
  });
  const [quietHoursEnd, setQuietHoursEnd] = useState(() => {
    return localStorage.getItem('nextask_quiet_hours_end') || '07:00';
  });

  // Interactive PIN lock configuration
  const [pinEnabled, setPinEnabled] = useState(() => {
    return localStorage.getItem('nextask_pin_enabled') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [pinSetupMode, setPinSetupMode] = useState<'idle' | 'setting_pin' | 'disabling_pin'>('idle');
  const [pinError, setPinError] = useState('');

  // Storage Footprint calculator
  const storageFootprint = (() => {
    try {
      const payload = JSON.stringify(tasks) + JSON.stringify(notes) + localStorage.getItem(`notif_settings_${user?.uid}`);
      const bytes = payload.length;
      if (bytes < 1024) return `${bytes} Bytes`;
      return `${(bytes / 1024).toFixed(2)} KB`;
    } catch (e) {
      return '1.24 KB';
    }
  })();

  // 1. Export workspace tasks & notes to format JSON backup file
  const triggerJsonExport = () => {
    try {
      const exportData = {
        name: "NexTask Workspace Backup",
        backupVersion: "1.1.0",
        timestamp: new Date().toISOString(),
        userEmail: user?.email || "anonymous",
        tasks,
        notes
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nextask_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed downloading JSON export:", e);
    }
  };

  // 2. Import JSON workspace
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const data = JSON.parse(rawText);

        if (!data || typeof data !== 'object') {
          throw new Error('Root element must be JSON object');
        }

        const sourceTasks = Array.isArray(data.tasks) ? data.tasks : [];
        const sourceNotes = Array.isArray(data.notes) ? data.notes : [];

        // Filter and sanitize tasks and notes objects
        const loadedTasks: Task[] = sourceTasks.map((t: any) => ({
          id: t.id || Math.random().toString(36).substr(2, 9),
          title: String(t.title || 'Untitled Task'),
          details: t.details ? String(t.details) : undefined,
          completed: !!t.completed,
          priority: (t.priority === 'low' || t.priority === 'high') ? t.priority : 'medium',
          dueDate: t.dueDate ? String(t.dueDate) : undefined,
          dueTime: t.dueTime ? String(t.dueTime) : undefined,
          category: String(t.category || 'General'),
          location: t.location ? String(t.location) : undefined,
          ownerId: user?.uid || 'temp'
        }));

        const loadedNotes: Note[] = sourceNotes.map((n: any) => ({
          id: n.id || Math.random().toString(36).substr(2, 9),
          title: String(n.title || 'Untitled Note'),
          content: String(n.content || ''),
          updatedAt: String(n.updatedAt || new Date().toLocaleDateString()),
          color: String(n.color || '#6366f1'),
          tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
          pinned: !!n.pinned,
          category: n.category ? String(n.category) : 'General',
          ownerId: user?.uid || 'temp'
        }));

        if (loadedTasks.length === 0 && loadedNotes.length === 0) {
          setImportStatus('error');
          setImportMessage('Workspace backup has empty tasks and notes.');
          return;
        }

        onImportRestore?.(loadedTasks, loadedNotes);
        setImportStatus('success');
        setImportMessage(`Successfully restored ${loadedTasks.length} tasks and ${loadedNotes.length} notes!`);
      } catch (err) {
        setImportStatus('error');
        setImportMessage('Parsing failed: Invalid backup .json format.');
      }
    };
    reader.readAsText(file);
  };

  // 3. Clear Database warnings
  const handleDatabaseReset = () => {
    if (window.confirm("WARNING: Are you absolutely sure you want to clear your local workspace cache? This deletes all custom tasks, notes, notification archives and resets to system default records.")) {
      onResetDatabase?.();
      alert("NexTask workspace database reset successfully.");
    }
  };

  // 4. Privacy Consents Save
  const handlePrivacyToggle = () => {
    const newVal = !privacyConsent;
    setPrivacyConsent(newVal);
    localStorage.setItem('nextask_privacy_ai_consent', String(newVal));
  };

  const handleDiagnosticToggle = () => {
    const newVal = !diagnosticConsent;
    setDiagnosticConsent(newVal);
    localStorage.setItem('nextask_privacy_diagnostic', String(newVal));
  };

  // 5. Quiet Hours Toggle / Save
  const handleQuietHoursToggle = () => {
    const newVal = !quietHoursEnabled;
    setQuietHoursEnabled(newVal);
    localStorage.setItem('nextask_quiet_hours_enabled', String(newVal));
  };

  useEffect(() => {
    localStorage.setItem('nextask_quiet_hours_start', quietHoursStart);
    localStorage.setItem('nextask_quiet_hours_end', quietHoursEnd);
  }, [quietHoursStart, quietHoursEnd]);

  // 6. PIN Passcode Save & Verification
  const handlePinSave = () => {
    setPinError('');
    if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }

    localStorage.setItem('nextask_pin', passcode);
    localStorage.setItem('nextask_pin_enabled', 'true');
    setPinEnabled(true);
    setPasscode('');
    setPinSetupMode('idle');
    onRefreshPinSettings?.();
  };

  const handlePinDisable = () => {
    setPinError('');
    const correctPin = localStorage.getItem('nextask_pin');
    if (passcode !== correctPin) {
      setPinError('Incorrect PIN. Authentication failed.');
      return;
    }

    localStorage.removeItem('nextask_pin');
    localStorage.setItem('nextask_pin_enabled', 'false');
    setPinEnabled(false);
    setPasscode('');
    setPinSetupMode('idle');
    onRefreshPinSettings?.();
  };

  return (
    <div className="p-6 space-y-8 pb-28">
      
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Fine-tune your local workspace workspace & privacy parameters.</p>
      </motion.div>

      {/* COMPACT VIEW TAB SELECTOR */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:flex-row gap-1.5 glass border-white/30 dark:border-slate-800/25 p-1.5 rounded-[1.5rem] shadow-xs">
        <button
          onClick={() => setActiveTab('preference')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeTab === 'preference'
              ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <SettingsIcon size={12} /> Preference
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield size={12} /> Privacy & Lock
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database size={12} /> Backups
        </button>
        <button
          onClick={() => setActiveTab('monetization')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeTab === 'monetization'
              ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm font-extrabold'
              : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <SparklesIcon size={12} className="text-amber-500" /> Premium & Ads
        </button>
        {user?.email === 'mdarman000732@gmail.com' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`xs:col-span-3 sm:flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-100/50 dark:border-indigo-900/30 shadow-xs'
                : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layout size={12} /> Admin Suite
          </button>
        )}
      </div>

      <div className="space-y-7">
        
        {/* ACTIVE PORTAL TAB: PREFERENCES */}
        {activeTab === 'preference' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* PROFILE CARD */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <User size={12} /> Account Profile
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-4 text-left">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Avatar" 
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-50 dark:ring-indigo-950 bg-slate-100 dark:bg-slate-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                      <User size={22} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {user?.displayName || 'NexTask User'}
                    </div>
                    <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-semibold">
                      {user?.email || 'No credentials associated'}
                    </div>
                    {/* Footprint statistics */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                        {storageFootprint}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">•</span>
                      <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold">
                        {tasks.length} tasks • {notes.length} notes
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 active:scale-95 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {/* VISUAL THEMES */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Layout size={12} /> Theme Appearance
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                
                <div className="grid grid-cols-2 gap-3.5">
                  <button 
                    onClick={() => { if (theme === 'dark') toggleTheme(); }}
                    className={`p-4 rounded-2xl border flex flex-col items-start gap-3 transition-all text-left group cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500 ring-2 ring-indigo-500/10' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-850 text-amber-500'}`}>
                      <Sun size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Light Canvas</h4>
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">High-contrast clean layout.</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => { if (theme === 'light') toggleTheme(); }}
                    className={`p-4 rounded-2xl border flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/10' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-850 text-slate-400'}`}>
                      <Moon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Dark Slate</h4>
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Luxurious twilight visual style.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* NOTIFICATIONS & TIMERS */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Bell size={12} className="text-slate-400 dark:text-slate-500" /> Notifications & Sound
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
                
                {/* Push Notification Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">Browser Push Alerts</div>
                    <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 leading-normal">
                      {permissionStatus === 'granted' 
                        ? 'Native visual desktop alerts enabled.' 
                        : permissionStatus === 'denied' 
                        ? 'Blocked by browser permissions. Reset site security config.' 
                        : 'Requires native system approval.'
                      }
                    </div>
                  </div>
                  <div>
                    {permissionStatus !== 'granted' ? (
                      <button
                        onClick={requestPermission}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Request
                      </button>
                    ) : (
                      <button
                        onClick={() => updateSettings({ enablePush: !settings.enablePush })}
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                          settings.enablePush ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          settings.enablePush ? 'translate-x-4.5' : 'translate-x-0'
                        }`} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-850" />

                {/* Due Date alarms */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">Task Due Reminders</div>
                    <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Send alerts about tasks approaching they due time.</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ dueDateReminders: !settings.dueDateReminders })}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                      settings.dueDateReminders ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      settings.dueDateReminders ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Threshold selector */}
                {settings.dueDateReminders && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center justify-between bg-slate-50/55 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl"
                  >
                    <div className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reminder Offset</div>
                    <select
                      value={settings.dueDateThreshold}
                      onChange={(e) => updateSettings({ dueDateThreshold: e.target.value })}
                      className="bg-transparent border-none text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 focus:ring-0 cursor-pointer outline-none font-sans"
                    >
                      <option value="0" className="dark:bg-slate-900">At due time</option>
                      <option value="5" className="dark:bg-slate-900">5 minutes before</option>
                      <option value="15" className="dark:bg-slate-900">15 minutes before</option>
                      <option value="30" className="dark:bg-slate-900">30 minutes before</option>
                      <option value="60" className="dark:bg-slate-900">1 hour before</option>
                    </select>
                  </motion.div>
                )}

                <div className="h-px bg-slate-50 dark:bg-slate-850" />

                {/* Focus Alerts */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">Focus Completion Alerts</div>
                    <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Notify when Focus Session or Break ends.</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ focusAlerts: !settings.focusAlerts })}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                      settings.focusAlerts ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      settings.focusAlerts ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-850" />

                {/* Chime sounding */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">Sound Alert Chimes</div>
                    <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Synthesize harmonic chord tones on triggers.</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ soundAlerts: !settings.soundAlerts })}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                      settings.soundAlerts ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      settings.soundAlerts ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-850" />

                {/* ACTIVE QUIET HOURS PANEL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-200">Quiet Hours Schedule</div>
                      <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Temporarily block and silence alarm triggers.</div>
                    </div>
                    <button
                      onClick={handleQuietHoursToggle}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                        quietHoursEnabled ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        quietHoursEnabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {quietHoursEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50/55 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 space-y-1">
                        <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Start Time</label>
                        <input
                          type="time"
                          value={quietHoursStart}
                          onChange={(e) => setQuietHoursStart(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                        />
                      </div>
                      <div className="flex items-center text-slate-300 dark:text-slate-700 pt-3">
                        <Clock size={16} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">End Time</label>
                        <input
                          type="time"
                          value={quietHoursEnd}
                          onChange={(e) => setQuietHoursEnd(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>
            </div>

          </motion.div>
        )}

        {/* ACTIVE PORTAL TAB: PRIVACY & PASSWORD SECURE LOCK */}
        {activeTab === 'privacy' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* DEVICE LEVEL ACCESS LOCK */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Lock size={12} /> App Access Lock
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl ${pinEnabled ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-50 dark:bg-slate-850 text-slate-400'} flex-shrink-0`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-0.5 text-left flex-1">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Device Locked Screen (4-Digit PIN)</h4>
                    <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                      Lock your database session upon refresh. Restricts unauthorized visibility completely.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-950 border border-slate-100/60 dark:border-slate-850 p-3.5 rounded-2xl">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lock protection status</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${pinEnabled ? 'text-indigo-500' : 'text-slate-400'}`}>
                        {pinEnabled ? 'Activated' : 'Disabled'}
                      </span>
                      
                      {pinEnabled ? (
                        <button
                          onClick={() => setPinSetupMode('disabling_pin')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => { setPinSetupMode('setting_pin'); setPasscode(''); setPinError(''); }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-455 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                        >
                          Set PIN
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SETUP INTERACTIVE SUB-FORM */}
                  {pinSetupMode !== 'idle' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50/60 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 text-left"
                    >
                      <h5 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <SettingsIcon size={10} /> 
                        {pinSetupMode === 'setting_pin' ? 'New PIN configuration' : 'Unlock authorization required'}
                      </h5>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                          {pinSetupMode === 'setting_pin' ? 'Specify a 4-Digit PIN' : 'Enter current 4-Digit PIN'}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            maxLength={4}
                            pattern="\d*"
                            placeholder="••••"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                            className="w-full tracking-[1.5em] text-center font-bold font-mono text-slate-900 dark:text-white pl-4 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl text-base focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        {pinError && (
                          <span className="text-[9px] font-bold text-rose-500 tracking-wide mt-1 block">
                            {pinError}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setPinSetupMode('idle')}
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-500 text-[10px] uppercase font-bold tracking-widest rounded-xl hover:bg-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={pinSetupMode === 'setting_pin' ? handlePinSave : handlePinDisable}
                          className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>
            </div>

            {/* CORE CONSENT & PRIVACY POLICY */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Globe size={12} /> Compliance & Consent
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
                
                {/* AI Consent */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 text-left flex-1 pr-4">
                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">AI Summary Synthesis Permissions</div>
                    <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                      Authorizes NexTask AI Copilot to safely analyze notes internally to render smart metrics.
                    </div>
                  </div>
                  <button
                    onClick={handlePrivacyToggle}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex-shrink-0 ${
                      privacyConsent ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      privacyConsent ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-850" />

                {/* Diagnostics Consent */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 text-left flex-1 pr-4">
                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">Send Anonymized Error Logs</div>
                    <div className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                      Transmit crash parameters locally back to console inspector trackers to debug workspace latency.
                    </div>
                  </div>
                  <button
                    onClick={handleDiagnosticToggle}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex-shrink-0 ${
                      diagnosticConsent ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      diagnosticConsent ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-850" />

                {/* Local Encryption Mock */}
                <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100/50 dark:border-slate-850 rounded-2xl text-left">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 animate-pulse" />
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                    Personal content in transit is protected using client-side SHA-256 equivalent hashing models before cloud synchronization hooks trigger.
                  </span>
                </div>

              </div>
            </div>

            {/* LEGAL & TRUST COMPLIANCE LINKS */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Info size={12} /> Legal Documents & Help
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                <button
                  type="button"
                  onClick={() => onNavigate?.('about')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100/40 dark:hover:bg-slate-850/40 cursor-pointer group transition-colors text-left"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">About NexTask Team</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <div className="h-px bg-slate-50 dark:bg-slate-850" />
                <button
                  type="button"
                  onClick={() => onNavigate?.('contact')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100/40 dark:hover:bg-slate-850/40 cursor-pointer group transition-colors text-left"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Help Desk</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <div className="h-px bg-slate-50 dark:bg-slate-850" />
                <button
                  type="button"
                  onClick={() => onNavigate?.('help')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100/40 dark:hover:bg-slate-850/40 cursor-pointer group transition-colors text-left"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Interactive Help Center</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <div className="h-px bg-slate-50 dark:bg-slate-850" />
                <button
                  type="button"
                  onClick={() => onNavigate?.('privacy')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100/40 dark:hover:bg-slate-850/40 cursor-pointer group transition-colors text-left"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Privacy Policy Guidelines</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <div className="h-px bg-slate-50 dark:bg-slate-850" />
                <button
                  type="button"
                  onClick={() => onNavigate?.('terms')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100/40 dark:hover:bg-slate-850/40 cursor-pointer group transition-colors text-left"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Terms & Conditions Agreement</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <div className="h-px bg-slate-50 dark:bg-slate-850" />
                <button
                  type="button"
                  onClick={() => onNavigate?.('deletion')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 cursor-pointer group transition-colors text-left"
                >
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">Request Data Deletion (GDPR)</span>
                  <ChevronRight size={14} className="text-rose-450 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ACTIVE PORTAL TAB: BACKUPS & JSON INTERFACE */}
        {activeTab === 'backup' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* OFFLINE REPORT BACKUPS */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <FileSpreadsheet size={12} /> Document Data Exports
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                  Build and download offline document backups of your workspace databases. Select between formatted PDF reports or editable Microsoft Excel spreadsheets.
                </p>
                
                <div className="flex flex-col gap-2.5">
                  {/* Tasks Agenda Card */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Tasks Checklist</h4>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Download task priority reports.</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => pdfService.exportTasks(tasks, { userName: user?.displayName || 'Alex', userEmail: user?.email || '' })}
                        className="p-2 hover:bg-indigo-500/10 rounded-xl text-indigo-500 active:scale-95 transition-all cursor-pointer"
                        title="Export Tasks as PDF"
                      >
                        <FileDown size={14} />
                      </button>
                      <button
                        onClick={() => excelService.exportTasks(tasks, { userName: user?.displayName || 'Alex', userEmail: user?.email || '' })}
                        className="p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-450 active:scale-95 transition-all cursor-pointer"
                        title="Export Tasks as Excel"
                      >
                        <FileSpreadsheet size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Notes Archive Card */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Notes Archive</h4>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold font-sans">Download custom thought databases.</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => pdfService.exportNotes(notes, { userName: user?.displayName || 'Alex', userEmail: user?.email || '' })}
                        className="p-2 hover:bg-indigo-500/10 rounded-xl text-indigo-500 active:scale-95 transition-all cursor-pointer"
                        title="Export Notes as PDF"
                      >
                        <FileDown size={14} />
                      </button>
                      <button
                        onClick={() => excelService.exportNotes(notes, { userName: user?.displayName || 'Alex', userEmail: user?.email || '' })}
                        className="p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-450 active:scale-95 transition-all cursor-pointer"
                        title="Export Notes as Excel"
                      >
                        <FileSpreadsheet size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* REAL-TIME CLOUD FIREBASE INTEGRATION GATEWAY */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5 font-display">
                <Server size={12} className="text-indigo-500" /> Firebase Platform Connections
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Firebase System Diagnostics</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Inspect active server sync latency, verify Firestore rules, credentials, cloud storage capabilities, and browser push parameters.
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Portal v2.0
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate?.('firebase-status')}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-650 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <Server size={12} />
                  <span>Verify Firebase Server Setup</span>
                </button>
              </div>
            </div>

            {/* RAW BACKUP RESTORATION AND LOADER */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Database size={12} /> JSON Database Sync
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                  Save our raw backup bundle as a local `.json` file to migrate NexTask contents across devices instantly.
                </p>

                {importMessage && (
                  <div className={`p-3 rounded-2xl text-[10px] font-bold text-left border ${
                    importStatus === 'success' 
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-450'
                  }`}>
                    {importMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* EXPORT ACTION */}
                  <button
                    onClick={triggerJsonExport}
                    className="flex flex-col items-center justify-center p-5 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 hover:border-indigo-500 rounded-2xl cursor-pointer text-center group transition-all"
                  >
                    <FileDown size={24} className="text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-205">Download Backup File</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Export .json archive</span>
                  </button>

                  {/* IMPORT ACTION */}
                  <label className="flex flex-col items-center justify-center p-5 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 hover:border-emerald-500 rounded-2xl cursor-pointer text-center group transition-all">
                    <UploadCloud size={24} className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-205">Upload Backup File</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Import .json archive</span>
                    <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* CACHE CLEAR RESET DATA */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-rose-500/70 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Trash2 size={12} /> Danger Operations
              </h2>
              <div className="bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/40 dark:border-rose-900/45 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="text-left space-y-1">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Purge Workspace Cache Data</h4>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-450 font-semibold leading-relaxed">
                    Instantly wipes all tasks, thoughts, notes, tags and diagnostic settings from high-speed browser cache.
                  </p>
                </div>
                <button
                  onClick={handleDatabaseReset}
                  className="w-full py-3.5 bg-rose-500/10 md:bg-rose-500/5 hover:bg-rose-500 text-rose-600 hover:text-white dark:hover:text-white border border-rose-200 dark:border-rose-900/60 rounded-2xl text-[10.5px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                >
                  Confirm Database Purge
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ACTIVE PORTAL TAB: MONETIZATION & PREMIUM */}
        {activeTab === 'monetization' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-left"
          >
            {/* PREMIUM PLAN SECTION */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <SparklesIcon size={12} className="text-amber-500" /> Subscription Solutions
              </h2>
              <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-amber-500/20 bg-radial-gradient">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <SparklesIcon size={120} className="text-amber-400" />
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      ★ NEXTASK PREMIUM
                    </div>
                    <h3 className="text-2xl font-bold font-display tracking-tight mt-1.5">Pro Workspace Suite</h3>
                    <p className="text-[10.5px] text-slate-300 font-medium font-sans">Unshackle your productivity with elite AI & complete ad-removal.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black font-display text-amber-400">$4.99</span>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Per Month / Cancel Anytime</span>
                  </div>
                </div>

                {isPremium ? (
                  <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Your Pro Subscription is currently ACTIVE. Thank you for supporting NexTask development!</span>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[11px] text-slate-200">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-amber-400 flex-shrink-0" />
                        <span>Unlimited server-side Gemini Interactions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-amber-400 flex-shrink-0" />
                        <span>Instant Raw PDF and Excel File Exporters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-amber-400 flex-shrink-0" />
                        <span>Exclusive AI Productivity Coach Consultations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-amber-400 flex-shrink-0" />
                        <span>Enterprise Cloud Sync & 100% No Ads</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePurchasePremium}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold uppercase tracking-widest text-[11px] rounded-2xl shadow-lg shadow-amber-500/10 duration-150 active:scale-95 transition-all cursor-pointer text-center"
                    >
                      Upgrade To Pro Workspace Now
                    </button>
                    <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider">
                      Secure payment managed via encrypted test checkout gateways.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* INTEGRATED ADMOB SIMULATOR */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Tv size={12} /> Google AdMob Sandboxing
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Ad Placement Controls</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-450 font-semibold leading-relaxed font-sans">
                      Toggle whether Google AdMob banner and interstitial triggers are enabled in your current UI layouts.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = !adsEnabled;
                      setAdsEnabled(updated);
                      localStorage.setItem('nextask_ads_enabled', String(updated));
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                      adsEnabled 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {adsEnabled ? 'Ads Active' : 'Ads Blocked'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!adsEnabled) {
                        alert("AdMob triggers are currently disabled. Please activate the 'Ads Active' toggle first.");
                        return;
                      }
                      alert("AdMob Banner triggered successfully. Banner is visible at the footer section.");
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-[10.5px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 grayscale hover:grayscale-0 group"
                  >
                    <Tv size={16} className="text-slate-450 group-hover:text-indigo-500 transition-colors" />
                    <span>Load Banner Ad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isPremium) {
                        alert("Pro account active: Interstitial bypass validated. Upgrade removes all prompt overlays.");
                        return;
                      }
                      if (!adsEnabled) {
                        alert("AdMob triggers are currently disabled. Please activate the 'Ads Active' toggle first.");
                        return;
                      }
                      setAdTimer(3);
                      setShowAdOverlay('interstitial');
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-[10.5px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 grayscale hover:grayscale-0 group"
                  >
                    <Tv size={16} className="text-slate-450 group-hover:text-amber-500 transition-colors" />
                    <span>Trigger Interstitial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!adsEnabled) {
                        alert("AdMob triggers are currently disabled. Please activate the 'Ads Active' toggle first.");
                        return;
                      }
                      setAdTimer(5);
                      setShowAdOverlay('rewarded');
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-[10.5px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 grayscale hover:grayscale-0 group"
                  >
                    <Tv size={16} className="text-slate-450 group-hover:text-emerald-500 transition-colors" />
                    <span>Trigger Rewarded</span>
                  </button>
                </div>
              </div>
            </div>

            {/* REFERRAL SYSTEM */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Share2 size={12} /> Invite & Referral Network
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <p className="text-[10.5px] text-slate-500 dark:text-slate-450 font-semibold leading-relaxed font-sans">
                  Earn +3 free days of NexTask Premium for every friend who registers using your personalized referral token link!
                </p>

                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                  <input
                    type="text"
                    readOnly
                    value={`https://nextask.app/join?ref=NEXT-${user?.displayName?.split(' ')[0]?.toUpperCase() || 'USER'}-9842`}
                    className="flex-1 bg-transparent border-0 px-3.5 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Join me on NexTask, the ultimate offline-first productivity platform! Use link: https://nextask.app/join?ref=NEXT-${user?.displayName?.split(' ')[0]?.toUpperCase() || 'USER'}-9842 to unlock premium.`);
                      setReferralCopied(true);
                      setTimeout(() => setReferralCopied(false), 2000);
                    }}
                    className="px-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                  >
                    {referralCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Your Referral History</h5>
                  <div className="space-y-2">
                    {referrals.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl text-[11px]">
                        <div className="text-left">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold font-sans">Registered {r.date}</span>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                            r.status === 'Completed' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-550/10 text-amber-600 dark:text-amber-450'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-[9px] text-slate-405 block font-extrabold mt-0.5">{r.reward}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ACTIVE PORTAL TAB: SECURE ADMIN WORKSPACE */}
        {activeTab === 'admin' && user?.email === 'mdarman000732@gmail.com' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-left"
          >
            {/* DIAGNOSTIC TELEMETRY MONITOR */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Activity size={12} /> Live Server Diagnostics
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-xs text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Service Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-850 dark:text-white">Active (Port 3000)</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-xs text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Firestore Buffer</span>
                  <span className="text-sm font-black text-slate-850 dark:text-white block mt-0.5">387 KB (Cached)</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-xs text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">API Latency</span>
                  <span className="text-sm font-black text-emerald-500 block mt-0.5">14ms (Node CJS)</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-xs text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Users</span>
                  <span className="text-sm font-black text-indigo-500 dark:text-indigo-400 block mt-0.5">{adminUsers.length} Logged In</span>
                </div>
              </div>
            </div>

            {/* REAL-TIME SYSTEM LOG CONSOLE */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Layout size={12} /> Terminal Executive Logs
              </h2>
              <div className="bg-slate-950 border border-slate-900 rounded-3xl p-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">nextask_admin@cloudrun</span>
                </div>
                <div className="font-mono text-[10px] leading-relaxed text-emerald-500/90 text-left space-y-1 h-32 overflow-y-auto custom-scrollbar">
                  {systemLogs.map((log, idx) => (
                    <div key={idx} className="truncate select-text">
                      <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> {log}
                    </div>
                  ))}
                  <div className="text-slate-500 animate-pulse">_ system observer node listening...</div>
                </div>
              </div>
            </div>

            {/* USER MANAGEMENT */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <Users size={12} /> Active User Portfolio
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 dark:border-slate-800 pb-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <th className="py-2.5 px-3">Identity</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Premium</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {adminUsers.map((u) => (
                        <tr key={u.uid} className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/20 ${u.banned ? 'opacity-40 animate-pulse' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{u.displayName}</div>
                            <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{u.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-md font-bold uppercase tracking-wider text-[8.5px] text-slate-500 dark:text-slate-400">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${u.isPremium ? 'bg-amber-400 shadow-sm' : 'bg-slate-200 dark:bg-slate-700'}`} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleTogglePremiumAdmin(u.uid)}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 duration-100 cursor-pointer ${
                                  u.isPremium 
                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-200/30' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200'
                                }`}
                                title="Toggle Premium Status"
                              >
                                {u.isPremium ? 'Revoke PRO' : 'Grant PRO'}
                              </button>
                              <button
                                onClick={() => handleToggleBanAdmin(u.uid)}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 duration-100 cursor-pointer ${
                                  u.banned 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/15 text-emerald-600 border border-emerald-200/20' 
                                    : 'bg-rose-50 dark:bg-rose-950/15 text-rose-600 border border-rose-200/20'
                                }`}
                                title={u.banned ? 'Reinstate User account' : 'Force suspend user account'}
                              >
                                {u.banned ? 'Reinstate' : 'Ban'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* FEEDBACK RESOLUTION SYSTEM */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <MessageSquare size={12} /> Feedback & Escalations Desk
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="space-y-3">
                  {adminTickets.map((t) => (
                    <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl relative overflow-hidden text-sans text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-left">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{t.user}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold font-sans">Submitted {t.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400 text-xs">
                            {Array.from({ length: t.rating }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide ${
                            t.resolved 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450' 
                              : 'bg-amber-550/10 text-amber-600 dark:text-amber-450'
                          }`}>
                            {t.resolved ? 'Resolved' : 'Reviewing'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-slate-600 dark:text-slate-350 font-medium leading-relaxed mb-3 pr-4 text-left font-sans">
                        "{t.message}"
                      </p>

                      {t.resolved && t.reply ? (
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-left border-l-2 border-l-emerald-500 font-sans">
                          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider block">Official response</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{t.reply}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 mt-2">
                          <textarea
                            placeholder="Formulate official administrator answer..."
                            value={ticketReplyInputs[t.id] || ''}
                            onChange={(e) => setTicketReplyInputs(prev => ({ ...prev, [t.id]: e.target.value }))}
                            className="w-full text-[10.5px] p-2 bg-slate-105 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-left font-sans"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const response = ticketReplyInputs[t.id];
                                if (!response || !response.trim()) {
                                  alert("Please draft an official response message first.");
                                  return;
                                }
                                setAdminTickets(prev => prev.map(tick => {
                                  if (tick.id === t.id) {
                                    return { ...tick, resolved: true, reply: response };
                                  }
                                  return tick;
                                }));
                                alert(`Feedback Ticket #${t.id} successfully answered and closed.`);
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer font-sans"
                            >
                              Dispatch Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* CONNECTION & PWA DETAILS FOOTER BAR */}
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/4 *dark:border-indigo-900/30 p-4.5 rounded-[1.5rem] flex flex-col gap-2 bg-gradient-to-r from-indigo-50/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">NexTask PWA System</span>
            </div>
            <div className="flex items-center gap-1 py-0.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-[9px] font-extrabold shadow-sm uppercase tracking-wider">
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-450" />
                  <span className="text-rose-600 dark:text-rose-400">Offline (Local Cache)</span>
                </>
              )}
            </div>
          </div>
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold leading-relaxed text-left">
            Local service workers and cache nodes are live. Entire app assets and Firestore buffers are cache-bound for complete offline redundancy.
          </p>

          {deferredPrompt && (
            <button
              onClick={onInstallApp}
              className="mt-1 flex items-center justify-center gap-2 py-3 bg-brand-primary hover:bg-indigo-650 text-white rounded-xl text-[10px] uppercase font-bold tracking-widest shadow shadow-indigo-600/10 duration-150 active:scale-95 transition-all cursor-pointer"
            >
              <Smartphone size={13} />
              <span>Install Launcher App</span>
            </button>
          )}
        </div>

        {/* SIGN OUT ACTION */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 active:scale-[0.99] font-bold uppercase tracking-widest text-[11px] rounded-[1.5rem] transition-all cursor-pointer shadow-sm"
        >
          <LogOut size={16} />
          Reset App Session
        </button>

      </div>

      {/* ADMOB INTEGRATION BANNER */}
      {!isPremium && adsEnabled && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl relative overflow-hidden flex items-center gap-3 shadow-xs text-left"
        >
          <div className="p-1 px-1.5 bg-amber-500 text-[8px] font-black text-white rounded uppercase tracking-wider h-max">
            Ad
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">Google AdMob Placement</h5>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-tight mt-1 truncate">
              Sparkles Task Planner: Organize your week in seconds with Gemini!
            </p>
          </div>
          <button 
            onClick={() => alert("Simulating redirection to app web download node...")}
            className="p-1 px-3 bg-amber-500 hover:bg-amber-650 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider duration-100 active:scale-95 cursor-pointer flex-shrink-0"
          >
            Install
          </button>
        </motion.div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <button type="button" onClick={() => onNavigate?.('about')} className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors bg-transparent border-0 p-0">About Us</button>
        <span className="text-slate-200 dark:text-slate-800">•</span>
        <button type="button" onClick={() => onNavigate?.('contact')} className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors bg-transparent border-0 p-0">Contact Us</button>
        <span className="text-slate-200 dark:text-slate-800">•</span>
        <button type="button" onClick={() => onNavigate?.('privacy')} className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors bg-transparent border-0 p-0">Privacy Policy</button>
        <span className="text-slate-200 dark:text-slate-800">•</span>
        <button type="button" onClick={() => onNavigate?.('terms')} className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors bg-transparent border-0 p-0">Terms of Service</button>
        <span className="text-slate-200 dark:text-slate-800">•</span>
        <button type="button" onClick={() => onNavigate?.('deletion')} className="hover:text-rose-600 dark:hover:text-rose-450 cursor-pointer transition-colors bg-transparent border-0 p-0">Delete Data</button>
      </div>

      <div className="flex justify-center pt-3 pb-4">
        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
          NexTask v1.2.0 • Progressive Web Experience
        </span>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />

      {/* FULL-SCREEN ADMOB OVERLAY SIMULATOR */}
      <AnimatePresence>
        {showAdOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans"
          >
            <div className="absolute top-4 left-4 flex items-center gap-1.5 py-1 px-3 bg-slate-900 border border-slate-800 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-amber-500">
              <Tv size={10} />
              <span>Google AdMob Sandbox Play</span>
            </div>

            <div className="absolute top-4 right-4">
              {adTimer > 0 ? (
                <div className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-[11px] font-black text-amber-400">
                  {adTimer}
                </div>
              ) : (
                <button
                  onClick={() => {
                    const rewarded = showAdOverlay === 'rewarded';
                    setShowAdOverlay(null);
                    if (rewarded) {
                      localStorage.setItem(`nextask_premium_${user?.uid}`, 'true');
                      setIsPremium(true);
                      alert("CONGRATULATIONS! You completed watching the rewarded ad! Free NexTask Premium status has been unlocked on your active session!");
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow active:scale-95 duration-100"
                >
                  Close Ad ✕
                </button>
              )}
            </div>

            <div className="w-full max-w-md space-y-6">
              {showAdOverlay === 'interstitial' ? (
                <>
                  <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                    <SparklesIcon size={36} className="animate-bounce mt-1" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white font-display">Sparkles AI Task Scheduler</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Banish checklist burnout forever. Let our advanced Gemini deep-scheduler structure your custom daily agendas in single-tap.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => alert("Simulating app download referral...")}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer shadow-lg active:scale-95 duration-100"
                    >
                      Install Workspace Optimizer
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-48 h-32 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center mx-auto shadow-inner overflow-hidden">
                    <div className="absolute inset-0 bg-radial-gradient opacity-10" />
                    <Tv size={42} className="text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-450 mt-2">Playing Promotion Clip</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white font-display uppercase tracking-widest text-amber-500">Sponsored Video Placement</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      Complete this 5-second video ad challenge to unlock free Premium Pro features for your NexTask workspace!
                    </p>
                  </div>
                  {adTimer > 0 && (
                    <div className="w-full bg-slate-905 border border-slate-850 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="bg-amber-500 h-full" 
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
