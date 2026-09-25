/** @jest-environment node */
/**
 * Limite de tentativas do login — por e-mail (web e mobile).
 *
 * Arquivos fonte: app/api/auth/[...nextauth]/route.ts, app/api/auth/mobile/login/route.ts,
 * lib/loginRateLimit.ts
 *
 * Usa o limitador REAL em memória (sem Upstash), não um mock: o que se prova é que
 * as variações do mesmo e-mail caem no mesmo contador. Cada tentativa sai de um IP
 * diferente — é o atacante que troca de rede, e o limite por IP não o segura.
 * Cada teste usa e-mails/IPs próprios: o contador vive no módulo e atravessa os testes.
 */

import { NextRequest } from "next/server"
import { POST as webPOST } from "@/app/api/auth/[...nextauth]/route"
import { POST as mobilePOST } from "@/app/api/auth/mobile/login/route"
import { RATE_LIMITS } from "@/lib/rateLimit"

// Os pacotes @upstash/* são ESM-only: mockados como no teste do rateLimit.
jest.mock("@upstash/redis", () => ({
  Redis: { fromEnv: jest.fn() },
}))
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = jest.fn()
    limit = jest.fn()
  },
}))

const mockNextAuthPost = jest.fn()
jest.mock("@/lib/auth", () => ({
  handlers: {
    GET:  jest.fn(),
    POST: (...args: unknown[]) => mockNextAuthPost(...args),
  },
}))

const mockFindUnique = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) } },
}))

const mockCompare = jest.fn()
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { compare: (...args: unknown[]) => mockCompare(...args) },
}))

const LIMITE_EMAIL = RATE_LIMITS.loginEmail.limit

beforeAll(() => {
  // O bypass de teste (lib/rateLimit.ts) não pode estar ligado aqui.
  delete process.env.SKIP_RATE_LIMIT
  delete process.env.E2E_SECRET
  delete process.env.E2E_BYPASS_DISABLED
  process.env.AUTH_SECRET = "segredo-de-teste-para-jwt-32-caracteres"
})

beforeEach(() => {
  mockNextAuthPost.mockReset()
  mockNextAuthPost.mockResolvedValue(new Response("ok", { status: 200 }))
  mockFindUnique.mockReset()
  mockFindUnique.mockResolvedValue(null)
  mockCompare.mockReset()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let ipSeq = 0
/** IP novo a cada chamada — simula o atacante trocando de rede. */
const novoIp = () => {
  const n = ipSeq++
  return `172.16.${(n >> 8) & 255}.${n & 255}`
}

/** Formas do mesmo e-mail que o login trata como uma conta só (caixa e espaços). */
const FORMAS: Array<(email: string) => string> = [
  (e) => e,
  (e) => e.toUpperCase(),
  (e) => `${e} `,
  (e) => ` ${e}`,
  (e) => `${e}\t`,
]
const variacao = (base: string, i: number) => FORMAS[i % FORMAS.length](base)

/** `email` como lista repete a chave no corpo: o NextAuth fica com a ÚLTIMA. */
function webReq(
  email: string | string[] | undefined,
  opts: { ip?: string; json?: boolean; path?: string } = {},
) {
  const ip   = opts.ip ?? novoIp()
  const path = opts.path ?? "/api/auth/callback/credentials"
  const pares: Array<[string, string]> = [["password", "qualquer"], ["csrfToken", "csrf"]]
  if (email !== undefined) for (const e of [email].flat()) pares.push(["email", e])
  const json = opts.json === true
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": ip,
      "content-type": json ? "application/json" : "application/x-www-form-urlencoded",
    },
    body: json ? JSON.stringify(Object.fromEntries(pares)) : new URLSearchParams(pares).toString(),
  })
}

