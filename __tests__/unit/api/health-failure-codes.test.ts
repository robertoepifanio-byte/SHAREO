/** @jest-environment node */
import { codigoDeFalha, codigoDeFalhaStorage } from "@/lib/health/failure-codes"

/** Estes códigos são a única informação de diagnóstico que sobra em produção
 *  (a mensagem crua é dev-only). Racional em lib/health/failure-codes.ts. */
describe("codigoDeFalhaStorage", () => {
  it.each([
    ["supabaseUrl is required.",                         "NO_SUPABASE_URL"],
    ["supabaseKey is required.",                         "NO_SERVICE_ROLE_KEY"],
    ["Bucket not found",                                 "BUCKET_NOT_FOUND"],
    ["Invalid API key",                                  "BAD_SERVICE_ROLE_KEY"],
    ["invalid JWT: unable to parse or verify signature", "BAD_SERVICE_ROLE_KEY"],
    ["fetch failed",                                     "UNREACHABLE"],
    ["getaddrinfo ENOTFOUND abc.supabase.co",            "UNREACHABLE"],
  ])("classifica %s", (msg, esperado) => {
    expect(codigoDeFalhaStorage(new Error(msg))).toBe(esperado)
  })

  it("sem correspondência, entrega a mensagem SEM identificador de infra", () => {
    // A 1ª versão devolvia só "DESCONHECIDO" — e foi isso que a produção
    // respondeu em 01/09/2026: um rótulo tão pouco informativo quanto o
    // `storage: "error"` que ele existia para explicar. Esconder a mensagem
    // não protegia nada; o que precisa sair é o identificador de infra.
    const code = codigoDeFalhaStorage(
      new Error("algo estranho em https://jdxdndrhjxtkaifbpagr.supabase.co/storage/v1 para admin@shareo.com.br"),
    )
    expect(code).toContain("DESCONHECIDO")
    expect(code).toContain("algo estranho")
    expect(code).not.toContain("jdxdndrhjxtkaifbpagr")
    expect(code).not.toContain("supabase.co")
    expect(code).not.toContain("admin@shareo.com.br")
  })

  it("remove o host mesmo quando aparece sem URL completa", () => {
    const code = codigoDeFalhaStorage(new Error("erro em jdxdndrhjxtkaifbpagr.supabase.co"))
    expect(code).not.toContain("jdxdndrhjxtkaifbpagr")
    expect(code).toContain("[host]")
  })

  it("corta mensagem longa para não inflar a resposta pública", () => {
    const code = codigoDeFalhaStorage(new Error("x".repeat(500)))
    expect(code.length).toBeLessThanOrEqual("DESCONHECIDO: ".length + 200)
  })

  it("aceita valor lançado que não é Error", () => {
    expect(codigoDeFalhaStorage("Bucket not found")).toBe("BUCKET_NOT_FOUND")
  })
})

/**
 * O classificador do banco existia desde sempre dentro do route.ts, onde o App
 * Router impede export — e por isso nunca teve teste. Sair para lib/ deu a
 * cobertura de graça.
 */
describe("codigoDeFalha (banco)", () => {
  it("prefere o código do Prisma quando ele vem no erro", () => {
    expect(codigoDeFalha(Object.assign(new Error("qualquer coisa"), { code: "P1001" }))).toBe("P1001")
  })

  it("acha o código no texto quando não vem no objeto", () => {
    expect(codigoDeFalha(new Error("Error P2021: tabela não existe"))).toBe("P2021")
  })

  it("reconhece a variável ausente no runtime", () => {
    expect(codigoDeFalha(new Error("DATABASE_URL not configured"))).toBe("NO_DATABASE_URL")
  })

  it("REMOVE a credencial da mensagem sem código", () => {
    // Este caminho cai para a mensagem crua e é exposto em produção, então o
    // escrub e a unica coisa entre o log e a senha do banco.
    const code = codigoDeFalha(new Error("connect failed: postgresql://postgres.abc:senhaSecreta@host:5432/db"))
    expect(code).not.toContain("senhaSecreta")
    expect(code).toContain("//***:***@")
    // Mantém o protocolo legível: a mensagem mais útil do Prisma é justamente
    // "the URL must start with the protocol `postgresql://`".
    expect(code).toContain("postgresql://")
  })

  it("descarta o cabeçalho genérico do Prisma, que não diz a causa", () => {
    const code = codigoDeFalha(new Error("Invalid `prisma.user.findMany()` invocation:\nCausa util aqui"))
    expect(code).not.toContain("invocation")
    expect(code).toContain("Causa util aqui")
  })
})
