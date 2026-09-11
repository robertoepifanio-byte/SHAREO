/**
 * Contador agregado do funil de captação de Fundadores (visita → tentativa de
 * envio). INCR no Upstash via `lib/upstash.ts`, fail-open.
 *
 * Existe porque o GA4 está deliberadamente desligado (ver
 * `components/analytics/GoogleAnalytics.tsx`) e reabri-lo reabriria o prazo
 * vencido do Art. 33/CPC-ANPD. Isto não é analytics de terceiro: nenhum dado
 * sai do nosso Redis, não há PII, IP ou cookie — só um número por dia por
 * evento.
 *
 * `submit_success` não existe aqui de propósito: já é o total real de
 * `FounderLead` (fonte da verdade). Contar de novo aqui divergiria do banco em
 * caso de falha parcial e criaria uma segunda "verdade" para conciliar.
 */

import { upstashUrl, upstashFetch } from "./upstash"

type FunnelEvent = "view" | "submit_attempt"

/** Chave do dia em UTC — só precisa ser estável e ordenável, não fuso local. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function dayKey(event: FunnelEvent, day: string): string {
  return `funnel:${event}:${day}`
}

export async function incrementFunnelEvent(event: FunnelEvent): Promise<void> {
  if (!upstashUrl()) return
  try {
    await upstashFetch(["INCR", dayKey(event, today())])
  } catch (e) {
    console.warn("[founderFunnel] falhou:", e instanceof Error ? e.message : e)
  }
}

/**
 * Soma os últimos `days` dias (incluindo hoje) para cada evento. Todas as
 * leituras (2 por dia × N dias) saem de uma vez num único `Promise.all` — o
 * volume é baixíssimo, mas não há razão para serializar N rodadas de round-trip
 * quando o chamador (um GET de admin) está esperando a resposta.
 */
export async function readFunnelCounts(days: number): Promise<{
  view: number
  submitAttempt: number
  byDay: { day: string; view: number; submitAttempt: number }[]
}> {
  const dayList = Array.from({ length: days }, (_, i) =>
    new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  )

  const reads = await Promise.all(
    dayList.map((d) =>
      Promise.all([
        upstashFetch(["GET", dayKey("view", d)]).catch(() => null),
        upstashFetch(["GET", dayKey("submit_attempt", d)]).catch(() => null),
      ]),
    ),
  )

  let view = 0
  let submitAttempt = 0
  const byDay = dayList.map((day, i) => {
    const [v, s] = reads[i]
    const vN = typeof v === "string" ? parseInt(v, 10) : 0
    const sN = typeof s === "string" ? parseInt(s, 10) : 0
    view += vN
    submitAttempt += sN
    return { day, view: vN, submitAttempt: sN }
  })

  return { view, submitAttempt, byDay: byDay.reverse() }
}
