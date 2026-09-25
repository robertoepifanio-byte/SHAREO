/**
 * Limite de tentativas POR E-MAIL do login (web e mobile).
 *
 * A chave sai do e-mail do próprio `LoginSchema` (`emailField()`: trim +
 * minúsculas), o mesmo que o login consulta no banco: `a@b.com` e `a@b.com `
 * são a mesma conta e, portanto, o mesmo contador. Reusar o schema, em vez de
 * reescrever a normalização aqui, impede as duas pontas de divergirem.
 *
 * Web e mobile dividem o contador de propósito, e ele conta toda tentativa
 * (inclusive as que dão certo). E-mail inválido não gera chave: o login o
 * recusa antes de tocar em conta alguma, e o limite por IP segue valendo.
 */

import { LoginSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const LOGIN_EMAIL = LoginSchema.shape.email

export function loginEmailKey(raw: unknown): string | null {
  const parsed = LOGIN_EMAIL.safeParse(raw)
  return parsed.success ? `login:email:${parsed.data}` : null
}

/**
 * Conta a tentativa no contador do e-mail. Devolve o 429 pronto quando a cota
 * estourou; `null` quando pode seguir (ou quando não há e-mail válido).
 * Único ponto com chave, limite e janela: web e mobile chamam esta função.
 */
export async function checkLoginEmailLimit(
  raw: unknown,
  req?: { headers: { get(name: string): string | null } },
): Promise<Response | null> {
  const key = loginEmailKey(raw)
  if (!key) return null
  const { limit, windowMs } = RATE_LIMITS.loginEmail
  const rl = await checkRateLimit(key, limit, windowMs, req)
  return rl.allowed ? null : rateLimitResponse(rl.resetAt)
}
