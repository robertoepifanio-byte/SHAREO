/**
 * geocodeBR — achados do teste D0 (27/09/2026):
 * - "Jardim Monte Kemel, São Paulo" caía na RUA Monte Kemel (~11 km do bairro);
 * - "Centro, Natal, RN" caía no Centro do Rio de Janeiro.
 * Respostas do Mapbox reproduzidas das consultas reais daquele dia.
 */
import { geocodeBR } from "@/lib/geocodeBR"

type F = { center: [number, number]; place_name: string; context?: { id: string; text: string }[] }
const feat = (lng: number, lat: number, place_name: string, cidade?: string): F => ({
  center: [lng, lat], place_name, ...(cidade && { context: [{ id: "place.1", text: cidade }] }),
})

// jsdom não tem AbortSignal.timeout (Node e navegadores têm).
if (!("timeout" in AbortSignal)) Object.assign(AbortSignal, { timeout: () => new AbortController().signal })

const mockFetch = jest.fn()
beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.teste"
})

/** Responde por `types=` da URL; o que não estiver no mapa volta vazio. */
function mapbox(porTipo: Record<string, F[]>) {
  mockFetch.mockImplementation(async (url: string) => {
    const types = new URL(url).searchParams.get("types") ?? ""
    return { json: async () => ({ features: porTipo[types] ?? [] }) }
  })
}
const tiposConsultados = () => mockFetch.mock.calls.map(([u]) => new URL(u as string).searchParams.get("types"))

describe("geocodeBR", () => {
  it("usa o CEP primeiro e não chega a buscar pelo bairro", async () => {
    mapbox({ postcode: [feat(-46.7396, -23.6019, "São Paulo, São Paulo, 05634, Brasil", "São Paulo")] })
    const r = await geocodeBR({ cep: "05634010", neighborhood: "Jardim Monte Kemel", city: "São Paulo", state: "SP" })
    expect(r).toEqual({ lat: -23.6019, lng: -46.7396 })
    expect(tiposConsultados()).toEqual(["postcode"])
  })

  it("busca por bairro NÃO aceita nome de rua (types sem address)", async () => {
    mapbox({ place: [feat(-46.6472, -23.5521, "São Paulo, São Paulo, Brasil", "São Paulo")] })
    await geocodeBR({ neighborhood: "Jardim Monte Kemel", city: "São Paulo", state: "SP" })
    expect(tiposConsultados()).toEqual(["neighborhood,locality", "place"])
  })

  it("descarta resultado de outra cidade (Centro de Natal não vira Centro do Rio)", async () => {
    mapbox({
      "neighborhood,locality": [
        feat(-43.1772, -22.9064, "Centro, 20020, Rio de Janeiro, Rio de Janeiro, Brasil", "Rio de Janeiro"),
        feat(-35.2079, -5.8055, "Centro, Natal, Rio Grande do Norte, Brasil", "Natal"),
      ],
    })
    const r = await geocodeBR({ neighborhood: "Centro", city: "Natal", state: "RN" })
    expect(r).toEqual({ lat: -5.8055, lng: -35.2079 })
  })

  it("compara a cidade sem acento e sem caixa", async () => {
    mapbox({ place: [feat(-46.6, -23.5, "Sao Paulo, SP, Brasil", "SAO PAULO")] })
    expect(await geocodeBR({ city: "São Paulo", state: "SP" })).toEqual({ lat: -23.5, lng: -46.6 })
  })

  it("nada na cidade → null (sem coordenada errada)", async () => {
    mapbox({ place: [feat(-43.1, -22.9, "Rio de Janeiro, Brasil", "Rio de Janeiro")] })
    expect(await geocodeBR({ city: "Natal", state: "RN" })).toBeNull()
  })

  it("CEP com máscara ou incompleto: normaliza, ou pula", async () => {
    mapbox({ place: [feat(-46.6, -23.5, "São Paulo, Brasil", "São Paulo")] })
    await geocodeBR({ cep: "056-34", city: "São Paulo", state: "SP" })
    expect(tiposConsultados()).toEqual(["place"])
  })
})
