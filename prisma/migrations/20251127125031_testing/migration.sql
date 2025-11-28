-- AlterTable
ALTER TABLE "whiteboard_elements" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "zIndex" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "whiteboard_elements_parentId_idx" ON "whiteboard_elements"("parentId");
