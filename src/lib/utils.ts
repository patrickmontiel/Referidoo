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

export function formatNumberWithCommas(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("en-US").format(Number(digits));
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

// Corte obligatorio: el asesor tiene este número de días para pagarle el premio
// a su cliente desde que el premio queda aprobado (o desde que reclama su burbuja).
export const REWARD_CUTOFF_DAYS = 30;

// Normaliza un teléfono a sus últimos 10 dígitos para comparar duplicados sin
// que el formato (espacios, +52, lada) genere falsos negativos.
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
