import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Referidoo — referidos que se registran solos",
  description: "El sistema de referidos para asesores de seguros en México. Cada recomendación de tus clientes se registra sola y su premio se calcula solo — tú nada más cierras la venta.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-white text-gray-950 antialiased">
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
