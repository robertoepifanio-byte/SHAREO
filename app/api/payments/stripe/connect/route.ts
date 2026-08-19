import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resolveUserId } from "@/lib/resolveUserId"
import { APP_URL } from "@/lib/app-url"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { isStripeConnectActive, getOrCreateConnectedAccount, createOnboardingLink } from "@/lib/stripe-connect"

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * Inicia o onboarding Express do proprietário (Stripe Connect — ADR-028).
 * Cria a connected account se necessário e retorna o link de onboarding
 * hospedado pela Stripe.
 *
 * Gating: flag stripeConnectEnabled (default OFF) + STRIPE_SECRET_KEY. Com
 * qualquer um ausente, responde 404 — o fluxo atual de checkout não é afetado
 * (mesmo padrão de app/api/payments/mp/connect/route.ts).
 *
 * Dois métodos, mesmo padrão de app/api/payments/mp/checkout/route.ts:
 * GET  → web (link `<a href>` do site, auth por cookie, resposta é o redirect).
 * POST → mobile (fetch autenticado por Bearer via resolveUserId, resposta é
 *        JSON com a URL — o app abre com Linking.openURL, mesmo padrão do
 *        checkout MP em apps/mobile/app/reservas/[id].tsx).
 */
export async function GET() {
  if (!(await isStripeConnectActive())) return err("NOT_FOUND", "Recurso indisponível.", 404)

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(`${APP_URL}/login?callbackUrl=/perfil/recebimentos`)
  }

  try {
    const accountId = await getOrCreateConnectedAccount(session.user.id)
    const onboardingUrl = await createOnboardingLink(accountId, "web")
    return NextResponse.redirect(onboardingUrl)
  } catch (e: unknown) {
    console.error("[GET /api/payments/stripe/connect]", e instanceof Error ? e.message : e)
    return NextResponse.redirect(`${APP_URL}/perfil/recebimentos?stripe=erro`)
  }
}

export async function POST(req: NextRequest) {
  if (!(await isStripeConnectActive())) return err("NOT_FOUND", "Recurso indisponível.", 404)

  const userId = await resolveUserId(req)
  if (!userId) return err("UNAUTHORIZED", "Autenticação necessária.", 401)

  const rl = await checkRateLimit(`stripe-connect:${userId}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const accountId = await getOrCreateConnectedAccount(userId)
    const url = await createOnboardingLink(accountId, "mobile")
    return NextResponse.json({ data: { url } })
  } catch (e: unknown) {
    console.error("[POST /api/payments/stripe/connect]", e instanceof Error ? e.message : e)
    return err("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
