/**
 * lib/logger.ts — Logger server-side com mascaramento de PII.
 *
 * Auditoria s40 / ressalva #5: console.error server-side não mascarava PII.
 * Este módulo expõe safeServerError() como substituto de console.error nos
 * pontos que processam dados sensíveis (auth, cadastro, financeiro).
 *
 * APENAS server-side — não importar em Client Components ("use client").
 * Em rotas de API simples (sem PII nos args de erro), console.error direto
 * continua aceitável, pois já logamos só e.message (nunca o objeto completo).
 */

import { SENSITIVE_RE } from "@/lib/sentry-scrub"

/**
 * Substitui tokens que batem em SENSITIVE_RE por "[Filtered]" numa string.
 * Cobre padrões comuns: JSON keys+values e query-string.
 *
 * Exemplo:
 *   '{"cpf":"123.456.789-00"}'  →  '{"cpf":"[Filtered]"}'
 *   'pixKey=abc123'             →  'pixKey=[Filtered]'
 */
function maskString(text: string): string {
  // JSON: "campo": "valor" ou "campo":"valor"
  return text
    .replace(
      /"([^"]+)":\s*"([^"]*)"/g,
      (match, key: string) => (SENSITIVE_RE.test(key) ? `"${key}":"[Filtered]"` : match),
    )
    // query-string / form: campo=valor&
    .replace(
      /([a-zA-Z_][a-zA-Z0-9_]*)=([^&\s"]*)/g,
      (match, key: string) => (SENSITIVE_RE.test(key) ? `${key}=[Filtered]` : match),
    )
}

/**
 * Console.error seguro para uso em rotas que lidam com PII.
 * Mascara strings antes de emitir o log; outros tipos são passados tal qual.
 *
 * Uso: safeServerError("[POST /api/auth/register]", e.message, e.stack)
 */
export function safeServerError(prefix: string, ...args: unknown[]): void {
  const sanitized = args.map((arg) => {
    if (typeof arg === "string") return maskString(arg)
    return arg
  })
  console.error(prefix, ...sanitized)
}
