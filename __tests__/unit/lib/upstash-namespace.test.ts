/**
 * @jest-environment node
 *
 * Racional em `upstashNamespace`, lib/upstash.ts. Um Redis falso COMPARTILHADO
 * entre os casos faz o papel do Redis único; o que muda de um ambiente para o
 * outro é só NEXT_PUBLIC_SUPABASE_URL.
 */

// Só o rate limit usa estes pacotes; o mock captura as opções do construtor.
const mockOpcoes: Array<Record<string, unknown>> = []
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: jest.fn() } }))
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = jest.fn()
    constructor(opcoes: Record<string, unknown>) { mockOpcoes.push(opcoes) }
    limit = jest.fn(async () => ({ success: true, remaining: 1, reset: 0 }))
  },
}))

import { incrementViewCount, pendingItemsSetKey, pendingCountKey } from "@/lib/viewCounter"
import { incrementFunnelEvent, readFunnelCounts } from "@/lib/founderFunnel"
import { upstashNamespace } from "@/lib/upstash"

const PROD    = "https://jdxdndrhjxtkaifbpagr.supabase.co"
const STAGING = "https://zythygwvmrwrqmnrdufq.supabase.co"

function ambiente(supabaseUrl?: string) {
  if (supabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
}

const redis = { valores: new Map<string, string>(), conjuntos: new Map<string, Set<string>>() }

function executar(cmd: string[]): unknown {
  const [op, chave, ...resto] = cmd
  switch (op) {
    case "INCR": {
      const n = Number(redis.valores.get(chave) ?? 0) + 1
      redis.valores.set(chave, String(n))
      return n
    }
    case "GET":
      return redis.valores.get(chave) ?? null
    case "SADD": {
      const s = redis.conjuntos.get(chave) ?? new Set<string>()
      resto.forEach((m) => s.add(m))
      redis.conjuntos.set(chave, s)
      return 1
    }
    case "SMEMBERS":
      return [...(redis.conjuntos.get(chave) ?? [])]
    default:
      throw new Error(`comando não previsto no Redis falso: ${op}`)
  }
}

beforeEach(() => {
  redis.valores.clear()
  redis.conjuntos.clear()
  process.env.UPSTASH_REDIS_REST_URL = "https://exemplo.upstash.io"
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-de-teste"
  global.fetch = jest.fn(async (_url: unknown, init?: { body?: string }) => ({
    ok: true,
    status: 200,
    json: async () => ({ result: executar(JSON.parse(init?.body ?? "[]")) }),
  })) as unknown as typeof fetch
})

describe("upstashNamespace", () => {
  it("usa o ref do projeto Supabase: um por banco", () => {
    ambiente(PROD)
    expect(upstashNamespace()).toBe("jdxdndrhjxtkaifbpagr")
    ambiente(STAGING)
    expect(upstashNamespace()).toBe("zythygwvmrwrqmnrdufq")
  })

  it("ignora espaço e quebra de linha nas pontas (chegam do painel sem aviso)", () => {
    ambiente(`  ${PROD}\n`)
    expect(upstashNamespace()).toBe("jdxdndrhjxtkaifbpagr")
  })

  it.each([
    ["ausente", undefined],
    ["vazia", ""],
    ["fora do Supabase", "https://exemplo.com.br"],
  ])("cai em 'local' quando a URL é %s", (_nome, url) => {
    ambiente(url)
    expect(upstashNamespace()).toBe("local")
  })
})

describe("contador de views (viewCounter + cron de flush)", () => {
  it("a produção não enxerga nem consome as views pendentes do staging", async () => {
    ambiente(STAGING)
    await incrementViewCount("item-do-staging")

    // É exatamente o que o cron de flush da produção lê antes do GETDEL.
    ambiente(PROD)
    expect(executar(["SMEMBERS", pendingItemsSetKey()])).toEqual([])
    expect(redis.valores.get(pendingCountKey("item-do-staging"))).toBeUndefined()

    ambiente(STAGING)
    expect(executar(["SMEMBERS", pendingItemsSetKey()])).toEqual(["item-do-staging"])
    expect(redis.valores.get(pendingCountKey("item-do-staging"))).toBe("1")
  })
})

describe("rate limit (@upstash/ratelimit)", () => {
  it("o limite por IP tem prefixo do ambiente, não o compartilhado", async () => {
    ambiente(PROD)
    const { checkRateLimit } = await import("@/lib/rateLimit")

    await checkRateLimit("login:ip:1.2.3.4", 5, 60_000)

    expect(mockOpcoes.at(-1)?.prefix).toBe("jdxdndrhjxtkaifbpagr:@upstash/ratelimit")
  })
})

describe("funil da campanha (founderFunnel)", () => {
  it("o teste feito no staging não soma no funil da produção", async () => {
    ambiente(STAGING)
    await incrementFunnelEvent("view")
    await incrementFunnelEvent("view")

    ambiente(PROD)
    await incrementFunnelEvent("view")

    expect((await readFunnelCounts(1)).view).toBe(1)
    ambiente(STAGING)
    expect((await readFunnelCounts(1)).view).toBe(2)
  })
})
