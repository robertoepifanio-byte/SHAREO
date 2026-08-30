/**
 * corrigir-periodo-invertido.ts — conserta reservas antigas cujo período ficou
 * de trás para frente (`startDate > endDate`).
 *
 * CAUSA (corrigida no código pelo #345, 2026-08-23): `mark_active` recalculava
 * o `endDate` a partir da retirada real — o locatário tem os N dias contratados
 * a contar de quando recebeu o item — mas deixava o `startDate` na data
 * reservada. Retirada antecipada produzia início DEPOIS do fim, e a lista do
 * locatário exibia o período invertido. Reservas criadas depois do #345 saem
 * corretas; as antigas NÃO se autocorrigem, daí este script.
 *
 * REGRA — a mesma que o código corrigido aplica hoje
 * (app/api/bookings/[id]/route.ts, ramo `mark_active`):
 *   depois de ativada, a locação é [retirada real, retirada + N dias].
 *
 * Dois casos, e a distinção importa:
 *
 *   A) `activatedAt < endDate` → basta `startDate = activatedAt`.
 *      O `endDate` NÃO é tocado. 🪤 Isto não é economia de escrita: entre as
 *      afetadas há reserva com EXTENSÃO DE PRAZO APROVADA, cujo `endDate` foi
 *      legitimamente empurrado para além de `activatedAt + totalDays`.
 *      Recalcular o `endDate` apagaria a extensão em silêncio.
 *
 *   B) `activatedAt >= endDate` → nem isso resolve; o par inteiro é incoerente.
 *      Aí também `endDate = activatedAt + totalDays * 24h`.
 *
 * SEM IMPACTO FINANCEIRO: o único uso de `startDate` em dinheiro é a faixa de
 * reembolso no cancelamento, que só é permitido em PENDING/CONFIRMED — e toda
 * reserva afetada está em COMPLETED ou DISPUTED. Verificado antes de escrever.
 *
 * Uso:
 *   node --env-file=.env.staging-migrate --import tsx scripts/corrigir-periodo-invertido.ts
 *   node --env-file=.env.staging-migrate --import tsx scripts/corrigir-periodo-invertido.ts --apply
 */
import { PrismaClient } from "@prisma/client"

const DIA = 24 * 60 * 60 * 1000
const aplicar = process.argv.includes("--apply")

const prisma = new PrismaClient()

type Reserva = {
  id: string
  status: string
  startDate: Date
  endDate: Date
  activatedAt: Date
  totalDays: number
  extensionStatus: string | null
}

