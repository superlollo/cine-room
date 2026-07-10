import type { MetadataRoute } from "next";

// Web App Manifest: dà all'app un nome/icona propri quando installata (Android
// crea un WebAPK che intercetta i link nello scope e apre l'app installata
// invece del browser). Su iOS il nome della home screen segue invece il meta
// `apple-mobile-web-app-title` in layout.tsx, non questo file.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CineRoom",
    short_name: "CineRoom",
    description: "Decidete insieme che film guardare.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
