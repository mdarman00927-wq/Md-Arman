export type View = 'dashboard' | 'calendar' | 'focus' | 'notes' | 'settings' | 'analytics' | 'privacy' | 'terms' | 'about' | 'contact' | 'deletion' | 'help' | 'firebase-status' | 'social';

export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RepeatConfig {
  interval: RepeatInterval;
  customInterval?: number; // e.g. every 2 days, 3 weeks, etc.
  customUnit?: 'days' | 'weeks' | 'months';
  daysOfWeek?: number[]; // 0 for Sunday, 1 for Monday, etc.
  endDate?: string;
  count?: number; // End after N occurrences
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  details?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  dueTime?: string;
  category: string;
  location?: string;
  folder?: string;
  tags?: string[];
  recurrence?: RepeatConfig;
  ownerId?: string;
  subtasks?: SubTask[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  color: string;
  ownerId?: string;
  tags?: string[];
  pinned?: boolean;
  category?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'system' | 'task' | 'focus' | 'reminder';
  read: boolean;
  ownerId: string;
  createdAt: string;
  targetId?: string;
}

export interface NotificationSettings {
  enablePush: boolean;
  dueDateReminders: boolean;
  focusAlerts: boolean;
  soundAlerts: boolean;
  dueDateThreshold: string; // '0', '5', '15', '30', '60' in minutes before
}

export interface CalendarEvent extends Task {
  // Calendar specific fields if any, but Task is broad enough
}

export interface UserSettings {
  id: string;
  ownerId: string;
  theme: string;
  enablePush: boolean;
  dueDateReminders: boolean;
  focusAlerts: boolean;
  soundAlerts: boolean;
  dueDateThreshold: string;
}

export interface UserAnalytics {
  id: string;
  ownerId: string;
  focusMinutesToday: number;
  totalFocusSessions: number;
  productivityScore: number;
  updatedAt: string;
}

export interface OnboardingState {
  userId: string;
  step1Completed: boolean;
  step2Completed: boolean;
  step3Completed: boolean;
  step4Completed: boolean;
  step5Completed: boolean;
  collapsed: boolean;
  completedAt?: string;
}

