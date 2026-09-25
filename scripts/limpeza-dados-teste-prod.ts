/**
 * scripts/limpeza-dados-teste-prod.ts — limpeza de dados de smoke test do D0 em PRODUÇÃO.
 *
 * Tudo criado no smoke de D0 leva `[TESTE D0]` no nome, no título, na descrição e na
 * borrowerNote da reserva (regra 1 do docs/roteiro-smoke-d0.md).
 *
 * Este script localiza esses registros, mostra o que seriam apagados (modo seco padrão)
 * e apaga com --execute SOMENTE se o ref for de produção.
 *
 * ## Uso
 *
 *   # modo seco — mostra o que seria apagado (PADRÃO)
 *   npx tsx --env-file="<env-prod>" scripts/limpeza-dados-teste-prod.ts --ref jdxdndrhjxtkaifbpagr
 *
 *   # execução real
 *   npx tsx --env-file="<env-prod>" scripts/limpeza-dados-teste-prod.ts --ref jdxdndrhjxtkaifbpagr --execute
 *
 * ## Trava absoluta
 *
 *   Este script se recusa a rodar a MENOS que:
 *     1. --ref jdxdndrhjxtkaifbpagr seja passado explicitamente
 *     2. O ref no DATABASE_URL seja jdxdndrhjxtkaifbpagr
 *   Qualquer divergência aborta antes de qualquer I/O.
 *   Isso é proposital: nenhum dado de staging é deletado por este script.
 *
 * ## O que é apagado (com --execute)
 *
 *   - Reservas cujo borrowerNote contém "[TESTE D0]" — SEM dependente financeiro
 *     (nenhum PlatformTransaction, Payout nem pagamento real). Se houver qualquer
 *     registro financeiro, a reserva é listada mas NÃO apagada (registros ficam
 *     por retenção fiscal de 5 anos — ADR-017).
 *   - Itens cujo título contém "[TESTE D0]" — SEM reservas ativas ligadas.
 *   - Usuários cujo nome contém "[TESTE D0]" — SEM reservas nem itens restantes.
 *   - Conversas ligadas às reservas apagadas.
 *
 * ## O que NUNCA é apagado
 *
 *   - Qualquer reserva com PlatformTransaction, Payout ou paymentStatus != null.
 *   - Fotos do Storage — devem ser removidas manualmente após a limpeza do banco.
 *     (Scripts de Storage ainda não cobrem produção; ver docs/roteiro-smoke-d0.md seção 3.)
 *
 * Padrão: scripts/limpar-lixo-teste-staging.ts (staging) — este segue a mesma convenção,
 * adicionando a trava de ref de produção.
 */

import { PrismaClient } from "@prisma/client"
import { validarRef, REFS_CONHECIDOS } from "./lib/storage-orfaos-core"

// ────────────────────────────────────────────────────────────────────────────
// Trava absoluta: só produção
// ────────────────────────────────────────────────────────────────────────────

const REF_PROD = REFS_CONHECIDOS.prod   // jdxdndrhjxtkaifbpagr

const argRef = (() => {
  const i = process.argv.indexOf("--ref")
  return i > -1 ? process.argv[i + 1] : undefined
})()

if (argRef !== REF_PROD) {
  console.error(
    `ABORTADO — este script só roda em PRODUÇÃO.\n` +
    `Passe --ref ${REF_PROD} explicitamente.\n` +
    `ref recebido: "${argRef ?? "(nenhum)"}"`,
  )
  process.exit(1)
}

const DATABASE_URL = process.env.DATABASE_URL ?? ""
if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não definida no ambiente.")
  process.exit(1)
}

const check = validarRef(DATABASE_URL, REF_PROD)
if (!check.ok) {
  console.error(
    `ABORTADO — --ref "${REF_PROD}" não bate com o ref no DATABASE_URL ` +
    `("${check.refEncontrado}"). Nada foi lido ou alterado.\n` +
    `Confirme que o --env-file aponta para o ambiente de PRODUÇÃO (jdxd…).`,
  )
  process.exit(1)
}

// ────────────────────────────────────────────────────────────────────────────
// Argumentos
// ────────────────────────────────────────────────────────────────────────────

