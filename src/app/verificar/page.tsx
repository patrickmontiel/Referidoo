"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";

const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export default function VerificarPage() {
  const searchParams = useSearchParams();
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setInvalid(true);
      return;
    }
    // Navegación completa al API — el browser aplica el Set-Cookie del redirect correctamente
    window.location.href = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-5 ${hanken.className}`} style={{ background: "#f4f3f0" }}>
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em", color: "#0d0d0d" }}>referidoo</span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2B57F0", display: "inline-block", marginBottom: 3 }} />
      </div>

      {!invalid ? (
        <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.07)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #2B57F0", borderTopColor: "transparent", margin: "0 auto 20px", animation: "spin .8s linear infinite" }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: "#0d0d0d", marginBottom: 8 }}>Verificando tu correo</p>
          <p style={{ fontSize: 13, color: "#71717a" }}>Solo un momento...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.07)" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fff0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#0d0d0d", marginBottom: 8 }}>Link inválido</p>
          <p style={{ fontSize: 13, color: "#71717a", marginBottom: 24 }}>Este enlace no tiene un token de verificación válido.</p>
          <button onClick={() => { window.location.href = "/login"; }} style={{ width: "100%", background: "#0d0d0d", color: "#fff", border: "none", borderRadius: 50, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Ir al login →
          </button>
        </div>
      )}
    </div>
  );
}
