-- Migration: Add email verification fields to User table
-- Target: Supabase staging project fflpuoluiqmhpvcxubqi
-- Run via: Supabase Dashboard > SQL Editor > New Query
--
-- Also applies to local project (jtianehxosfdrhjzqvqj) via `npx prisma db push`

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailTokenExpiresAt" TIMESTAMPTZ;
