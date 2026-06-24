import { db, isFirebaseConfigured, auth, shouldUseFirebase } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { AppNotification, Task, Note, UserSettings, UserAnalytics, OnboardingState } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Security: logs error in full JSON format, throws conforming JSON string for diagnostics
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Detailed context: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Standard helper to run operations with secure retry limit
async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

// Task Database Service
export const taskService = {
  async fetchTasks(userId: string): Promise<Task[]> {
    if (shouldUseFirebase(userId)) {
      const pathStr = 'tasks';
      try {
        const q = query(collection(db, pathStr), where('ownerId', '==', userId));
        const snapshot = await fetchWithRetry(() => getDocs(q));
        const tasks: Task[] = [];
        snapshot.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        
        // Update local storage backup for seamless off-line access
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
        return tasks;
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.LIST, pathStr);
        } catch (diagErr: any) {
          console.error("Firestore tasks query failed, reverting to cached local backup list. Error details: ", diagErr.message);
        }
        // Secure offline fallback
        const tasksStr = localStorage.getItem(`tasks_${userId}`);
        if (!tasksStr) {
          const defaults: Task[] = [
            { id: '1', title: 'Complete NexTask documentation', completed: false, priority: 'high', category: 'Work', dueDate: 'Today', ownerId: userId },
            { id: '2', title: 'Order groceries', completed: false, priority: 'medium', category: 'Personal', dueDate: '14:00', ownerId: userId },
            { id: '3', title: 'Call grandma', completed: true, priority: 'low', category: 'Family', dueDate: 'Yesterday', ownerId: userId },
          ];
          localStorage.setItem(`tasks_${userId}`, JSON.stringify(defaults));
          return defaults;
        }
        return JSON.parse(tasksStr);
      }
    } else {
      // Mock Storage Fetch when applet setup is missing
      const tasksStr = localStorage.getItem(`tasks_${userId}`);
      if (!tasksStr) {
        const defaults: Task[] = [
          { id: '1', title: 'Complete NexTask documentation', completed: false, priority: 'high', category: 'Work', dueDate: 'Today', ownerId: userId },
          { id: '2', title: 'Order groceries', completed: false, priority: 'medium', category: 'Personal', dueDate: '14:00', ownerId: userId },
          { id: '3', title: 'Call grandma', completed: true, priority: 'low', category: 'Family', dueDate: 'Yesterday', ownerId: userId },
        ];
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(tasksStr);
    }
  },

  async saveTask(userId: string, task: Task): Promise<void> {
    const cleanedTask = {
      id: task.id || '',
      title: task.title || '',
      completed: !!task.completed,
      priority: task.priority || 'medium',
      category: task.category || 'General',
      ownerId: userId,
      ...(task.details ? { details: task.details } : {}),
      ...(task.location ? { location: task.location } : {}),
      ...(task.folder ? { folder: task.folder } : {}),
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
      ...(task.dueTime ? { dueTime: task.dueTime } : {}),
      ...(task.tags ? { tags: task.tags } : {}),
      ...(task.subtasks ? { subtasks: task.subtasks } : {}),
      ...(task.recurrence ? { recurrence: task.recurrence } : {}),
    };

    // Always update cache first to guarantee zero app crashes or slow transitions
    try {
      const current = await this.fetchTasks(userId).catch(() => {
        const cached = localStorage.getItem(`tasks_${userId}`);
        return cached ? JSON.parse(cached) : [];
      });
      const existsIdx = current.findIndex(t => t.id === task.id);
      if (existsIdx !== -1) {
        current[existsIdx] = cleanedTask as any;
      } else {
        current.unshift(cleanedTask as any);
      }
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(current));
    } catch (e) {
      console.warn("Could not synchronize tasks cache helper: ", e);
    }

    if (shouldUseFirebase(userId)) {
      const pathStr = `tasks/${task.id}`;
      try {
        await setDoc(doc(db, 'tasks', task.id), cleanedTask);
      } catch (error) {
        // Log to diagnostics telemetry and fail cleanly as a background save error
        try {
          handleFirestoreError(error, OperationType.CREATE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background task save.");
        }
      }
    }
  },

  async deleteTask(userId: string, taskId: string): Promise<void> {
    // Keep local cache secure first
    try {
      const current = await this.fetchTasks(userId).catch(() => {
        const cached = localStorage.getItem(`tasks_${userId}`);
        return cached ? JSON.parse(cached) : [];
      });
      const filtered = current.filter(t => t.id !== taskId);
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not sync tasks cache helper on delete: ", e);
    }

    if (shouldUseFirebase(userId)) {
      const pathStr = `tasks/${taskId}`;
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background task delete.");
        }
      }
    }
  }
};

