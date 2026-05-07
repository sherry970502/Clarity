-- CreateTable
CREATE TABLE "MapCollaborator" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MapCollaborator_mapId_userId_key" ON "MapCollaborator"("mapId", "userId");

-- CreateIndex
CREATE INDEX "MapCollaborator_userId_idx" ON "MapCollaborator"("userId");

-- AddForeignKey
ALTER TABLE "MapCollaborator" ADD CONSTRAINT "MapCollaborator_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCollaborator" ADD CONSTRAINT "MapCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
