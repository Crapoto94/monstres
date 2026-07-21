
-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailVerificationExpiresAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpiresAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

