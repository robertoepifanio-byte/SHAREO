-- Migration: add_item_status_draft
-- Adds ItemStatus enum and status column to items table.
-- DRAFT = item without photos (not visible in public listings)
-- AVAILABLE = item with ≥1 photo (visible in public listings)
-- PAUSED = owner manually paused (isActive=false)

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'PAUSED');

-- AlterTable: add status column defaulting to AVAILABLE (preserves existing items)
ALTER TABLE "items" ADD COLUMN "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE';

-- DropIndex (old index without status)
DROP INDEX IF EXISTS "items_isActive_isApproved_deletedAt_idx";

-- CreateIndex (new index with status for public listing queries)
CREATE INDEX "items_status_isActive_isApproved_deletedAt_idx" ON "items"("status", "isActive", "isApproved", "deletedAt");
