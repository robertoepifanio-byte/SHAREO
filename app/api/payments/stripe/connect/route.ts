import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { APP_URL } from "@/lib/app-url"
import { isStripeConnectActive, getOrCreateConnectedAccount, createOnboardingLink } from "@/lib/stripe-connect"

/**
 * Inicia o onboarding Express do proprietário (Stripe Connect — ADR-028).
 * Cria a connected account se necessário e redireciona para o link de
 * onboarding hospedado pela Stripe.
 *
 * Gating: flag stripeConnectEnabled (default OFF) + STRIPE_SECRET_KEY. Com
 * qualquer um ausente, responde 404 — o fluxo atual de checkout não é afetado
 * (mesmo padrão de app/api/payments/mp/connect/route.ts).
 */
export async function GET() {
  if (!(await isStripeConnectActive())) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Recurso indisponível." } },
      { status: 404 },
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(`${APP_URL}/login?callbackUrl=/perfil/recebimentos`)
  }

  try {
    const accountId = await getOrCreateConnectedAccount(session.user.id)
    const onboardingUrl = await createOnboardingLink(accountId)
    return NextResponse.redirect(onboardingUrl)
  } catch (e: unknown) {
    console.error("[GET /api/payments/stripe/connect]", e instanceof Error ? e.message : e)
    return NextResponse.redirect(`${APP_URL}/perfil/recebimentos?stripe=erro`)
  }
}
