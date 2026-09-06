/**
 * Links de descadastro autenticados por HMAC.
 *
 * O clique chega do cliente de e-mail: sem cookie, sem sessão. O token é
 * derivado do próprio e-mail, então é estável entre envios e não exige uma
 * linha no banco por mensagem enviada — o que um token persistido exigiria,
 * junto com um cron de expurgo.
 *
 * O `purpose` escopa a assinatura: o mesmo e-mail produz tokens diferentes para
 * a lista de Fundadores e para os e-mails de reengajamento, e um link não vale
 * na outra lista. Elas têm bases legais e conteúdos diferentes; quem sai de uma
 * não necessariamente quer sair da outra.
 *
 * 🪤 O formato do payload assinado — `${purpose}:${email normalizado}` — É o
 * contrato. Mudar a ordem, o separador, a normalização ou a string de propósito
 * invalida em silêncio todos os links já enviados. A campanha de Fundadores
 * manda esses links desde 01/09/2026, para caixas de entrada reais. Coberto por
 * teste que recalcula o HMAC do zero.
 *
 * Segurança: assinado com AUTH_SECRET. Sem a chave não dá para forjar o link de
 * outra pessoa; com o link só se consegue descadastrar aquele e-mail — ação de
 * baixo impacto e reversível, nunca leitura de dado.
 */
import crypto from "crypto"
import { timingSafeStringEqual } from "@/lib/timingSafe"

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!s) throw new Error("AUTH_SECRET não definida")
  return s
}

/**
 * Normalização única do e-mail, usada na assinatura E na URL.
 *
 * 🪤 Tem que ser a MESMA nas duas pontas e na consulta que aplica o
 * descadastro. Um e-mail gravado como `Roberto@Gmail.com` e assinado como
 * `roberto@gmail.com` gera um link cujo `UPDATE` casa zero linhas — e a página
 * responde "pronto, descadastrado" enquanto os e-mails continuam chegando. Por
 * isso a consulta do lado da rota é case-insensitive.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type UnsubscribeLink = {
  /** Assinatura estável para um e-mail. Mesmo e-mail → mesmo token. */
  token(email: string): string
  /** Comparação em tempo constante — não distingue token válido por timing. */
  verify(email: string, token: string): boolean
  /** URL absoluta do link que vai no rodapé dos e-mails. */
  url(appUrl: string, email: string): string
}

/**
 * Cria o par token/verificação/URL de uma lista.
 *
 * Existe para que uma lista nova seja duas constantes, e não mais um arquivo de
 * três funções idênticas às da lista anterior — que é como a normalização do
 * e-mail acabaria divergindo entre listas sem ninguém notar.
 */
export function makeUnsubscribeLink(purpose: string, path: string): UnsubscribeLink {
  function token(email: string): string {
    return crypto
      .createHmac("sha256", secret())
      .update(`${purpose}:${normalizeEmail(email)}`)
      .digest("hex")
  }

  return {
    token,

    verify(email, providedToken) {
      if (!email || !providedToken) return false
      let expected: string
      try {
        expected = token(email)
      } catch {
        // AUTH_SECRET ausente: recusa em vez de estourar. Um link que não
        // funciona é ruim; um 500 na página de descadastro é pior.
        return false
      }
      return timingSafeStringEqual(expected, providedToken)
    },

    url(appUrl, email) {
      return `${appUrl}${path}?email=${encodeURIComponent(normalizeEmail(email))}&token=${token(email)}`
    },
  }
}