// Note Database Service
export const noteService = {
  async fetchNotes(userId: string): Promise<Note[]> {
    if (shouldUseFirebase(userId)) {
      const pathStr = 'notes';
      try {
        const q = query(collection(db, pathStr), where('ownerId', '==', userId));
        const snapshot = await fetchWithRetry(() => getDocs(q));
        const notes: Note[] = [];
        snapshot.forEach((doc) => {
          notes.push({ id: doc.id, ...doc.data() } as Note);
        });
        localStorage.setItem(`notes_${userId}`, JSON.stringify(notes));
        return notes;
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.LIST, pathStr);
        } catch (diagErr: any) {
          console.error("Firestore notes query failed, reverting to cached local backup list. Error details: ", diagErr.message);
        }
        // Secure offline fallback
        const notesStr = localStorage.getItem(`notes_${userId}`);
        if (!notesStr) {
          const defaults: Note[] = [
            { id: '1', title: 'Vacation Ideas', content: 'Iceland, Japan, Portugal. Need to check flights for October.', updatedAt: new Date().toISOString(), color: '#6366f1', ownerId: userId },
            { id: '2', title: 'Workout Routine', content: 'Mon: Chest, Wed: Legs, Fri: Back. 3 sets of 12 reps.', updatedAt: new Date().toISOString(), color: '#a855f7', ownerId: userId },
          ];
          localStorage.setItem(`notes_${userId}`, JSON.stringify(defaults));
          return defaults;
        }
        return JSON.parse(notesStr);
      }
    } else {
      const notesStr = localStorage.getItem(`notes_${userId}`);
      if (!notesStr) {
        const defaults: Note[] = [
          { id: '1', title: 'Vacation Ideas', content: 'Iceland, Japan, Portugal. Need to check flights for October.', updatedAt: new Date().toISOString(), color: '#6366f1', ownerId: userId },
          { id: '2', title: 'Workout Routine', content: 'Mon: Chest, Wed: Legs, Fri: Back. 3 sets of 12 reps.', updatedAt: new Date().toISOString(), color: '#a855f7', ownerId: userId },
        ];
        localStorage.setItem(`notes_${userId}`, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(notesStr);
    }
  },

  async saveNote(userId: string, note: Note): Promise<void> {
    const cleanedNote = {
      id: note.id || '',
      title: note.title || '',
      content: note.content || '',
      color: note.color || '#6366f1',
      ownerId: userId,
      updatedAt: note.updatedAt || new Date().toISOString(),
      ...(note.tags ? { tags: note.tags } : {}),
      ...(note.pinned !== undefined ? { pinned: !!note.pinned } : {}),
      ...(note.category ? { category: note.category } : {})
    };

    try {
      const current = await this.fetchNotes(userId).catch(() => {
        const cached = localStorage.getItem(`notes_${userId}`);
        return cached ? JSON.parse(cached) : [];
      });
      const existsIdx = current.findIndex(n => n.id === note.id);
      if (existsIdx !== -1) {
        current[existsIdx] = cleanedNote as any;
      } else {
        current.unshift(cleanedNote as any);
      }
      localStorage.setItem(`notes_${userId}`, JSON.stringify(current));
    } catch (e) {
      console.warn("Could not sync local cache helper on save note: ", e);
    }

    if (shouldUseFirebase(userId)) {
      const pathStr = `notes/${note.id}`;
      try {
        await setDoc(doc(db, 'notes', note.id), cleanedNote);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background note save.");
        }
      }
    }
  },

  async deleteNote(userId: string, noteId: string): Promise<void> {
    try {
      const current = await this.fetchNotes(userId).catch(() => {
        const cached = localStorage.getItem(`notes_${userId}`);
        return cached ? JSON.parse(cached) : [];
      });
      const filtered = current.filter(n => n.id !== noteId);
      localStorage.setItem(`notes_${userId}`, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not sync notes cache on delete: ", e);
    }

    if (shouldUseFirebase(userId)) {
      const pathStr = `notes/${noteId}`;
      try {
        await deleteDoc(doc(db, 'notes', noteId));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background note delete.");
        }
      }
    }
  }
};

