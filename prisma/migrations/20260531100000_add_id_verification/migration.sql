-- CreateEnum IdVerificationStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdVerificationStatus') THEN
    CREATE TYPE "IdVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');
  END IF;
END $$;

-- AddColumns to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "idVerificationStatus" "IdVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "idDocumentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "idSelfieUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "idSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "idVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "idRejectionReason" TEXT;