function mobileReq(body: unknown, ip: string = novoIp(), extra: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/auth/mobile/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json", ...extra },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Login web
// ---------------------------------------------------------------------------

describe("POST /api/auth/callback/credentials (web) — limite por e-mail", () => {
  it("variações de caixa e espaço do mesmo e-mail dividem UMA cota", async () => {
    for (let i = 0; i < LIMITE_EMAIL; i++) {
      const res = await webPOST(webReq(variacao("web-a@exemplo.com", i)))
      expect(res.status).toBe(200)
    }
    expect(mockNextAuthPost).toHaveBeenCalledTimes(LIMITE_EMAIL)

    const bloqueada = await webPOST(webReq("Web-A@exemplo.com  "))
    expect(bloqueada.status).toBe(429)
    expect(mockNextAuthPost).toHaveBeenCalledTimes(LIMITE_EMAIL) // não chegou ao NextAuth
  })

  it("JSON (que o NextAuth também aceita) e formulário do mesmo e-mail dividem UMA cota", async () => {
    // Alterna JSON e formulário: se o JSON passasse batido, a cota não fecharia.
    for (let i = 0; i < LIMITE_EMAIL; i++) {
      const res = await webPOST(webReq(variacao("web-misto@exemplo.com", i), { json: i % 2 === 0 }))
      expect(res.status).toBe(200)
    }
    const bloqueada = await webPOST(webReq("web-misto@exemplo.com", { json: LIMITE_EMAIL % 2 === 0 }))
    expect(bloqueada.status).toBe(429)
    expect(mockNextAuthPost).toHaveBeenCalledTimes(LIMITE_EMAIL)
  })

  it("chave repetida no formulário: conta o e-mail que o NextAuth autentica (o último)", async () => {
    // `email=lixo-N&email=vitima`: o NextAuth (Object.fromEntries) fica com `vitima`.
    // Contar o primeiro daria uma cota nova a cada tentativa.
    for (let i = 0; i < LIMITE_EMAIL; i++) {
      const res = await webPOST(webReq([`lixo-${i}@exemplo.com`, "web-dup@exemplo.com"]))
      expect(res.status).toBe(200)
    }
    const bloqueada = await webPOST(webReq(["lixo-x@exemplo.com", "Web-Dup@exemplo.com "]))
    expect(bloqueada.status).toBe(429)
    expect(mockNextAuthPost).toHaveBeenCalledTimes(LIMITE_EMAIL)
  })

  it("o 429 mantém o formato de sempre (RATE_LIMITED + Retry-After)", async () => {
    for (let i = 0; i < LIMITE_EMAIL; i++) await webPOST(webReq("web-formato@exemplo.com"))
    const res = await webPOST(webReq("web-formato@exemplo.com"))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBeTruthy()
    expect(await res.json()).toEqual({
      error: { code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde um momento e tente novamente." },
    })
  })

  it("e-mails diferentes não dividem cota", async () => {
    for (let i = 0; i < LIMITE_EMAIL; i++) await webPOST(webReq("web-b1@exemplo.com"))
    expect((await webPOST(webReq("web-b1@exemplo.com"))).status).toBe(429)
    expect((await webPOST(webReq("web-b2@exemplo.com"))).status).toBe(200)
  })

  it("sem e-mail (ou e-mail inválido) não aplica cota por e-mail e segue para o NextAuth", async () => {
    for (let i = 0; i < LIMITE_EMAIL + 3; i++) {
      expect((await webPOST(webReq(undefined))).status).toBe(200)
      expect((await webPOST(webReq("nao-e-email"))).status).toBe(200)
    }
    expect(mockNextAuthPost).toHaveBeenCalledTimes((LIMITE_EMAIL + 3) * 2)
  })

  it("corpo ilegível segue para o NextAuth (sem cota por e-mail)", async () => {
    const req = new NextRequest("http://localhost/api/auth/callback/credentials", {
      method: "POST",
      headers: { "x-forwarded-for": novoIp(), "content-type": "application/json" },
      body: "{isso nao e json",
    })
    expect((await webPOST(req)).status).toBe(200)
    expect(mockNextAuthPost).toHaveBeenCalledTimes(1)
  })

  it("outras rotas do NextAuth não passam pelo limite", async () => {
    for (let i = 0; i < 20; i++) {
      const res = await webPOST(webReq("web-outra@exemplo.com", { path: "/api/auth/signout", ip: "198.51.100.7" }))
      expect(res.status).toBe(200)
    }
    expect(mockNextAuthPost).toHaveBeenCalledTimes(20)
  })

  it("o limite por IP continua igual (10/min, com e-mails diferentes)", async () => {
    const ip = "198.51.100.20"
    for (let i = 0; i < RATE_LIMITS.loginIp.limit; i++) {
      expect((await webPOST(webReq(`web-ip-${i}@exemplo.com`, { ip }))).status).toBe(200)
    }
    expect((await webPOST(webReq("web-ip-x@exemplo.com", { ip }))).status).toBe(429)
    expect(mockNextAuthPost).toHaveBeenCalledTimes(RATE_LIMITS.loginIp.limit)
  })
})

// ---------------------------------------------------------------------------
// Login mobile
// ---------------------------------------------------------------------------

describe("POST /api/auth/mobile/login — limite por e-mail", () => {
  it("variações de caixa e espaço do mesmo e-mail dividem UMA cota (IPs diferentes)", async () => {
    for (let i = 0; i < LIMITE_EMAIL; i++) {
      const res = await mobilePOST(mobileReq({ email: variacao("mob-a@exemplo.com", i), password: "errada123" }))
      expect(res.status).toBe(401) // chegou à consulta: ainda dentro da cota
    }
    expect(mockFindUnique).toHaveBeenCalledTimes(LIMITE_EMAIL)

    const bloqueada = await mobilePOST(mobileReq({ email: "Mob-A@exemplo.com  ", password: "errada123" }))
    expect(bloqueada.status).toBe(429)
    expect(mockFindUnique).toHaveBeenCalledTimes(LIMITE_EMAIL) // barrou antes do banco
  })

  it("o 429 é idêntico exista o e-mail ou não (não revela cadastro)", async () => {
    const existente = "mob-existe@exemplo.com"
    const inexistente = "mob-fantasma@exemplo.com"
    mockFindUnique.mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === existente
        ? { id: "u1", email: existente, passwordHash: "hash", isActive: true, deletedAt: null }
        : null,
    )
    mockCompare.mockResolvedValue(false)

    for (const email of [existente, inexistente]) {
      for (let i = 0; i < LIMITE_EMAIL; i++) {
        expect((await mobilePOST(mobileReq({ email, password: "errada123" }))).status).toBe(401)
      }
    }
    const chamadasAntes = mockFindUnique.mock.calls.length

    const r1 = await mobilePOST(mobileReq({ email: existente, password: "errada123" }))
    const r2 = await mobilePOST(mobileReq({ email: inexistente, password: "errada123" }))
    expect(r1.status).toBe(429)
    expect(r2.status).toBe(429)
    expect(await r1.json()).toEqual(await r2.json())
    expect([...r1.headers.keys()].sort()).toEqual([...r2.headers.keys()].sort())
    expect(mockFindUnique.mock.calls.length).toBe(chamadasAntes) // nenhum dos dois tocou no banco
  })

  it("web e mobile dividem a MESMA cota da conta", async () => {
    for (let i = 0; i < 3; i++) await webPOST(webReq(i % 2 ? "MISTO@exemplo.com" : "misto@exemplo.com "))
    for (let i = 0; i < LIMITE_EMAIL - 3; i++) {
      expect((await mobilePOST(mobileReq({ email: " Misto@exemplo.com", password: "x" }))).status).toBe(401)
    }
    expect((await mobilePOST(mobileReq({ email: "misto@exemplo.com", password: "x" }))).status).toBe(429)
    expect((await webPOST(webReq("misto@exemplo.com"))).status).toBe(429)
  })

  it("mantém as mensagens de erro de sempre", async () => {
    // Credencial errada
    const errada = await mobilePOST(mobileReq({ email: "mob-msg@exemplo.com", password: "x" }))
    expect(errada.status).toBe(401)
    expect(await errada.json()).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." },
    })
    // Corpo inválido
    const invalida = await mobilePOST(mobileReq({ email: "nao-e-email", password: "x" }))
    expect(invalida.status).toBe(400)
    expect(await invalida.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "E-mail ou senha inválidos." },
    })
  })

  it("requisição inválida (400) não consome a cota do e-mail", async () => {
    // Sem senha: reprova no schema. Repetir além do limite não pode bloquear o e-mail depois.
    for (let i = 0; i < LIMITE_EMAIL + 2; i++) {
      expect((await mobilePOST(mobileReq({ email: "mob-400@exemplo.com" }))).status).toBe(400)
    }
    expect((await mobilePOST(mobileReq({ email: "mob-400@exemplo.com", password: "x" }))).status).toBe(401)
  })

  it("login correto dentro da cota continua devolvendo os tokens", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u9", email: "mob-ok@exemplo.com", name: "Maria", role: "USER", userType: "PF",
      isVerified: true, avatarUrl: null, city: "Natal", state: "RN",
      passwordHash: "hash", isActive: true, deletedAt: null,
    })
    mockCompare.mockResolvedValue(true)

    const res = await mobilePOST(mobileReq({ email: " MOB-OK@exemplo.com ", password: "Senha1234" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.accessToken).toEqual(expect.any(String))
    expect(json.data.refreshToken).toEqual(expect.any(String))
    expect(json.data.user.passwordHash).toBeUndefined()
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "mob-ok@exemplo.com" } }),
    )
  })

  it("o token E2E dispensa a cota por e-mail, como no web", async () => {
    process.env.E2E_SECRET = "segredo-e2e-de-teste"
    try {
      for (let i = 0; i < LIMITE_EMAIL + 2; i++) {
        const req = mobileReq({ email: "mob-e2e@exemplo.com", password: "x" }, novoIp(), {
          "x-e2e-token": "segredo-e2e-de-teste",
        })
        expect((await mobilePOST(req)).status).toBe(401)
      }
    } finally {
      delete process.env.E2E_SECRET
    }
  })

  it("o limite por IP do mobile continua igual (10/min)", async () => {
    const ip = "198.51.100.99"
    for (let i = 0; i < RATE_LIMITS.mobileLogin.limit; i++) {
      expect((await mobilePOST(mobileReq({ email: `mob-ip-${i}@exemplo.com`, password: "x" }, ip))).status).toBe(401)
    }
    expect((await mobilePOST(mobileReq({ email: "mob-ip-x@exemplo.com", password: "x" }, ip))).status).toBe(429)
  })
})
