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
  lateFeeSessionExpiresAt: Date | null
  borrower: { email: string; name: string }
  item: { images: { url: string }[] }
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

/** Precisa emitir (primeira vez) ou reemitir (a anterior expirou)? */
export function precisaCobrar(b: BookingParaCobranca, agora: Date = new Date()): boolean {
  if (taxaDeAtrasoQuitada(b)) return false
  return !temCobrancaViva(b, agora)
}

export type ResultadoCobranca =
  | { emitida: true;  reemissao: boolean; valor: number }
  | { emitida: false; motivo: "JA_QUITADA" | "COBRANCA_VIVA" | "SEM_VALOR" }

/**
 * Cria a Checkout Session da multa, grava o vínculo e avisa o locatário.
 *
 * `valorSePrimeira` só é usado quando ainda não há multa registrada. Na
 * reemissão o valor **não é recalculado**: cobrar mais do que o valor já
 * comunicado ao locatário no primeiro e-mail seria mudar a dívida sem aviso.
 * (Que a multa não cresça com os dias de atraso é uma divergência conhecida em
 * relação ao texto publicado — está registrada no backlog e é decisão de
 * negócio, não deste módulo.)
 */
export async function emitirCobrancaTaxaAtraso(
  b:                BookingParaCobranca,
  itemsLabel:       string,
  valorSePrimeira:  number,
  descricaoAtraso:  string,
): Promise<ResultadoCobranca> {
  const agora = new Date()

  if (taxaDeAtrasoQuitada(b))  return { emitida: false, motivo: "JA_QUITADA" }
  if (temCobrancaViva(b, agora)) return { emitida: false, motivo: "COBRANCA_VIVA" }

  const valor = b.lateFeeAmount ?? valorSePrimeira
  if (!valor || valor <= 0) return { emitida: false, motivo: "SEM_VALOR" }

  const reemissao = b.lateFeeAmount != null

  const stripe  = getStripe()
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

  return { emitida: true, reemissao, valor }
}
