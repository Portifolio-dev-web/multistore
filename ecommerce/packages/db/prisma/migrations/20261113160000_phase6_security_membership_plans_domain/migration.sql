-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'ESSENCIAL', 'PRO');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "UserTokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFY', 'TEAM_INVITE');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "domainClaimedAt" TIMESTAMP(3),
ADD COLUMN     "domainStatus" "DomainStatus",
ADD COLUMN     "domainVerificationToken" TEXT,
ADD COLUMN     "onboardingDismissedAt" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planStatus" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Store_stripeCustomerId_key" ON "Store"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_stripeSubscriptionId_key" ON "Store"("stripeSubscriptionId");

-- AlterTable: ainda NÃO remove "storeId" aqui — precisa dele pra popular o Membership abaixo
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "UserTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_storeId_idx" ON "Membership"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_storeId_key" ON "Membership"("userId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_tokenHash_key" ON "UserToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserToken_userId_idx" ON "UserToken"("userId");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: todo usuário existente vira OWNER da loja que já tinha em User.storeId
INSERT INTO "Membership" ("id", "userId", "storeId", "role", "createdAt")
SELECT gen_random_uuid()::text, "id", "storeId", 'OWNER', CURRENT_TIMESTAMP
FROM "User"
WHERE "storeId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_storeId_fkey";

-- DropIndex
DROP INDEX "User_storeId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "storeId";
