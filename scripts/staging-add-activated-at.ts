/**
 * Adiciona a coluna activatedAt em bookings no banco de staging.
 * Idempotente (IF NOT EXISTS) — já aplicado; mantido para reprovisionar do zero.
 *
 * Uso: pnpm exec tsx --env-file=.env.staging-migrate scripts/staging-add-activated-at.ts
 */
import { PrismaClient } from "@prisma/client"

const STAGING_PROJECT_ID = "zythygwvmrwrqmnrdufq"

// DDL vai pelo DIRECT_URL (porta 5432); o pooler de transação não é confiável para ALTER TABLE.
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ""

if (!dbUrl.includes(STAGING_PROJECT_ID)) {
  console.error("❌ Abortado: DIRECT_URL/DATABASE_URL não aponta para o banco de staging.")
  console.error(`   Esperado: URL contendo project ID "${STAGING_PROJECT_ID}"`)
  console.error(`   Recebido: ${dbUrl ? dbUrl.replace(/:[^@]+@/, ":***@") : "(vazio)"}`)
  console.error("")
  console.error("   Execute com: pnpm exec tsx --env-file=.env.staging-migrate scripts/staging-add-activated-at.ts")
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
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
