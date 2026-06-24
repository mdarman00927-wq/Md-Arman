import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppNotification, NotificationSettings, Task } from '../types';
import { useAuth } from './AuthContext';
import { notificationService, settingsService } from './dataService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, shouldUseFirebase } from './firebase';

interface NotificationContextProps {
  notifications: AppNotification[];
  unreadCount: number;
  settings: NotificationSettings;
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  triggerNotification: (title: string, body: string, type: AppNotification['type'], targetId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  triggerFocusComplete: (mode: 'focus' | 'short-break' | 'long-break') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const DEFAULT_SETTINGS: NotificationSettings = {
  enablePush: false,
  dueDateReminders: true,
  focusAlerts: true,
  soundAlerts: true,
  dueDateThreshold: '5', // 5 minutes before due time
};

export function NotificationProvider({ children, tasks }: { children: React.ReactNode; tasks: Task[] }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  
  // Track notified tasks to prevent double alerts
  const alertedTasksRef = useRef<Record<string, boolean>>({});

  // 1. Sync notifications & preferences when user shifts
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setSettings(DEFAULT_SETTINGS);
      alertedTasksRef.current = {};
      return;
    }

    async function initUserNotifications() {
      // Fetch Notification History
      const fetched = await notificationService.fetchNotifications(user!.uid);
      setNotifications(fetched);

      // Fetch Notification Settings through settingsService (with retry + miss fallback)
      try {
        const cloudSettings = await settingsService.fetchSettings(user!.uid);
        setSettings({
          enablePush: cloudSettings.enablePush,
          dueDateReminders: cloudSettings.dueDateReminders,
          focusAlerts: cloudSettings.focusAlerts,
          soundAlerts: cloudSettings.soundAlerts,
          dueDateThreshold: cloudSettings.dueDateThreshold
        });
      } catch (e) {
        console.warn("Could not fetch cloud settings via service wrapper, falling back to local storage:", e);
        const local = localStorage.getItem(`notif_settings_${user!.uid}`);
        if (local) {
          setSettings(JSON.parse(local));
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    }

    initUserNotifications();
  }, [user]);

  // Request browser desktop notifications permission
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    try {
      const status = await Notification.requestPermission();
      setPermissionStatus(status);
      if (status === 'granted') {
        await updateSettings({ enablePush: true });
        return true;
      } else {
        await updateSettings({ enablePush: false });
        return false;
      }
    } catch (err) {
      console.error("Failed requesting browser notification guidelines:", err);
      return false;
    }
  };

  // Update Settings (Both locally or in cloud store)
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Persist to local cache immediately
    localStorage.setItem(`notif_settings_${user.uid}`, JSON.stringify(updated));

