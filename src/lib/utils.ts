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

export function generateReferralCode(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
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
