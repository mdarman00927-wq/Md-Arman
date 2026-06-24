/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import BottomNav from './components/BottomNav';
import CreateTaskModal from './components/CreateTaskModal';
import CreateNoteModal from './components/CreateNoteModal';
import AIAssistantModal from './components/AIAssistantModal';
import Dashboard from './views/Dashboard';
import Calendar from './views/Calendar';
import FocusTimer from './views/FocusTimer';
import Notes from './views/Notes';
import Analytics from './views/Analytics';
import Settings from './views/Settings';
import SocialPlatform from './views/SocialPlatform';
import AuthScreen from './views/AuthScreen';
import PrivacyPolicy from './views/PrivacyPolicy';
import TermsConditions from './views/TermsConditions';
import AboutUs from './views/AboutUs';
import ContactUs from './views/ContactUs';
import DataDeletion from './views/DataDeletion';
import HelpCenter from './views/HelpCenter';
import FirebaseStatus from './views/FirebaseStatus';
import NotFound from './views/NotFound';
import { View, Task, Note, OnboardingState } from './types';
import { AuthProvider, useAuth } from './services/AuthContext';
import { ThemeProvider, useTheme } from './services/ThemeContext';
import { NotificationProvider } from './services/NotificationContext';
import { ToastProvider, useToast } from './services/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { taskService, noteService, onboardingService } from './services/dataService';
import { Sparkles, WifiOff, Lock, Delete, RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  
  const [activeView, setActiveView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\//, '');
      const validViews: View[] = [
        'dashboard', 'calendar', 'focus', 'notes', 'settings', 'analytics', 
        'privacy', 'terms', 'about', 'contact', 'deletion', 'help', 'firebase-status', 'social'
      ];
      if (validViews.includes(path as View)) {
        return path as View;
      }
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (validViews.includes(hash as View)) {
        return hash as View;
      }
    }
    return 'dashboard';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '') || 'dashboard';
      const validViews: View[] = [
        'dashboard', 'calendar', 'focus', 'notes', 'settings', 'analytics', 
        'privacy', 'terms', 'about', 'contact', 'deletion', 'help', 'firebase-status', 'social'
      ];
      if (validViews.includes(path as View)) {
        setActiveView(path as View);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.replace(/^\//, '') || 'dashboard';
      if (currentPath !== activeView) {
        const targetPath = activeView === 'dashboard' ? '/' : '/' + activeView;
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [activeView]);
  const [dbLoadError, setDbLoadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`NexTask install choice outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [initialAITab, setInitialAITab] = useState<'copilot' | 'planner' | 'coach'>('copilot');
  const [initialVoiceActive, setInitialVoiceActive] = useState<boolean>(false);

  const openAIWithTab = (tab: 'copilot' | 'planner' | 'coach' = 'copilot', voiceActive = false) => {
    setInitialAITab(tab);
    setInitialVoiceActive(voiceActive);
    setIsAIModalOpen(true);
  };

  // Global State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Secure App PIN Lock State Control
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const pinEnabled = localStorage.getItem('nextask_pin_enabled') === 'true';
    const hasPin = !!localStorage.getItem('nextask_pin');
    return pinEnabled && hasPin;
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Sync PIN Lock State from settings instantly
  const refreshPinLockSettings = useCallback(() => {
    const pinEnabled = localStorage.getItem('nextask_pin_enabled') === 'true';
    const hasPin = !!localStorage.getItem('nextask_pin');
    if (!pinEnabled || !hasPin) {
      setIsLocked(false);
    }
  }, []);

  const handlePinDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    setPinError(false);
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);

    if (newPin.length === 4) {
      const correctPin = localStorage.getItem('nextask_pin') || '';
      if (newPin === correctPin) {
        setIsLocked(false);
        setEnteredPin('');
      } else {
        setTimeout(() => {
          setPinError(true);
          setEnteredPin('');
        }, 120);
      }
    }
  };

  const handlePinDelete = () => {
    setPinError(false);
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handleImportRestore = useCallback(async (importedTasks: Task[], importedNotes: Note[]) => {
    if (!user) return;
    setDataLoading(true);
    try {
      setTasks(importedTasks);
      setNotes(importedNotes);

      // Persist across Cloud or Local fallback
      for (const t of importedTasks) {
        await taskService.saveTask(user.uid, { ...t, ownerId: user.uid } as any);
      }
      for (const n of importedNotes) {
        await noteService.saveNote(user.uid, { ...n, ownerId: user.uid } as any);
      }
      showToast("Data backup successfully restored", "success");
    } catch (e) {
      console.error("Failed importing JSON archive:", e);
      showToast("Sync Error: Failed to restore backup completely", "error");
    } finally {
      setDataLoading(false);
    }
  }, [user, showToast]);

  const handleResetDatabase = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      // Clear data arrays
      setTasks([]);
      setNotes([]);
      setOnboarding(null);

      // Clear actual stores
      localStorage.removeItem(`tasks_${user.uid}`);
      localStorage.removeItem(`notes_${user.uid}`);
      localStorage.removeItem(`onboarding_${user.uid}`);

      // Call database services to repopulate initial fresh templates
      const fetchedTasks = await taskService.fetchTasks(user.uid);
      const fetchedNotes = await noteService.fetchNotes(user.uid) as unknown as Note[];
      const fetchedOnboarding = await onboardingService.fetchOnboarding(user.uid);
      setTasks(fetchedTasks as unknown as Task[]);
      setNotes(fetchedNotes);
      setOnboarding(fetchedOnboarding);
      showToast("Database successfully cleared and re-initialized", "success");
    } catch (err) {
      console.error("Failed clearing local tables:", err);
      showToast("Sync Error: Failed to reset database", "error");
    } finally {
      setDataLoading(false);
    }
  }, [user, showToast]);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setNotes([]);
      setOnboarding(null);
      return;
    }
    setDataLoading(true);
    setDbLoadError(null);
    try {
      const fetchedTasks = await taskService.fetchTasks(user.uid);
      const fetchedNotes = await noteService.fetchNotes(user.uid) as unknown as Note[];
      const fetchedOnboarding = await onboardingService.fetchOnboarding(user.uid);
      setTasks(fetchedTasks as unknown as Task[]);
      setNotes(fetchedNotes);
      setOnboarding(fetchedOnboarding);
    } catch (err) {
      console.error("Failed to synchronize user document records: ", err);
      setDbLoadError(err instanceof Error ? err.message : "Unstable network connection or permission issue");
      showToast("Failed to load your items. Please verify internet access.", "error");
    } finally {
      setDataLoading(false);
    }
  }, [user, showToast]);

  // Dynamic onboarding check for tasks and notes presence
  useEffect(() => {
    if (!user || !onboarding) return;

    let updated = false;
    const newOnboarding = { ...onboarding };

    if (tasks.length > 0 && !newOnboarding.step1Completed) {
      newOnboarding.step1Completed = true;
      updated = true;
    }
    if (notes.length > 0 && !newOnboarding.step2Completed) {
      newOnboarding.step2Completed = true;
      updated = true;
    }

    // Check if everything is now completed for the first time
    const wasAllCompletedBefore = onboarding.step1Completed && onboarding.step2Completed && onboarding.step3Completed && onboarding.step4Completed && onboarding.step5Completed;
    const isAllCompletedNow = newOnboarding.step1Completed && newOnboarding.step2Completed && newOnboarding.step3Completed && newOnboarding.step4Completed && newOnboarding.step5Completed;

    if (isAllCompletedNow && !wasAllCompletedBefore && !newOnboarding.completedAt) {
      newOnboarding.completedAt = new Date().toISOString();
      updated = true;
      showToast("🎉 Onboarding Completed! Congratulations!", "success");
    }

    if (updated) {
      setOnboarding(newOnboarding);
      onboardingService.saveOnboarding(user.uid, newOnboarding).catch(err => {
        console.error("Failed saving updated onboarding progress:", err);
      });
    }
  }, [tasks.length, notes.length, onboarding, user, showToast]);

  const completeOnboardingStep = useCallback((stepIndex: number) => {
    if (!user || !onboarding) return;
    
    const key = `step${stepIndex}Completed` as keyof OnboardingState;
    if (onboarding[key] === true) return; // already completed

    const newOnboarding = { ...onboarding, [key]: true };

    const wasAllCompletedBefore = onboarding.step1Completed && onboarding.step2Completed && onboarding.step3Completed && onboarding.step4Completed && onboarding.step5Completed;
    const isAllCompletedNow = newOnboarding.step1Completed && newOnboarding.step2Completed && newOnboarding.step3Completed && newOnboarding.step4Completed && newOnboarding.step5Completed;

    if (isAllCompletedNow && !wasAllCompletedBefore && !newOnboarding.completedAt) {
      newOnboarding.completedAt = new Date().toISOString();
      showToast("🎉 Onboarding Completed! Congratulations!", "success");
    }

    setOnboarding(newOnboarding);
    onboardingService.saveOnboarding(user.uid, newOnboarding).catch(err => {
      console.error(`Failed to save onboarding step ${stepIndex} completion:`, err);
    });
  }, [user, onboarding, showToast]);

  const updateOnboarding = useCallback((updates: Partial<OnboardingState>) => {
    if (!user || !onboarding) return;
    const newOnboarding = { ...onboarding, ...updates };
    setOnboarding(newOnboarding);
    onboardingService.saveOnboarding(user.uid, newOnboarding).catch(err => {
      console.error("Failed to update onboarding setting:", err);
    });
  }, [user, onboarding]);

  // Sync state whenever the active user shifts
  useEffect(() => {
    loadUserData();
  }, [user, loadUserData]);

  const addTask = useCallback(async (taskData: Partial<Task>) => {
    if (!user) return;
    
    const taskId = Math.random().toString(36).substr(2, 9);
    const newTask: Task = {
      id: taskId,
      completed: false,
      title: taskData.title || 'New Task',
      priority: taskData.priority || 'medium',
      category: taskData.category || 'General',
      ownerId: user.uid,
      ...taskData,
    } as Task;

    // Optimistic Update
    setTasks(prev => [newTask, ...prev]);
    showToast(`Task "${newTask.title}" added`, "success");
    
    try {
      await taskService.saveTask(user.uid, newTask as any);
    } catch (err) {
      console.error("Failed to commit task record to cloud Database: ", err);
      showToast("Sync Warning: Task saved locally. Waiting for connection.", "warning");
    }
  }, [user, showToast]);

  // Helper to calculate the next sequence due date for a recurring task
  const calculateNextDueDate = (task: Task): string | undefined => {
    if (!task.recurrence || task.recurrence.interval === 'none') return undefined;

    const currentDueDateStr = task.dueDate;
    let baseDate: Date;
    if (currentDueDateStr) {
      baseDate = new Date(currentDueDateStr);
    } else {
      baseDate = new Date();
    }

    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    const { interval, customInterval = 1, customUnit = 'days', daysOfWeek } = task.recurrence;

    if (interval === 'daily') {
      baseDate.setDate(baseDate.getDate() + 1);
    } else if (interval === 'weekly') {
      if (daysOfWeek && daysOfWeek.length > 0) {
        let found = false;
        let nextDate = new Date(baseDate);
        for (let i = 1; i <= 7; i++) {
          nextDate.setDate(nextDate.getDate() + 1);
          const dayNum = nextDate.getDay();
          if (daysOfWeek.includes(dayNum)) {
            baseDate = nextDate;
            found = true;
            break;
          }
        }
        if (!found) {
          baseDate.setDate(baseDate.getDate() + 7);
        }
      } else {
        baseDate.setDate(baseDate.getDate() + 7);
      }
    } else if (interval === 'monthly') {
      baseDate.setMonth(baseDate.getMonth() + 1);
    } else if (interval === 'custom') {
      const val = customInterval;
      if (customUnit === 'days') {
        baseDate.setDate(baseDate.getDate() + val);
      } else if (customUnit === 'weeks') {
        if (daysOfWeek && daysOfWeek.length > 0) {
          let found = false;
          let nextDate = new Date(baseDate);
          for (let i = 1; i <= val * 7; i++) {
            nextDate.setDate(nextDate.getDate() + 1);
            const dayNum = nextDate.getDay();
            
            if (daysOfWeek.includes(dayNum)) {
              const startOfWeek = (d: Date) => {
                const res = new Date(d);
                const day = res.getDay();
                res.setDate(res.getDate() - day);
                res.setHours(0,0,0,0);
                return res;
              };
              const w1 = startOfWeek(baseDate).getTime();
              const w2 = startOfWeek(nextDate).getTime();
              const weekDiff = Math.round((w2 - w1) / (7 * 24 * 60 * 60 * 1000));
              if (weekDiff === 0 || weekDiff % val === 0) {
                baseDate = nextDate;
                found = true;
                break;
              }
            }
          }
          if (!found) {
            baseDate.setDate(baseDate.getDate() + (val * 7));
          }
        } else {
          baseDate.setDate(baseDate.getDate() + (val * 7));
        }
      } else if (customUnit === 'months') {
        baseDate.setMonth(baseDate.getMonth() + val);
      }
    }

    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleTask = useCallback(async (id: string) => {
    if (!user) return;
    
    let updatedTask: Task | null = null;
    let nextTaskToCreate: Task | null = null;

    setTasks(prev => {
      let isFirstTimeComp = false;
      let matchedTask: Task | null = null;
      
      const updatedList = prev.map(t => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          isFirstTimeComp = nextCompleted;
          updatedTask = { ...t, completed: nextCompleted };
          matchedTask = t;
          return updatedTask;
        }
        return t;
      });

      if (matchedTask && isFirstTimeComp && matchedTask.recurrence && matchedTask.recurrence.interval !== 'none') {
        const nextDate = calculateNextDueDate(matchedTask);
        if (nextDate) {
          const countLeft = matchedTask.recurrence.count !== undefined ? matchedTask.recurrence.count - 1 : undefined;
          
          if (countLeft === undefined || countLeft > 0) {
            let isBeforeEnd = true;
            if (matchedTask.recurrence.endDate) {
              const dNext = new Date(nextDate);
              const dEnd = new Date(matchedTask.recurrence.endDate);
              if (dNext > dEnd) {
                isBeforeEnd = false;
              }
            }
            if (isBeforeEnd) {
              const nextId = Math.random().toString(36).substr(2, 9);
              nextTaskToCreate = {
                ...matchedTask,
                id: nextId,
                completed: false,
                dueDate: nextDate,
                recurrence: {
                  ...matchedTask.recurrence,
                  count: countLeft
                }
              };
            }
          }
        }
      }

      if (nextTaskToCreate) {
        return [nextTaskToCreate, ...updatedList];
      }
      return updatedList;
    });

    if (updatedTask) {
      try {
        await taskService.saveTask(user.uid, updatedTask as any);
        if (nextTaskToCreate) {
          await taskService.saveTask(user.uid, nextTaskToCreate as any);
          showToast("Task completed & recurring task scheduled", "success");
        } else {
          showToast(`Task marked as ${updatedTask.completed ? 'completed' : 'pending'}`, "success");
        }
      } catch (err) {
        console.error("Failed to commit toggled task transaction: ", err);
        showToast("Sync Warning: State saved locally. Waiting for connection.", "warning");
      }
    }
  }, [user, showToast]);

  const updateTask = useCallback(async (updatedTask: Task) => {
    if (!user) return;
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    try {
      await taskService.saveTask(user.uid, updatedTask as any);
      showToast("Task successfully updated", "success");
    } catch (err) {
      console.error("Failed to commit updated task record to cloud Database: ", err);
      showToast("Sync Warning: Update saved locally. Waiting for connection.", "warning");
    }
  }, [user, showToast]);

  const saveNote = useCallback(async (noteData: Partial<Note>) => {
    if (!user) return;

    if (noteData.id) {
      // It's an update!
      const updatedNote: Note = {
        ...noteData,
        updatedAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      } as Note;
      
      setNotes(prev => prev.map(n => n.id === noteData.id ? { ...n, ...updatedNote } : n));
      showToast("Note updated successfully", "success");
      
      try {
        await noteService.saveNote(user.uid, { ...updatedNote, ownerId: user.uid } as any);
      } catch (err) {
        console.error("Failed to commit note edit: ", err);
        showToast("Sync Warning: Edit saved locally.", "warning");
      }
    } else {
      // It's a create!
      const noteId = Math.random().toString(36).substr(2, 9);
      const newNote: Note = {
        id: noteId,
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        updatedAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        color: noteData.color || '#6366f1',
        tags: noteData.tags || [],
        pinned: noteData.pinned || false,
        category: noteData.category || 'General',
        ownerId: user.uid
      };

      setNotes(prev => [newNote, ...prev]);
      showToast(`Note "${newNote.title}" created`, "success");

      try {
        await noteService.saveNote(user.uid, newNote as any);
      } catch (err) {
        console.error("Failed to commit note record: ", err);
        showToast("Sync Warning: Note saved locally.", "warning");
      }
    }
  }, [user, showToast]);

  const deleteNote = useCallback(async (id: string) => {
    if (!user) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast("Note successfully deleted", "success");
    try {
      await noteService.deleteNote(user.uid, id);
    } catch (err) {
      console.error("Failed to delete note: ", err);
      showToast("Sync Warning: Note deletion cached locally.", "warning");
    }
  }, [user, showToast]);

  const togglePinNote = useCallback(async (id: string) => {
    if (!user) return;
    let updatedNote: Note | null = null;
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        updatedNote = { ...n, pinned: !n.pinned };
        return updatedNote;
      }
      return n;
    }));

    if (updatedNote) {
      try {
        await noteService.saveNote(user.uid, updatedNote as any);
      } catch (err) {
        console.error("Failed to toggle pin for note: ", err);
        showToast("Sync Warning: Pin status saved locally.", "warning");
      }
    }
  }, [user, showToast]);

  const handleAIAction = (type: 'task' | 'note' | 'event' | 'view', data: any) => {
    if (type === 'task' || type === 'event') {
      addTask(data);
    } else if (type === 'note') {
      saveNote(data);
    } else if (type === 'view') {
      setActiveView(data);
      setIsAIModalOpen(false);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            tasks={tasks} 
            onAddTask={() => setIsCreateModalOpen(true)} 
            onOpenAI={(tab, voice) => openAIWithTab(tab, voice)} 
            onSaveTask={addTask}
            onToggleTask={toggleTask}
            onUpdateTask={updateTask}
            onboarding={onboarding}
            onUpdateOnboarding={updateOnboarding}
            onCreateNote={() => { setEditingNote(null); setIsNoteModalOpen(true); }}
            onGoToSettings={() => setActiveView('settings')}
          />
        );
      case 'calendar':
        return <Calendar tasks={tasks} onToggleTask={toggleTask} />;
      case 'social':
        return <SocialPlatform />;
      case 'focus':
        return <FocusTimer />;
      case 'notes':
        return (
          <Notes 
            notes={notes} 
            onAddNote={() => { setEditingNote(null); setIsNoteModalOpen(true); }} 
            onEditNote={(note) => { setEditingNote(note); setIsNoteModalOpen(true); }}
            onTogglePinNote={togglePinNote}
            onDeleteNote={deleteNote}
          />
        );
      case 'analytics':
        return <Analytics tasks={tasks} notes={notes} />;
      case 'settings':
        return (
          <Settings 
            tasks={tasks} 
            notes={notes} 
            isOnline={isOnline} 
            deferredPrompt={deferredPrompt} 
            onInstallApp={handleInstallApp} 
            onImportRestore={handleImportRestore}
            onResetDatabase={handleResetDatabase}
            onRefreshPinSettings={refreshPinLockSettings}
            onNavigate={setActiveView}
            onCustomizeSettings={() => completeOnboardingStep(5)}
          />
        );
      case 'privacy':
        return <PrivacyPolicy onNavigate={setActiveView} />;
      case 'terms':
        return <TermsConditions onNavigate={setActiveView} />;
      case 'about':
        return <AboutUs onNavigate={setActiveView} />;
      case 'contact':
        return <ContactUs onNavigate={setActiveView} />;
      case 'deletion':
        return <DataDeletion onNavigate={setActiveView} onPurgeOfflineData={handleResetDatabase} />;
      case 'help':
        return <HelpCenter onNavigate={setActiveView} />;
      case 'firebase-status':
        return <FirebaseStatus onNavigate={setActiveView} />;
      default:
        return <NotFound onNavigate={setActiveView} />;
    }
  };

  // 1. Session Loading Check
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-100/30">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-3xl border-2 border-indigo-500/20 animate-ping pointer-events-none" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">NexTask Organizer</h3>
            <p className="text-[11px] text-slate-400 font-medium">Restoring encrypted secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Gate (Protected Routes)
  if (!user) {
    const publicViews: View[] = ['privacy', 'terms', 'about', 'contact', 'deletion', 'help', 'firebase-status'];
    if (publicViews.includes(activeView)) {
      return (
        <div className="min-h-screen bg-surface-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-brand-primary/20">
          <div className="max-w-lg mx-auto min-h-screen relative shadow-2xl shadow-indigo-500/5 dark:shadow-none bg-surface-50 dark:bg-slate-950 overflow-x-hidden">
            <div className="min-h-screen">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {renderView()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      );
    }
    return <AuthScreen />;
  }

  // 2.3 Database Sync Failure / Retry Gate
  if (dbLoadError) {
    return (
      <div id="db-error-view" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans p-6 text-slate-800 dark:text-slate-200 transition-colors duration-300">
        <div id="db-error-container" className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl scale-125 animate-pulse" />
              <div className="relative p-4 bg-indigo-50/85 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-3xl border border-indigo-150 dark:border-indigo-900/40 shadow-sm">
                <WifiOff size={32} />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Sync Connection Suspended</span>
              <h2 className="text-xl font-bold font-display tracking-tight mt-1 text-slate-900 dark:text-white">Cloud Database Offline</h2>
            </div>
          </div>

          <div id="db-error-desc" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-[2rem] shadow-md text-left space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              NexTask could not securely load items from your active cloud document database. This frequently indicates an unstable internet connection.
            </p>
            <div className="p-3 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 rounded-xl">
              <p className="font-mono text-[9px] text-rose-700 dark:text-rose-400 leading-tight break-all">
                Exception details: {dbLoadError}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              id="retry-db-sync"
              onClick={() => {
                showToast("Re-authenticating cloud socket...", "info");
                loadUserData();
              }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-650 text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} className={dataLoading ? "animate-spin" : ""} />
              <span>Retry Connection</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDbLoadError(null);
                setActiveView('firebase-status');
              }}
              className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/40 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles size={12} />
              <span>Open Diagnostics Portal</span>
            </button>

            <button
              type="button"
              id="db-error-offline-fallback"
              onClick={() => {
                showToast("Switched to active local storage backup", "info");
                setDbLoadError(null);
              }}
              className="w-full py-3.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-850/50 rounded-2xl text-[11px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
            >
              Work Offline with Cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2.5 Security PIN Screen Lock Gate
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-6 text-white text-center select-none">
        <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-indigo-500/10 rounded-full text-brand-primary ring-2 ring-indigo-500/20"
          >
            <Lock size={32} />
          </motion.div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-display tracking-tight text-white">NexTask Secured</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose">Enter 4-Digit Security PIN</p>
          </div>

          {/* Dots Indicator */}
          <div className={`flex gap-3.5 py-4 ${pinError ? 'animate-bounce' : ''}`}>
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                  idx < enteredPin.length 
                    ? pinError 
                      ? 'bg-rose-500 border-rose-500 scale-110' 
                      : 'bg-indigo-500 border-indigo-500 scale-110' 
                    : 'border-slate-800 bg-slate-900'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider animate-pulse">
              Invalid passcode. Try again.
            </span>
          )}

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] pt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                type="button"
                key={digit}
                onClick={() => handlePinDigit(digit)}
                className="aspect-square flex items-center justify-center text-lg font-bold font-mono bg-slate-900 hover:bg-slate-850 active:scale-90 border border-slate-900 hover:border-slate-800/85 rounded-full transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPinError(false); setEnteredPin(''); }}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-400 active:scale-95 flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handlePinDigit('0')}
              className="aspect-square flex items-center justify-center text-lg font-bold font-mono bg-slate-900 hover:bg-slate-850 active:scale-90 border border-slate-900 hover:border-slate-800/85 rounded-full transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinDelete}
              className="text-slate-500 hover:text-slate-400 active:scale-95 flex items-center justify-center cursor-pointer"
              title="Delete last digit"
            >
              <Delete size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated View Frame
  return (
    <NotificationProvider tasks={tasks}>
      <div className="min-h-screen bg-surface-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-brand-primary/20">
        <div className="max-w-lg mx-auto min-h-screen relative shadow-2xl shadow-indigo-500/5 dark:shadow-none bg-surface-50 dark:bg-slate-950 overflow-x-hidden">
          
          {/* Animated decorative ambient blobs in the background to sustain modern glassmorphism depth */}
          <div className="absolute top-24 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10 animate-blob-1" />
          <div className="absolute top-[48%] -right-16 w-60 h-60 rounded-full bg-gradient-to-tr from-brand-secondary/10 to-pink-500/5 blur-3xl pointer-events-none -z-10 animate-blob-2" />
          <div className="absolute bottom-28 -left-12 w-48 h-48 rounded-full bg-gradient-to-tr from-emerald-500/10 to-indigo-500/5 blur-3xl pointer-events-none -z-10 animate-blob-1" />

          {/* Offline Banner Indicator */}
          {!isOnline && (
            <div className="bg-rose-500 dark:bg-rose-950/90 text-white py-2.5 px-4 text-center text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-sm sticky top-0 z-50">
              <WifiOff size={11} className="animate-pulse" />
              <span>Offline Draft Mode — Changes will sync when online</span>
            </div>
          )}

          {/* Sync Indicator bar */}
          {dataLoading && (
            <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500/10 overflow-hidden z-50">
              <div className="w-1/3 h-full bg-brand-primary animate-infinite-loading" />
            </div>
          )}

          {/* Main Content with Transition */}
          <div className="min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation */}
          <BottomNav activeView={activeView} onViewChange={setActiveView} />

          {/* Global Modals */}
          <CreateTaskModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
            onSave={addTask} 
          />

          <CreateNoteModal 
            isOpen={isNoteModalOpen} 
            onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }} 
            onSave={saveNote} 
            editingNote={editingNote}
            onDelete={deleteNote}
          />

          <AIAssistantModal 
            isOpen={isAIModalOpen} 
            onClose={() => setIsAIModalOpen(false)} 
            onAction={handleAIAction}
            tasks={tasks}
            notes={notes}
            initialTab={initialAITab}
            initialVoiceActive={initialVoiceActive}
            onScheduleGenerated={() => completeOnboardingStep(3)}
            onPlannerGenerated={() => completeOnboardingStep(4)}
          />
        </div>
      </div>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