async function main() {
  console.log("\nShareO — corrigir período invertido (startDate > endDate)")
  console.log("─".repeat(62))
  console.log(`Modo: ${aplicar ? "⚠  APLICANDO (--apply)" : "DRY-RUN (somente leitura)"}`)
  const host = (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "?"
  console.log(`Banco: ${host}`)
  console.log("─".repeat(62))

  const afetadas = await prisma.$queryRawUnsafe<Reserva[]>(`
    SELECT id, status, "startDate", "endDate", "activatedAt", "totalDays", "extensionStatus"
    FROM bookings
    WHERE "startDate" > "endDate" AND "activatedAt" IS NOT NULL
    ORDER BY "createdAt" DESC`)

  // Guarda: período invertido SEM activatedAt teria outra causa, e a regra
  // baseada na retirada real não serviria. Aborta em vez de inventar conserto.
  const semAtivacao = await prisma.$queryRawUnsafe<{ n: number }[]>(`
    SELECT count(*)::int AS n FROM bookings
    WHERE "startDate" > "endDate" AND "activatedAt" IS NULL`)
  if (semAtivacao[0].n > 0) {
    console.error(`\n✗ ABORTADO: ${semAtivacao[0].n} reserva(s) com período invertido e SEM activatedAt.`)
    console.error("  A causa conhecida (#345) passa por mark_active, que sempre grava activatedAt.")
    console.error("  Estas têm outra origem — investigar antes de corrigir em lote.")
    process.exit(1)
  }

  if (afetadas.length === 0) {
    console.log("\nNenhuma reserva com período invertido. Nada a fazer.")
    return
  }

  const casoA = afetadas.filter((b) => b.activatedAt < b.endDate)
  const casoB = afetadas.filter((b) => b.activatedAt >= b.endDate)
  const comExtensao = afetadas.filter((b) => b.extensionStatus === "APPROVED")

  const porStatus = afetadas.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  console.log(`\nAfetadas: ${afetadas.length}`)
  console.log(`  por status: ${JSON.stringify(porStatus)}`)
  console.log(`  caso A (só startDate = activatedAt): ${casoA.length}`)
  console.log(`  caso B (também endDate = activatedAt + N dias): ${casoB.length}`)
  console.log(`  com extensão APROVADA (endDate preservado): ${comExtensao.length}`)

  console.log("\nAmostra (até 5 de cada caso):")
  for (const [rotulo, lista] of [["A", casoA], ["B", casoB]] as const) {
    for (const b of lista.slice(0, 5)) {
      const novoInicio = b.activatedAt
      const novoFim = rotulo === "B" ? new Date(b.activatedAt.getTime() + b.totalDays * DIA) : b.endDate
      console.log(
        `  [${rotulo}] ${b.id}  ${b.startDate.toISOString().slice(0, 10)} → ${b.endDate.toISOString().slice(0, 10)}` +
        `   vira   ${novoInicio.toISOString().slice(0, 10)} → ${novoFim.toISOString().slice(0, 10)}`,
      )
    }
  }

  if (!aplicar) {
    console.log("\nDRY-RUN concluído — nada foi escrito.")
    console.log("Para aplicar, rode de novo com --apply.")
    return
  }

  // Uma transação só: ou o lote inteiro entra, ou nada entra.
  //
  // 🪤 Dois UPDATE de CONJUNTO, não 46 updates linha a linha. A primeira versão
  // iterava com `tx.booking.update()` e estourou o timeout padrão de 5s da
  // transação interativa do Prisma — cada update é um round-trip ao pooler, e o
  // lote inteiro reverteu. Em SQL de conjunto são duas instruções, milissegundos.
  //
  // Os dois WHERE são disjuntos (`activatedAt < endDate` vs `>=`), então a ordem
  // não importa e nenhuma linha é tocada duas vezes.
  //
  // `totalDays * INTERVAL '24 hours'` (e não `make_interval(days => …)`) para
  // espelhar exatamente o cálculo do código, que soma milissegundos fixos —
  // intervalo em DIAS faria aritmética de calendário e divergiria no horário de
  // verão.
  const [afetadasA, afetadasB] = await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      UPDATE bookings SET "startDate" = "activatedAt"
      WHERE "startDate" > "endDate" AND "activatedAt" IS NOT NULL
        AND "activatedAt" < "endDate"`),
    prisma.$executeRawUnsafe(`
      UPDATE bookings
      SET "startDate" = "activatedAt",
          "endDate"   = "activatedAt" + ("totalDays" * INTERVAL '24 hours')
      WHERE "startDate" > "endDate" AND "activatedAt" IS NOT NULL
        AND "activatedAt" >= "endDate"`),
  ])

  console.log(`\n✓ Corrigidas: ${afetadasA} (caso A) + ${afetadasB} (caso B) = ${afetadasA + afetadasB}`)
  if (afetadasA !== casoA.length || afetadasB !== casoB.length) {
    console.warn(`⚠  Divergência do previsto no dry-run (A=${casoA.length}, B=${casoB.length}) — investigar.`)
  }

  const restantes = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM bookings WHERE "startDate" > "endDate"`)
  console.log(`Reservas ainda invertidas: ${restantes[0].n} (esperado: 0)`)
}

main()
  .catch((e) => {
    console.error("\n✗ Erro:", e instanceof Error ? e.stack : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
