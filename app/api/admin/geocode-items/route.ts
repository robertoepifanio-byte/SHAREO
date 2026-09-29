/**
 * POST /api/admin/geocode-items
 * Geocodifica itens que ainda não têm latitude/longitude via Mapbox Geocoding API.
 * `?todos=1` recalcula TODOS os itens (lote de 100; continuar com `&depois=<último id>`)
 * — usado depois da troca da regra em lib/geocodeBR.ts (CEP primeiro, 27/09/2026).
 * Protegido por CRON_SECRET ou sessão de admin.
 */
import { NextResponse, type NextRequest } from "next/server"
import { requireAdminApi } from "@/lib/auth/require-admin"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { prisma } from "@/lib/prisma"
import { geocodeItem } from "@/lib/geocodeItem"

export const runtime   = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Aceita CRON_SECRET (guard com comparação em tempo constante) ou sessão
  // admin. O guard devolve a resposta 401 quando NÃO é chamada de cron — aqui
  // ela é descartada de propósito, porque falta de cron não é recusa: cai no
  // caminho da sessão.
  const semCron = assertCronAuth(req)
  if (semCron) {
    // S14-M-14: geocode de itens é domínio Operacional (+Superadmin).
    // Pelo requireAdminApi para herdar a regra de status: 401 só sem sessão,
    // 403 para papel errado — antes esta rota devolvia 401 nos dois casos.
    const { error } = await requireAdminApi("ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")
    if (error) return error
  }

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return NextResponse.json({ error: "NEXT_PUBLIC_MAPBOX_TOKEN não configurado" }, { status: 500 })
  }

  // S14-M-18: filtra no banco (não carrega TODOS os itens em memória) e processa
  // em lote limitado — cada chamada geocodifica até BATCH_SIZE itens, respeitando
  // o maxDuration de 60s + a pausa de 120ms/req da Mapbox. Reexecutar a rota
  // processa o próximo lote (hasMore indica que ainda restam itens).
  // Item.latitude/longitude são Float NÃO-nulos; o sentinela de "sem coordenadas"
  // é 0,0 (mesmo critério do create em app/api/items/route.ts) — o antigo filtro
  // `== null` em JS nunca casava (no-op latente).
  const BATCH_SIZE = 40  // até 3 consultas Mapbox por item (CEP → bairro → cidade, 4 s cada no máximo)
  const todos  = req.nextUrl.searchParams.get("todos") === "1"
  const depois = req.nextUrl.searchParams.get("depois")
  const filtro = !todos ? { OR: [{ latitude: 0 }, { longitude: 0 }] }
               : depois ? { id: { gt: depois } }
               : {}
  const items = await prisma.item.findMany({
    where:   { deletedAt: null, ...filtro },
    select:  { id: true, neighborhood: true, city: true, state: true },
    orderBy: { id: "asc" },
    take:    BATCH_SIZE,
  })

  if (items.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "Nenhum item a geocodificar." })
  }

  // geocodeItem grava lat/lng e o status (OK / PENDING / FAILED) do próprio item.
  for (const item of items) {
    await geocodeItem(item.id, { neighborhood: item.neighborhood, city: item.city, state: item.state })
    // Pequena pausa para não estourar rate limit da Mapbox (free tier: 600 req/min)
    await new Promise((r) => setTimeout(r, 120))
  }

  const hasMore = items.length === BATCH_SIZE
  const ultimo  = items[items.length - 1].id
  console.warn(`[geocode-items] processed=${items.length} todos=${todos} hasMore=${hasMore}`)
  return NextResponse.json({ ok: true, processed: items.length, hasMore, ...(todos && hasMore && { depois: ultimo }) })
}
