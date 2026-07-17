"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";

const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

function CorreoVerificadoInner() {
  const searchParams = useSearchParams();
  const estado = searchParams.get("estado"); // "expirado" | "falta" | null(=éxito)
  const isError = estado === "expirado" || estado === "falta";

  // ¿Esta pestaña tiene una "hermana" abierta (la que la asesora ya estaba
  // usando)? Si el correo se abrió en el mismo navegador, sí — le avisamos por
  // BroadcastChannel y ella se actualiza sin recargar.
  const [hasSibling, setHasSibling] = useState(false);

  useEffect(() => {
    if (isError) return; // en error NO avisamos "verificado" a nadie
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("referidoo-auth");
        bc.postMessage({ type: "email-verified" });
        bc.close();
      }
    } catch {}
    try {
      localStorage.setItem("referidoo-email-verified", String(Date.now()));
    } catch {}

    const likelyStandalone = window.history.length <= 1 && !window.opener;
    setHasSibling(!likelyStandalone);
  }, [isError]);

  const accent = isError ? "#D97706" : "#2563EB";

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-5 ${hanken.className}`}
      style={{ background: "#f4f3f0" }}
    >
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em", color: "#0d0d0d" }}>referidoo</span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB", display: "inline-block", marginBottom: 3 }} />
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "40px 36px 32px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,.07)",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 22px",
            animation: "cvPop .5s cubic-bezier(.34,1.3,.5,1) both",
          }}
        >
          {isError ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v5M12 17h.01" />
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </div>

        {isError ? (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#0d0d0d", marginBottom: 8 }}>Este enlace ya no sirve</p>
            <p style={{ fontSize: 14, color: "#52525b", lineHeight: 1.55, marginBottom: 26 }}>
              Es probable que hayas reenviado el correo: cada reenvío deja fuera los enlaces anteriores. En el
              dispositivo donde <strong style={{ color: "#0d0d0d" }}>creaste tu cuenta</strong>, toca “reenviar correo” y abre el
              correo <strong style={{ color: "#0d0d0d" }}>más reciente</strong>. Si ya lo verificaste, ignora esto.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#0d0d0d", marginBottom: 8 }}>¡Correo verificado!</p>
            {hasSibling ? (
              <p style={{ fontSize: 14, color: "#52525b", lineHeight: 1.55, marginBottom: 26 }}>
                Ya puedes agregar clientes. <strong style={{ color: "#0d0d0d" }}>Vuelve a la pestaña</strong> donde estabas
                trabajando — ya se actualizó sola, sin perder nada de lo que tenías. Puedes cerrar esta.
              </p>
            ) : (
              <p style={{ fontSize: 14, color: "#52525b", lineHeight: 1.55, marginBottom: 26 }}>
                Tu cuenta quedó lista. Ya puedes empezar a agregar clientes y activar tu programa de referidos.
              </p>
            )}
          </>
        )}

        <a
          href="/admin"
          style={{
            display: "block",
            width: "100%",
            background: "#0d0d0d",
            color: "#fff",
            textAlign: "center",
            padding: "14px 0",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Ir a mi panel →
        </a>
      </div>

      <style>{`@keyframes cvPop { 0% { transform: scale(.5); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

export default function CorreoVerificadoPage() {
  return (
    <Suspense fallback={null}>
      <CorreoVerificadoInner />
    </Suspense>
  );
}
