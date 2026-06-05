-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "export_jobs" (
    "id"           TEXT NOT NULL,
    "requestedBy"  TEXT NOT NULL,
    "periodStart"  TIMESTAMP(3) NOT NULL,
    "periodEnd"    TIMESTAMP(3) NOT NULL,
    "status"       "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl"      TEXT,
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_jobs_requestedBy_createdAt_idx" ON "export_jobs"("requestedBy", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requestedBy_fkey"
    FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
