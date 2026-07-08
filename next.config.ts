import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fissa la root del progetto: evita il warning quando esistono lockfile
  // in cartelle superiori (Next altrimenti "indovina" la workspace root).
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
