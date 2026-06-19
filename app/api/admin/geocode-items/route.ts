/**
 * POST /api/admin/geocode-items
 * Geocodifica itens que ainda não têm latitude/longitude via Mapbox Geocoding API.
 * Protegido por CRON_SECRET ou sessão de admin.
 */
import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { hasAdminRole } from "@/lib/auth/admin-guards"
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
    // S14-M-14: geocode de itens é domínio Operacional (+Superadmin)
    if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    return NextResponse.json({ error: "NEXT_PUBLIC_MAPBOX_TOKEN não configurado" }, { status: 500 })
  }

  // S14-M-18: filtra no banco (não carrega TODOS os itens em memória) e processa
  // em lote limitado — cada chamada geocodifica até BATCH_SIZE itens, respeitando
  // o maxDuration de 60s + a pausa de 120ms/req da Mapbox. Reexecutar a rota
  // processa o próximo lote (hasMore indica que ainda restam itens).
  // Item.latitude/longitude são Float NÃO-nulos; o sentinela de "sem coordenadas"
  // é 0,0 (mesmo critério do create em app/api/items/route.ts) — o antigo filtro
  // `== null` em JS nunca casava (no-op latente).
  const BATCH_SIZE = 100
  const items = await prisma.item.findMany({
    where:  { deletedAt: null, OR: [{ latitude: 0 }, { longitude: 0 }] },
    select: { id: true, title: true, neighborhood: true, city: true, state: true },
    take:   BATCH_SIZE,
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

  const hasMore = items.length === BATCH_SIZE
  console.warn(`[geocode-items] updated=${updated} failed=${failed} hasMore=${hasMore}`)
  return NextResponse.json({ ok: true, processed: items.length, updated, failed, hasMore, results })
}
