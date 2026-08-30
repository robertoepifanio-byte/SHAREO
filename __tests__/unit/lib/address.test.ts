/** @jest-environment node */
/**
 * Testes unitários de fetchAddressByCep (lib/forms/address.ts).
 *
 * Por que existe: o helper é compartilhado por três telas do site e pelo
 * espelho no app. Os callers têm catch, mas o timeout era silencioso — a
 * promise nunca resolvia, deixando a tela travada em "loading". Este arquivo
 * garante os quatro desfechos: sucesso, CEP inexistente, falha de rede e
 * timeout.
 *
 * Prova de captura: mude VIACEP_TIMEOUT_MS para 9_999_999 no helper e o teste
 * "timeout" reprovará porque `jest.advanceTimersByTime(5500)` não chega a
 * disparar o abort.
 */
import { fetchAddressByCep } from "@/lib/forms/address"

const VIACEP_OK = {
  logradouro: "Rua Pais Leme",
  bairro:     "Pinheiros",
  localidade: "São Paulo",
  uf:         "SP",
}

/**
 * Mock de fetch que responde ao AbortSignal — necessário para o teste de
 * timeout. Sem o listener no signal, `controller.abort()` não causaria rejeição
 * e o teste travaria esperando por uma promise que nunca resolve.
 */
function mockFetch(resposta: unknown, { falhar = false, semResposta = false } = {}) {
  global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
    if (falhar) return Promise.reject(new Error("sem rede"))

    if (semResposta) {
      // Simula ViaCEP aceitando a conexão mas sem responder — o cenário de timeout.
      return new Promise<never>((_, reject) => {
        const signal = init?.signal as AbortSignal | undefined
        if (signal) {
          const rejeitar = () =>
            reject(Object.assign(new Error("The user aborted a request."), { name: "AbortError" }))
          if (signal.aborted) { rejeitar(); return }
          signal.addEventListener("abort", rejeitar)
        }
      })
    }

    return Promise.resolve({
      ok:   true,
      json: async () => resposta,
    })
  }) as unknown as typeof fetch
}

afterEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
})

describe("fetchAddressByCep", () => {
  it("retorna o endereço quando o ViaCEP responde com sucesso", async () => {
    mockFetch(VIACEP_OK)
    const result = await fetchAddressByCep("05424-150")

    expect(result).toEqual({
      street:       "Rua Pais Leme",
      neighborhood: "Pinheiros",
      city:         "São Paulo",
      state:        "SP",
    })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/05424150/json/",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it("retorna null quando o CEP não existe (data.erro)", async () => {
    mockFetch({ erro: true })
    expect(await fetchAddressByCep("99999999")).toBeNull()
  })

  it("retorna null para CEP com menos de 8 dígitos — sem chamar fetch", async () => {
    mockFetch(VIACEP_OK)
    expect(await fetchAddressByCep("1234")).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("lança quando o ViaCEP está fora do ar (falha de rede)", async () => {
    mockFetch(null, { falhar: true })
    await expect(fetchAddressByCep("05424150")).rejects.toThrow("sem rede")
  })

  it("lança após 5 s quando o ViaCEP aceita a conexão mas não responde", async () => {
    jest.useFakeTimers()
    mockFetch(null, { semResposta: true })

    const promise = fetchAddressByCep("05424150")

    // Avança além do timeout configurado no helper (5 000 ms).
    jest.advanceTimersByTime(5_500)

    // O abort deve propagar como rejeição da promise.
    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
  })

  it("cancela o timer interno quando a resposta chega antes do timeout", async () => {
    // Garante que clearTimeout é chamado no finally — sem timers pendentes após
    // a resolução, o que traria warning de "async operation" em jest --detectOpenHandles.
    jest.useFakeTimers()
    mockFetch(VIACEP_OK)

    const result = await fetchAddressByCep("05424150")

    expect(result?.city).toBe("São Paulo")
    // Se o timer não tivesse sido cancelado, existiria um handle aberto.
    expect(jest.getTimerCount()).toBe(0)
  })
})
