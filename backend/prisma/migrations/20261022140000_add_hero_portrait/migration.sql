-- Managed homepage hero portrait (docs/08-database-schema.md §20).
-- Image bytes live on the media volume; these tables hold metadata and the
-- draft/published references only.

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storageKey" VARCHAR(120) NOT NULL,
    "originalFilename" VARCHAR(200) NOT NULL,
    "mimeType" VARCHAR(60) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageSettings" (
    "id" VARCHAR(16) NOT NULL DEFAULT 'primary',
    "draftPortraitId" TEXT,
    "draftPortraitAlt" VARCHAR(200),
    "draftPortraitVisible" BOOLEAN NOT NULL DEFAULT true,
    "draftEffectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "draftTiltIntensity" INTEGER NOT NULL DEFAULT 40,
    "draftAnimationIntensity" INTEGER NOT NULL DEFAULT 50,
    "draftFloatingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publishedPortraitId" TEXT,
    "publishedPortraitAlt" VARCHAR(200),
    "publishedPortraitVisible" BOOLEAN NOT NULL DEFAULT true,
    "publishedEffectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publishedTiltIntensity" INTEGER NOT NULL DEFAULT 40,
    "publishedAnimationIntensity" INTEGER NOT NULL DEFAULT 50,
    "publishedFloatingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "HomepageSettings_draftPortraitId_idx" ON "HomepageSettings"("draftPortraitId");

-- CreateIndex
CREATE INDEX "HomepageSettings_publishedPortraitId_idx" ON "HomepageSettings"("publishedPortraitId");

-- AddForeignKey
ALTER TABLE "HomepageSettings" ADD CONSTRAINT "HomepageSettings_draftPortraitId_fkey" FOREIGN KEY ("draftPortraitId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepageSettings" ADD CONSTRAINT "HomepageSettings_publishedPortraitId_fkey" FOREIGN KEY ("publishedPortraitId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
