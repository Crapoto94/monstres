-- AlterTable: ajout des métadonnées de connexion sur la table users
ALTER TABLE "users" ADD COLUMN "registrationIp" TEXT;
ALTER TABLE "users" ADD COLUMN "registrationUserAgent" TEXT;
ALTER TABLE "users" ADD COLUMN "registrationOs" TEXT;
ALTER TABLE "users" ADD COLUMN "registrationBrowser" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "lastLoginIp" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginUserAgent" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginOs" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginBrowser" TEXT;
