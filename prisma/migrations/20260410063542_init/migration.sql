-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "geminiApiKey" TEXT
);

-- CreateTable
CREATE TABLE "CachedMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dateRange" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CachedMetric_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "CachedMetric_brandId_source_metricKey_dateRange_idx" ON "CachedMetric"("brandId", "source", "metricKey", "dateRange");
