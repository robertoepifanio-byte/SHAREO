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

/**
 * Conta de recebimento + prazo de elegibilidade — comuns a todo repasse,
 * qualquer que seja a cobrança que o financia.
 */
async function contaEPrazo(bookingId: string, ownerId: string, origem: string) {
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
      `SEM CONTA DE RECEBIMENTO — repasse NÃO criado. ` +
      `O valor fica retido até o proprietário cadastrar a conta.`,
    )
    return null
  }

  const payoutWindowDays = await getPayoutWindowDays()
  return {
    ownerPaymentAccountId: ownerAccount.id,
    eligibleAfter:         new Date(Date.now() + payoutWindowDays * 24 * 60 * 60 * 1000),
  }
}

/**
 * Repasse da TAXA DE ATRASO ao proprietário.
 *
 * 🪤 Até 01/09/2026 a multa era cobrada do locatário e ficava INTEIRA com a
 * plataforma. `criarPayoutDaReserva` monta o repasse a partir de
 * `ownerNetAmount`, que cobre locação e extensão — a multa não entrava em
 * nenhuma fatia e não gerava Payout próprio. O proprietário via "Você recebe
 * R$ 4,25" numa locação em que o locatário tinha pago R$ 7,50 de multa.
 * Decisão de Roberto (01/09): a multa segue o MESMO split da locação.
 *
 * Não dá para somar ao repasse da locação nem reaproveitar
 * `criarPayoutDaReserva`: a multa vive numa Checkout Session própria, e a
 * Stripe exige `source_transaction` ligado a UMA cobrança. Um Transfer só
 * pediria à cobrança da locação um dinheiro que ela não tem — mesma restrição
 * que já obrigou um Payout por cobrança na extensão (ATOR-03).
 */
export async function criarPayoutDaTaxaDeAtraso(
  bookingId:              string,
  ownerId:                string,
  lateFeeCents:           number | null | undefined,
  lateFeePaymentIntentId: string | null | undefined,
): Promise<ResultadoPayout> {
  const origem = "late_fee"

  if (!lateFeeCents || lateFeeCents <= 0) {
    console.warn(`[payout] id=${bookingId} origem=${origem} SEM VALOR — repasse não criado`)
    return { criado: false, motivo: "SEM_VALOR_LIQUIDO" }
  }

  // Sem o PaymentIntent da multa o Transfer não teria de onde sair. Falhar aqui
  // é melhor que criar um Payout que o cron vai recusar todo dia em silêncio.
  if (!lateFeePaymentIntentId) {
    console.warn(
      `[payout] id=${bookingId} origem=${origem} SEM PaymentIntent da cobrança da multa — ` +
      `repasse de ${lateFeeCents} centavos NÃO criado (a Stripe exige source_transaction no Brasil)`,
    )
    return { criado: false, motivo: "SEM_VALOR_LIQUIDO" }
  }

  // 🪤 Dedup pela COBRANÇA, não pela reserva: a reserva quase sempre já tem o
  // repasse da locação, então checar só `bookingId` recusaria todo repasse de
  // multa como duplicado.
  const existente = await prisma.payout.findFirst({
    where:  { bookingId, sourcePaymentIntentId: lateFeePaymentIntentId },
    select: { id: true },
  })
  if (existente) {
    console.warn(`[payout] id=${bookingId} origem=${origem} JÁ EXISTE payout=${existente.id} — nada a fazer`)
    return { criado: false, motivo: "JA_EXISTE" }
  }

  const base = await contaEPrazo(bookingId, ownerId, origem)
  if (!base) return { criado: false, motivo: "SEM_CONTA_DE_RECEBIMENTO" }

  // Taxa VIGENTE, lida da configuração — nunca 15% cravado.
  const feeRate = await getPlatformFeeRate()
  const { ownerNetAmount } = calcSplit(lateFeeCents, feeRate)

  if (ownerNetAmount <= 0) {
    console.warn(`[payout] id=${bookingId} origem=${origem} líquido zero após a taxa — repasse não criado`)
    return { criado: false, motivo: "SEM_VALOR_LIQUIDO" }
  }

  const payout = await prisma.payout.create({
    data: {
      ownerPaymentAccountId: base.ownerPaymentAccountId,
      bookingId,
      amount:                ownerNetAmount,
      sourcePaymentIntentId: lateFeePaymentIntentId,
      status:                "PENDING",
      eligibleAfter:         base.eligibleAfter,
    },
    select: { id: true },
  })

  return { criado: true, payoutId: payout.id, amount: ownerNetAmount }
}

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
  //
  // 🪤 `sourcePaymentIntentId: null` é o filtro que faz esta checagem olhar SÓ o
  // repasse da locação. O repasse da taxa de atraso é um Payout da mesma
  // reserva, com a cobrança da multa como fonte — e a multa costuma ser paga
  // ANTES do `confirm_return`. Sem este filtro, uma multa paga primeiro faria
  // o repasse da locação inteira ser recusado como "já existe", e o
  // proprietário perderia o valor do aluguel para ganhar o da multa.
  const existente = await prisma.payout.findFirst({
    where:  { bookingId, sourcePaymentIntentId: null },
    select: { id: true },
  })
  if (existente) {
    console.warn(`[payout] id=${bookingId} origem=${origem} JÁ EXISTE payout=${existente.id} — nada a fazer`)
    return { criado: false, motivo: "JA_EXISTE" }
  }

  const base = await contaEPrazo(bookingId, ownerId, origem)
  if (!base) return { criado: false, motivo: "SEM_CONTA_DE_RECEBIMENTO" }
  const { eligibleAfter } = base

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
          ownerPaymentAccountId: base.ownerPaymentAccountId,
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
