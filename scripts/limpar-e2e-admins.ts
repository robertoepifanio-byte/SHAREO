/**
 * Remove as contas admin.e2e.* que a suite E2E cria e nunca limpa.
 *
 * Uso: node --env-file=<arquivo> --import tsx scripts/limpar-e2e-admins.ts <ref-esperado> [--apagar]
 *
 * Sem --apagar, so mostra o que faria. O <ref-esperado> e obrigatorio: apagar
 * usuario no banco errado nao tem desfazer.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const PREFIXO = "admin.e2e."

async function main() {
  const [refEsperado, flag] = process.argv.slice(2)
  const apagar = flag === "--apagar"

  if (!refEsperado) {
    console.error("Uso: ... limpar-e2e-admins.ts <ref-esperado> [--apagar]")
    process.exit(1)
  }

  const ref = (process.env.DATABASE_URL ?? "").match(/postgres\.([a-z0-9]+):/)?.[1]
  if (!ref || !ref.startsWith(refEsperado)) {
    console.error(`ABORTADO — esperado "${refEsperado}…", conectado "${ref ?? "?"}". Nada foi alterado.`)
    process.exit(1)
  }
  console.log(`banco: ${ref}\nmodo: ${apagar ? "APAGAR" : "simulacao (use --apagar para valer)"}\n`)

  const contas = await prisma.user.findMany({
    where:  { email: { startsWith: PREFIXO } },
    select: { id: true, email: true },
  })
  if (contas.length === 0) { console.log("Nenhuma conta a remover."); return }

  const ids = contas.map((c) => c.id)

  // 🪤 Notificacao nao aparece no _count do User (guarda `userId` sem relacao),
  // entao some do inventario e sobra como linha orfa depois do delete.
  const notificacoes = await prisma.notification.count({ where: { userId: { in: ids } } })
  const contasReceb  = await prisma.ownerPaymentAccount.count({ where: { userId: { in: ids } } })

  console.log(`contas: ${contas.length}`)
  for (const c of contas) console.log(`  ${c.email}`)
  console.log(`notificacoes ligadas: ${notificacoes}`)
  console.log(`contas de recebimento: ${contasReceb}`)

  if (!apagar) { console.log("\nSimulacao — nada foi alterado."); return }

  const r = await prisma.$transaction(async (tx) => {
    const n = await tx.notification.deleteMany({ where: { userId: { in: ids } } })
    const u = await tx.user.deleteMany({ where: { id: { in: ids } } })
    return { notificacoes: n.count, usuarios: u.count }
  })

  console.log(`\nremovidos: ${r.usuarios} usuarios, ${r.notificacoes} notificacoes`)
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
