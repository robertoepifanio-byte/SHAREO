import { PrismaClient } from "@prisma/client"

const STAGING_URL = "postgresql://postgres.fflpuoluiqmhpvcxubqi:ejdd2Rascka3FWrE@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
const prisma = new PrismaClient({ datasources: { db: { url: STAGING_URL } } })

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "pickupToken" VARCHAR(6)`)
  await prisma.$executeRawUnsafe(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "pickupTokenUsedAt" TIMESTAMP(3)`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "bookings_pickupToken_key" ON bookings("pickupToken")`)
  console.log("OK: pickupToken + pickupTokenUsedAt adicionados ao staging")
}

main()
  .catch((e) => { console.error(e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
