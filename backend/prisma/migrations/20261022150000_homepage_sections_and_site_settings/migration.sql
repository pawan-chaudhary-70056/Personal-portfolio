-- AlterTable
ALTER TABLE "HomepageSettings" ADD COLUMN     "draftFeaturedProjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "draftHiddenSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "draftSectionOrder" TEXT[] DEFAULT ARRAY['about', 'work', 'skills', 'experience', 'credentials', 'contact']::TEXT[],
ADD COLUMN     "publishedFeaturedProjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishedHiddenSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishedSectionOrder" TEXT[] DEFAULT ARRAY['about', 'work', 'skills', 'experience', 'credentials', 'contact']::TEXT[];

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" VARCHAR(16) NOT NULL DEFAULT 'primary',
    "siteTitle" VARCHAR(120) NOT NULL DEFAULT '',
    "siteDescription" VARCHAR(320) NOT NULL DEFAULT '',
    "canonicalUrl" VARCHAR(2048),
    "socialImageUrl" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
