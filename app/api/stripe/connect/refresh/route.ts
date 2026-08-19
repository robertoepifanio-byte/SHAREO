import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { isStripeConnectActive, createOnboardingLink, stripeConnectFinalRedirect } from "@/lib/stripe-connect"

/**
 * O link de onboarding do Stripe (`account_onboarding`) expira depois de um
 * tempo curto. Se o locador demorar para preencher, a Stripe manda ele para
 * cá em vez de para o `return_url` — geramos um link novo e redirecionamos
 * de novo, sem exigir que ele reabra "Conectar" manualmente.
 *
 * SEM sessão, mesmo motivo de app/api/stripe/connect/return/route.ts: a
 * conta é identificada pelo `stripeAccountId` que viaja na URL, não por
 * cookie/Bearer.
 *
 * Gating: flag stripeConnectEnabled + STRIPE_SECRET_KEY. Sem isso, 404.
 */
export async function GET(req: NextRequest) {
  if (!(await isStripeConnectActive())) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Recurso indisponível." } },
      { status: 404 },
    )
  }

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("account")
  const client    = searchParams.get("client")

  if (!accountId || !accountId.startsWith("acct_")) {
    return NextResponse.redirect(stripeConnectFinalRedirect(client, "sem_conta"))
  }

  try {
    const url = await createOnboardingLink(accountId, client === "mobile" ? "mobile" : "web")
    return NextResponse.redirect(url)
  } catch (e: unknown) {
    console.error("[GET /api/stripe/connect/refresh]", e instanceof Error ? e.message : e)
    return NextResponse.redirect(stripeConnectFinalRedirect(client, "erro"))
  }
}