    if (shouldUseFirebase(user.uid)) {
      try {
        // Legacy: Support notificationSettings map inside users profile
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { notificationSettings: updated }, { merge: true });

        // New Collection: Support dedicated settings/ collection document
        await settingsService.saveSettings(user.uid, {
          id: user.uid,
          ownerId: user.uid,
          theme: 'light',
          enablePush: updated.enablePush,
          dueDateReminders: updated.dueDateReminders,
          focusAlerts: updated.focusAlerts,
          soundAlerts: updated.soundAlerts,
          dueDateThreshold: updated.dueDateThreshold
        });
      } catch (err) {
        console.warn("Could not save cloud notification preferences:", err);
      }
    }
  };

  // Play a browser native Audio Context synthesized chime chord
  const playSynthesizedChime = () => {
    if (!settings.soundAlerts) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      
      osc.start(now);
      osc.stop(now + 0.7);
    } catch (err) {
      console.warn("Synthesizer blocked or unsupported:", err);
    }
  };

  // Core trigger for in-app and native push alarms
  const triggerNotification = async (
    title: string,
    body: string,
    type: AppNotification['type'],
    targetId?: string
  ) => {
    if (!user) return;

    // Create App Notification Document
    const notif: AppNotification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      title,
      body,
      type,
      read: false,
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      targetId,
    };

    // Optimistic append
    setNotifications(prev => [notif, ...prev]);
    
    // Save to Firestore / LocalStorage
    await notificationService.saveNotification(user.uid, notif);

    // Audio chime trigger
    playSynthesizedChime();

    // Trigger Browser Push Notification if authorized
    if (settings.enablePush && permissionStatus === 'granted' && typeof window !== 'undefined') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn("Could not dispatch native push alert:", err);
      }
    }
  };

  const triggerFocusComplete = async (mode: 'focus' | 'short-break' | 'long-break') => {
    if (!settings.focusAlerts) return;
    const title = mode === 'focus' ? '🎯 Focus Session Complete!' : '☕ Break Finished!';
    const body = mode === 'focus' 
      ? 'Outstanding job staying on task! Time to take a short, well-earned break.'
      : 'Ready to kick off another beautiful productivity sprint? Let\'s go!';
    
    await triggerNotification(title, body, 'focus');
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const target = notifications.find(n => n.id === id);
    if (target) {
      await notificationService.saveNotification(user.uid, { ...target, read: true });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await notificationService.markAllAsRead(user.uid);
  };

  const clearAll = async () => {
    if (!user) return;
    setNotifications([]);
    await notificationService.clearAllNotifications(user.uid);
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    await notificationService.deleteNotification(user.uid, id);
  };

  // 2. BACKGROUND ALERT TICKER DAEMON
  // Scans tasks with dueDate & dueTime scheduled, then matches with due thresholds
  useEffect(() => {
    if (!user || !settings.dueDateReminders) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      
      tasks.forEach((task) => {
        // Skip completed tasks
        if (task.completed) return;
        
        // We only check if task has both dueDate and dueTime declared
        if (!task.dueDate || !task.dueTime) return;

        try {
          // Parse due date string (YYYY-MM-DD format) & dueTime (HH:MM or HH:MM AM/PM format)
          const datePart = task.dueDate; // "2026-06-06"
          const timePart = task.dueTime; // "14:30" or "02:30 PM"
          
          let hours = 0;
          let minutes = 0;

          if (timePart.includes('M') || timePart.includes('m')) {
            // Handle AM/PM format
            const [time, modifier] = timePart.split(' ');
            let [hStr, mStr] = time.split(':');
            hours = parseInt(hStr, 10);
            minutes = parseInt(mStr, 10);
            
            if (modifier.toLowerCase() === 'pm' && hours < 12) {
              hours += 12;
            }
            if (modifier.toLowerCase() === 'am' && hours === 12) {
              hours = 0;
            }
          } else {
            // Handle 24h format "14:30"
            const [hStr, mStr] = timePart.split(':');
            hours = parseInt(hStr, 10);
            minutes = parseInt(mStr, 10);
          }

          // Create complete target Date object
          const [year, month, day] = datePart.split('-').map(Num => parseInt(Num, 10));
          const dueDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
          
          const timeDiffMs = dueDateTime.getTime() - now.getTime();
          const minutesDiff = Math.ceil(timeDiffMs / (1000 * 60));

          // Load target threshold config in minutes
          const thresholdOffset = parseInt(settings.dueDateThreshold, 10);

          // Unique alert ID per task-threshold pair to guarantee exactly-once alerts
          const alertKey = `${task.id}_${thresholdOffset}`;

          if (minutesDiff >= 0 && minutesDiff <= thresholdOffset) {
            // Check if alert has already triggered for this key
            if (!alertedTasksRef.current[alertKey]) {
              alertedTasksRef.current[alertKey] = true;

              // Dispatch Alert
              const warningTimeStr = thresholdOffset === 0 
                ? 'is due right now!' 
                : `is due in ${minutesDiff} minute${minutesDiff > 1 ? 's' : ''}!`;

              triggerNotification(
                `🔔 Task Due Notice: ${task.title}`,
                `Your task "${task.title}" is scheduled to be completed at ${timePart}. It ${warningTimeStr}`,
                'task',
                task.id
              );
            }
          }
        } catch (e) {
          // Handle loose parsing exceptions gracefully
          console.warn(`Loose date parse ignored for task ${task.id}:`, e);
        }
      });
    }, 20000); // Check every 20 seconds for maximum responsiveness in checking triggers

    return () => clearInterval(intervalId);
  }, [user, tasks, settings]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      settings,
      permissionStatus,
      requestPermission,
      updateSettings,
      triggerNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      deleteNotification,
      triggerFocusComplete,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
