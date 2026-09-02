/**
 * Assinatura dos callbacks de onboarding do Stripe Connect (`return_url` e
 * `refresh_url`).
 *
 * 🪤 O problema que isto fecha: `/api/stripe/connect/refresh` recebia
 * `?account=acct_...` e emitia um link de onboarding hospedado da Stripe para
 * QUALQUER id que chegasse, sem sessão. Quem descobrisse o `acct_` de outro
 * locador — ele viaja na URL, e URL entra em histórico, print e ticket de
 * suporte — ganhava um link capaz de coletar dados bancários de repasse
 * daquela conta. Não era exploração remota trivial (o id não é adivinhável),
 * mas o desenho era o de uma capability URL: quem tem a URL, tem o poder.
 *
 * Por que HMAC e não sessão: o `return_url` da Stripe abre no navegador
 * EXTERNO no fluxo mobile, sem cookie nem Bearer do app — `auth()` ali
 * devolveria nulo para todo mundo (ver comentário em connect/return). O HMAC
 * mantém o callback sem sessão e ainda assim não-forjável: quem monta a URL
 * somos nós, em createOnboardingLink.
 *
 * O que a assinatura NÃO faz: provar que quem clicou é o dono da conta. Ela
 * prova que a URL saiu daqui. Basta para o que está em jogo — impedir que um
 * terceiro escolha o `acct_` de outra pessoa.
 */
import crypto from "crypto"

const PURPOSE = "stripe-connect-callback-v1"

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!s) throw new Error("AUTH_SECRET não definida")
  return s
}

/** Assinatura estável para o par (conta, cliente). */
export function connectCallbackSig(accountId: string, client: "web" | "mobile"): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${PURPOSE}:${accountId}:${client}`)
    .digest("hex")
}

/**
 * Confere a assinatura em tempo constante. `client` é o valor cru da query —
 * qualquer coisa diferente de "mobile" é tratada como "web", igual ao resto do
 * fluxo, para que a normalização não vire uma brecha de assinatura.
 */
export function verifyConnectCallbackSig(
  accountId: string | null,
  client: string | null,
  sig: string | null,
): boolean {
  if (!accountId || !sig) return false
  let esperada: string
  try {
    esperada = connectCallbackSig(accountId, client === "mobile" ? "mobile" : "web")
  } catch {
    // AUTH_SECRET ausente: fecha, não abre. Já custou 25 dias de produção
    // silenciosamente sem chave uma vez (ver lib/crypto.ts).
    return false
  }
  const a = Buffer.from(esperada, "utf8")
  const b = Buffer.from(sig, "utf8")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
