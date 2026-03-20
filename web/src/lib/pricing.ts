export const ZIP_TIER_PRICE_CENTS = {
  STANDARD: 52_000,
  HIGH_DEMAND: 99_800,
  PREMIUM: 112_000,
} as const;

export const ZIP_TIER_PRICE_DOLLARS = {
  STANDARD: 520,
  HIGH_DEMAND: 998,
  PREMIUM: 1120,
} as const;

export type ZipTierPriceKey = keyof typeof ZIP_TIER_PRICE_CENTS;

export const ZIP_TIER_LABELS: Record<ZipTierPriceKey, string> = {
  STANDARD: "Standard",
  HIGH_DEMAND: "High Demand",
  PREMIUM: "Premium",
};

export function formatZipTierLabel(tier: string) {
  return ZIP_TIER_LABELS[tier as ZipTierPriceKey] ?? tier.replaceAll("_", " ");
}
