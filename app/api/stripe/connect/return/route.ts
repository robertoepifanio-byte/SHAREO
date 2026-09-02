import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { isStripeConnectActive, fetchAndSyncConnectAccount, stripeConnectFinalRedirect } from "@/lib/stripe-connect"
import { lerCallbackDoConnect } from "@/lib/stripe-connect-callback-guard"

/**
 * Retorno do onboarding Express (Stripe Connect — ADR-028). A Stripe manda o
 * locador para cá depois que ele preenche (ou abandona) o formulário
 * hospedado. Não há garantia de que o onboarding foi concluído aqui — por
 * isso buscamos o Account fresco e sincronizamos o status real, em vez de
 * assumir sucesso só pelo redirect ter acontecido.
 *
 * SEM sessão de propósito: no mobile, o `return_url` da Stripe abre no
 * navegador externo do onboarding, que não carrega cookie nem Bearer token
 * do app — não dá pra usar auth()/resolveUserId aqui. A conta é identificada
 * só pelo `stripeAccountId` que viaja na própria URL (ver createOnboardingLink
 * em lib/stripe-connect.ts) — mesmo padrão que o webhook account.updated usa.
 * O id vem ASSINADO (`sig`): sem sessão para autenticar, a assinatura é o que
 * impede um terceiro de escolher a conta alheia.
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

  // Sem sessao aqui: a assinatura da URL e a autenticacao.
  const { accountId, client, error } = lerCallbackDoConnect(req, stripeConnectFinalRedirect)
  if (error) return error

  try {
    const stripeAccount = await fetchAndSyncConnectAccount(accountId)

    const noPendingRequirements = (stripeAccount.requirements?.entries?.length ?? 0) === 0
    return NextResponse.redirect(
      stripeConnectFinalRedirect(client, noPendingRequirements ? "concluido" : "incompleto"),
    )
  } catch (e: unknown) {
    console.error("[GET /api/stripe/connect/return]", e instanceof Error ? e.message : e)
    return NextResponse.redirect(stripeConnectFinalRedirect(client, "erro"))
  }
}
