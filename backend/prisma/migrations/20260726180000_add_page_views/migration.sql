-- Statistiques de consultation anonymisées (§ KPI admin). Aucune IP ni
-- User-Agent brut n'est stocké, seulement les champs déjà dérivés.
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "itemId" TEXT,
    "userId" TEXT,
    "visitorHash" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "os" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "page_views_createdAt_idx" ON "page_views"("createdAt");
CREATE INDEX "page_views_path_idx" ON "page_views"("path");
CREATE INDEX "page_views_visitorHash_idx" ON "page_views"("visitorHash");
CREATE INDEX "page_views_itemId_idx" ON "page_views"("itemId");
