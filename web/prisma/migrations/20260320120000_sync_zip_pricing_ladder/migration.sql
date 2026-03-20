UPDATE "ZipInventory"
SET "annualPriceCents" = CASE "tier"
  WHEN 'STANDARD' THEN 52000
  WHEN 'HIGH_DEMAND' THEN 99800
  WHEN 'PREMIUM' THEN 112000
  ELSE "annualPriceCents"
END
WHERE "annualPriceCents" IS DISTINCT FROM CASE "tier"
  WHEN 'STANDARD' THEN 52000
  WHEN 'HIGH_DEMAND' THEN 99800
  WHEN 'PREMIUM' THEN 112000
  ELSE "annualPriceCents"
END;

UPDATE "Payment" AS payment
SET "amountCents" = zip."annualPriceCents"
FROM "ZipInventory" AS zip
WHERE payment."zipId" = zip."id"
  AND payment."status" = 'PENDING'
  AND payment."amountCents" IS DISTINCT FROM zip."annualPriceCents";
