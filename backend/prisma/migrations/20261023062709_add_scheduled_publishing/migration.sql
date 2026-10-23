-- AlterTable
ALTER TABLE "Certification" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Education" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Certification_publishAt_idx" ON "Certification"("publishAt");

-- CreateIndex
CREATE INDEX "Education_publishAt_idx" ON "Education"("publishAt");

-- CreateIndex
CREATE INDEX "Experience_publishAt_idx" ON "Experience"("publishAt");

-- CreateIndex
CREATE INDEX "Project_publishAt_idx" ON "Project"("publishAt");

-- CreateIndex
CREATE INDEX "Skill_publishAt_idx" ON "Skill"("publishAt");
