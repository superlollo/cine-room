import { ImageResponse } from "next/og";

export const alt = "CineRoom — decidete insieme che film guardare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Immagine di anteprima social (WhatsApp, ecc.). Branding generico.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(245,197,24,0.18), transparent 60%), #0a0a0f",
          color: "#ededf2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120 }}>🎬</div>
        <div style={{ display: "flex", fontSize: 110, fontWeight: 800, marginTop: 12 }}>
          <span>Cine</span>
          <span style={{ color: "#f5c518" }}>Room</span>
        </div>
        <div style={{ fontSize: 40, color: "#9a9aa8", marginTop: 8 }}>
          Decidete insieme che film guardare
        </div>
      </div>
    ),
    { ...size },
  );
}
