/*
  Warnings:

  - Added the required column `userId` to the `Brand` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Insert default user for existing brands
INSERT INTO "User" ("id", "username", "createdAt", "updatedAt")
VALUES ('default-user-id', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default-user-id',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
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
    "geminiApiKey" TEXT,
    CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Brand" ("createdAt", "ga4PropertyId", "ga4ServiceAccountJson", "geminiApiKey", "googleAdsClientId", "googleAdsClientSecret", "googleAdsCustomerId", "googleAdsDevToken", "googleAdsRefreshToken", "id", "logoUrl", "metaAccessToken", "metaAdAccountId", "metaAppId", "metaAppSecret", "name", "shopifyAccessToken", "shopifyStoreUrl", "slug", "updatedAt", "userId") SELECT "createdAt", "ga4PropertyId", "ga4ServiceAccountJson", "geminiApiKey", "googleAdsClientId", "googleAdsClientSecret", "googleAdsCustomerId", "googleAdsDevToken", "googleAdsRefreshToken", "id", "logoUrl", "metaAccessToken", "metaAdAccountId", "metaAppId", "metaAppSecret", "name", "shopifyAccessToken", "shopifyStoreUrl", "slug", "updatedAt", 'default-user-id' FROM "Brand";
DROP TABLE "Brand";
ALTER TABLE "new_Brand" RENAME TO "Brand";
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
