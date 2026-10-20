-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" VARCHAR(60) NOT NULL DEFAULT 'Full-stack',
    "year" VARCHAR(9) NOT NULL,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "liveUrl" VARCHAR(2048),
    "repositoryUrl" VARCHAR(2048),
    "imageUrl" VARCHAR(2048),
    "imageAlt" VARCHAR(200),
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" VARCHAR(60) NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" VARCHAR(64),
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_status_featured_sortOrder_idx" ON "Project"("status", "featured", "sortOrder");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
