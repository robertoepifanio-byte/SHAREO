/**
 * Limpa dados de teste acumulados no staging.
 *
 * Nasceu manual em 23/08/2026, quando o staging tinha 183 itens e 186 reservas
 * de teste afogando as reservas reais na lista do usuário. Hoje o escopo `e2e`
 * roda no CI logo depois da suíte, para o acúmulo não voltar.
 *
 * ## Por que a suíte não se limpa sozinha
 *
 * O `return-flow.spec.ts` JÁ chama `DELETE /api/items/{id}` no `finally`. Só que
 * esse DELETE é **soft**: grava `deletedAt` + `status: "DELETED"` e a linha fica.
 * E a RESERVA não é apagada por nada — não existe endpoint para isso, nem deveria:
 * reserva é registro de negócio. Resultado: o item sumia da vitrine, a reserva
 * continuava na lista do locatário, e a cada rodada sobrava mais uma.
 *
 * Como não há caminho por HTTP, a limpeza precisa de acesso ao banco. Daí ser um
 * script e não um passo do próprio spec.
 *
 * ## Escopos
 *
 *   --escopo=e2e      itens "Devolução E2E …" + reservas e conversas deles.
 *                     É o que o CI roda. NÃO toca em nada mais.
 *   --escopo=roteiro  reservas marcadas "[ADR-028 TESTE]" (roteiro manual).
 *                     Preserva o item de teste, que é reaproveitado.
 *   --escopo=tudo     os dois.
 *
 * Modo seco por padrão. Para apagar de verdade: --apply
 *
 *   node --env-file=.env.staging-new --import tsx scripts/limpar-lixo-teste-staging.ts --escopo=e2e
 *   node --env-file=.env.staging-new --import tsx scripts/limpar-lixo-teste-staging.ts --escopo=e2e --apply
 */

import { PrismaClient } from "@prisma/client"

const APLICAR = process.argv.includes("--apply")

const ESCOPOS = ["e2e", "roteiro", "tudo"] as const
type Escopo = (typeof ESCOPOS)[number]

function lerEscopo(): Escopo {
  const arg = process.argv.find((a) => a.startsWith("--escopo="))?.split("=")[1]
  if (!arg) return "e2e" // o caso do CI é o padrão seguro: só lixo de suíte
  if (!(ESCOPOS as readonly string[]).includes(arg)) {
    throw new Error(`--escopo inválido: "${arg}". Use: ${ESCOPOS.join(" | ")}`)
  }
  return arg as Escopo
}

