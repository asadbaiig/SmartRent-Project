import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: string | number | null | undefined, compact = false) {
  const amount = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount)) return "Price on request";

  if (compact) {
    if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(1)}Cr`;
    if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(amount >= 1_000_000 ? 1 : 0)}L`;
    if (amount >= 1_000) return `Rs ${(amount / 1_000).toFixed(0)}k`;
  }

  return `Rs ${amount.toLocaleString()}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
