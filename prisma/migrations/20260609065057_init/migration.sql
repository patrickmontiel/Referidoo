-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdvisorSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "afterLastTier" TEXT NOT NULL DEFAULT 'cycle',
    "flatAmount" INTEGER NOT NULL DEFAULT 1500,
    "whatsappMessage" TEXT,
    "welcomeMessage" TEXT,
    CONSTRAINT "AdvisorSettings_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "label" TEXT,
    CONSTRAINT "RewardTier_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "policyNumber" TEXT,
    "accessToken" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadPhone" TEXT NOT NULL,
    "leadEmail" TEXT,
    "leadNotes" TEXT,
    "tierPosition" INTEGER NOT NULL,
    "rewardAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referral_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_email_key" ON "Advisor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorSettings_advisorId_key" ON "AdvisorSettings"("advisorId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTier_advisorId_position_key" ON "RewardTier"("advisorId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Client_accessToken_key" ON "Client"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Client_referralCode_key" ON "Client"("referralCode");
