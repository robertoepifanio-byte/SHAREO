/**
 * @jest-environment node
 *
 * Raio máximo da ordenação "Mais próximos".
 *
 * O que estes testes protegem: o valor vem do banco e é editável pelo admin, mas
 * a busca NÃO pode quebrar por causa disso. Um valor absurdo, ausente ou um banco
 * fora do ar têm que cair no default de 50 km — a vitrine continua de pé.
 */
import { getSearchMaxDistanceKm, SEARCH_MAX_DISTANCE_LIMIT_KM } from "@/lib/platform-config"
import { clearPlatformConfigCache } from "@/lib/platform-config"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: { platformConfig: { findMany: jest.fn() } },
}))

const findMany = prisma.platformConfig.findMany as jest.Mock

const DEFAULT_KM = 50

function comConfig(valor?: string) {
  clearPlatformConfigCache()
  findMany.mockResolvedValue(valor === undefined ? [] : [{ key: "searchMaxDistanceKm", value: valor }])
}

beforeEach(() => jest.clearAllMocks())
afterEach(() => clearPlatformConfigCache())

describe("getSearchMaxDistanceKm", () => {
  it("usa o valor configurado pelo admin", async () => {
    comConfig("25")
    expect(await getSearchMaxDistanceKm()).toBe(25)
  })

  it("cai no default de 50 km quando a chave não existe", async () => {
    comConfig(undefined)
    expect(await getSearchMaxDistanceKm()).toBe(DEFAULT_KM)
  })

  it.each([
    ["0",       "zero esvaziaria o resultado"],
    ["-10",     "negativo"],
    ["abc",     "texto"],
    ["",        "vazio"],
    ["999999",  "acima do limite de sanidade"],
  ])("ignora %s (%s) e usa o default", async (valor) => {
    comConfig(valor)
    expect(await getSearchMaxDistanceKm()).toBe(DEFAULT_KM)
  })

  it("aceita exatamente o limite máximo", async () => {
    comConfig(String(SEARCH_MAX_DISTANCE_LIMIT_KM))
    expect(await getSearchMaxDistanceKm()).toBe(SEARCH_MAX_DISTANCE_LIMIT_KM)
  })

  it("banco fora do ar não derruba a busca — devolve o default", async () => {
    clearPlatformConfigCache()
    findMany.mockRejectedValue(new Error("connection refused"))
    expect(await getSearchMaxDistanceKm()).toBe(DEFAULT_KM)
  })
})
