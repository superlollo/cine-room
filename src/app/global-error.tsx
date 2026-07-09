"use client";

import "./globals.css";

// Fallback per errori nel root layout stesso: deve renderizzare <html>/<body>.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="it">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#0a0a0f",
          color: "#ededf2",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          Qualcosa è andato storto
        </h1>
        <p style={{ color: "#9a9aa8", fontSize: "0.875rem" }}>
          Ricarica la pagina per riprovare.
        </p>
        <button
          onClick={reset}
          style={{
            height: "3rem",
            padding: "0 1.75rem",
            borderRadius: "1rem",
            border: "none",
            fontWeight: 600,
            color: "#000",
            cursor: "pointer",
            background: "linear-gradient(135deg, #f5c518, #e50914)",
          }}
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
