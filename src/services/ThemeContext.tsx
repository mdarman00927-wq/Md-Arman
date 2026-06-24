import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, shouldUseFirebase } from './firebase';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme preference from DB or LocalStorage
  useEffect(() => {
    async function loadThemePreference() {
      let savedTheme: Theme = 'light';

      if (user) {
        if (shouldUseFirebase(user.uid)) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data()?.theme) {
              savedTheme = userDoc.data().theme as Theme;
            } else {
              // Read from localStorage first then save to Firestore
              const localTheme = localStorage.getItem(`nextask_theme_${user.uid}`) as Theme;
              if (localTheme === 'dark' || localTheme === 'light') {
                savedTheme = localTheme;
                // Sync to Firestore
                await setDoc(userDocRef, { theme: savedTheme }, { merge: true });
              }
            }
          } catch (e) {
            console.warn("Could not load theme from Firestore, falling back to LocalStorage:", e);
            const localTheme = localStorage.getItem(`nextask_theme_${user.uid}`) as Theme;
            if (localTheme === 'dark' || localTheme === 'light') {
              savedTheme = localTheme;
            }
          }
        } else {
          // Local/Demo Mode
          const localTheme = localStorage.getItem(`nextask_theme_${user.uid}`) as Theme;
          if (localTheme === 'dark' || localTheme === 'light') {
            savedTheme = localTheme;
          }
        }
      } else {
        // Unauthenticated standard local fallback
        const localTheme = localStorage.getItem('nextask_theme_guest') as Theme;
        if (localTheme === 'dark' || localTheme === 'light') {
          savedTheme = localTheme;
        } else {
          // If no guest preference, check system preference
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          savedTheme = systemPrefersDark ? 'dark' : 'light';
        }
      }

      applyTheme(savedTheme);
    }

    loadThemePreference();
  }, [user]);

  // Apply theme class to document with smooth transitions
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Add transitioning class temporarily for smooth CSS custom transition
    root.classList.add('theme-transitioning');
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    setThemeState(newTheme);

    // Save temporary transition state cleanup
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);
  };

  const saveThemePreference = async (newTheme: Theme) => {
    applyTheme(newTheme);

    if (user) {
      // Save locally
      localStorage.setItem(`nextask_theme_${user.uid}`, newTheme);

      // Save in Database
      if (shouldUseFirebase(user.uid)) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { theme: newTheme }, { merge: true });
        } catch (e) {
          console.warn("Could not save theme preference to Firestore:", e);
        }
      }
    } else {
      localStorage.setItem('nextask_theme_guest', newTheme);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    await saveThemePreference(nextTheme);
  };

  const setTheme = async (targetTheme: Theme) => {
    await saveThemePreference(targetTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
