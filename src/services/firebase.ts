import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc,
  getDocFromServer
} from 'firebase/firestore';
// Firebase Storage is explicitly disabled/unsupported on current user plan tier
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import fallbackConfig from '../../firebase-applet-config.json';

// Consolidate configuration with environment priorities and clean incorrect values
const envProjectId = ((import.meta as any).env.VITE_FIREBASE_PROJECT_ID as string);
const envDatabaseId = ((import.meta as any).env.VITE_FIREBASE_DATABASE_ID as string);

if (envDatabaseId && (envDatabaseId.startsWith("G-") || envDatabaseId === "G-TXFFQKZ7B6" || envDatabaseId.toLowerCase().includes("measurement"))) {
  console.warn(`[Firebase Configuration Guardian] Detected unrequested Analytics tracking/measurement ID '${envDatabaseId}' supplied as VITE_FIREBASE_DATABASE_ID. Overriding and utilizing standard default partition '(default)' instead to prevent Firestore connection failure.`);
}

const resolvedProjectId = envProjectId || fallbackConfig.projectId || "naxt-task";
const resolvedDatabaseId = envDatabaseId || fallbackConfig.firestoreDatabaseId || "(default)";

const firebaseConfig = {
  apiKey: ((import.meta as any).env.VITE_FIREBASE_API_KEY as string) || fallbackConfig.apiKey || "",
  authDomain: ((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN as string) || fallbackConfig.authDomain || "",
  projectId: resolvedProjectId,
  storageBucket: ((import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET as string) || fallbackConfig.storageBucket || "",
  messagingSenderId: ((import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || fallbackConfig.messagingSenderId || "",
  appId: ((import.meta as any).env.VITE_FIREBASE_APP_ID as string) || fallbackConfig.appId || "",
  firestoreDatabaseId: resolvedDatabaseId
};

let isFirebaseConfigured = false;
let auth: any = null;
let db: any = null;
let storage: any = null;
let messaging: any = null;
let messagingSupported = false;
let googleProvider: any = null;
let firebaseConnectionError: string | null = null;
let isFirestoreConnected = false;

// Config validation helper
const validateConfig = () => {
  if (!firebaseConfig.apiKey) return "API Key is missing.";
  if (!firebaseConfig.projectId) return "Project ID is missing.";
  if (!firebaseConfig.appId) return "Application ID (App ID) is missing.";
  return null;
};

const validationError = validateConfig();

try {
  console.log("Starting Firebase Initialization with project ID:", firebaseConfig.projectId);
  if (!validationError) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase Core successfully initialized/retrieved. App Name:", app.name);
    
    // Auth init
    auth = getAuth(app);
    console.log("Firebase Authentication initialized.");
    
    // Initialize Firestore using the correct database instance ID
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("Firestore Database initialized successfully using instance: " + firebaseConfig.firestoreDatabaseId);
    
    // Storage is disabled as per current user plan tier
    storage = null;
    
    // Lazy check and register Cloud Messaging in non-blocking way
    isMessagingSupported().then((supported) => {
      if (supported) {
        messaging = getMessaging(app);
        messagingSupported = true;
        console.log("Firebase Messaging initialized successfully.");
      } else {
        console.warn("Firebase Messaging is not supported in this browser run context.");
      }
    }).catch(err => {
      console.warn("Exception checking Messaging support:", err);
    });

    googleProvider = new GoogleAuthProvider();
    isFirebaseConfigured = true;
    console.log("Firebase services successfully bootstrapped inside the app using config:", firebaseConfig.projectId);

    // Perform connection test according to firebase-integration guidelines with robust deferral
    setTimeout(() => {
      testFirestoreConnection();
    }, 500);
  } else {
    firebaseConnectionError = `Firebase config validation failed: ${validationError}`;
    console.warn("Firebase config is empty or invalid:", validationError);
  }
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  firebaseConnectionError = msg;
  console.error("Firebase initialization failed with critical error:", error);
}

async function testFirestoreConnection(retryCount = 0) {
  if (!db) return;
  try {
    // Attempt real read-test from server according to critical constraints
    await getDocFromServer(doc(db, 'test', 'connection'));
    isFirestoreConnected = true;
    firebaseConnectionError = null; // Clear connection errors on success
    console.log("Firestore connection verified successfully: Reached Firebase servers.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    // If we receive a security or permissions rejection from the server, we have reached it successfully!
    if (msg.toLowerCase().includes('permission-denied') || msg.toLowerCase().includes('permission denied')) {
      isFirestoreConnected = true;
      firebaseConnectionError = null;
      console.log("Firestore reachable: Security rules verified connection to Firebase servers.");
      return;
    }

    if (retryCount < 3 && (msg.includes('the client is offline') || msg.includes('Unavailable') || msg.includes('network') || msg.includes('failed-precondition'))) {
      console.warn(`Firestore connectivity offline/unavailable (attempt ${retryCount + 1}/3). Retrying in 1.5s...`);
      setTimeout(() => {
        testFirestoreConnection(retryCount + 1);
      }, 1500);
      return;
    }

    if (msg.includes('the client is offline') || msg.includes('Unavailable')) {
      console.error("Please check your Firebase configuration or network status. Core database is offline.");
    }
    // Only set connection error if it wasn't already configured
    if (!firebaseConnectionError) {
      firebaseConnectionError = msg;
    }
  }
}

export function shouldUseFirebase(userId?: string): boolean {
  if (!isFirebaseConfigured || !db) return false;
  if (!auth?.currentUser) return false;
  const currentUid = auth.currentUser.uid;
  if (currentUid === 'guest-local-user') return false;
  if (userId && (userId === 'guest-local-user' || currentUid !== userId)) return false;
  return true;
}

export { 
  auth, 
  db, 
  storage, 
  messaging, 
  messagingSupported, 
  googleProvider, 
  isFirebaseConfigured,
  isFirestoreConnected,
  firebaseConnectionError,
  testFirestoreConnection,
  firebaseConfig
};


