/**
 * Limpa o acúmulo de reservas/itens de teste no staging.
 *
 * Escopo FIXO e conferido antes de agir:
 *   - itens cujo título começa com "Devolução E2E" (sobra da suíte Playwright)
 *   - as reservas nesses itens
 *   - as conversas ligadas a essas reservas (mensagens vão por cascata)
 *   - as reservas tagueadas "[ADR-028 TESTE]" (roteiro manual, para recomeçar)
 *
 * NÃO toca em: usuários fixture, no item "Furadeira de Impacto 650W
 * [ADR-028 TESTE]" (reaproveitado no roteiro) e no restante da base demo.
 *
 * Roda em modo seco por padrão. Para apagar de verdade: --apply
 *
 *   node --env-file=.env.staging-new --import tsx scripts/limpar-lixo-teste-staging.ts
 *   node --env-file=.env.staging-new --import tsx scripts/limpar-lixo-teste-staging.ts --apply
 */

import { PrismaClient } from "@prisma/client"

const APLICAR = process.argv.includes("--apply")

async function main() {
  const prisma = new PrismaClient()

  const antes = {
    itens:     await prisma.item.count(),
    reservas:  await prisma.booking.count(),
    conversas: await prisma.conversation.count(),
  }
  console.log("ANTES:", JSON.stringify(antes))

  const itensE2E = await prisma.item.findMany({
    where:  { title: { startsWith: "Devolução E2E" } },
    select: { id: true },
  })
  const idsItens = itensE2E.map((i) => i.id)

  const reservasE2E = await prisma.booking.findMany({
    where:  { itemId: { in: idsItens } },
    select: { id: true },
  })
  const reservasRoteiro = await prisma.booking.findMany({
    where:  { borrowerNote: { contains: "ADR-028 TESTE" } },
    select: { id: true },
  })
  const idsReservas = [...reservasE2E.map((b) => b.id), ...reservasRoteiro.map((b) => b.id)]

  const conversas = await prisma.conversation.count({ where: { bookingId: { in: idsReservas } } })

  console.log(
    `ALVO: ${idsItens.length} itens, ${idsReservas.length} reservas ` +
    `(${reservasE2E.length} E2E + ${reservasRoteiro.length} do roteiro), ${conversas} conversas`,
  )

  // Nada que tenha valor financeiro pode ser arrastado junto. Se algum
  // dependente aparecer, é sinal de que o alvo mudou — aborta em vez de apagar.
  const dependentes = {
    transacoes: await prisma.platformTransaction.count({ where: { bookingId: { in: idsReservas } } }),
    avaliacoes: await prisma.review.count({ where: { bookingId: { in: idsReservas } } }),
    repasses:   await prisma.payout.count({ where: { bookingId: { in: idsReservas } } }),
    fotos:      await prisma.bookingPhoto.count({ where: { bookingId: { in: idsReservas } } }),
  }
  console.log("DEPENDENTES FINANCEIROS:", JSON.stringify(dependentes))

  const total = Object.values(dependentes).reduce((a, b) => a + b, 0)
  if (total > 0) {
    console.log(`ABORTADO: ${total} registro(s) financeiro(s) dependem do alvo. Reveja o escopo.`)
    await prisma.$disconnect()
    return
  }

  if (!APLICAR) {
    console.log("MODO SECO — nada foi apagado. Rode de novo com --apply para executar.")
    await prisma.$disconnect()
    return
  }

  const apagado = await prisma.$transaction(async (tx) => {
    const conv = await tx.conversation.deleteMany({ where: { bookingId: { in: idsReservas } } })
    const bks  = await tx.booking.deleteMany({ where: { id: { in: idsReservas } } })
    const its  = await tx.item.deleteMany({ where: { id: { in: idsItens } } })
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
