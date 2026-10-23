-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'EDITOR');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'EDITOR';

-- Existing accounts predate roles: the current administrator owns the portfolio.
UPDATE "Admin" SET "role" = 'OWNER';