async function main() {
  const escopo = lerEscopo()
  const prisma = new PrismaClient()

  const antes = {
    itens:     await prisma.item.count(),
    reservas:  await prisma.booking.count(),
    conversas: await prisma.conversation.count(),
  }
  console.log(`ESCOPO: ${escopo}${APLICAR ? "" : "  (MODO SECO)"}`)
  console.log("ANTES:", JSON.stringify(antes))

  const pegaE2E     = escopo === "e2e" || escopo === "tudo"
  const pegaRoteiro = escopo === "roteiro" || escopo === "tudo"

  // Itens criados pelo return-flow.spec — o título é o único marcador, e é
  // suficientemente específico. Inclui os soft-deletados: `deletedAt` não some
  // com a linha, e é justamente ela que queremos remover.
  const idsItens = pegaE2E
    ? (await prisma.item.findMany({
        where:  { title: { startsWith: "Devolução E2E" } },
        select: { id: true },
      })).map((i) => i.id)
    : []

  const reservasE2E = idsItens.length
    ? await prisma.booking.findMany({ where: { itemId: { in: idsItens } }, select: { id: true } })
    : []

  const reservasRoteiro = pegaRoteiro
    ? await prisma.booking.findMany({
        where:  { borrowerNote: { contains: "ADR-028 TESTE" } },
        select: { id: true },
      })
    : []

  const idsReservas = [...reservasE2E.map((b) => b.id), ...reservasRoteiro.map((b) => b.id)]

  if (idsItens.length === 0 && idsReservas.length === 0) {
    console.log("NADA A FAZER — sem lixo no escopo.")
    await prisma.$disconnect()
    return
  }

  const conversas = await prisma.conversation.count({ where: { bookingId: { in: idsReservas } } })
  console.log(
    `ALVO: ${idsItens.length} itens, ${idsReservas.length} reservas ` +
    `(${reservasE2E.length} E2E + ${reservasRoteiro.length} do roteiro), ${conversas} conversas`,
  )

  // Trava de segurança: nada com valor financeiro pode ser arrastado junto. Se
  // algum dependente aparecer, o alvo mudou de natureza — aborta em vez de
  // apagar. Vale especialmente no CI, onde ninguém está olhando.
  const dependentes = {
    transacoes: await prisma.platformTransaction.count({ where: { bookingId: { in: idsReservas } } }),
    avaliacoes: await prisma.review.count({ where: { bookingId: { in: idsReservas } } }),
    repasses:   await prisma.payout.count({ where: { bookingId: { in: idsReservas } } }),
  }
  console.log("DEPENDENTES FINANCEIROS:", JSON.stringify(dependentes))

  // 🪤 Foto de reserva NÃO entra na trava acima, embora já tenha entrado.
  //
  // Desde que a foto de devolução virou obrigatória, TODA reserva do E2E tem uma
  // — então tratá-la como dependente fazia o script abortar sempre, e a limpeza
  // do CI nunca rodaria. Foto é prova anexada à reserva, não dinheiro, e some por
  // cascata (`BookingPhoto.booking` tem onDelete: Cascade).
  //
  // ⚠️ O ARQUIVO no bucket `booking-photos` NÃO some junto: a cascata é só do
  // banco. Cada rodada deixa um blob órfão. É pequeno e público, mas acumula —
  // registrado no backlog para resolver com a service role key.
  const fotos = await prisma.bookingPhoto.count({ where: { bookingId: { in: idsReservas } } })
  if (fotos > 0) {
    console.log(`FOTOS: ${fotos} linha(s) somem por cascata; os arquivos ficam no bucket (órfãos).`)
  }

  const totalDependentes = Object.values(dependentes).reduce((a, b) => a + b, 0)
  if (totalDependentes > 0) {
    console.log(`ABORTADO: ${totalDependentes} registro(s) financeiro(s) dependem do alvo. Reveja o escopo.`)
    await prisma.$disconnect()
    return
  }

  if (!APLICAR) {
    console.log("MODO SECO — nada foi apagado. Rode de novo com --apply para executar.")
    await prisma.$disconnect()
    return
  }

  const apagado = await prisma.$transaction(async (tx) => {
    // Conversa primeiro: `Conversation.booking` é relação OPCIONAL sem cascata,
    // então apagar a reserva deixaria conversas órfãs com `bookingId` nulo.
    const conv = await tx.conversation.deleteMany({ where: { bookingId: { in: idsReservas } } })
    const bks  = await tx.booking.deleteMany({ where: { id: { in: idsReservas } } })
    const its  = idsItens.length
      ? await tx.item.deleteMany({ where: { id: { in: idsItens } } })
      : { count: 0 }
    return { conversas: conv.count, reservas: bks.count, itens: its.count }
  }, { timeout: 120_000 })

  console.log("APAGADO:", JSON.stringify(apagado))
  console.log("DEPOIS:", JSON.stringify({
    itens:     await prisma.item.count(),
    reservas:  await prisma.booking.count(),
    conversas: await prisma.conversation.count(),
  }))
  console.log("PRESERVADOS:", JSON.stringify({
    usuariosFixture: await prisma.user.count({ where: { email: { contains: "fixture" } } }),
    itemDoRoteiro:   await prisma.item.count({ where: { title: { contains: "[ADR-028 TESTE]" } } }),
  }))

  await prisma.$disconnect()
}

void main()
