import { ImageResponse } from "next/og";

export const alt = "Referidoo — el sistema de referidos para asesores de seguros en México";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: 72,
          position: "relative",
        }}
      >
        {/* Círculo azul de marca, sangrado como en el footer */}
        <div
          style={{
            position: "absolute",
            right: -170,
            bottom: -240,
            width: 540,
            height: 540,
            borderRadius: 9999,
            background: "#2563EB",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span style={{ fontSize: 46, fontWeight: 700, color: "#0B0B0C", letterSpacing: "-0.02em" }}>
            referidoo
          </span>
          <div
            style={{
              width: 15,
              height: 15,
              borderRadius: 9999,
              background: "#3B82F6",
              marginLeft: 7,
              marginBottom: 11,
              display: "flex",
            }}
          />
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              color: "#0B0B0C",
              letterSpacing: "-0.03em",
              lineHeight: 1.06,
              maxWidth: 880,
              display: "flex",
            }}
          >
            Deja de perder referidos en WhatsApp y Excel.
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#5A626E",
              marginTop: 26,
              maxWidth: 780,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Cada recomendación de tus clientes se registra sola y su premio se calcula solo.
          </div>
        </div>

        {/* CTA + dominio */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              background: "#0B0B0C",
              color: "#ffffff",
              fontSize: 25,
              fontWeight: 700,
              padding: "17px 34px",
              borderRadius: 9999,
              display: "flex",
            }}
          >
            Crear cuenta gratis
          </div>
          <span style={{ fontSize: 25, color: "#8A8F98" }}>referidoo.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
