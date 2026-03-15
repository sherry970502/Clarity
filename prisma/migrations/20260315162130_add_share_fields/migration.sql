/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `MindMap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MindMap" ADD COLUMN     "sharePasswordHash" TEXT,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MindMap_shareToken_key" ON "MindMap"("shareToken");
