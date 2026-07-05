import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://referidoo.com"),
  title: "Referidoo — referidos que se registran solos",
  description: "El sistema de referidos para asesores de seguros en México. Cada recomendación de tus clientes se registra sola y su premio se calcula solo — tú nada más cierras la venta.",
  openGraph: {
    title: "Referidoo — referidos que se registran solos",
    description: "El sistema de referidos para asesores de seguros en México. Cada recomendación de tus clientes se registra sola y su premio se calcula solo.",
    url: "https://referidoo.com",
    siteName: "Referidoo",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-white text-gray-950 antialiased">
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  );
}
