-- CreateTable
CREATE TABLE "EmployeeFormData" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "birthDate" TEXT,
    "idNumber" VARCHAR(20),
    "birthplace" VARCHAR(50),
    "nationality" VARCHAR(30),
    "bloodType" VARCHAR(5),
    "gender" VARCHAR(5),
    "maritalStatus" VARCHAR(10),
    "childrenCount" VARCHAR(10),
    "homePhone" VARCHAR(30),
    "mobilePhone" VARCHAR(30),
    "personalEmail" VARCHAR(255),
    "permanentAddress" VARCHAR(200),
    "currentAddress" VARCHAR(200),
    "sameAddress" BOOLEAN NOT NULL DEFAULT false,
    "education" JSONB,
    "workHistory" JSONB,
    "languageSkills" JSONB,
    "familyMembers" JSONB,
    "nhiDependents" JSONB,
    "emergencyName" VARCHAR(50),
    "emergencyRelation" VARCHAR(20),
    "emergencyPhone" VARCHAR(30),
    "laborPensionSelf" BOOLEAN,
    "laborPensionRate" VARCHAR(5),
    "withholdingMethod" VARCHAR(5),
    "taxDependents" JSONB,
    "consentAgreed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeFormData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeFormData_sessionId_key" ON "EmployeeFormData"("sessionId");

-- AddForeignKey
ALTER TABLE "EmployeeFormData" ADD CONSTRAINT "EmployeeFormData_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
