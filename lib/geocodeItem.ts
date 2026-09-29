import { prisma } from "@/lib/prisma"
import { geocodeBR } from "@/lib/geocodeBR"
import { normalizePlace } from "@/lib/geo/normalize-place"

// Após MAX_ATTEMPTS falhas, o item é marcado FAILED e requer intervenção manual
// via /api/admin/geocode-items.
const MAX_ATTEMPTS = 5

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
  // Sem token não é falha do endereço: sai antes de contar tentativa (senão vira FAILED).
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return

  const current = await prisma.item.findUnique({
    where:  { id: itemId },
    select: { geocodeAttempts: true, owner: { select: { cep: true, neighborhood: true, city: true } } },
  }).catch(() => null)

  if (!current) return  // item removido antes de geocodificar

  // O item não guarda CEP. Quando o anúncio está no endereço do dono (mesmo
  // bairro e cidade), o CEP do dono é o dado mais preciso que temos.
  const mesmo = (a?: string | null, b?: string | null) => normalizePlace(a) === normalizePlace(b)
  const o     = current.owner
  const cep   = o && mesmo(o.city, opts.city) && mesmo(o.neighborhood, opts.neighborhood) ? o.cep : null
  const coords = await geocodeBR({ cep, neighborhood: opts.neighborhood, city: opts.city, state: opts.state })

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
