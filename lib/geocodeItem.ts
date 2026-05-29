import { prisma } from "@/lib/prisma"

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
 */
export async function geocodeItem(itemId: string, opts: {
  neighborhood?: string | null
  city:          string
  state:         string
}): Promise<void> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return

  const query    = [opts.neighborhood?.trim(), opts.city.trim(), opts.state, "Brasil"].filter(Boolean).join(", ")
  const coords   = await mapboxGeocode(query, token)
                ?? await mapboxGeocode(`${opts.city}, ${opts.state}, Brasil`, token)

  if (!coords) return

  await prisma.item.update({
    where: { id: itemId },
    data:  { latitude: coords.lat, longitude: coords.lng },
  }).catch((e) => console.error("[geocodeItem]", itemId, e instanceof Error ? e.message : e))
}
