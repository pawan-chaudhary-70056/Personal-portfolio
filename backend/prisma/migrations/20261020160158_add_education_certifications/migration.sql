-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "institution" VARCHAR(160) NOT NULL,
    "qualification" VARCHAR(160) NOT NULL,
    "fieldOfStudy" VARCHAR(160),
    "description" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "issuingOrganization" VARCHAR(160) NOT NULL,
    "issueDate" DATE,
    "expiryDate" DATE,
    "credentialId" VARCHAR(120),
    "credentialUrl" VARCHAR(2048),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Education_published_sortOrder_idx" ON "Education"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "Certification_published_sortOrder_idx" ON "Certification"("published", "sortOrder");
