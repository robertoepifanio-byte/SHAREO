import { prisma } from "@/lib/prisma"
import { getPayoutWindowDays, getPlatformFeeRate, calcSplit } from "@/lib/platform-config"

/**
 * Criação do repasse ao proprietário — ponto único.
 *
 * Existia só dentro do `confirm_return` (FIN-3.3). A resolução de disputa pelo
 * admin (`resolve_completed`) leva a reserva ao MESMO estado terminal COMPLETED
 * e não criava repasse nenhum: o proprietário ganhava a disputa e nunca recebia,
 * em silêncio. Com a lógica em dois lugares isso se repetiria; por isso mora aqui.
 */

export type ResultadoPayout =
  | { criado: true;  payoutId: string; amount: number }
  | { criado: false; motivo: "SEM_CONTA_DE_RECEBIMENTO" | "SEM_VALOR_LIQUIDO" | "JA_EXISTE" }

export async function criarPayoutDaReserva(
  bookingId:       string,
  ownerId:         string,
  ownerNetAmount:  number | null | undefined,
  /** Origem, só para o log — ajuda a distinguir devolução normal de disputa. */
  origem:          "confirm_return" | "resolve_completed",
): Promise<ResultadoPayout> {
  if (!ownerNetAmount) {
    console.warn(`[payout] id=${bookingId} origem=${origem} SEM VALOR LÍQUIDO — repasse não criado`)
    return { criado: false, motivo: "SEM_VALOR_LIQUIDO" }
  }

  // `Payout.bookingId` NÃO é único no schema, então nada no banco impede dois
  // repasses para a mesma reserva. Com dois caminhos criando repasse, a checagem
  // deixou de ser teórica.
  const existente = await prisma.payout.findFirst({
    where:  { bookingId },
    select: { id: true },
  })
  if (existente) {
    console.warn(`[payout] id=${bookingId} origem=${origem} JÁ EXISTE payout=${existente.id} — nada a fazer`)
    return { criado: false, motivo: "JA_EXISTE" }
  }

  const ownerAccount = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: ownerId },
    select: { id: true },
  })

  if (!ownerAccount) {
    // 🪤 Antes isto era um `if` sem `else`: a reserva concluía, o dinheiro ficava
    // com a plataforma e NÃO existia registro de que um repasse deixou de ser
    // criado. O aviso não conserta o caso, mas tira do escuro — é o que dá para
    // fazer sem migração (não há tipo de notificação de repasse no enum).
    console.warn(
      `[payout] id=${bookingId} origem=${origem} ownerId=${ownerId} ` +
      `SEM CONTA DE RECEBIMENTO — repasse de ${ownerNetAmount} centavos NÃO criado. ` +
      `A reserva conclui e o valor fica retido até o proprietário cadastrar a conta.`,
    )
    return { criado: false, motivo: "SEM_CONTA_DE_RECEBIMENTO" }
  }

  const payoutWindowDays = await getPayoutWindowDays()
  const eligibleAfter    = new Date(Date.now() + payoutWindowDays * 24 * 60 * 60 * 1000)

  // 🪤 Um repasse por COBRANÇA, não por reserva (ATOR-03).
  //
  // A Stripe EXIGE `source_transaction` em transferência envolvendo o Brasil, e
  // ele liga a transferência a UMA cobrança. Quando houve extensão paga, o
  // dinheiro está em duas cobranças distintas: a da locação e a das diárias
  // extras. Um Transfer só pediria à cobrança original mais do que ela tem —
  // recusa em silêncio no cron, ou, em extensão pequena, uma transferência que
  // come a taxa da plataforma.
  const extensao = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { extensionAmountCents: true, extensionPaymentIntentId: true },
  })

  const extra = extensao?.extensionAmountCents ?? 0
  const temCobrancaPropria = extra > 0 && Boolean(extensao?.extensionPaymentIntentId)

  // Sem extensão paga à parte, é o caso de sempre: um repasse, cobrança original.
  const fatias = !temCobrancaPropria
    ? [{ amount: ownerNetAmount, sourcePaymentIntentId: null }]
    : await (async () => {
        const feeRate  = await getPlatformFeeRate()
        const daExtensao = calcSplit(extra, feeRate).ownerNetAmount
        return [
          // O resto sai da cobrança original. Subtrair (em vez de recalcular)
          // garante que as duas fatias somem exatamente `ownerNetAmount` — não
          // sobra nem falta centavo por arredondamento.
          { amount: ownerNetAmount - daExtensao, sourcePaymentIntentId: null },
          { amount: daExtensao, sourcePaymentIntentId: extensao!.extensionPaymentIntentId! },
        ]
      })()

  // `await` obrigatório: fire-and-forget morre quando a lambda congela e o
  // repasse se perde sem deixar rastro.
  const criados = await prisma.$transaction(
    fatias
      .filter((f) => f.amount > 0)
      .map((f) => prisma.payout.create({
        data: {
          ownerPaymentAccountId: ownerAccount.id,
          bookingId,
          amount:                f.amount,
          sourcePaymentIntentId: f.sourcePaymentIntentId,
          status:                "PENDING",
          eligibleAfter,
        },
        select: { id: true },
      })),
  )

  if (criados.length > 1) {
    console.warn(
      "[payout] id=" + bookingId + " origem=" + origem +
      " 2 repasses (locação + extensão) — cobranças distintas",
    )
  }

  return { criado: true, payoutId: criados[0].id, amount: ownerNetAmount }
}
