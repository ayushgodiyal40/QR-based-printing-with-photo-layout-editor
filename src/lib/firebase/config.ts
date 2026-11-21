"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

let dynamicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || "",
};

let initPromise: Promise<FirebaseApp | null> | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(dynamicConfig.apiKey && dynamicConfig.projectId);
}

export async function ensureFirebaseInitialized(): Promise<FirebaseApp | null> {
  if (typeof window === "undefined") return null;

  if (getApps().length > 0) {
    return getApp();
  }

  // If already have apiKey from bundled env (via NEXT_PUBLIC_ or next.config.ts), initialize immediately
  if (dynamicConfig.apiKey && dynamicConfig.projectId) {
    try {
      return initializeApp(dynamicConfig);
    } catch (e) {
      if (getApps().length > 0) return getApp();
      console.error("Firebase sync initialization error:", e);
    }
  }

  // Fallback: fetch configuration from server API route if not bundled in client
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const res = await fetch("/api/auth/firebase/config");
        if (res.ok) {
          const fetched = await res.json();
          if (fetched.apiKey && fetched.projectId) {
            dynamicConfig = {
              apiKey: fetched.apiKey,
              authDomain: fetched.authDomain || "",
              projectId: fetched.projectId,
              storageBucket: fetched.storageBucket || "",
              messagingSenderId: fetched.messagingSenderId || "",
              appId: fetched.appId || "",
              measurementId: fetched.measurementId || "",
            };

            if (getApps().length > 0) {
              return getApp();
            }
            return initializeApp(dynamicConfig);
          }
        }
      } catch (err) {
        console.error("Error fetching Firebase client config from server:", err);
      }
      return null;
    })();
  }

  return await initPromise;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (getApps().length > 0) {
    return getApp();
  }
  if (dynamicConfig.apiKey && dynamicConfig.projectId) {
    try {
      return initializeApp(dynamicConfig);
    } catch (e) {
      if (getApps().length > 0) return getApp();
    }
  }
  return null;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<{ user: User; idToken: string }> {
  const app = await ensureFirebaseInitialized();
  if (!app) {
    throw new Error(
      "Firebase is not configured. Please ensure Firebase keys (FIREBASE_API_KEY, FIREBASE_PROJECT_ID, etc.) are set in your environment variables."
    );
  }
  const auth = getAuth(app);
  const credential = await signInWithPopup(auth, googleProvider);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ user: User; idToken: string }> {
  const app = await ensureFirebaseInitialized();
  if (!app) {
    throw new Error(
      "Firebase is not configured. Please ensure Firebase keys are set in your environment variables."
    );
  }
  const auth = getAuth(app);
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signUpWithEmail(
  email: string,
  pass: string
): Promise<{ user: User; idToken: string }> {
  const app = await ensureFirebaseInitialized();
  if (!app) {
    throw new Error(
      "Firebase is not configured. Please ensure Firebase keys are set in your environment variables."
    );
  }
  const auth = getAuth(app);
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signOutFirebase(): Promise<void> {
  const app = await ensureFirebaseInitialized();
  if (app) {
    const auth = getAuth(app);
    await firebaseSignOut(auth);
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    ensureFirebaseInitialized().then((app) => {
      if (app) {
        onAuthStateChanged(getAuth(app), callback);
      }
    });
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
