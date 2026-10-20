-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "description" VARCHAR(300),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "role" VARCHAR(120) NOT NULL,
    "organization" VARCHAR(120) NOT NULL,
    "employmentType" VARCHAR(40),
    "location" VARCHAR(120),
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_expire_idx" ON "session"("expire");

-- CreateIndex
CREATE INDEX "Skill_published_category_sortOrder_idx" ON "Skill"("published", "category", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_category_name_key" ON "Skill"("category", "name");

-- CreateIndex
CREATE INDEX "Experience_published_sortOrder_idx" ON "Experience"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "Experience_startDate_idx" ON "Experience"("startDate");
