-- SQLite doesn't support direct foreign key constraint drops
-- We'll create a new Brand table without userId, copy data, drop old table, rename new table

PRAGMA foreign_keys=OFF;

-- Create new Brand table without userId
CREATE TABLE "Brand_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shopifyStoreUrl" TEXT,
    "shopifyAccessToken" TEXT,
    "ga4PropertyId" TEXT,
    "ga4ServiceAccountJson" TEXT,
    "metaAppId" TEXT,
    "metaAppSecret" TEXT,
    "metaAccessToken" TEXT,
    "metaAdAccountId" TEXT,
    "googleAdsDevToken" TEXT,
    "googleAdsClientId" TEXT,
    "googleAdsClientSecret" TEXT,
    "googleAdsRefreshToken" TEXT,
    "googleAdsCustomerId" TEXT,
    "geminiApiKey" TEXT
);

-- Copy data from old Brand table to new table
INSERT INTO "Brand_new"
SELECT "id", "name", "slug", "logoUrl", "createdAt", "updatedAt", "shopifyStoreUrl", "shopifyAccessToken",
       "ga4PropertyId", "ga4ServiceAccountJson", "metaAppId", "metaAppSecret", "metaAccessToken",
       "metaAdAccountId", "googleAdsDevToken", "googleAdsClientId", "googleAdsClientSecret",
       "googleAdsRefreshToken", "googleAdsCustomerId", "geminiApiKey"
FROM "Brand";

-- Drop old tables
DROP TABLE "Brand";
DROP TABLE "User";

-- Rename new Brand table
ALTER TABLE "Brand_new" RENAME TO "Brand";

PRAGMA foreign_keys=ON;
