import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function getFirebaseAdminApp(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  try {
    if (projectId && clientEmail && privateKey) {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    if (projectId) {
      return initializeApp({
        projectId,
      });
    }
  } catch (err) {
    console.error("Firebase admin initialization error:", err);
  }

  return null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  name?: string;
} | null> {
  if (!idToken) return null;

  try {
    const app = getFirebaseAdminApp();
    if (app) {
      const decoded = await getAuth(app).verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.email?.split("@")[0],
      };
    }

    // Fallback verification via Google tokeninfo endpoint if service account private key is not set
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (res.ok) {
      const data = await res.json();
      return {
        uid: data.sub || data.user_id,
        email: data.email,
        name: data.name || data.email?.split("@")[0],
      };
    }
  } catch (err) {
    console.error("Firebase ID token verification failed:", err);
  }
  return null;
}
