import { auth } from './firebase';

/**
 * Helper to build headers with Authorization Bearer token from current authenticated Firebase User
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (auth?.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (err) {
      console.warn("[Auth Header Warning] Failed to fetch Firebase ID Token for API Authorization:", err);
    }
  }

  return headers;
}

export async function chatWithAI(message: string, history: any[] = [], tasks: any[] = [], notes: any[] = []) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history, tasks, notes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to chat with AI');
    }

    return await response.json();
  } catch (error) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
}

export interface DayPlanActivity {
  time: string;
  duration: string;
  title: string;
  description: string;
  type: 'focus' | 'break' | 'task' | 'routine';
  associatedTaskId?: string;
}

export interface DailySchedulePlan {
  plan: DayPlanActivity[];
  summary: string;
}

export async function generateDailyPlan(tasks: any[], message?: string): Promise<DailySchedulePlan> {
  // 4. Prevent API calls when user is not authenticated or tasks array is empty
  // 7. Client-side validation before fetch()
  if (!auth?.currentUser || !auth.currentUser.uid) {
    throw new Error("User is not authenticated. Please log in first.");
  }
  if (!tasks || tasks.length === 0) {
    throw new Error("Your task list is empty. Please add a task first.");
  }

  try {
    const headers = await getAuthHeaders();
    
    // 3. Ensure required fields always exist with 6. safe defaults
    const payload = {
      userId: auth.currentUser.uid,
      tasks,
      preferences: {},
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date: new Date().toISOString(),
      message: message || ""
    };

    const response = await fetch('/api/ai/schedule', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate schedule');
    }

    return await response.json();
  } catch (error) {
    console.error("AI Schedule Error:", error);
    throw error;
  }
}

export interface ProductivityInsight {
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProductivityAudit {
  workloadRating: string;
  heatPercent: number;
  insights: ProductivityInsight[];
  coachingTip: string;
}

export async function getProductivitySuggestions(tasks: any[], notes: any[]): Promise<ProductivityAudit> {
  // 4. Prevent API calls when user is not authenticated or tasks array is empty
  // 7. Client-side validation before fetch()
  if (!auth?.currentUser || !auth.currentUser.uid) {
    throw new Error("User is not authenticated. Please log in first.");
  }
  if (!tasks || tasks.length === 0) {
    throw new Error("Your task list is empty. Please add a task first.");
  }

  try {
    const headers = await getAuthHeaders();

    // 3. Ensure required fields always exist with 6. safe defaults
    const payload = {
      userId: auth.currentUser.uid,
      tasks,
      notes: notes || [],
      preferences: {},
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date: new Date().toISOString(),
    };

    const response = await fetch('/api/ai/productivity', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get insights');
    }

    return await response.json();
  } catch (error) {
    console.error("AI Insights Error:", error);
    throw error;
  }
}
