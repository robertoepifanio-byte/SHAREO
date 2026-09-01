import { cryptoKeyStatus } from "@/lib/crypto"

/** Fixa o vocabulário que o /api/health devolve. Racional em lib/crypto.ts. */
describe("cryptoKeyStatus", () => {
  const HEX32_A = "a".repeat(64)
  const HEX32_B = "b".repeat(64)
  const original = { enc: process.env.ENCRYPTION_KEY, hmac: process.env.HMAC_KEY }

  function set(enc?: string, hmac?: string) {
    if (enc === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = enc
    if (hmac === undefined) delete process.env.HMAC_KEY
    else process.env.HMAC_KEY = hmac
  }

  afterAll(() => set(original.enc, original.hmac))

  it("reporta ok/ok quando as duas existem e são DISTINTAS (config de produção)", () => {
    set(HEX32_A, HEX32_B)
    expect(cryptoKeyStatus()).toEqual({ encryption: "ok", hmac: "ok" })
  })

  it("chama de igual-a-encryption quando HMAC_KEY repete o valor da outra", () => {
    // Não é erro de execução — é a config que o .env.example manda evitar em
    // banco novo: vazar a chave AES comprometeria também o índice de documento.
    set(HEX32_A, HEX32_A)
    expect(cryptoKeyStatus().hmac).toBe("igual-a-encryption")
  })

  it("trata HMAC_KEY vazia como o fallback documentado, não como ausência", () => {
    set(HEX32_A, "")
    expect(cryptoKeyStatus()).toEqual({ encryption: "ok", hmac: "igual-a-encryption" })
  })

  it("acusa ausente quando nenhuma das duas chegou ao runtime", () => {
    set(undefined, undefined)
    expect(cryptoKeyStatus()).toEqual({ encryption: "ausente", hmac: "ausente" })
  })

  it("acusa tamanho-invalido em valor de 64 caracteres NÃO-hex", () => {
    // Buffer.from(_, "hex") trunca em caractere invalido em vez de lançar, então
    // um valor mal colado passaria por "presente" sem esta checagem.
    set("z".repeat(64), HEX32_B)
    expect(cryptoKeyStatus().encryption).toBe("tamanho-invalido")
  })

})