// Notification Database Service
export const notificationService = {
  async fetchNotifications(userId: string): Promise<AppNotification[]> {
    if (shouldUseFirebase(userId)) {
      const pathStr = 'notifications';
      try {
        const q = query(collection(db, pathStr), where('ownerId', '==', userId));
        const snapshot = await fetchWithRetry(() => getDocs(q));
        const notifications: AppNotification[] = [];
        snapshot.forEach((doc) => {
          notifications.push({ id: doc.id, ...doc.data() } as AppNotification);
        });
        const sorted = notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        localStorage.setItem(`notifications_${userId}`, JSON.stringify(sorted));
        return sorted;
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.LIST, pathStr);
        } catch (diagErr: any) {
          console.error("Firestore notifications query failed, reverting to cached local backup list. Error details: ", diagErr.message);
        }
        // Secure offline fallback
        const notificationsStr = localStorage.getItem(`notifications_${userId}`);
        if (!notificationsStr) {
          const defaults: AppNotification[] = [
            {
              id: 'n1',
              title: 'Welcome to NexTask!',
              body: 'Get started by creating your first task or custom note. Click the AI Assistant button to auto-organize your day!',
              type: 'system',
              read: false,
              ownerId: userId,
              createdAt: new Date().toISOString()
            }
          ];
          localStorage.setItem(`notifications_${userId}`, JSON.stringify(defaults));
          return defaults;
        }
        return JSON.parse(notificationsStr);
      }
    } else {
      const notificationsStr = localStorage.getItem(`notifications_${userId}`);
      if (!notificationsStr) {
        const defaults: AppNotification[] = [
          {
            id: 'n1',
            title: 'Welcome to NexTask!',
            body: 'Get started by creating your first task or custom note. Click the AI Assistant button to auto-organize your day!',
            type: 'system',
            read: false,
            ownerId: userId,
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(`notifications_${userId}`, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(notificationsStr);
    }
  },

  async saveNotification(userId: string, notification: AppNotification): Promise<void> {
    const cleanedNotif = {
      id: notification.id || '',
      title: notification.title || '',
      body: notification.body || '',
      type: notification.type || 'system',
      read: !!notification.read,
      ownerId: userId,
      createdAt: notification.createdAt || new Date().toISOString(),
      ...(notification.targetId ? { targetId: notification.targetId } : {})
    };

    try {
      const current = await this.fetchNotifications(userId).catch(() => {
        const cached = localStorage.getItem(`notifications_${userId}`);
        return cached ? JSON.parse(cached) : [];
      });
      const existsIdx = current.findIndex(n => n.id === notification.id);
      if (existsIdx !== -1) {
        current[existsIdx] = cleanedNotif as any;
      } else {
        current.unshift(cleanedNotif as any);
      }
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(current));
    } catch (e) {
      console.warn("Could not sync notifications cache helper: ", e);
    }

    if (shouldUseFirebase(userId)) {
      const pathStr = `notifications/${notification.id}`;
      try {
        await setDoc(doc(db, 'notifications', notification.id), cleanedNotif);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background notification save.");
        }
      }
    }
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const current = await this.fetchNotifications(userId).catch(() => {
        const cached = localStorage.getItem(`notifications_${userId}`);
        return cached ? JSON.parse(cached) : [];
      });
      const filtered = current.filter(n => n.id !== notificationId);
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not sync notifications cache on delete: ", e);
    }

    if (shouldUseFirebase(userId)) {
      const pathStr = `notifications/${notificationId}`;
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background notification delete.");
        }
      }
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const current = await this.fetchNotifications(userId);
      for (const notif of current) {
        if (!notif.read) {
          notif.read = true;
          await this.saveNotification(userId, notif);
        }
      }
    } catch (e) {
      console.warn("Could not mark all notifications as read:", e);
    }
  },

  async clearAllNotifications(userId: string): Promise<void> {
    localStorage.setItem(`notifications_${userId}`, JSON.stringify([]));
    if (shouldUseFirebase(userId)) {
      try {
        const current = await this.fetchNotifications(userId);
        for (const notif of current) {
          await this.deleteNotification(userId, notif.id);
        }
      } catch (e) {
        console.warn("Could not clear all notifications from cloud service:", e);
      }
    }
  }
};

