/**
 * Atribui ADMIN_SUPERADMIN ao admin fixture no staging.
 * Uso: npx tsx scripts/set-fixture-admin-role.ts
 */
import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.staging-migrate") })

const prisma = new PrismaClient()

async function main() {
  const email = "admin.fixture@shareo-test.com"

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, adminRole: true, role: true } })
  if (!user) { console.error(`Usuário ${email} não encontrado no staging.`); process.exit(1) }

  console.log(`Antes: role=${user.role}, adminRole=${user.adminRole}`)

  await prisma.user.update({
    where: { email },
    data:  { role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" },
  })

  console.log(`✓ ${email} → role=ADMIN, adminRole=ADMIN_SUPERADMIN`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
