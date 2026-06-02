-- Add optional fields to items table that exist in schema.prisma but lacked migrations
ALTER TABLE "items"
  ADD COLUMN IF NOT EXISTS "estimatedRetailPrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "voltage"              TEXT;
