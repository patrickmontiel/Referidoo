import { ImageResponse } from "next/og";

// Favicon: el isotipo — fondo blanco, "r" negra, punto azul al pie.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: "#0B0B0C", lineHeight: 0.78 }}>r</span>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#2563EB",
              marginLeft: 2,
              marginBottom: 1,
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
