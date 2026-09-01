/**
 * Emissão e REEMISSÃO da cobrança da taxa de atraso.
 *
 * 🪤 O defeito que este módulo existe para fechar (diagnóstico de 01/09/2026 no
 * staging): das 5 multas efetivamente cobradas, as 5 sessões de checkout
 * expiraram sem pagamento. A Checkout Session vale 24h — teto da Stripe para
 * `expires_at`, não escolha nossa — e **nada a reemitia**. O cron só criava
 * cobrança quando `lateFeeAmount` estava vazio, e ele mesmo acabara de
 * preencher esse campo na primeira detecção. Passadas 24h a dívida virava
 * incobrável, enquanto o lembrete diário de atraso continuava saindo — agora
 * sem link nenhum para pagar.
 *
 * 🪤 A ordem de escrita também era parte do problema: o cron gravava
 * `lateFeeAmount` ANTES de criar a sessão. Qualquer falha depois disso (chave
 * da Stripe ausente, indisponibilidade, e-mail) deixava a reserva com multa
 * registrada e sem cobrança, permanentemente. Aqui a gravação acontece DEPOIS
 * de a sessão existir, num update só.
 */
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { APP_URL } from "@/lib/app-url"
import { sendLateFeeEmail } from "@/lib/email"
import { STRIPE_CHARGE_EXPIRES_SECONDS } from "@/lib/platform-config"

export type BookingParaCobranca = {
  id: string
  lateFeeAmount: number | null
  lateFeePaymentIntentId: string | null
  lateFeeSessionId: string | null
  lateFeeSessionExpiresAt: Date | null
  borrower: { email: string; name: string }
  item: { images: { url: string }[] }
}

/**
 * Dias de atraso — inteiro, mínimo 1.
 *
 * 🪤 `referencia` é o que faz a multa PARAR de crescer: enquanto o item não
 * voltou, é hoje (e a dívida cresce a cada dia, como o texto publicado
 * promete); depois da devolução, é o instante em que o locatário devolveu.
 * Usar "hoje" numa reserva já devolvida faria a multa crescer para sempre,
 * inclusive depois de a locação estar concluída.
 */
export function diasDeAtraso(endDate: Date, referencia: Date): number {
  const dia = 86_400_000
  const d0  = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  const d1  = Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate())
  return Math.max(1, Math.ceil((d1 - d0) / dia))
}

/**
 * A multa já foi paga? `lateFeePaymentIntentId` só é gravado pelo webhook,
 * quando o dinheiro entra — é o sinal de quitação, não a existência do valor.
 */
export function taxaDeAtrasoQuitada(b: { lateFeePaymentIntentId: string | null }): boolean {
  return b.lateFeePaymentIntentId != null
}

/**
 * Existe cobrança viva agora? Uma sessão expirada é o mesmo que nenhuma —
 * o link não abre mais.
 */
export function temCobrancaViva(
  b: { lateFeeSessionExpiresAt: Date | null },
  agora: Date = new Date(),
): boolean {
  return b.lateFeeSessionExpiresAt != null && b.lateFeeSessionExpiresAt > agora
}

/**
 * Precisa emitir, reemitir ou REPRECIFICAR a cobrança?
 *
 * 🪤 O terceiro caso é o que a decisão de 01/09 acrescenta: a multa é
 * recalculada todo dia enquanto o item não volta, então uma cobrança viva pelo
 * valor de ontem está DESATUALIZADA e precisa ser substituída. Sem isso o
 * locatário pagaria 1 diária num atraso de 5 dias — o que o texto publicado
 * ("1,5× o preço diário por dia de atraso") não sustenta.
 */
export function precisaCobrar(
  b: BookingParaCobranca,
  valorAtual: number,
  agora: Date = new Date(),
): boolean {
  if (taxaDeAtrasoQuitada(b)) return false
  if (!temCobrancaViva(b, agora)) return true
  return b.lateFeeAmount !== valorAtual
}

