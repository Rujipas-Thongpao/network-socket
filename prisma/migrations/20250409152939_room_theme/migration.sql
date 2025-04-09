-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('DEFAULT', 'DARK', 'LIGHT', 'SPACE', 'NATURE', 'RETRO');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'DEFAULT';
