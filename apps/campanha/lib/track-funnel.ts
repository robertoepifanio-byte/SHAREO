import { ROTAS } from "./config"

/**
 * Contador de funil (visita → tentativa de envio) — ver `lib/founderFunnel.ts`
 * do lado do ShareO para o porquê de existir em vez do GA4.
 *
 * Fire-and-forget de propósito: um contador não pode atrasar nem quebrar a
 * captação de verdade. Falha silenciosa, sempre.
 */
export function trackFunnel(event: "view" | "submit_attempt"): void {
  try {
    void fetch(ROTAS.funnel, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ambiente sem fetch ou storage bloqueado — sem contador, sem quebra */
  }
}
