import { formatZipTierLabel as formatTierLabel } from "@/lib/pricing";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function zipStatusColor(status: string) {
  if (status === "AVAILABLE") return "bg-emerald-100 text-emerald-700";
  if (status === "RESERVED") return "bg-amber-100 text-amber-700";
  if (status === "SOLD") return "bg-rose-100 text-rose-700";
  return "bg-slate-200 text-slate-700";
}

export function formatZipTierLabel(tier: string) {
  return formatTierLabel(tier);
}
