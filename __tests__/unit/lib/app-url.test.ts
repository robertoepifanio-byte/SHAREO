/**
 * @jest-environment node
 *
 * `APP_URL` monta os links dos e-mails e as URLs de retorno do Stripe. O erro que
 * estes testes existem para impedir: a produção sem AUTH_URL cair no fallback do
 * STAGING (em 24/09/2026 `AUTH_URL` e `NEXTAUTH_URL` não existiam no shareo-prod).
 */

const STAGING = "https://shareo-rouge.vercel.app"
const PROD = "https://app.shareo.com.br"
const CHAVES = ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]

// O módulo lê a env no import: cada caso zera as três chaves e reimporta.
async function carregar(env: Record<string, string> = {}) {
  jest.resetModules()
  for (const k of CHAVES) delete process.env[k]
  Object.assign(process.env, env)
  return (await import("@/lib/app-url")).APP_URL
}

describe("APP_URL", () => {
  it("AUTH_URL vence as demais", async () => {
    expect(
      await carregar({ AUTH_URL: PROD, NEXTAUTH_URL: "https://b.example", NEXT_PUBLIC_APP_URL: "https://c.example" }),
    ).toBe(PROD)
  })

  it("NEXTAUTH_URL vale quando não há AUTH_URL", async () => {
    expect(await carregar({ NEXTAUTH_URL: PROD, NEXT_PUBLIC_APP_URL: "https://c.example" })).toBe(PROD)
  })

  it("produção sem AUTH_URL nem NEXTAUTH_URL usa NEXT_PUBLIC_APP_URL, não o staging", async () => {
    expect(await carregar({ NEXT_PUBLIC_APP_URL: PROD })).toBe(PROD)
  })

  it("sem nenhuma das três cai no staging", async () => {
    expect(await carregar()).toBe(STAGING)
  })

  it("variável VAZIA não conta como definida (NEXT_PUBLIC_APP_URL chega '' em build sem secret)", async () => {
    expect(await carregar({ AUTH_URL: "", NEXTAUTH_URL: "", NEXT_PUBLIC_APP_URL: "" })).toBe(STAGING)
    expect(await carregar({ AUTH_URL: "", NEXT_PUBLIC_APP_URL: PROD })).toBe(PROD)
  })

  it("remove barras finais", async () => {
    expect(await carregar({ AUTH_URL: `${PROD}///` })).toBe(PROD)
  })
})
