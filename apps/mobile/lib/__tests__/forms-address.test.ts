// Fonte: __tests__/unit/lib/address.test.ts (site) — espelho do teste do helper.
/**
 * Testes unitários de fetchAddressByCep (apps/mobile/lib/forms.ts).
 *
 * Por que existe SEPARADO do teste de tela: o timeout do ViaCEP já era coberto
 * por `screens-captacao-fundador.test.tsx`, mas só ATRAVÉS da tela. Uma
 * refatoração do formulário levaria junto a única prova de que o helper aborta
 * — e o modo de falha é justamente o silencioso: a promise nunca resolve e a
 * tela fica presa em "loading", sem revelar o preenchimento manual.
 *
 * Espelha os seis casos do lado do site. A paridade entre as duas cópias do
 * helper é o que os PRs de 24/08 fecharam; testes espelhados são o que a
 * mantém, já que o teste de paridade compara texto de tela, não código de lib.
 *
 * Prova de captura: mude VIACEP_TIMEOUT_MS para 9_999_999 e o caso "timeout"
 * reprova — `advanceTimersByTime(5500)` não chega a disparar o abort.
 */
import { fetchAddressByCep } from "../forms"

const VIACEP_OK = {
  logradouro: "Rua Pais Leme",
  bairro:     "Pinheiros",
  localidade: "São Paulo",
  uf:         "SP",
}

/**
 * Mock de fetch que RESPEITA o AbortSignal — sem o listener, `controller.abort()`
 * não rejeitaria nada e o teste de timeout travaria esperando para sempre.
 */
function mockFetch(resposta: unknown, { falhar = false, semResposta = false } = {}) {
  global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
    if (falhar) return Promise.reject(new Error("sem rede"))

    if (semResposta) {
      // ViaCEP aceita a conexão e não responde — o cenário que travava a tela.
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

    return Promise.resolve({ ok: true, json: async () => resposta })
  }) as unknown as typeof fetch
}

afterEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
})

describe("fetchAddressByCep (app)", () => {
  it("retorna o endereço quando o ViaCEP responde", async () => {
    mockFetch(VIACEP_OK)

    expect(await fetchAddressByCep("05424-150")).toEqual({
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

  it("lança quando o ViaCEP está fora do ar", async () => {
    mockFetch(null, { falhar: true })

    await expect(fetchAddressByCep("05424150")).rejects.toThrow("sem rede")
  })

  it("lança após 5 s quando o ViaCEP aceita a conexão e não responde", async () => {
    jest.useFakeTimers()
    mockFetch(null, { semResposta: true })

    const promise = fetchAddressByCep("05424150")
    jest.advanceTimersByTime(5_500)

    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
  })

  it("cancela o timer quando a resposta chega antes do timeout", async () => {
    jest.useFakeTimers()
    mockFetch(VIACEP_OK)

    const result = await fetchAddressByCep("05424150")

    expect(result?.city).toBe("São Paulo")
    // Timer pendente aqui significaria handle aberto e warning no jest.
    expect(jest.getTimerCount()).toBe(0)
  })
})
