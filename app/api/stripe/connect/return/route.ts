import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { getStripe } from "@/lib/stripe"
import { isStripeConnectActive, syncStripeConnectAccount } from "@/lib/stripe-connect"

const SETTINGS = "/perfil/recebimentos"

function back(status: string) {
  return NextResponse.redirect(`${APP_URL}${SETTINGS}?stripe=${status}`)
}

/**
 * Retorno do onboarding Express (Stripe Connect — ADR-028). A Stripe manda o
 * locador para cá depois que ele preenche (ou abandona) o formulário
 * hospedado. Não há garantia de que o onboarding foi concluído aqui — por
 * isso buscamos o Account fresco e sincronizamos o status real, em vez de
 * assumir sucesso só pelo redirect ter acontecido.
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
  if (!account?.stripeAccountId) return back("sem_conta")

  try {
    const stripe = getStripe()
    const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId)
    await syncStripeConnectAccount(stripeAccount)

    return back(stripeAccount.details_submitted ? "concluido" : "incompleto")
  } catch (e: unknown) {
    console.error("[GET /api/stripe/connect/return]", e instanceof Error ? e.message : e)
    return back("erro")
  }
}
