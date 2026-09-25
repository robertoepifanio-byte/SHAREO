/**
 * Verificação de assinatura das requests de webhook do Stripe.
 *
 * Mora aqui, e não em lib/stripe.ts, porque devolve `NextResponse` e portanto
 * importa `next/server` — que exige o global `Request`. `lib/stripe.ts` é
 * alcançado transitivamente por testes que rodam em jsdom (via
 * lib/stripe-connect.ts), onde esse global não existe; arrastar o runtime do
 * Next pra lá quebra a suíte inteira que só queria o cliente Stripe.
 *
 * Fica junto de lib/payments/stripe-event-queue.ts: as duas são o envelope
 * comum às duas rotas de webhook (v1 e Connect v2).
 */
import Stripe from "stripe"
import { NextResponse } from "next/server"

/**
 * Lê o body raw + assinatura e verifica com a função passada — v1
 * (`webhooks.constructEvent`) ou v2 (`parseEventNotification`); cada rota
 * escolhe a sua, porque são mecanismos de assinatura diferentes e secrets
 * diferentes (ver app/api/webhooks/stripe/route.ts e
 * app/api/webhooks/stripe-connect/route.ts).
 *
 * Devolve o payload verificado, ou já a resposta de erro pronta pra retornar
 * (400 sem assinatura ou assinatura inválida, 500 sem secret configurado).
 *
 * MIGRAÇÃO — múltiplos secrets (STRIPE_CONNECT_WEBHOOK_SECRET):
 * A env var pode conter uma lista separada por vírgula para suportar dois
 * Event Destinations coexistindo durante a migração (ex.: ao recriar o
 * destino com `events_from: ["@self","@accounts"]`, o antigo ainda entrega
 * até ser removido, mas usa o secret anterior). A função tenta cada secret
 * em ordem; falha com 400 somente se nenhum validar. Nunca loga os secrets.
 *
 * Formato: `whsec_aaa` ou `whsec_aaa,whsec_bbb` (vírgula sem espaços).
 * Se a env var não estiver definida, retorna 500 como antes.
 */
export async function verifyStripeWebhookRequest<T>(
  req:  Request,
  opts: { logPrefix: string; secretEnvVar: string; verify: (body: string, signature: string, secret: string) => T },
): Promise<{ ok: true; payload: T } | { ok: false; response: NextResponse }> {
  const body      = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return { ok: false, response: NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 }) }
  }

  const rawSecret = process.env[opts.secretEnvVar]
  if (!rawSecret) {
    console.error(`${opts.logPrefix} ${opts.secretEnvVar} not set`)
    return { ok: false, response: NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 }) }
  }

  // Suporte a múltiplos secrets separados por vírgula — útil durante a
  // migração em que dois Event Destinations coexistem com secrets diferentes.
  // A ordem não importa funcionalmente; o primeiro que validar é aceito.
  const secrets = rawSecret.split(",").map((s) => s.trim()).filter(Boolean)

  for (const secret of secrets) {
    try {
      return { ok: true, payload: opts.verify(body, signature, secret) }
    } catch (err) {
      // Só engole StripeSignatureVerificationError — é o que diz "secret errado,
      // tente o próximo". Qualquer outro erro (payload malformado, biblioteca,
      // etc.) é relançado imediatamente para não mascarar falhas reais.
      if (!(err instanceof Stripe.errors.StripeSignatureVerificationError)) throw err
    }
  }

  console.error(`${opts.logPrefix} signature verification failed (tried ${secrets.length} secret(s))`)
  return { ok: false, response: NextResponse.json({ error: "Invalid signature" }, { status: 400 }) }
}
