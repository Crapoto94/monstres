-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "whatsapp_logs_to_idx" ON "whatsapp_logs"("to");

-- CreateIndex
CREATE INDEX "whatsapp_logs_status_idx" ON "whatsapp_logs"("status");

-- CreateIndex
CREATE INDEX "whatsapp_logs_createdAt_idx" ON "whatsapp_logs"("createdAt");
