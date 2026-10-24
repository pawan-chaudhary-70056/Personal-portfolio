-- AlterTable
ALTER TABLE "ProjectScreenshot" ADD COLUMN     "mediaId" TEXT,
ALTER COLUMN "url" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectScreenshot_mediaId_idx" ON "ProjectScreenshot"("mediaId");

-- AddForeignKey
ALTER TABLE "ProjectScreenshot" ADD CONSTRAINT "ProjectScreenshot_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
