/**
 * Token de descadastro da lista de interessados (campanha de pré-lançamento).
 *
 * Por que HMAC e não um token guardado no banco:
 *   O link vai no rodapé de TODO e-mail da campanha. Um token persistido exigiria
 *   uma linha por envio e um cron de expurgo; o HMAC é derivado do próprio e-mail,
 *   é estável entre envios e não guarda nada. O lead não tem sessão — o clique vem
 *   do cliente de e-mail, sem cookie.
 *
 * Segurança: assinado com AUTH_SECRET. Sem a chave não dá para forjar o link de
 * outra pessoa; com o link só se consegue DESCADASTRAR aquele e-mail (ação de
 * baixo impacto e reversível reinscrevendo-se), nunca ler dado.
 */
import crypto from "crypto"

const PURPOSE = "founder-unsubscribe-v1"

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!s) throw new Error("AUTH_SECRET não definida")
  return s
}

/** Assinatura estável para um e-mail. Mesmo e-mail → mesmo token. */
export function unsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${PURPOSE}:${email.trim().toLowerCase()}`)
    .digest("hex")
}

/** Comparação em tempo constante — evita distinguir token válido por timing. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  let expected: string
  try {
    expected = unsubscribeToken(email)
  } catch {
    return false
  }
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(token, "utf8")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** URL absoluta do link que vai no rodapé dos e-mails. */
export function unsubscribeUrl(appUrl: string, email: string): string {
  const e = encodeURIComponent(email.trim().toLowerCase())
  const t = unsubscribeToken(email)
  return `${appUrl}/api/founders/unsubscribe?email=${e}&token=${t}`
}
