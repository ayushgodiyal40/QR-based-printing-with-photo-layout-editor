import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clean(val?: string): string {
  return (val || "").trim();
}

export async function GET() {
  const apiKey = clean(
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );
  const authDomain = clean(
    process.env.FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  );
  const projectId = clean(
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  const storageBucket = clean(
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
  const messagingSenderId = clean(
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  );
  const appId = clean(
    process.env.FIREBASE_APP_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
  const measurementId = clean(
    process.env.FIREBASE_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  );

  return NextResponse.json({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    isConfigured: Boolean(apiKey && projectId),
  });
}
