import { normalizePlace } from "@/lib/geo/normalize-place"

/**
 * Geocodificação de endereço brasileiro (Mapbox) — fonte única para itens,
 * perfil e a rota de admin.
 *
 * 🪤 Achado do teste D0 (27/09/2026): "Jardim Monte Kemel, São Paulo, SP" com
 * `types=...,address` devolvia a *Rua* Monte Kemel (CEP 04155, perto de
 * Congonhas), a ~11 km do bairro; e "Centro, Natal, RN" caía no Centro do Rio.
 * Por isso: (1) o CEP vem primeiro — é o dado mais preciso que temos;
 * (2) busca por bairro não aceita nome de rua; (3) todo resultado precisa
 * estar na cidade informada, senão é descartado.
 */

export interface EnderecoBR {
  cep?:          string | null
  street?:       string | null
  neighborhood?: string | null
  city:          string
  state:         string
}

type Feature = { center: [number, number]; place_name: string; context?: { id: string; text: string }[] }

/** O resultado fica na cidade pedida? Confere o `place` do contexto ou o nome completo. */
function naCidade(f: Feature, alvo: string): boolean {
  const place = f.context?.find((c) => c.id.startsWith("place."))?.text
  return place ? normalizePlace(place) === alvo : (normalizePlace(f.place_name) ?? "").includes(alvo)
}

async function buscar(query: string, types: string, alvo: string, token: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url  = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=BR&language=pt&limit=5&types=${types}`
    // Sem timeout, uma resposta presa estoura o lote da rota de admin (60 s).
    const res  = await fetch(url, { signal: AbortSignal.timeout(4000) })
    const data = await res.json() as { features?: Feature[] }
    const feat = data.features?.find((f) => naCidade(f, alvo))
    if (!feat) return null
    const [lng, lat] = feat.center
    return { lat, lng }
  } catch {
    return null
  }
}

/** Tenta CEP → rua → bairro → cidade; devolve o primeiro acerto dentro da cidade. */
export async function geocodeBR(e: EnderecoBR): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  const city   = e.city.trim()
  const alvo   = normalizePlace(city) ?? ""
  const sufixo = `${city}, ${e.state.trim()}, Brasil`
  const cep    = e.cep?.replace(/\D/g, "")
  const bairro = e.neighborhood?.trim()
  const rua    = e.street?.trim()

  return (
    (cep?.length === 8 && await buscar(`${cep.slice(0, 5)}-${cep.slice(5)}, ${sufixo}`, "postcode", alvo, token)) ||
    (rua    && await buscar([rua, bairro, sufixo].filter(Boolean).join(", "), "address", alvo, token)) ||
    (bairro && await buscar(`${bairro}, ${sufixo}`, "neighborhood,locality", alvo, token)) ||
    await buscar(sufixo, "place", alvo, token)
  )
}
