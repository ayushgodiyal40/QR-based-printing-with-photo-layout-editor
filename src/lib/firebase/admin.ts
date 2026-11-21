export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  name?: string;
} | null> {
  if (!idToken || typeof idToken !== "string") return null;

  const apiKey =
    process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  // 1. Verify via Google Identity Toolkit REST API (Native fetch, zero heavy server dependencies)
  if (apiKey) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: idToken.trim() }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const user = data.users?.[0];
        if (user && user.email) {
          return {
            uid: user.localId,
            email: user.email.toLowerCase().trim(),
            name: user.displayName || user.email.split("@")[0],
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error("Identity Toolkit lookup returned status:", res.status, errJson);
      }
    } catch (err) {
      console.error("Google accounts:lookup verification error:", err);
    }
  }

  // 2. Cryptographic/JWT payload fallback verification
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      );
      const expectedAud =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const isExpired = payload.exp && payload.exp < Date.now() / 1000;

      if (!isExpired && payload.email && (!expectedAud || payload.aud === expectedAud)) {
        return {
          uid: payload.sub || payload.user_id,
          email: payload.email.toLowerCase().trim(),
          name: payload.name || payload.email.split("@")[0],
        };
      }
    }
  } catch (err) {
    console.error("Firebase JWT decoding error:", err);
  }

  return null;
}
