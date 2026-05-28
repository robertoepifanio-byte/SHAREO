/**
 * POST /api/admin/geocode-items
 * Geocodifica itens que ainda não têm latitude/longitude via Mapbox Geocoding API.
 * Protegido por CRON_SECRET ou sessão de admin.
 */
import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime   = "nodejs"
export const maxDuration = 60

async function geocode(query: string, token: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=BR&language=pt&limit=1&types=place,locality,neighborhood,address`
  try {
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

export async function POST(req: NextRequest) {
  // Aceita CRON_SECRET ou sessão admin
  const auth_header = req.headers.get("authorization")
  const secret      = process.env.CRON_SECRET
  const isSecret    = secret && auth_header === `Bearer ${secret}`

  if (!isSecret) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    return NextResponse.json({ error: "NEXT_PUBLIC_MAPBOX_TOKEN não configurado" }, { status: 500 })
  }

  // Busca itens sem coordenadas
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
      ],
      deletedAt: null,
    },
    select: { id: true, title: true, neighborhood: true, city: true, state: true },
  })

  if (items.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "Nenhum item sem coordenadas." })
  }

  let updated = 0
  let failed  = 0
  const results: string[] = []

  for (const item of items) {
    const parts = [item.neighborhood?.trim(), item.city?.trim(), item.state, "Brasil"].filter(Boolean)
    if (parts.length < 2) { failed++; continue }

    const coords = await geocode(parts.join(", "), token)
    if (!coords) {
      // Tenta só cidade + estado como fallback
      const fallback = await geocode(`${item.city}, ${item.state}, Brasil`, token)
      if (!fallback) {
        results.push(`❌ ${item.id} — ${item.title}`)
        failed++
        continue
      }
      await prisma.item.update({ where: { id: item.id }, data: { latitude: fallback.lat, longitude: fallback.lng } })
      results.push(`✅ ${item.id} — ${item.title} (fallback cidade)`)
    } else {
      await prisma.item.update({ where: { id: item.id }, data: { latitude: coords.lat, longitude: coords.lng } })
      results.push(`✅ ${item.id} — ${item.title}`)
    }
    updated++

    // Pequena pausa para não estourar rate limit da Mapbox (free tier: 600 req/min)
    await new Promise((r) => setTimeout(r, 120))
  }

  console.warn(`[geocode-items] updated=${updated} failed=${failed}`)
  return NextResponse.json({ ok: true, processed: items.length, updated, failed, results })
}
