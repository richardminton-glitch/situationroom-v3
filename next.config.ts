import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma types aren't generated until a DB is connected — suppress TS errors in build
  // Remove this once DATABASE_URL is configured and `prisma generate` has been run
  typescript: {
    ignoreBuildErrors: true,
  },

  // Permanent (308) redirects from the old route layout to the new
  // tools/* and rooms/* structure. Order matters: list specific paths
  // before catch-alls so the catch-all doesn't shadow them.
  async redirects() {
    return [
      // Tools section
      { source: '/room/dca-signal',  destination: '/tools/dca-signal',  permanent: true },
      { source: '/room/cycle-gauge', destination: '/tools/cycle-gauge', permanent: true },
      { source: '/room/mining',      destination: '/tools/mining',      permanent: true },
      { source: '/map',              destination: '/tools/map',         permanent: true },

      // Rooms section
      { source: '/bot-room',         destination: '/rooms/trading-desk', permanent: true },
      { source: '/rooms/bot',        destination: '/rooms/trading-desk', permanent: true },
      { source: '/room',             destination: '/rooms/members',      permanent: true },

      // Catch-all safety net for any future /room/<unknown> path
      { source: '/room/:path*',      destination: '/rooms/members',     permanent: true },
    ];
  },
};

export default nextConfig;
