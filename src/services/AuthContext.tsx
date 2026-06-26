import { createContext, useContext, useState, ReactNode } from 'react';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isDemoMode: boolean; // Retained for type compatibility but strictly false
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileDetails: (displayName: string, photoURL?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>({
    uid: 'guest-local-user',
    displayName: 'Guest User',
    email: 'guest@nextask.com',
    photoURL: null,
  });
  const [loading, setLoading] = useState(false);
  const isDemoMode = false;

  const signInWithGoogle = async () => {
    throw new Error("Social sign-in is disabled in Guest Mode.");
  };

  const loginWithEmail = async (email: string, _password: string) => {
    setUser({
      uid: 'guest-local-user',
      displayName: 'Guest User',
      email: email || 'guest@nextask.com',
      photoURL: null,
    });
  };

  const signupWithEmail = async (email: string, _password: string, displayName: string) => {
    setUser({
      uid: 'guest-local-user',
      displayName: displayName || 'Guest User',
      email: email || 'guest@nextask.com',
      photoURL: null,
    });
  };

  const resetPassword = async (_email: string) => {
    // Non-functional mock in Guest Mode
  };

  const logout = async () => {
    setUser(null);
  };

  const updateProfileDetails = async (displayName: string, photoURL?: string) => {
    setUser(prev => prev ? { ...prev, displayName, photoURL: photoURL || prev.photoURL } : null);
  };

  const signInAsGuest = async () => {
    setUser({
      uid: 'guest-local-user',
      displayName: 'Guest User',
      email: 'guest@nextask.com',
      photoURL: null,
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isDemoMode,
      signInWithGoogle,
      loginWithEmail,
      signupWithEmail,
      resetPassword,
      logout,
      updateProfileDetails,
      signInAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
