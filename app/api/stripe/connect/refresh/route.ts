import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { isStripeConnectActive, createOnboardingLink } from "@/lib/stripe-connect"

const SETTINGS = "/perfil/recebimentos"

/**
 * O link de onboarding do Stripe (`account_onboarding`) expira depois de um
 * tempo curto. Se o locador demorar para preencher, a Stripe manda ele para
 * cá em vez de para o `return_url` — geramos um link novo e redirecionamos
 * de novo, sem exigir que ele clique em "Conectar" de novo manualmente.
 *
 * Gating: flag stripeConnectEnabled + STRIPE_SECRET_KEY. Sem isso, 404.
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
    return NextResponse.redirect(`${APP_URL}/login?callbackUrl=${SETTINGS}`)
  }

  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
    select: { stripeAccountId: true },
  })
  if (!account?.stripeAccountId) {
    return NextResponse.redirect(`${APP_URL}${SETTINGS}?stripe=sem_conta`)
  }

  try {
    const onboardingUrl = await createOnboardingLink(account.stripeAccountId)
    return NextResponse.redirect(onboardingUrl)
  } catch (e: unknown) {
    console.error("[GET /api/stripe/connect/refresh]", e instanceof Error ? e.message : e)
    return NextResponse.redirect(`${APP_URL}${SETTINGS}?stripe=erro`)
  }
}
