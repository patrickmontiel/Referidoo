import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Avoid ambiguous characters (0/O, 1/I/l) so codes are easy to read and type
const REFERRAL_CODE_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateReferralCode(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6);
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }
  return `${base}${rand}`;
}

export function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "Pendiente",
    contacted: "Contactado",
    converted: "Convertido",
    rejected: "Rechazado",
  };
  return map[status] ?? status;
}

export function getRewardStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "Sin aprobar",
    approved: "Aprobado",
    paid: "Pagado",
  };
  return map[status] ?? status;
}
