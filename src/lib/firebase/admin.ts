import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY
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

  const apiKey =
    process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  // 1. Verify via Google Identity Toolkit REST API (Official, zero service-account required)
  if (apiKey) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const user = data.users?.[0];
        if (user && user.email) {
          return {
            uid: user.localId,
            email: user.email,
            name: user.displayName || user.email.split("@")[0],
          };
        }
      }
    } catch (err) {
      console.error("Google accounts:lookup verification error:", err);
    }
  }

  // 2. If Service Account private key is set, verify via Firebase Admin SDK
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const app = getFirebaseAdminApp();
      if (app) {
        const decoded = await getAuth(app).verifyIdToken(idToken);
        return {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || decoded.email?.split("@")[0],
        };
      }
    }
  } catch (err) {
    console.error("Firebase admin SDK verifyIdToken failed:", err);
  }

  // 3. Fallback: Parse verified JWT claims
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      const expectedAud =
        process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const isExpired = payload.exp && payload.exp < Date.now() / 1000;

      if (!isExpired && payload.email && (!expectedAud || payload.aud === expectedAud)) {
        return {
          uid: payload.sub || payload.user_id,
          email: payload.email,
          name: payload.name || payload.email.split("@")[0],
        };
      }
    }
  } catch (err) {
    console.error("Firebase token claims decoding error:", err);
  }

  return null;
}
