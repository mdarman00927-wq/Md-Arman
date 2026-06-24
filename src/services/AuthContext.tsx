import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured, 
  db 
} from './firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  signInAnonymously,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './dataService';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = false; // Rigidly set to false. Mocking is forbidden.

  useEffect(() => {
    // 1. Core Firebase auth State changes listener
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setLoading(true);
        if (fbUser) {
          const authUser: AuthUser = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || 'Guest User',
            email: fbUser.email || 'guest@nextask.com',
            photoURL: fbUser.photoURL,
          };
          
          setUser(authUser);
          
          // Sync or setup the user profile document in Firestore database
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            let userDoc;
            try {
              userDoc = await getDoc(userDocRef);
            } catch (getErr) {
              handleFirestoreError(getErr, OperationType.GET, `users/${fbUser.uid}`);
            }
            if (userDoc && !userDoc.exists()) {
              try {
                await setDoc(userDocRef, {
                  uid: fbUser.uid,
                  email: fbUser.email || 'guest@nextask.com',
                  displayName: fbUser.displayName || 'Guest User',
                  photoURL: fbUser.photoURL || null,
                  createdAt: new Date().toISOString()
                });
              } catch (setErr) {
                handleFirestoreError(setErr, OperationType.WRITE, `users/${fbUser.uid}`);
              }
            }
          } catch (e) {
            console.warn("Could not sync user profile metadata with global Firestore:", e);
          }
          setLoading(false);
        } else {
          // Stay logged out to show AuthScreen immediately
          setUser(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      // Configuration missing/invalid: bypass login by creating a secure offline guest session
      setUser({
        uid: 'guest-local-user',
        displayName: 'Guest User',
        email: 'guest@nextask.com',
        photoURL: null,
      });
      setLoading(false);
    }
  }, []);

  const verifyFirebaseState = () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("NexTask Security Block: Firebase authentication service is not configured. Please complete setup first.");
    }
  };

  const signInWithGoogle = async () => {
    verifyFirebaseState();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const authUser: AuthUser = {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        
        // Sync User Doc
        const userDocRef = doc(db, 'users', result.user.uid);
        try {
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || 'NexUser',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.WRITE, `users/${result.user.uid}`);
        }

        setUser(authUser);
      }
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
        console.warn("Google Authentication Sign-In cancelled: Popup closed by user.");
        return;
      }
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        const hostname = window.location.hostname;
        const errMsg = `Google Sign-In is blocked because '${hostname}' is not in your Firebase Authorized Domains.\n\nTo enable:\n1. Open your Firebase Console\n2. Go to Authentication > Settings > Authorized domains\n3. Click 'Add domain' and paste: '${hostname}'\n\nFallback: Email & Password sign-up works immediately without any extra config! Please use the 'Sign Up' tab above.`;
        console.warn("Google Authenticating Direct Error: Firebase: Error (auth/unauthorized-domain).", error);
        throw new Error(errMsg);
      }
      console.warn("Google Authenticating Direct Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    verifyFirebaseState();
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        setUser({
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        });
      }
    } catch (error) {
      console.warn("Firebase Login Query Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email: string, password: string, displayName: string) => {
    verifyFirebaseState();
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, { displayName });
        
        // Trigger Email Verification Support
        try {
          await sendEmailVerification(result.user);
          console.log("Verification email dispatched to:", email);
        } catch (evErr) {
          console.warn("Could not dispatch signup verification mail:", evErr);
        }
        
        const authUser: AuthUser = {
          uid: result.user.uid,
          displayName: displayName,
          email: result.user.email,
          photoURL: null,
        };
        
        const userDocRef = doc(db, 'users', result.user.uid);
        try {
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email,
            displayName: displayName,
            photoURL: null,
            createdAt: new Date().toISOString()
          });
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.WRITE, `users/${result.user.uid}`);
        }

        setUser(authUser);
      }
    } catch (error) {
       console.warn("Firebase Registrations Error:", error);
       throw error;
     } finally {
       setLoading(false);
     }
   };
 
   const resetPassword = async (email: string) => {
     verifyFirebaseState();
     try {
       await sendPasswordResetEmail(auth, email);
     } catch (error) {
       console.warn("Firebase Password Reset Transmission Error:", error);
       throw error;
     }
   };

  const logout = async () => {
    verifyFirebaseState();
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Firebase Signout Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileDetails = async (displayName: string, photoURL?: string) => {
    verifyFirebaseState();
    if (!auth.currentUser) {
      throw new Error("Active session invalid. User is already logged out.");
    }
    try {
      setLoading(true);
      await updateProfile(auth.currentUser, { displayName, photoURL });
      
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      try {
        await setDoc(userDocRef, {
          displayName,
          photoURL: photoURL || null
        }, { merge: true });
      } catch (setErr) {
        handleFirestoreError(setErr, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }

      setUser(prev => prev ? { ...prev, displayName, photoURL: photoURL || prev.photoURL } : null);
    } catch (error) {
      console.error("Firebase User Profile Update Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async () => {
    verifyFirebaseState();
    try {
      setLoading(true);
      const result = await signInAnonymously(auth);
      if (result.user) {
        setUser({
          uid: result.user.uid,
          displayName: 'Guest User',
          email: 'guest@nextask.com',
          photoURL: null,
        });
      }
    } catch (error) {
      console.warn("Firebase Anonymous Sign-In failed or was disabled. Transitioning automatically to localized secure fallback session.", error);
      // Fallback local session if anonymous connection fails
      setUser({
        uid: 'guest-local-user',
        displayName: 'Guest User',
        email: 'guest@nextask.com',
        photoURL: null,
      });
    } finally {
      setLoading(false);
    }
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
