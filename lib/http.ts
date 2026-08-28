/** Extrai o Retry-After (segundos) de uma resposta 429 — parse + clamp, sem fallback de mensagem. */
export function parseRetryAfterSeconds(res: Response): number | null {
  const v = parseInt(res.headers.get("Retry-After") ?? "", 10)
  return Number.isFinite(v) ? Math.max(1, v) : null
}
