/**
 * @jest-environment node
 *
 * `upstashStatus` alimenta `flags.upstash` do /api/health. Racional em
 * lib/upstash.ts. O status fica em variável de módulo: cada caso reimporta com
 * `resetModules`.
 */

const URL_OK = "https://exemplo.upstash.io"
const COM_CHAVES = { UPSTASH_REDIS_REST_URL: URL_OK, UPSTASH_REDIS_REST_TOKEN: "token-de-teste" }

async function carregar(env: Record<string, string> = {}) {
  jest.resetModules()
  for (const k of Object.keys(COM_CHAVES)) delete process.env[k]
  Object.assign(process.env, env)
  return import("@/lib/upstash")
}

function respostaHttp(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

let fetchMock: jest.Mock

beforeEach(() => {
  fetchMock = jest.fn()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => jest.useRealTimers())

describe("upstashStatus", () => {
  it.each([
    ["nenhuma variável", {}],
    ["só a URL", { UPSTASH_REDIS_REST_URL: URL_OK }],
    ["só o token", { UPSTASH_REDIS_REST_TOKEN: "t" }],
    ["token vazio (chega '' do painel)", { ...COM_CHAVES, UPSTASH_REDIS_REST_TOKEN: "" }],
  ])("sem-chave com %s, sem chamar a rede", async (_nome, env) => {
    const { upstashStatus } = await carregar(env)
    expect(await upstashStatus()).toBe("sem-chave")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("ok quando o PING responde PONG, com token, corpo e limite de tempo", async () => {
    fetchMock.mockResolvedValue(respostaHttp(200, { result: "PONG" }))
    const { upstashStatus } = await carregar(COM_CHAVES)

    expect(await upstashStatus()).toBe("ok")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(URL_OK)
    expect(init.headers.Authorization).toBe("Bearer token-de-teste")
    expect(JSON.parse(init.body)).toEqual(["PING"])
    // Sem o `signal`, um Upstash pendurado seguraria o /api/health.
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("erro-401 quando o token é recusado (o defeito de 24/09)", async () => {
    fetchMock.mockResolvedValue(respostaHttp(401))
    const { upstashStatus } = await carregar(COM_CHAVES)
    expect(await upstashStatus()).toBe("erro-401")
  })

  it("erro-rede quando a chamada falha", async () => {
    fetchMock.mockRejectedValue(new Error("fetch failed"))
    const { upstashStatus } = await carregar(COM_CHAVES)
    expect(await upstashStatus()).toBe("erro-rede")
  })

  it("erro-resposta quando responde 200 mas não é PONG", async () => {
    fetchMock.mockResolvedValue(respostaHttp(200, { result: "outra-coisa" }))
    const { upstashStatus } = await carregar(COM_CHAVES)
    expect(await upstashStatus()).toBe("erro-resposta")
  })

  it("chamadas SIMULTÂNEAS dividem um único PING (rajada no health não vira rajada de comandos)", async () => {
    fetchMock.mockResolvedValue(respostaHttp(200, { result: "PONG" }))
    const { upstashStatus } = await carregar(COM_CHAVES)

    const resultados = await Promise.all([upstashStatus(), upstashStatus(), upstashStatus()])

    expect(resultados).toEqual(["ok", "ok", "ok"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("lembra o resultado por 5 min e depois pergunta de novo", async () => {
    fetchMock.mockResolvedValue(respostaHttp(200, { result: "PONG" }))
    const { upstashStatus } = await carregar(COM_CHAVES)
    jest.useFakeTimers()

    await upstashStatus()
    jest.advanceTimersByTime(299_000)
    await upstashStatus()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(2_000)
    await upstashStatus()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
