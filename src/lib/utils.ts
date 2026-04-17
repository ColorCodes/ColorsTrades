import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined, currency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "USD"): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | string | null | undefined, digits = 2): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
