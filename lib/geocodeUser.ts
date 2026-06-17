import { prisma } from "@/lib/prisma"

/**
 * Geocodifica o endereço do usuário (Mapbox) e salva lat/lng no perfil.
 * Fire-and-forget: usar dentro de `after()` para não bloquear a resposta (S14-M-19).
 * Tenta endereço completo → bairro → cidade+estado.
 */
export async function geocodeUserLocation(userId: string, opts: {
  street?:       string | null
  neighborhood?: string | null
  city:          string
  state:         string
}) {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    const fullQuery = [opts.street?.trim(), opts.neighborhood?.trim(), opts.city.trim(), opts.state.trim(), "Brasil"]
      .filter(Boolean).join(", ")
    const cityQuery = `${opts.city.trim()}, ${opts.state.trim()}, Brasil`

    async function fetchCoords(query: string, types: string): Promise<[number, number] | null> {
      const url  = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=BR&language=pt&limit=1&types=${types}`
      const res  = await fetch(url)
      const data = await res.json() as { features?: { center: [number, number] }[] }
      return data.features?.[0]?.center ?? null
    }

    const center =
      (opts.street   && await fetchCoords(fullQuery, "address,neighborhood,place,locality")) ||
      (opts.neighborhood && await fetchCoords([opts.neighborhood.trim(), opts.city.trim(), opts.state.trim(), "Brasil"].join(", "), "neighborhood,place,locality")) ||
      await fetchCoords(cityQuery, "place,locality")

    if (!center) return
    const [lng, lat] = center
    await prisma.user.update({
      where: { id: userId },
      data:  { latitude: lat, longitude: lng },
    })
  } catch (e) {
    console.error("[geocodeUserLocation]", userId, e instanceof Error ? e.message : e)
  }
}