const EXECUTAR = process.argv.includes("--execute")
const MARCADOR = "[TESTE D0]"

console.log(`ref: ${REF_PROD}  (banco: ${check.refEncontrado})`)
console.log(`marcador: "${MARCADOR}"`)
console.log(`modo: ${EXECUTAR ? "EXECUÇÃO — dados serão APAGADOS" : "SIMULAÇÃO (use --execute para apagar de verdade)"}`)
console.log()

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

async function main() {
  // 1. Reservas com o marcador
  const reservasComMarcador = await prisma.booking.findMany({
    where: { borrowerNote: { contains: MARCADOR } },
    select: {
      id: true,
      borrowerNote: true,
      paymentStatus: true,
      item: { select: { title: true } },
      _count: { select: { reviews: true } },
      platformTransaction: { select: { id: true } },
      payouts: { select: { id: true } },
    },
  })

  // Separa: sem dependência financeira (elegíveis para apagar) vs com (manter)
  const reservasApagaveis = reservasComMarcador.filter(
    (b) =>
      b.platformTransaction === null &&
      b.payouts.length === 0 &&
      (b.paymentStatus === null || b.paymentStatus === "PENDING" || b.paymentStatus === "CANCELLED"),
  )
  const reservasManter = reservasComMarcador.filter((b) => !reservasApagaveis.includes(b))

  // 2. Conversas das reservas apagáveis
  const idsReservasApagaveis = reservasApagaveis.map((b) => b.id)
  const conversas = await prisma.conversation.count({
    where: { bookingId: { in: idsReservasApagaveis } },
  })

  // 3. Itens com o marcador (sem reservas apagáveis; só se restarem reservas seria bloqueado)
  const itensComMarcador = await prisma.item.findMany({
    where: { title: { contains: MARCADOR } },
    select: {
      id: true,
      title: true,
      ownerId: true,
      _count: { select: { bookings: true } },
    },
  })
  // Itens apagáveis: aqueles sem reservas fora das idsReservasApagaveis (query precisa abaixo)
  const idsItensConservadores: string[] = []
  for (const item of itensComMarcador) {
    const reservasFora = await prisma.booking.count({
      where: {
        itemId: item.id,
        id: { notIn: idsReservasApagaveis },
        deletedAt: null,
      },
    })
    if (reservasFora === 0) idsItensConservadores.push(item.id)
  }

  // 4. Usuários com o marcador (sem reservas ou itens restantes)
  const usuariosComMarcador = await prisma.user.findMany({
    where: { name: { contains: MARCADOR } },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { items: true, bookingsAsBorrower: true, bookingsAsOwner: true } },
    },
  })
  const usuariosApagaveis: typeof usuariosComMarcador = []
  for (const u of usuariosComMarcador) {
    // Após apagar as reservas e itens elegíveis, ainda restará algo?
    const reservasRestantes = await prisma.booking.count({
      where: {
        OR: [{ borrowerId: u.id }, { ownerId: u.id }],
        id: { notIn: idsReservasApagaveis },
        deletedAt: null,
      },
    })
    const itensRestantes = await prisma.item.count({
      where: {
        ownerId: u.id,
        id: { notIn: idsItensConservadores },
        deletedAt: null,
      },
    })
    if (reservasRestantes === 0 && itensRestantes === 0) {
      usuariosApagaveis.push(u)
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Relatório
  // ────────────────────────────────────────────────────────────────────────

  console.log(`=== RESERVAS COM MARCADOR (${reservasComMarcador.length}) ===`)
  for (const b of reservasApagaveis) {
    console.log(`  [APAGÁVEL] ${b.id}  nota="${b.borrowerNote}"  item="${b.item.title}"`)
  }
  for (const b of reservasManter) {
    console.log(
      `  [MANTER]   ${b.id}  paymentStatus=${b.paymentStatus}  ` +
      `platformTransaction=${b.platformTransaction?.id ?? "nenhum"}  ` +
      `payouts=${b.payouts.length}  — REGISTRO FINANCEIRO, NÃO APAGAR`,
    )
  }
  console.log()

  console.log(`=== CONVERSAS ligadas a reservas apagáveis: ${conversas} ===`)
  console.log()

  console.log(`=== ITENS COM MARCADOR (${itensComMarcador.length}) ===`)
  for (const item of itensComMarcador) {
    const apagavel = idsItensConservadores.includes(item.id)
    console.log(`  [${apagavel ? "APAGÁVEL" : "MANTER  "}] ${item.id}  "${item.title}"  reservas_totais=${item._count.bookings}`)
  }
  console.log()

  console.log(`=== USUÁRIOS COM MARCADOR (${usuariosComMarcador.length}) ===`)
  for (const u of usuariosComMarcador) {
    const apagavel = usuariosApagaveis.includes(u)
    console.log(`  [${apagavel ? "APAGÁVEL" : "MANTER  "}] ${u.id}  "${u.name}"  email=${u.email}`)
  }
  console.log()

  console.log("=== RESUMO ===")
  console.log(`  Reservas a apagar:   ${reservasApagaveis.length}  (${reservasManter.length} mantidas — financeiro)`)
  console.log(`  Conversas a apagar:  ${conversas}`)
  console.log(`  Itens a apagar:      ${idsItensConservadores.length}`)
  console.log(`  Usuários a apagar:   ${usuariosApagaveis.length}`)
  console.log()

  if (!EXECUTAR) {
    console.log("Modo seco — nada foi apagado.")
    console.log()
    console.log("Para apagar de verdade (somente o fundador deve executar):")
    console.log()
    console.log(`  npx tsx --env-file="<env-prod>" scripts/limpeza-dados-teste-prod.ts --ref ${REF_PROD} --execute`)
    return
  }

  if (
    reservasApagaveis.length === 0 &&
    idsItensConservadores.length === 0 &&
    usuariosApagaveis.length === 0
  ) {
    console.log("Nada a apagar.")
    return
  }

  // ────────────────────────────────────────────────────────────────────────
  // Execução em transação
  // ────────────────────────────────────────────────────────────────────────

  const resultado = await prisma.$transaction(async (tx) => {
    const idsUsuariosApagaveis = usuariosApagaveis.map((u) => u.id)

    // 1. Conversas
    const rConversas = await tx.conversation.deleteMany({
      where: { bookingId: { in: idsReservasApagaveis } },
    })

    // 2. Reviews (podem existir em reservas sem dependente financeiro, pois a reserva era grátis/teste)
    await tx.review.deleteMany({ where: { bookingId: { in: idsReservasApagaveis } } })

    // 3. Fotos de reserva
    await tx.bookingPhoto.deleteMany({ where: { bookingId: { in: idsReservasApagaveis } } })

    // 4. Notificações
    await tx.notification.deleteMany({ where: { userId: { in: idsUsuariosApagaveis } } })

    // 5. Reservas
    const rReservas = await tx.booking.deleteMany({ where: { id: { in: idsReservasApagaveis } } })

    // 6. Imagens dos itens
    await tx.itemImage.deleteMany({ where: { itemId: { in: idsItensConservadores } } })

    // 7. Itens
    const rItens = await tx.item.deleteMany({ where: { id: { in: idsItensConservadores } } })

    // 8. Usuários
    const rUsuarios = await tx.user.deleteMany({ where: { id: { in: idsUsuariosApagaveis } } })

    return {
      conversas: rConversas.count,
      reservas:  rReservas.count,
      itens:     rItens.count,
      usuarios:  rUsuarios.count,
    }
  })

  console.log("=== EXECUTADO ===")
  console.log(`  conversas apagadas:  ${resultado.conversas}`)
  console.log(`  reservas apagadas:   ${resultado.reservas}`)
  console.log(`  itens apagados:      ${resultado.itens}`)
  console.log(`  usuários apagados:   ${resultado.usuarios}`)
  console.log()

  if (reservasManter.length > 0) {
    console.log(
      `ATENÇÃO: ${reservasManter.length} reserva(s) com marcador [TESTE D0] têm registro financeiro ` +
      `e NÃO foram apagadas. Avise o financeiro e a Contabilizei (ver docs/roteiro-smoke-d0.md seção 3).`,
    )
  }
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
