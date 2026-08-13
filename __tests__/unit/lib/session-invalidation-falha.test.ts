/** @jest-environment node */
/**
 * Invalidação de sessão (SEC-CRIT-04) — comportamento quando o Upstash falha.
 *
 * Arquivo fonte: lib/redis-admin-blocklist.ts
 *
 * A assimetria que este teste fixa:
 *
 *  - LEITURA (`isSessionStale`) falhando é TRANSITÓRIA — a próxima requisição
 *    tenta de novo. Fail-open aqui é uma escolha de disponibilidade defensável:
 *    fail-closed derrubaria todas as sessões a cada blip do Upstash.
 *  - ESCRITA (`invalidateUserSessions`) falhando é PERMANENTE — o epoch nunca é
 *    gravado e nada volta a tentar. Um blip exatamente durante a troca de senha
 *    deixa o token roubado válido pelos 30 dias do maxAge, enquanto o usuário
 *    acredita ter encerrado as outras sessões.
 *
 * Por isso a escrita passou a retentar e a DEVOLVER o resultado; a leitura
 * segue fail-open de propósito, e o teste fixa isso para ninguém "endurecer"
 * sem perceber o custo.
 */
const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch

const envOriginal = { ...process.env }

async function carregarModulo() {
  let mod: typeof import("@/lib/redis-admin-blocklist")
  await jest.isolateModulesAsync(async () => {
    mod = await import("@/lib/redis-admin-blocklist")
  })
  return mod!
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...envOriginal }
  process.env.UPSTASH_REDIS_REST_URL   = "https://upstash.exemplo"
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-de-teste"
  jest.spyOn(console, "warn").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterAll(() => { process.env = envOriginal })

describe("invalidateUserSessions — escrita do epoch", () => {
  it("true quando grava", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: "OK" }) })
    const { invalidateUserSessions } = await carregarModulo()
    await expect(invalidateUserSessions("u1")).resolves.toBe(true)
  })

  it("retenta uma vez antes de desistir", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })                       // 1ª falha
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: "OK" }) }) // 2ª ok
    const { invalidateUserSessions } = await carregarModulo()
    await expect(invalidateUserSessions("u1")).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("FALSE quando as duas tentativas falham — o defeito que este PR corrige", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    const { invalidateUserSessions } = await carregarModulo()
    await expect(invalidateUserSessions("u1")).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("FALSE, sem tentar, quando o Upstash nem está configurado", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const { invalidateUserSessions } = await carregarModulo()
    await expect(invalidateUserSessions("u1")).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("registra a falha como error, não como warn — é perda permanente", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    const { invalidateUserSessions } = await carregarModulo()
    await invalidateUserSessions("u1")
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/FALHOU após 2 tentativas/))
  })
})

describe("isSessionStale — leitura permanece fail-open DE PROPÓSITO", () => {
  it("não considera a sessão obsoleta quando o Upstash falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    const { isSessionStale } = await carregarModulo()
    // Fail-closed aqui derrubaria TODAS as sessões a cada blip do Upstash.
    // Se algum dia isso mudar, que seja por decisão explícita — não por acidente.
    await expect(isSessionStale("u1", 1_700_000_000)).resolves.toBe(false)
  })

  it("não considera obsoleta quando o token não tem loginAt (emitido antes do recurso)", async () => {
    const { isSessionStale } = await carregarModulo()
    await expect(isSessionStale("u1", undefined)).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("considera obsoleta quando loginAt é anterior ao epoch gravado", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: "1700000500" }) })
    const { isSessionStale } = await carregarModulo()
    await expect(isSessionStale("u1", 1_700_000_000)).resolves.toBe(true)
  })

  it("não considera obsoleta quando loginAt é posterior ao epoch", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: "1700000000" }) })
    const { isSessionStale } = await carregarModulo()
    await expect(isSessionStale("u1", 1_700_000_500)).resolves.toBe(false)
  })
})
