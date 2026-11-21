import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "43fb0d0b8f09fa6106655c68ee188e404bf79ef79f82fa5eb7fc51caeb76451e",
    AUTH_TRUST_HOST: "true",
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
      process.env.FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  },
  // External packages that should not be bundled in edge runtime
  serverExternalPackages: ["pg", "sharp", "pdf-lib", "bcryptjs"],
  // Allow images from local storage
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
