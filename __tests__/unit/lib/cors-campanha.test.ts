/**
 * @jest-environment node
 *
 * Ambiente node, não jsdom: o helper devolve `Response` do fetch, que o jsdom
 * desta versão não expõe como global (o teste quebra com "Response is not
 * defined"). O código roda em rota de API, que é ambiente node de qualquer forma.
 */

/**
 * A landing da campanha vive em outro domínio e posta leads direto do navegador
 * em /api/founders/leads. Esse CORS é a única porta externa para uma rota que
 * grava DADO PESSOAL e consome cota de e-mail.
 *
 * O erro que estes testes existem para impedir: liberar `*` (ou casar origem por
 * `startsWith`/`includes`), o que deixaria qualquer site postar lead em nome do
 * ShareO.
 *
 * O módulo lê a env no import, então cada caso reimporta com `resetModules`.
 */

const ORIGEM_OK = "https://campanha.shareo.com.br"

async function carregar(origins: string | undefined) {
  jest.resetModules()
  if (origins === undefined) delete process.env.CAMPANHA_ORIGINS
  else process.env.CAMPANHA_ORIGINS = origins
  return import("@/lib/cors-campanha")
}

const envOriginal = process.env.CAMPANHA_ORIGINS
afterAll(() => {
  if (envOriginal === undefined) delete process.env.CAMPANHA_ORIGINS
  else process.env.CAMPANHA_ORIGINS = envOriginal
})

describe("origemPermitida", () => {
  it("aceita origem exatamente listada", async () => {
    const { origemPermitida } = await carregar(ORIGEM_OK)
    expect(origemPermitida(ORIGEM_OK)).toBe(ORIGEM_OK)
  })

  it("aceita várias origens separadas por vírgula, ignorando espaços", async () => {
    const { origemPermitida } = await carregar(` ${ORIGEM_OK} , https://shareo.com.br `)
    expect(origemPermitida("https://shareo.com.br")).toBe("https://shareo.com.br")
    expect(origemPermitida(ORIGEM_OK)).toBe(ORIGEM_OK)
  })

  it("normaliza barra final dos dois lados", async () => {
    const { origemPermitida } = await carregar(`${ORIGEM_OK}/`)
    expect(origemPermitida(`${ORIGEM_OK}/`)).toBeTruthy()
    expect(origemPermitida(ORIGEM_OK)).toBeTruthy()
  })

  it("recusa origem ausente", async () => {
    const { origemPermitida } = await carregar(ORIGEM_OK)
    expect(origemPermitida(null)).toBeNull()
  })

  it("sem CAMPANHA_ORIGINS não libera nada", async () => {
    const { origemPermitida } = await carregar(undefined)
    expect(origemPermitida(ORIGEM_OK)).toBeNull()
  })

  it.each([
    ["https://campanha.shareo.com.br.evil.com", "sufixo coladinho"],
    ["https://evil.com/campanha.shareo.com.br", "origem como caminho"],
    ["http://campanha.shareo.com.br", "esquema http em vez de https"],
    ["https://sub.campanha.shareo.com.br", "subdomínio a mais"],
    ["null", "origem opaca de sandbox"],
    ["*", "curinga"],
  ])("recusa %s (%s)", async (origem) => {
    const { origemPermitida } = await carregar(ORIGEM_OK)
    expect(origemPermitida(origem)).toBeNull()
  })
})

describe("corsHeaders", () => {
  it("ecoa a origem concreta e nunca curinga", async () => {
    const { corsHeaders } = await carregar(ORIGEM_OK)
    const h = corsHeaders(ORIGEM_OK)
    expect(h["Access-Control-Allow-Origin"]).toBe(ORIGEM_OK)
    expect(Object.values(h)).not.toContain("*")
  })

  it("declara Vary: Origin — sem isso um CDN serve o cabeçalho de outra origem", async () => {
    const { corsHeaders } = await carregar(ORIGEM_OK)
    expect(corsHeaders(ORIGEM_OK).Vary).toBe("Origin")
  })
})

describe("comCors", () => {
  it("aplica cabeçalhos quando a origem está na allowlist", async () => {
    const { comCors } = await carregar(ORIGEM_OK)
    const res = comCors(new Response("ok"), ORIGEM_OK)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEM_OK)
  })

  it("não aplica nada para origem estranha — a resposta sai sem CORS", async () => {
    const { comCors } = await carregar(ORIGEM_OK)
    const res = comCors(new Response("ok"), "https://evil.com")
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })

  it("preserva o status original (inclusive de erro)", async () => {
    const { comCors } = await carregar(ORIGEM_OK)
    const res = comCors(new Response("erro", { status: 429 }), ORIGEM_OK)
    expect(res.status).toBe(429)
    // 429 precisa de CORS também: sem os cabeçalhos, o fetch do navegador cai no
    // catch como "erro de conexão" e o visitante nunca vê o motivo real.
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEM_OK)
  })
})

describe("respostaPreflight", () => {
  it("204 com cabeçalhos para origem permitida", async () => {
    const { respostaPreflight } = await carregar(ORIGEM_OK)
    const res = respostaPreflight(ORIGEM_OK)
    expect(res.status).toBe(204)
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST")
  })

  it("403 sem cabeçalhos para origem não listada", async () => {
    const { respostaPreflight } = await carregar(ORIGEM_OK)
    const res = respostaPreflight("https://evil.com")
    expect(res.status).toBe(403)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})
