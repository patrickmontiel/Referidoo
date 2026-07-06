import { ImageResponse } from "next/og";

// Ícono para iOS/bookmarks: mismo isotipo a mayor resolución.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span style={{ fontSize: 124, fontWeight: 700, color: "#0B0B0C", lineHeight: 0.78 }}>r</span>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#2563EB",
              marginLeft: 5,
              marginBottom: 3,
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