export type ResultadoCobranca =
  | { emitida: true;  reemissao: boolean; valor: number; anterior: number | null }
  | { emitida: false; motivo: "JA_QUITADA" | "COBRANCA_ATUAL_VIVA" | "SEM_VALOR" }

/**
 * Cria a Checkout Session da multa pelo valor ATUAL, grava o vínculo e avisa o
 * locatário.
 *
 * Decisão de Roberto (01/09/2026): **a multa é recalculada diariamente.** Ela
 * cresce com os dias de atraso, como o texto publicado promete. Quem devolve
 * com 5 dias de atraso deve 5 diárias, não 1.
 *
 * 🪤 Recalcular obriga a INVALIDAR a cobrança anterior. Sem isso ficariam dois
 * links vivos por valores diferentes, e o locatário pagaria o menor —
 * escolhendo a própria dívida.
 */
export async function emitirCobrancaTaxaAtraso(
  b:                BookingParaCobranca,
  itemsLabel:       string,
  valorAtual:       number,
  descricaoAtraso:  string,
): Promise<ResultadoCobranca> {
  const agora = new Date()

  if (taxaDeAtrasoQuitada(b)) return { emitida: false, motivo: "JA_QUITADA" }

  const valor = valorAtual
  if (!valor || valor <= 0) return { emitida: false, motivo: "SEM_VALOR" }

  // Cobrança viva E pelo valor certo: nada a fazer. Reemitir aqui só trocaria
  // o link do locatário por outro idêntico, e mandaria e-mail repetido.
  if (temCobrancaViva(b, agora) && b.lateFeeAmount === valor) {
    return { emitida: false, motivo: "COBRANCA_ATUAL_VIVA" }
  }

  const reemissao = b.lateFeeAmount != null
  const stripe    = getStripe()

  // Expira a cobrança desatualizada ANTES de criar a nova. Falha aqui não
  // impede a emissão — a sessão velha morre sozinha em 24h de qualquer forma,
  // e ficar sem cobrança nenhuma é pior que ter duas por algumas horas.
  if (b.lateFeeSessionId && temCobrancaViva(b, agora)) {
    await stripe.checkout.sessions.expire(b.lateFeeSessionId).catch((e: unknown) =>
      console.error(`[lateFee] falha ao expirar sessão ${b.lateFeeSessionId}:`, e instanceof Error ? e.message : e)
    )
  }

  const session = await stripe.checkout.sessions.create({
    mode:                 "payment",
    payment_method_types: ["card"],
    customer_email:       b.borrower.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency:     "brl",
        unit_amount:  valor,
        product_data: {
          name:        `Taxa de atraso — ${itemsLabel}`,
          description: descricaoAtraso,
          ...(b.item.images[0]?.url && { images: [b.item.images[0].url] }),
        },
      },
    }],
    metadata:    { bookingId: b.id, type: "late_fee" },
    success_url: `${APP_URL}/reservas/${b.id}?late_fee=paid`,
    cancel_url:  `${APP_URL}/reservas/${b.id}`,
    // 🪤 Era `72 * 3600`, e a Stripe recusa: o teto de `expires_at` é 24h.
    expires_at:  Math.floor(agora.getTime() / 1000) + STRIPE_CHARGE_EXPIRES_SECONDS,
  })

  // Só agora o banco sabe da multa — depois de a cobrança existir de fato.
  await prisma.booking.update({
    where: { id: b.id },
    data:  {
      lateFeeAmount:           valor,
      lateFeeSessionId:        session.id,
      lateFeeSessionExpiresAt: new Date(agora.getTime() + STRIPE_CHARGE_EXPIRES_SECONDS * 1000),
    },
  })

  await sendLateFeeEmail(
    b.borrower.email, b.borrower.name,
    itemsLabel, b.id,
    valor, session.url!,
  )

  return { emitida: true, reemissao, valor, anterior: b.lateFeeAmount }
}
