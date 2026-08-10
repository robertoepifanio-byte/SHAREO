// Regressão do gate de pré-lançamento no app.
//
// Em 07/08 o app mostrava "Nenhum item encontrado" contra o staging com 606
// itens no banco: /api/items respondia 503 {"error":{"code":"PRELAUNCH"}} e o
// apiFetch descartava o `code`, então a tela não tinha como distinguir "a API
// recusou" de "a busca não retornou nada".
//
// Importa mais para o D4 do que para o staging: quando o gate subir em
// produção, todo usuário com o app instalado receberia este 503.

import { apiFetch, clearTokens, saveTokens, ApiError, isPrelaunchError } from "../api"

const fetchMock = () => globalThis.fetch as unknown as jest.Mock

beforeEach(async () => {
  await clearTokens()
  ;(globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn()
})

describe("apiFetch preserva status e code do corpo de erro", () => {
  it("503 PRELAUNCH vira ApiError com code preenchido", async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: { code: "PRELAUNCH", message: "Indisponível durante o pré-lançamento." },
      }),
    })

    const err = await apiFetch("/api/items").catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe("PRELAUNCH")
    expect((err as ApiError).status).toBe(503)
  })

  it("mantém a mensagem intacta — telas que fazem sniffing de string seguem funcionando", async () => {
    // app/reservas/[id].tsx testa msg.includes("NOT_FOUND"). Este teste existe
    // para que a introdução do ApiError não quebre esse comportamento por acidente.
    fetchMock().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: "NOT_FOUND", message: "Reserva NOT_FOUND" } }),
    })

    const err = await apiFetch("/api/bookings/x").catch((e: unknown) => e)

    expect((err as Error).message).toBe("Reserva NOT_FOUND")
    expect((err as ApiError).code).toBe("NOT_FOUND")
  })

  it("corpo sem code deixa code null, sem quebrar", async () => {
    fetchMock().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    const err = await apiFetch("/api/items").catch((e: unknown) => e)

    expect((err as ApiError).code).toBeNull()
    expect((err as ApiError).status).toBe(500)
    expect((err as Error).message).toBe("API 500")
  })

  it("também preserva o code no retry pós-refresh de token", async () => {
    // Caminho fácil de esquecer: o 401 dispara refresh e refaz a chamada, e o
    // erro do RETRY passava por um `new Error(\`API ${status}\`)` separado.
    await saveTokens({ accessToken: "old", refreshToken: "ref" })
    fetchMock()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { accessToken: "novo", refreshToken: "novo-r" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: "PRELAUNCH", message: "Indisponível." } }),
      })

    const err = await apiFetch("/api/items").catch((e: unknown) => e)

    expect((err as ApiError).code).toBe("PRELAUNCH")
    expect((err as ApiError).status).toBe(503)
  })
})

describe("isPrelaunchError", () => {
  it("reconhece o erro do gate", () => {
    expect(isPrelaunchError(new ApiError("x", 503, "PRELAUNCH"))).toBe(true)
  })

  it("reconhece objeto simples com o code — não depende de instanceof", () => {
    // Deliberado: com target ES5 o instanceof de subclasse de Error é traiçoeiro,
    // e o erro pode ter cruzado React Query ou um boundary no caminho.
    expect(isPrelaunchError({ code: "PRELAUNCH" })).toBe(true)
  })

  it.each([
    ["outro código de API", new ApiError("x", 404, "NOT_FOUND")],
    ["erro comum", new Error("falha de rede")],
    ["null", null],
    ["undefined", undefined],
    ["string", "PRELAUNCH"],
  ])("não confunde %s com o gate", (_label, value) => {
    expect(isPrelaunchError(value)).toBe(false)
  })
})
