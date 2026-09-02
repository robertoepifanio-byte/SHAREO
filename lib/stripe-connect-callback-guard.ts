/**
 * Guard dos callbacks de onboarding do Stripe Connect.
 *
 * Vive separado de lib/stripe-connect-callback.ts (que só faz HMAC) porque
 * importa `next/server`: qualquer módulo que o puxe arrasta o runtime do Next
 * para dentro de todo teste em jsdom que o importe — foi o que quebrou
 * __tests__/unit/lib/stripe-connect.test.ts quando as duas coisas moravam no
 * mesmo arquivo. A regra prática: o módulo de assinatura fica puro, o que fala
 * HTTP fica aqui.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifyConnectCallbackSig } from "@/lib/stripe-connect-callback"

type CallbackOk  = { accountId: string; client: string | null; error: null }
type CallbackErr = { accountId: null; client: string | null; error: NextResponse }

/**
 * Le e valida os parametros de um callback de onboarding. Devolve
 * `{ accountId }` quando a URL foi emitida por nos, ou `{ error }` pronto para
 * `return error`.
 *
 * Existe como helper — e nao copiado nas duas rotas — porque `return` e
 * `refresh` sao as unicas rotas sem sessao do fluxo Connect: qualquer
 * endurecimento futuro (expiracao, rate-limit, telemetria) precisa valer para
 * as duas, e foi um par de rotas copiadas que deixou o buraco original.
 *
 * O desfecho de assinatura invalida e o MESMO de conta ausente, de proposito:
 * nao confirma a um terceiro que aquele `acct_` existe.
 */
export function lerCallbackDoConnect(
  req: NextRequest,
  redirecionarPara: (client: string | null, status: string) => string,
): CallbackOk | CallbackErr {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("account")
  const client    = searchParams.get("client")

  if (!accountId || !verifyConnectCallbackSig(accountId, client, searchParams.get("sig"))) {
    // Sem `sig` valido nao ha conta: o prefixo `acct_` nao precisa ser checado
    // a parte, porque so assinamos ids que a propria Stripe nos devolveu.
    console.warn("[connect callback] assinatura invalida", { path: req.nextUrl.pathname })
    return { accountId: null, client, error: NextResponse.redirect(redirecionarPara(client, "sem_conta")) }
  }

  return { accountId, client, error: null }
}
