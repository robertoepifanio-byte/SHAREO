/**
 * GET /api/cron/geocode-retry
 * Executa às 05:00 e 17:00 UTC via Vercel Cron.
 * Reprocessa itens com geocodeStatus='PENDING' que não foram tentados
 * nas últimas 2 horas — backoff simples para evitar storm em caso de
 * indisponibilidade prolongada da Mapbox API.
 */
import { NextResponse, type NextRequest } from "next/server"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { geocodeItem }    from "@/lib/geocodeItem"
import { prisma }         from "@/lib/prisma"

export const runtime     = "nodejs"
export const maxDuration = 60

// Número máximo de itens por execução — respeita maxDuration de 60s
// (cada geocode leva ~200ms; 50 itens ≈ 10s, margem confortável)
const BATCH_SIZE = 50

// Itens tentados há menos de 2h são ignorados nesta rodada
const RETRY_COOLDOWN_MS = 2 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const cooldownCutoff = new Date(Date.now() - RETRY_COOLDOWN_MS)

  const items = await prisma.item.findMany({
    where: {
      geocodeStatus: "PENDING",
      deletedAt:     null,
      OR: [
        { geocodeLastTriedAt: null },
        { geocodeLastTriedAt: { lt: cooldownCutoff } },
      ],
    },
    select: {
      id:           true,
      neighborhood: true,
      city:         true,
      state:        true,
    },
    take: BATCH_SIZE,
  })

  if (items.length === 0) {
    console.warn("[cron/geocode-retry] nenhum item PENDING elegível")
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let succeeded = 0
  let failed    = 0

  for (const item of items) {
    try {
      await geocodeItem(item.id, {
        neighborhood: item.neighborhood,
        city:         item.city,
        state:        item.state,
      })
      succeeded++
    } catch (e) {
      // geocodeItem não lança, mas defensivamente capturamos
      console.error("[cron/geocode-retry]", item.id, e instanceof Error ? e.message : e)
      failed++
    }
  }

  console.warn(`[cron/geocode-retry] processed=${items.length} succeeded=${succeeded} failed=${failed}`)
  return NextResponse.json({ ok: true, processed: items.length, succeeded, failed })
}