// Settings Database Service (Durable Cloud Persistence + Cache Fallback)
export const settingsService = {
  async fetchSettings(userId: string): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      id: userId,
      ownerId: userId,
      theme: 'light',
      enablePush: false,
      dueDateReminders: true,
      focusAlerts: true,
      soundAlerts: true,
      dueDateThreshold: '15'
    };

    if (shouldUseFirebase(userId)) {
      const pathStr = `settings/${userId}`;
      try {
        const docRef = doc(db, 'settings', userId);
        const snap = await fetchWithRetry(() => getDoc(docRef));
        
        if (snap.exists()) {
          const fetched = { id: snap.id, ...snap.data() } as UserSettings;
          localStorage.setItem(`settings_${userId}`, JSON.stringify(fetched));
          return fetched;
        } else {
          // Automatic Creation of Default Record on Miss
          try {
            await setDoc(docRef, defaultSettings);
          } catch (writeErr) {
            console.warn("Failed to write default settings in cloud:", writeErr);
          }
          localStorage.setItem(`settings_${userId}`, JSON.stringify(defaultSettings));
          return defaultSettings;
        }
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.GET, pathStr);
        } catch (diagErr) {
          console.warn("Diag log handled for settings fetch error.");
        }
        const cached = localStorage.getItem(`settings_${userId}`);
        if (!cached) {
          localStorage.setItem(`settings_${userId}`, JSON.stringify(defaultSettings));
          return defaultSettings;
        }
        return JSON.parse(cached);
      }
    } else {
      const cached = localStorage.getItem(`settings_${userId}`);
      if (!cached) {
        localStorage.setItem(`settings_${userId}`, JSON.stringify(defaultSettings));
        return defaultSettings;
      }
      return JSON.parse(cached);
    }
  },

  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
    const cleanedSettings = {
      id: userId,
      ownerId: userId,
      theme: settings.theme || 'light',
      enablePush: !!settings.enablePush,
      dueDateReminders: !!settings.dueDateReminders,
      focusAlerts: !!settings.focusAlerts,
      soundAlerts: !!settings.soundAlerts,
      dueDateThreshold: settings.dueDateThreshold || '15'
    };

    // Always update local storage first
    localStorage.setItem(`settings_${userId}`, JSON.stringify(cleanedSettings));

    if (shouldUseFirebase(userId)) {
      const pathStr = `settings/${userId}`;
      try {
        await setDoc(doc(db, 'settings', userId), cleanedSettings);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background settings save.");
        }
      }
    }
  }
};

