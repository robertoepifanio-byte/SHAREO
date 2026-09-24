/**
 * GET /api/cron/flush-view-counts
 * Flush periódico dos contadores de visualização do Redis para o Postgres.
 *
 * Executa 3×/dia (00h, 08h, 16h UTC via vercel.json).
 * Intervalo escolhido: ~8h — view count é dado analítico, staleness de horas
 * é aceitável, e nenhum cron existente ocupa esses horários.
 *
 * Fluxo: lê o SET de pendentes (`pendingItemsSetKey()`, com o namespace do
 * ambiente) → para cada itemId, GETDEL atômico do contador → UPDATE Postgres em
 * lote de 10 → SREM do SET.
 *
 * NFR-BL2
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma }         from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { upstashUrl, upstashFetch } from "@/lib/upstash"
import { pendingItemsSetKey, pendingCountKey } from "@/lib/viewCounter"

export const runtime     = "nodejs"
export const maxDuration = 60

const BATCH_SIZE = 10

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  if (!upstashUrl()) {
    return NextResponse.json({ ok: true, skipped: "upstash_not_configured", flushed: 0 })
  }

  let members: string[]
  try {
    members = ((await upstashFetch(["SMEMBERS", pendingItemsSetKey()])) as string[] | null) ?? []
  } catch (e) {
    console.error("[cron/flush-view-counts] SMEMBERS falhou:", e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: "redis_error" }, { status: 500 })
  }

  if (members.length === 0) {
    return NextResponse.json({ ok: true, flushed: 0 })
  }

  let flushed      = 0
  const errors: string[] = []

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch   = members.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (itemId) => {
        // GETDEL: pega e apaga atomicamente — novas views após esta chamada
        // criam nova chave e serão apanhadas no próximo flush.
        const countRaw = (await upstashFetch(["GETDEL", pendingCountKey(itemId)])) as string | null
        const count    = countRaw ? parseInt(countRaw, 10) : 0

        if (count <= 0) {
          await upstashFetch(["SREM", pendingItemsSetKey(), itemId])
          return 0
        }

        await prisma.item.update({
          where: { id: itemId },
          data:  { viewCount: { increment: count } },
        })
        await upstashFetch(["SREM", pendingItemsSetKey(), itemId])
        return count
      })
    )

    for (const r of results) {
      if (r.status === "fulfilled" && r.value && r.value > 0) {
        flushed++
      } else if (r.status === "rejected") {
        errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[cron/flush-view-counts] erros=${errors.length}`, errors)
  }
  console.warn(`[cron/flush-view-counts] flushed=${flushed}/${members.length}`)
  return NextResponse.json({ ok: true, flushed, total: members.length, errors: errors.length })
}
