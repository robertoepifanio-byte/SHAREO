/**
 * Adiciona pickupToken/pickupTokenUsedAt em bookings no banco de staging.
 * Idempotente (IF NOT EXISTS) — já aplicado; mantido para reprovisionar do zero.
 *
 * Uso: pnpm exec tsx --env-file=.env.staging-migrate scripts/staging-add-pickup-token.ts
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
  console.error("   Execute com: pnpm exec tsx --env-file=.env.staging-migrate scripts/staging-add-pickup-token.ts")
  process.exit(1)
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "pickupToken" VARCHAR(6)`)
  await prisma.$executeRawUnsafe(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "pickupTokenUsedAt" TIMESTAMP(3)`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "bookings_pickupToken_key" ON bookings("pickupToken")`)
  console.log("OK: pickupToken + pickupTokenUsedAt adicionados ao staging")
}

main()
  .catch((e) => { console.error(e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
