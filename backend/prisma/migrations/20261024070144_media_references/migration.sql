-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "portraitMediaId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "coverMediaId" TEXT;

-- CreateIndex
CREATE INDEX "Profile_portraitMediaId_idx" ON "Profile"("portraitMediaId");

-- CreateIndex
CREATE INDEX "Project_coverMediaId_idx" ON "Project"("coverMediaId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_portraitMediaId_fkey" FOREIGN KEY ("portraitMediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
