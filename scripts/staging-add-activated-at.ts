import { PrismaClient } from "@prisma/client"

const STAGING_URL = "postgresql://postgres.fflpuoluiqmhpvcxubqi:ejdd2Rascka3FWrE@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: { db: { url: STAGING_URL } },
})

async function main() {
  // Verificar schema atual
  const tables = await prisma.$queryRawUnsafe<{tablename: string}[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%ooking%'`
  )
  console.log("Tables found:", tables)

  await prisma.$executeRawUnsafe(
    `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3)`
  )
  console.log("OK: coluna activatedAt adicionada ao staging")
}

main()
  .catch((e) => { console.error(e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
