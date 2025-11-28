/*
  Warnings:

  - Added the required column `avatar` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `activities` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'INVITE', 'JOIN', 'LEAVE', 'COMMENT', 'SHARE', 'EXPORT', 'VIEW');

-- DropIndex
DROP INDEX "activities_action_idx";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "avatar" TEXT NOT NULL,
ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "timestamp" BIGINT NOT NULL,
ADD COLUMN     "type" "ActivityType" NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "whiteboard_elements" ADD COLUMN     "comments" JSONB DEFAULT '[]',
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "reactions" JSONB DEFAULT '[]',
ALTER COLUMN "zIndex" SET DEFAULT 10;

-- DropEnum
DROP TYPE "ActivityAction";

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB,
    "reactions" JSONB DEFAULT '[]',
    "replyTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_dashboardId_timestamp_idx" ON "chat_messages"("dashboardId", "timestamp");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "activities_timestamp_idx" ON "activities"("timestamp");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "whiteboard_elements_createdBy_idx" ON "whiteboard_elements"("createdBy");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
