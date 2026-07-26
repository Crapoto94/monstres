-- CreateTable
CREATE TABLE "import_log_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'facebook',
    "postId" TEXT,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "title" TEXT,
    "itemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "import_log_entries_runId_idx" ON "import_log_entries"("runId");

-- CreateIndex
CREATE INDEX "import_log_entries_createdAt_idx" ON "import_log_entries"("createdAt");
