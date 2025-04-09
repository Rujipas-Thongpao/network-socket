/*
  Warnings:

  - A unique constraint covering the columns `[hashName]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashName` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Room_name_key";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "hashName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_hashName_key" ON "Room"("hashName");
