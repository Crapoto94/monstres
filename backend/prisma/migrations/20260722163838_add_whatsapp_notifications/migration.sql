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
    "phoneNumber" TEXT,
    "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_users" ("avatar", "bannedAt", "createdAt", "email", "emailNotifications", "emailVerificationExpiresAt", "emailVerificationToken", "emailVerifiedAt", "id", "lastLoginAt", "lastLoginBrowser", "lastLoginIp", "lastLoginOs", "lastLoginUserAgent", "loginCount", "name", "onboardingCompletedAt", "password", "passwordResetExpiresAt", "passwordResetToken", "registrationBrowser", "registrationIp", "registrationOs", "registrationUserAgent", "role", "score", "suspendedAt", "trustScore", "updatedAt") SELECT "avatar", "bannedAt", "createdAt", "email", "emailNotifications", "emailVerificationExpiresAt", "emailVerificationToken", "emailVerifiedAt", "id", "lastLoginAt", "lastLoginBrowser", "lastLoginIp", "lastLoginOs", "lastLoginUserAgent", "loginCount", "name", "onboardingCompletedAt", "password", "passwordResetExpiresAt", "passwordResetToken", "registrationBrowser", "registrationIp", "registrationOs", "registrationUserAgent", "role", "score", "suspendedAt", "trustScore", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