// Analytics Database Service (Durable Cloud Persistence + Cache Fallback)
export const analyticsService = {
  async fetchAnalytics(userId: string): Promise<UserAnalytics> {
    const defaultAnalytics: UserAnalytics = {
      id: userId,
      ownerId: userId,
      focusMinutesToday: 0,
      totalFocusSessions: 0,
      productivityScore: 100,
      updatedAt: new Date().toISOString()
    };

    if (shouldUseFirebase(userId)) {
      const pathStr = `analytics/${userId}`;
      try {
        const docRef = doc(db, 'analytics', userId);
        const snap = await fetchWithRetry(() => getDoc(docRef));
        
        if (snap.exists()) {
          const fetched = { id: snap.id, ...snap.data() } as UserAnalytics;
          localStorage.setItem(`analytics_${userId}`, JSON.stringify(fetched));
          return fetched;
        } else {
          // Automatic Creation of Default Record on Miss
          try {
            await setDoc(docRef, defaultAnalytics);
          } catch (writeErr) {
            console.warn("Failed to write default analytics in cloud:", writeErr);
          }
          localStorage.setItem(`analytics_${userId}`, JSON.stringify(defaultAnalytics));
          return defaultAnalytics;
        }
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.GET, pathStr);
        } catch (diagErr) {
          console.warn("Diag log handled for analytics fetch error.");
        }
        const cached = localStorage.getItem(`analytics_${userId}`);
        if (!cached) {
          localStorage.setItem(`analytics_${userId}`, JSON.stringify(defaultAnalytics));
          return defaultAnalytics;
        }
        return JSON.parse(cached);
      }
    } else {
      const cached = localStorage.getItem(`analytics_${userId}`);
      if (!cached) {
        localStorage.setItem(`analytics_${userId}`, JSON.stringify(defaultAnalytics));
        return defaultAnalytics;
      }
      return JSON.parse(cached);
    }
  },

  async saveAnalytics(userId: string, analytics: UserAnalytics): Promise<void> {
    const cleanedAnalytics = {
      id: userId,
      ownerId: userId,
      focusMinutesToday: Math.round(analytics.focusMinutesToday || 0),
      totalFocusSessions: Math.round(analytics.totalFocusSessions || 0),
      productivityScore: Math.round(analytics.productivityScore || 100),
      updatedAt: analytics.updatedAt || new Date().toISOString()
    };

    // Always keep cache updated immediately
    localStorage.setItem(`analytics_${userId}`, JSON.stringify(cleanedAnalytics));

    if (shouldUseFirebase(userId)) {
      const pathStr = `analytics/${userId}`;
      try {
        await setDoc(doc(db, 'analytics', userId), cleanedAnalytics);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background analytics save.");
        }
      }
    }
  }
};

export const onboardingService = {
  async fetchOnboarding(userId: string): Promise<OnboardingState> {
    const defaultOnboarding: OnboardingState = {
      userId,
      step1Completed: false,
      step2Completed: false,
      step3Completed: false,
      step4Completed: false,
      step5Completed: false,
      collapsed: false,
    };

    if (shouldUseFirebase(userId)) {
      const pathStr = `users/${userId}/onboarding/checklist`;
      try {
        const docRef = doc(db, 'users', userId, 'onboarding', 'checklist');
        const snap = await fetchWithRetry(() => getDoc(docRef));
        
        if (snap.exists()) {
          const fetched = snap.data() as OnboardingState;
          localStorage.setItem(`onboarding_${userId}`, JSON.stringify(fetched));
          return fetched;
        } else {
          try {
            await setDoc(docRef, defaultOnboarding);
          } catch (writeErr) {
            console.warn("Failed to write default onboarding in cloud:", writeErr);
          }
          localStorage.setItem(`onboarding_${userId}`, JSON.stringify(defaultOnboarding));
          return defaultOnboarding;
        }
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.GET, pathStr);
        } catch (diagErr) {
          console.warn("Diag log handled for onboarding fetch error.");
        }
        const cached = localStorage.getItem(`onboarding_${userId}`);
        if (!cached) {
          localStorage.setItem(`onboarding_${userId}`, JSON.stringify(defaultOnboarding));
          return defaultOnboarding;
        }
        return JSON.parse(cached);
      }
    } else {
      const cached = localStorage.getItem(`onboarding_${userId}`);
      if (!cached) {
        localStorage.setItem(`onboarding_${userId}`, JSON.stringify(defaultOnboarding));
        return defaultOnboarding;
      }
      return JSON.parse(cached);
    }
  },

  async saveOnboarding(userId: string, onboarding: OnboardingState): Promise<void> {
    const cleanedOnboarding: OnboardingState = {
      userId,
      step1Completed: !!onboarding.step1Completed,
      step2Completed: !!onboarding.step2Completed,
      step3Completed: !!onboarding.step3Completed,
      step4Completed: !!onboarding.step4Completed,
      step5Completed: !!onboarding.step5Completed,
      collapsed: !!onboarding.collapsed,
      completedAt: onboarding.completedAt || undefined,
    };

    localStorage.setItem(`onboarding_${userId}`, JSON.stringify(cleanedOnboarding));

    if (shouldUseFirebase(userId)) {
      const pathStr = `users/${userId}/onboarding/checklist`;
      try {
        await setDoc(doc(db, 'users', userId, 'onboarding', 'checklist'), cleanedOnboarding);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.CREATE, pathStr);
        } catch (diagErr) {
          console.warn("Telemetry warning caught during background onboarding save.");
        }
      }
    }
  }
};
