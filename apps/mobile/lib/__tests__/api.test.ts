import { getTokens, saveTokens, clearTokens, apiFetch } from "../api"

// expo-secure-store é mockado em jest.setup.js (Map em memória).

describe("tokens (SecureStore)", () => {
  beforeEach(async () => {
    await clearTokens()
  })

  it("getTokens retorna null quando não há nada armazenado", async () => {
    expect(await getTokens()).toBeNull()
  })

  it("saveTokens persiste e getTokens lê de volta", async () => {
    await saveTokens({ accessToken: "a1", refreshToken: "r1" })
    expect(await getTokens()).toEqual({ accessToken: "a1", refreshToken: "r1" })
  })

  it("clearTokens remove os tokens", async () => {
    await saveTokens({ accessToken: "a1", refreshToken: "r1" })
    await clearTokens()
    expect(await getTokens()).toBeNull()
  })
})

describe("apiFetch", () => {
  beforeEach(async () => {
    await clearTokens()
    ;(globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn()
  })

  it("envia Authorization quando há token e retorna o JSON", async () => {
    await saveTokens({ accessToken: "tok", refreshToken: "ref" })
    const fetchMock = globalThis.fetch as unknown as jest.Mock
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: 42 }) })

    const result = await apiFetch<{ data: number }>("/api/users/me")

    expect(result).toEqual({ data: 42 })
    const [, init] = fetchMock.mock.calls[0]
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok")
  })

  it("faz refresh e retenta quando recebe 401", async () => {
    await saveTokens({ accessToken: "old", refreshToken: "ref" })
    const fetchMock = globalThis.fetch as unknown as jest.Mock
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })          // 1ª chamada → 401
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { accessToken: "new", refreshToken: "ref2" } }) }) // refresh
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: "ok" }) }) // retry

    const result = await apiFetch<{ data: string }>("/api/protected")

    expect(result).toEqual({ data: "ok" })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    // o token novo foi persistido
    expect(await getTokens()).toEqual({ accessToken: "new", refreshToken: "ref2" })
    // o retry usou o token novo
    const [, retryInit] = fetchMock.mock.calls[2]
    expect((retryInit.headers as Record<string, string>).Authorization).toBe("Bearer new")
  })

  it("lança SESSION_EXPIRED e limpa tokens quando o refresh falha", async () => {
    await saveTokens({ accessToken: "old", refreshToken: "ref" })
    const fetchMock = globalThis.fetch as unknown as jest.Mock
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // 401
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // refresh falha

    await expect(apiFetch("/api/protected")).rejects.toThrow("SESSION_EXPIRED")
    expect(await getTokens()).toBeNull()
  })
})
