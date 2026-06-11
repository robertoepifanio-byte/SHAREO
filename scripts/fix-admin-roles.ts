/**
 * Garante que os usuários fixture de admin no banco de STAGING têm os
 * adminRole corretos. Deve ser rodado apontando para o banco de staging.
 *
 * Uso:
 *   DATABASE_URL="<staging-url>" npx tsx scripts/fix-admin-roles.ts
 *
 * Variáveis de ambiente necessárias (use .env.staging ou exporte):
 *   DATABASE_URL — connection string do Supabase staging (não local)
 *
 * ATENÇÃO: nunca rodar contra produção.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const FIXTURE_ROLES = [
  { email: "admin.fixture@shareo-test.com", role: "ADMIN" as const, adminRole: "ADMIN_SUPERADMIN" },
  { email: "financeiro@shareo.com.br",      role: "ADMIN" as const, adminRole: "ADMIN_FINANCEIRO"  },
  { email: "operacional@shareo.com.br",     role: "ADMIN" as const, adminRole: "ADMIN_OPERACIONAL" },
]

async function main() {
  // Proteção: rejeitar se a DATABASE_URL não parece ser staging
  const dbUrl = process.env.DATABASE_URL ?? ""
  if (!dbUrl) {
    console.error("DATABASE_URL não definida. Exporte antes de rodar.")
    process.exit(1)
  }
  if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    // Permite local apenas com flag explícita para testes de desenvolvimento
    if (!process.env.ALLOW_LOCAL) {
      console.error("DATABASE_URL aponta para localhost. Se for intencional, exporte ALLOW_LOCAL=1.")
      process.exit(1)
    }
  }

  console.log("\nCorrigindo adminRole dos fixtures de admin no staging...\n")

  for (const { email, role, adminRole } of FIXTURE_ROLES) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.warn(`  ⚠ Usuário não encontrado: ${email}`)
      continue
    }

    const needsUpdate = user.role !== role || user.adminRole !== adminRole
    if (!needsUpdate) {
      console.log(`  ✓ ${email} — já correto (role=${user.role}, adminRole=${user.adminRole})`)
      continue
    }

    await prisma.user.update({
      where: { email },
      data:  { role, adminRole, isActive: true },
    })

    console.log(`  ✓ ${email} — atualizado: role=${role}, adminRole=${adminRole}`)
  }

  console.log("\nPronto. Execute o create-admin-sessions.ts para recriar os cookies:\n")
  console.log("  pnpm tsx scripts/create-admin-sessions.ts\n")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
