-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantAId" TEXT NOT NULL,
    "participantBId" TEXT NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversations_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversations_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "emailVerifiedAt" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "score" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "newsletterOptin" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT,
    "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false,
    "messageEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "suspendedAt" DATETIME,
    "bannedAt" DATETIME,
    "registrationIp" TEXT,
    "registrationUserAgent" TEXT,
    "registrationOs" TEXT,
    "registrationBrowser" TEXT,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "lastLoginUserAgent" TEXT,
    "lastLoginOs" TEXT,
    "lastLoginBrowser" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "emailVerificationToken" TEXT,
    "emailVerificationExpiresAt" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" DATETIME
);
INSERT INTO "new_users" ("avatar", "bannedAt", "createdAt", "email", "emailNotifications", "emailVerificationExpiresAt", "emailVerificationToken", "emailVerifiedAt", "id", "lastLoginAt", "lastLoginBrowser", "lastLoginIp", "lastLoginOs", "lastLoginUserAgent", "loginCount", "name", "newsletterOptin", "onboardingCompletedAt", "password", "passwordResetExpiresAt", "passwordResetToken", "phoneNumber", "registrationBrowser", "registrationIp", "registrationOs", "registrationUserAgent", "role", "score", "suspendedAt", "trustScore", "updatedAt", "whatsappNotifications") SELECT "avatar", "bannedAt", "createdAt", "email", "emailNotifications", "emailVerificationExpiresAt", "emailVerificationToken", "emailVerifiedAt", "id", "lastLoginAt", "lastLoginBrowser", "lastLoginIp", "lastLoginOs", "lastLoginUserAgent", "loginCount", "name", "newsletterOptin", "onboardingCompletedAt", "password", "passwordResetExpiresAt", "passwordResetToken", "phoneNumber", "registrationBrowser", "registrationIp", "registrationOs", "registrationUserAgent", "role", "score", "suspendedAt", "trustScore", "updatedAt", "whatsappNotifications" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "conversations_participantAId_idx" ON "conversations"("participantAId");

-- CreateIndex
CREATE INDEX "conversations_participantBId_idx" ON "conversations"("participantBId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participantAId_participantBId_key" ON "conversations"("participantAId", "participantBId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");
