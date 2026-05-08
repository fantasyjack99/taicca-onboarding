-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "name" VARCHAR(50) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "startDate" DATE NOT NULL,
    "contactEmail" VARCHAR(255) NOT NULL,
    "taiccaEmail" VARCHAR(255),
    "englishName" VARCHAR(100),
    "showPhone" BOOLEAN,
    "photoPath" VARCHAR(500),
    "employeeId" VARCHAR(20),
    "ragicSyncedAt" TIMESTAMP(3),
    "ragicCache" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentCache" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "divisions" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_token_key" ON "OnboardingSession"("token");

-- CreateIndex
CREATE INDEX "OnboardingSession_status_idx" ON "OnboardingSession"("status");

-- CreateIndex
CREATE INDEX "OnboardingSession_taiccaEmail_idx" ON "OnboardingSession"("taiccaEmail");

-- CreateIndex
CREATE INDEX "OnboardingSession_englishName_idx" ON "OnboardingSession"("englishName");
