import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma types aren't generated until a DB is connected — suppress TS errors in build
  // Remove this once DATABASE_URL is configured and `prisma generate` has been run
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
