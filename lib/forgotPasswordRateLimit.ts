/**
 * Limite de tentativas POR E-MAIL do esqueci-senha.
 *
 * A chave usa o mesmo `emailField()` que o endpoint consulta no banco
 * (`email.toLowerCase()` após trim), garantindo que variações do mesmo
 * endereço (maiúsculas, espaços) caiam no mesmo contador.
 *
 * Contador SEPARADO do login (prefixo `forgot:email:`, não `login:email:`):
 * um flood de esqueci-senha não bloqueia o login do usuário real, nem uma
 * tentativa de força bruta no login consome a cota de redefinição de senha.
 *
 * A resposta ao estourar o limite é HTTP 429 (não 200): como o limite é
 * aplicado ANTES de qualquer consulta ao banco, o 429 não revela se o
 * e-mail está cadastrado — qualquer endereço válido (existente ou não)
 * consome a mesma cota e recebe a mesma resposta.
 */

import { emailField } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const FORGOT_EMAIL = emailField()

export function forgotPasswordEmailKey(raw: unknown): string | null {
  const parsed = FORGOT_EMAIL.safeParse(raw)
  return parsed.success ? `forgot:email:${parsed.data}` : null
}

/**
 * Conta a tentativa no contador do e-mail. Devolve o 429 pronto quando a cota
 * estourou; `null` quando pode seguir (ou quando não há e-mail válido).
 * Único ponto com chave, limite e janela: toda rota que inicia redefinição de
 * senha deve chamar esta função.
 */
export async function checkForgotPasswordEmailLimit(
  raw: unknown,
  req?: { headers: { get(name: string): string | null } },
): Promise<Response | null> {
  const key = forgotPasswordEmailKey(raw)
  if (!key) return null
  const { limit, windowMs } = RATE_LIMITS.forgotPasswordEmail
  const rl = await checkRateLimit(key, limit, windowMs, req)
  return rl.allowed ? null : rateLimitResponse(rl.resetAt)
}
