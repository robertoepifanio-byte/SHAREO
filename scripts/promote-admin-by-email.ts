/**
 * Promove uma conta EXISTENTE a ADMIN_SUPERADMIN no ambiente do --env-file.
 *
 * Uso:
 *   node --env-file=.env.prod-run --import tsx scripts/promote-admin-by-email.ts <email> <ref-esperado>
 *
 * Exemplo (produção):
 *   node --env-file=.env.prod-run --import tsx \
 *     scripts/promote-admin-by-email.ts roberto.epifanio@gmail.com jdxd
 *
 * 🪤 O `<ref-esperado>` não é burocracia. Este script concede SUPERADMIN, e a
 * única coisa que decide EM QUAL BANCO isso acontece é o `--env-file` — que não
 * aparece na saída e é fácil de errar entre dois arquivos de nomes parecidos.
 * Trocar staging por produção aqui cria um superadmin no lugar errado sem
 * nenhum sinal. Por isso o alvo é declarado ANTES: o script compara com o ref
 * do projeto Supabase da DATABASE_URL e aborta se divergir.
 *
 * Diferente dos irmãos `promote-admin.ts` e `promote-admin-fixture.ts`, que têm
 * o e-mail de fixture cravado no código e servem só para teste.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/** Ref do projeto Supabase na DATABASE_URL: postgres.<ref>:senha@host */
function refDoBanco(url: string): string | null {
  return url.match(/postgres\.([a-z0-9]+):/)?.[1] ?? null
}

async function main() {
  const [email, refEsperado] = process.argv.slice(2)

  if (!email || !refEsperado) {
    console.error("Uso: node --env-file=<arquivo> --import tsx scripts/promote-admin-by-email.ts <email> <ref-esperado>")
    console.error("  <ref-esperado>: o começo do ref do projeto Supabase de destino (ex.: zythy para staging).")
    console.error("  Serve para você declarar o ambiente ANTES — o script recusa se não bater.")
    process.exit(1)
  }

  const ref = refDoBanco(process.env.DATABASE_URL ?? "")
  if (!ref) {
    console.error("Não consegui identificar o projeto na DATABASE_URL. O --env-file está correto?")
    process.exit(1)
  }

  if (!ref.startsWith(refEsperado)) {
    console.error(`ABORTADO — ambiente diferente do declarado.`)
    console.error(`  esperado: ${refEsperado}…`)
    console.error(`  conectado: ${ref}`)
    console.error("Nenhuma alteração foi feita.")
    process.exit(1)
  }

  console.log(`banco: ${ref} (confere com "${refEsperado}")`)

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true, role: true, adminRole: true },
  })

  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    console.error("Crie a conta pelo cadastro normal no ambiente de destino antes de promover.")
    process.exit(1)
  }

  console.log(`antes:  ${user.email} | role: ${user.role} | adminRole: ${user.adminRole}`)

  if (user.role === "ADMIN" && user.adminRole === "ADMIN_SUPERADMIN") {
    console.log("Nada a fazer — a conta já é ADMIN_SUPERADMIN.")
    return
  }

  const updated = await prisma.user.update({
    where:  { id: user.id },
    data:   { role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" },
    select: { email: true, role: true, adminRole: true },
  })

  console.log(`depois: ${updated.email} | role: ${updated.role} | adminRole: ${updated.adminRole}`)
  console.log("Promovido.")
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
