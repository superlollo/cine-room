import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fissa la root del progetto: evita il warning quando esistono lockfile
  // in cartelle superiori (Next altrimenti "indovina" la workspace root).
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  experimental: {
    // Di default Next 16 mette in cache le risposte fetch tra richieste
    // separate in sviluppo (si svuota solo con reload/navigazione), anche
    // per quelle 'no-store'. Le nostre letture Supabase (stato realtime di
    // stanze/sessioni swipe) devono essere sempre fresche: es. il gate
    // "tutti pronti" del Tinder-mode leggeva readiness stantia da cache e
    // faceva partire la sessione in anticipo.
    serverComponentsHmrCache: false,
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
