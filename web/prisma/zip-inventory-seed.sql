-- Seed marketplace ZIP inventory rows for both REALTOR and DEALER verticals.
INSERT INTO "ZipInventory" ("zipCode", "vertical", "state", "city", "county", "tier", "annualPriceCents", "status", "assignedClientId", "reservationExpiresAt", "renewalDate", "createdAt", "updatedAt")
VALUES
  ('28207', 'REALTOR'::"Vertical", 'NC', 'Charlotte', 'Mecklenburg', 'PREMIUM'::"ZipTier", 112000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28207', 'DEALER'::"Vertical", 'NC', 'Charlotte', 'Mecklenburg', 'PREMIUM'::"ZipTier", 112000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27608', 'REALTOR'::"Vertical", 'NC', 'Raleigh', 'Wake', 'PREMIUM'::"ZipTier", 112000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27608', 'DEALER'::"Vertical", 'NC', 'Raleigh', 'Wake', 'PREMIUM'::"ZipTier", 112000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27519', 'REALTOR'::"Vertical", 'NC', 'Cary', 'Wake', 'HIGH_DEMAND'::"ZipTier", 99800, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27519', 'DEALER'::"Vertical", 'NC', 'Cary', 'Wake', 'HIGH_DEMAND'::"ZipTier", 99800, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28173', 'REALTOR'::"Vertical", 'NC', 'Waxhaw', 'Union', 'HIGH_DEMAND'::"ZipTier", 99800, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28173', 'DEALER'::"Vertical", 'NC', 'Waxhaw', 'Union', 'HIGH_DEMAND'::"ZipTier", 99800, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28031', 'REALTOR'::"Vertical", 'NC', 'Cornelius', 'Mecklenburg', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28031', 'DEALER'::"Vertical", 'NC', 'Cornelius', 'Mecklenburg', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28211', 'REALTOR'::"Vertical", 'NC', 'Charlotte', 'Mecklenburg', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('28211', 'DEALER'::"Vertical", 'NC', 'Charlotte', 'Mecklenburg', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27540', 'REALTOR'::"Vertical", 'NC', 'Holly Springs', 'Wake', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27540', 'DEALER'::"Vertical", 'NC', 'Holly Springs', 'Wake', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27587', 'REALTOR'::"Vertical", 'NC', 'Wake Forest', 'Wake', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW()),
  ('27587', 'DEALER'::"Vertical", 'NC', 'Wake Forest', 'Wake', 'STANDARD'::"ZipTier", 52000, 'AVAILABLE'::"ZipStatus", NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT ("zipCode", "vertical") DO UPDATE SET
  "state" = EXCLUDED."state",
  "city" = EXCLUDED."city",
  "county" = EXCLUDED."county",
  "tier" = EXCLUDED."tier",
  "annualPriceCents" = EXCLUDED."annualPriceCents",
  "status" = EXCLUDED."status",
  "assignedClientId" = NULL,
  "reservationExpiresAt" = NULL,
  "renewalDate" = NULL,
  "updatedAt" = NOW();
