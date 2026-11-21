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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;

  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please paste your Firebase API keys in .env.local"
    );
  }
  const credential = await signInWithPopup(auth, googleProvider);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please paste your Firebase API keys in .env.local"
    );
  }
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signUpWithEmail(
  email: string,
  pass: string
): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please paste your Firebase API keys in .env.local"
    );
  }
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await firebaseSignOut(auth);
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
