-- Managed project and skill categories (docs/08-database-schema.md §5.5, §5.8).
-- The free-text `category` columns are replaced by foreign keys. Existing
-- values are imported as category rows first so no content loses its grouping.

-- CreateTable
CREATE TABLE "ProjectCategory" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- Backfill: one category per distinct existing value. Duplicate slugs (for
-- example "C++" and "C#") get a numeric suffix so the unique index holds.
INSERT INTO "ProjectCategory" ("id", "name", "slug", "sortOrder", "createdAt", "updatedAt")
SELECT
    'pcat_' || substr(md5(c."name"), 1, 20),
    c."name",
    CASE WHEN c."rn" = 1 THEN c."base" ELSE c."base" || '-' || c."rn" END,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        "name",
        "base",
        row_number() OVER (PARTITION BY "base" ORDER BY "name") AS "rn"
    FROM (
        SELECT
            "name",
            COALESCE(
                NULLIF(trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), ''),
                'category'
            ) AS "base"
        FROM (SELECT DISTINCT trim("category") AS "name" FROM "Project") AS distinct_categories
    ) AS with_base
) AS c;

INSERT INTO "SkillCategory" ("id", "name", "slug", "sortOrder", "createdAt", "updatedAt")
SELECT
    'scat_' || substr(md5(c."name"), 1, 20),
    c."name",
    CASE WHEN c."rn" = 1 THEN c."base" ELSE c."base" || '-' || c."rn" END,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        "name",
        "base",
        row_number() OVER (PARTITION BY "base" ORDER BY "name") AS "rn"
    FROM (
        SELECT
            "name",
            COALESCE(
                NULLIF(trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), ''),
                'category'
            ) AS "base"
        FROM (SELECT DISTINCT trim("category") AS "name" FROM "Skill") AS distinct_categories
    ) AS with_base
) AS c;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategory_name_key" ON "ProjectCategory"("name");
CREATE UNIQUE INDEX "ProjectCategory_slug_key" ON "ProjectCategory"("slug");
CREATE INDEX "ProjectCategory_sortOrder_idx" ON "ProjectCategory"("sortOrder");
CREATE UNIQUE INDEX "SkillCategory_name_key" ON "SkillCategory"("name");
CREATE UNIQUE INDEX "SkillCategory_slug_key" ON "SkillCategory"("slug");
CREATE INDEX "SkillCategory_sortOrder_idx" ON "SkillCategory"("sortOrder");

-- Project: point at the imported category, then drop the free-text column.
ALTER TABLE "Project" ADD COLUMN "categoryId" TEXT;

UPDATE "Project" AS p
SET "categoryId" = c."id"
FROM "ProjectCategory" AS c
WHERE c."name" = trim(p."category");

ALTER TABLE "Project" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Project" DROP COLUMN "category";
CREATE INDEX "Project_categoryId_idx" ON "Project"("categoryId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ProjectCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Skill: same migration. The old unique key (category, name) and the old
-- compound index are dropped together with the column.
ALTER TABLE "Skill" ADD COLUMN "categoryId" TEXT;

UPDATE "Skill" AS s
SET "categoryId" = c."id"
FROM "SkillCategory" AS c
WHERE c."name" = trim(s."category");

ALTER TABLE "Skill" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Skill" DROP COLUMN "category";
CREATE UNIQUE INDEX "Skill_categoryId_name_key" ON "Skill"("categoryId", "name");
CREATE INDEX "Skill_published_sortOrder_idx" ON "Skill"("published", "sortOrder");
CREATE INDEX "Skill_categoryId_idx" ON "Skill"("categoryId");
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
