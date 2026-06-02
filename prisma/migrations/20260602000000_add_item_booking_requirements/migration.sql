-- Add booking requirement flags to items table
ALTER TABLE "items"
  ADD COLUMN IF NOT EXISTS "requireIdVerification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requirePhone"          BOOLEAN NOT NULL DEFAULT false;
