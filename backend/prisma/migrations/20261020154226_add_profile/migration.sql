-- CreateTable
CREATE TABLE "Profile" (
    "id" VARCHAR(16) NOT NULL DEFAULT 'primary',
    "displayName" VARCHAR(120) NOT NULL,
    "headline" VARCHAR(160) NOT NULL,
    "biography" TEXT NOT NULL,
    "location" VARCHAR(120),
    "publicEmail" VARCHAR(254),
    "websiteUrl" VARCHAR(2048),
    "linkedinUrl" VARCHAR(2048),
    "githubUrl" VARCHAR(2048),
    "portraitUrl" VARCHAR(2048),
    "portraitAlt" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
