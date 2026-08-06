import { prisma } from "@/lib/prisma"

// Após MAX_ATTEMPTS falhas, o item é marcado FAILED e requer intervenção manual
// via /api/admin/geocode-items.
const MAX_ATTEMPTS = 5

async function mapboxGeocode(query: string, token: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=BR&language=pt&limit=1&types=place,locality,neighborhood,address`
    const res  = await fetch(url)
    const data = await res.json() as { features?: { center: [number, number] }[] }
    const feat = data.features?.[0]
    if (!feat) return null
    const [lng, lat] = feat.center
    return { lat, lng }
  } catch {
    return null
  }
}

/**
 * Geocodifica um item pelo endereço e atualiza lat/lng no banco.
 * Fire-and-forget — não lança exceção.
 * Rastrea tentativas: geocodeAttempts / geocodeStatus / geocodeLastTriedAt.
 * Falhas transitórias viram PENDING (retry pelo cron); após MAX_ATTEMPTS viram FAILED.
 */
export async function geocodeItem(itemId: string, opts: {
  neighborhood?: string | null
  city:          string
  state:         string
}): Promise<void> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return

  const query  = [opts.neighborhood?.trim(), opts.city.trim(), opts.state, "Brasil"].filter(Boolean).join(", ")
  const coords = await mapboxGeocode(query, token)
             ?? await mapboxGeocode(`${opts.city}, ${opts.state}, Brasil`, token)

  const current = await prisma.item.findUnique({
    where:  { id: itemId },
    select: { geocodeAttempts: true },
  }).catch(() => null)

  if (!current) return  // item removido antes de geocodificar

  const nextAttempts = current.geocodeAttempts + 1

  if (!coords) {
    const nextStatus = nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING"
    if (nextStatus === "FAILED") {
      console.error(`[geocodeItem] ${itemId} atingiu ${MAX_ATTEMPTS} tentativas sem sucesso — FAILED`)
    }
    await prisma.item.update({
      where: { id: itemId },
      data: {
        geocodeStatus:      nextStatus,
        geocodeAttempts:    nextAttempts,
        geocodeLastTriedAt: new Date(),
      },
    }).catch((e) => console.error("[geocodeItem] update status", itemId, e instanceof Error ? e.message : e))
    return
  }

  await prisma.item.update({
    where: { id: itemId },
    data: {
      latitude:           coords.lat,
      longitude:          coords.lng,
      geocodeStatus:      "OK",
      geocodeAttempts:    nextAttempts,
      geocodeLastTriedAt: new Date(),
    },
  }).catch((e) => console.error("[geocodeItem]", itemId, e instanceof Error ? e.message : e))
}
