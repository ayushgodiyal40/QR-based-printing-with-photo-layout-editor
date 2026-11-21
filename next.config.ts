import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled in edge runtime
  serverExternalPackages: ["pg", "sharp", "pdf-lib", "bcryptjs", "firebase-admin"],
  // Allow images from local storage
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
