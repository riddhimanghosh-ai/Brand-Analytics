-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "previousValue" REAL NOT NULL,
    "currentValue" REAL NOT NULL,
    "changePercent" REAL NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT 0,
    "dismissedAt" DATETIME,
    CONSTRAINT "Alert_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "Alert_brandId_detectedAt_idx" ON "Alert"("brandId", "detectedAt");
