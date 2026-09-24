/**
 * @jest-environment node
 */
import crypto from "crypto"
import fs from "fs"
import path from "path"
import type { PrismaClient } from "@prisma/client"
import {
  decryptDocument,
  decryptPII,
  decryptWithKey,
  encryptDocument,
  encryptPII,
  encryptWithKey,
  isWellFormedCiphertext,
} from "@/lib/crypto"
import {
  ENCRYPTED_COLUMNS,
  createPrismaStore,
  rotateValue,
  runRotation,
  safeErrorLabel,
  type EncryptedColumn,
  type RotationStore,
  type RotationUpdate,
} from "@/lib/crypto-rotation"
import {
  checkDatabaseConfirmation,
  connectionFailureHint,
  connectionSummary,
  describeDatabase,
  fingerprintKey,
  formatReport,
  parseRotationArgs,
  resolveRotationKeys,
} from "@/scripts/lib/rotation-cli"

/**
 * Recifragem da ENCRYPTION_KEY — testada com um store falso em memória.
 * NADA aqui toca banco. Que o script funcione contra um banco real continua
 * NÃO comprovado (ver docs/runbook-rotacao-encryption-key.md).
 */

const OLD = crypto.randomBytes(32)
const NEW = crypto.randomBytes(32)
const OTHER = crypto.randomBytes(32)
const SENTINEL = "SEGREDO-NAO-VAZAR-123"

// ─── Store falso ──────────────────────────────────────────────────────────────

class FakeStore implements RotationStore {
  data: Record<EncryptedColumn, Map<string, string | null>> = {
    cpfEncrypted: new Map(),
    cnpjEncrypted: new Map(),
    cnpjResponsavelLegalEncrypted: new Map(),
    totpSecretEnc: new Map(),
  }
  fetchCalls = 0
  applyCalls = 0
  writes = 0
  failApplyOnCall: number | null = null
  failFetchOnCall: number | null = null
  /** Roda antes do commit — simula a aplicação escrevendo entre a leitura e a gravação. */
  beforeApply: ((column: EncryptedColumn, updates: RotationUpdate[]) => void) | null = null

  async fetchBatch(column: EncryptedColumn, afterId: string | null, limit: number) {
    this.fetchCalls++
    if (this.failFetchOnCall === this.fetchCalls) throw new Error(`falha de leitura ${SENTINEL}`)
    return [...this.data[column].entries()]
      .filter(([id, v]) => v !== null && (afterId === null || id > afterId))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .slice(0, limit)
      .map(([id, v]) => ({ id, value: v as string }))
  }

  async applyBatch(column: EncryptedColumn, updates: RotationUpdate[]) {
    this.applyCalls++
    // Lança ANTES de qualquer mutação: emula a transação que não grava nada.
    if (this.failApplyOnCall === this.applyCalls) throw new Error(`deadlock ${SENTINEL} ${updates[0]?.expected}`)
    this.beforeApply?.(column, updates)
    const applied = updates.map((u) => this.data[column].get(u.id) === u.expected)
    updates.forEach((u, i) => {
      if (applied[i]) {
        this.data[column].set(u.id, u.next)
        this.writes++
      }
    })
    return applied
  }

  snapshot(): string {
    return JSON.stringify(Object.fromEntries(Object.entries(this.data).map(([c, m]) => [c, [...m.entries()]])))
  }
}

/** 5 linhas por coluna (`u1`..`u5`), todas cifradas com a chave dada; `nulo` fica null. */
function seed(store: FakeStore, key: Buffer, columns: readonly EncryptedColumn[] = ENCRYPTED_COLUMNS) {
  for (const col of columns) {
    for (let i = 1; i <= 5; i++) store.data[col].set(`u${i}`, encryptWithKey(key, `${col}-valor-${i}-${SENTINEL}`))
    store.data[col].set("nulo", null)
  }
}

const allDecryptWith = (store: FakeStore, key: Buffer, columns: readonly EncryptedColumn[] = ENCRYPTED_COLUMNS) =>
  columns.every((c) =>
    [...store.data[c].values()].every((v) => {
      if (v === null) return true
      try { decryptWithKey(key, v); return true } catch { return false }
    }),
  )

// ─── rotateValue ──────────────────────────────────────────────────────────────

describe("rotateValue", () => {
  it.each([["12345678909"], ["José da Silva Ç"], [""], ["x".repeat(500)]])(
    "recifra e preserva o claro (ida-e-volta): %j",
    (plaintext) => {
      const stored = encryptWithKey(OLD, plaintext)
      const out = rotateValue(stored, OLD, NEW)
      expect(out.kind).toBe("recifrar")
      if (out.kind !== "recifrar") return
      expect(decryptWithKey(NEW, out.next)).toBe(plaintext)
      expect(() => decryptWithKey(OLD, out.next)).toThrow() // a chave vazada deixa de abrir o dado novo
      expect(out.next).not.toBe(stored)
    },
  )

  it("valor que já decifra com a chave nova é pulado (idempotência)", () => {
    expect(rotateValue(encryptWithKey(NEW, "abc"), OLD, NEW)).toEqual({ kind: "ja-na-chave-nova" })
  })

  it.each([
    ["cifrado por uma chave que não é a antiga nem a nova", () => encryptWithKey(OTHER, "abc")],
    ["adulterado (bem formado, mas o tag não confere)", () => {
      const [iv, tag, body] = encryptWithKey(OLD, "12345678909").split(":")
      return `${iv}:${(tag[0] === "0" ? "1" : "0") + tag.slice(1)}:${body}`
    }],
  ])("falha sem tocar no valor: %s", (_nome, make) => {
    expect(rotateValue(make(), OLD, NEW)).toEqual({ kind: "falha", reason: "nenhuma-chave-decifra" })
  })

  it.each([[""], ["invalido"], ["a:b"], ["a:b:c:d"], ["zz:yy:xx"], ["00".repeat(12) + ":" + "00".repeat(8) + ":aa"]])(
    "formato inválido é falha, não exceção: %j",
    (stored) => {
      expect(isWellFormedCiphertext(stored)).toBe(false)
      expect(rotateValue(stored, OLD, NEW)).toEqual({ kind: "falha", reason: "formato-invalido" })
    },
  )

  it("o que encryptWithKey produz é bem formado (fonte única do formato)", () => {
    expect(isWellFormedCiphertext(encryptWithKey(OLD, "12345678909"))).toBe(true)
    expect(isWellFormedCiphertext(encryptWithKey(OLD, ""))).toBe(true)
  })

  it("MORDE: exceção ao cifrar também vira falha, não recifração", () => {
    const quebrada = () => { throw new Error("boom") }
    expect(rotateValue(encryptWithKey(OLD, "1"), OLD, NEW, quebrada)).toEqual({ kind: "falha", reason: "ida-e-volta-divergente" })
  })
})

// ─── Compatibilidade com o que a aplicação escreve/lê ─────────────────────────

describe("compatibilidade com encryptDocument/encryptPII (o que a aplicação usa)", () => {
  const original = process.env.ENCRYPTION_KEY
  afterEach(() => {
    if (original === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = original
  })

  it("dado escrito pela aplicação com a chave antiga é lido pela aplicação com a chave nova", async () => {
    process.env.ENCRYPTION_KEY = OLD.toString("hex")
    const store = new FakeStore()
    store.data.cpfEncrypted.set("a", encryptDocument("123.456.789-09"))
    store.data.cnpjEncrypted.set("a", encryptDocument("12.345.678/0001-95"))
    store.data.cnpjResponsavelLegalEncrypted.set("a", encryptPII("José da Silva"))
    store.data.totpSecretEnc.set("a", encryptPII("JBSWY3DPEHPK3PXP"))

    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true })
    expect(rep.ok).toBe(true)

    process.env.ENCRYPTION_KEY = NEW.toString("hex")
    expect(decryptDocument(store.data.cpfEncrypted.get("a")!)).toBe("12345678909")
    expect(decryptDocument(store.data.cnpjEncrypted.get("a")!)).toBe("12345678000195")
    expect(decryptPII(store.data.cnpjResponsavelLegalEncrypted.get("a")!)).toBe("José da Silva")
    expect(decryptPII(store.data.totpSecretEnc.get("a")!)).toBe("JBSWY3DPEHPK3PXP")

    process.env.ENCRYPTION_KEY = OLD.toString("hex")
    expect(() => decryptDocument(store.data.cpfEncrypted.get("a")!)).toThrow() // a chave antiga não abre mais
  })
})

// ─── runRotation ──────────────────────────────────────────────────────────────

describe("runRotation", () => {
  it("apply: recifra todas as colunas, em vários lotes, e ignora NULL", async () => {
    const store = new FakeStore()
    seed(store, OLD)
    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, batchSize: 2 })

    expect(rep.ok).toBe(true)
    expect(rep.modo).toBe("apply")
    expect(rep.totais).toEqual({ lidos: 20, jaNaChaveNova: 0, recifrados: 20, conflitos: 0, falhos: 0 })
    expect(store.writes).toBe(20)
    expect(allDecryptWith(store, NEW)).toBe(true)
    expect(ENCRYPTED_COLUMNS.every((c) => store.data[c].get("nulo") === null)).toBe(true)
    // 5 linhas em lotes de 2 => 3 lotes com dados + 1 leitura vazia, por coluna
    expect(store.fetchCalls).toBe(4 * 4)
    // o texto claro sobrevive à mudança de chave
    expect(decryptWithKey(NEW, store.data.totpSecretEnc.get("u3")!)).toBe(`totpSecretEnc-valor-3-${SENTINEL}`)
  })

  it("dry-run: não chama applyBatch e não muda um byte, mas relata o que faria", async () => {
    const store = new FakeStore()
    seed(store, OLD)
    const antes = store.snapshot()
    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: false, batchSize: 3 })

    expect(rep.modo).toBe("dry-run")
    expect(store.applyCalls).toBe(0)
    expect(store.writes).toBe(0)
    expect(store.snapshot()).toBe(antes)
    expect(rep.totais.recifrados).toBe(20) // "seriam" recifrados
    expect(rep.ok).toBe(true)
  })

  it("idempotente: a segunda rodada não recifra nem grava nada", async () => {
    const store = new FakeStore()
    seed(store, OLD)
    await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true })
    const depoisDaPrimeira = store.snapshot()
    const escritas = store.writes

    const rep2 = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true })
    expect(rep2.totais).toEqual({ lidos: 20, jaNaChaveNova: 20, recifrados: 0, conflitos: 0, falhos: 0 })
    expect(store.writes).toBe(escritas)
    expect(store.snapshot()).toBe(depoisDaPrimeira)
  })

  it("simétrica: rodar com as chaves TROCADAS devolve tudo à chave antiga (é o caminho de reversão)", async () => {
    const store = new FakeStore()
    seed(store, OLD)
    const claros = ENCRYPTED_COLUMNS.map((c) => decryptWithKey(OLD, store.data[c].get("u1")!))

    await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true })
    expect(allDecryptWith(store, NEW)).toBe(true)
    const volta = await runRotation(store, { oldKey: NEW, newKey: OLD, apply: true })

    expect(volta.ok).toBe(true)
    expect(volta.totais.recifrados).toBe(20)
    expect(allDecryptWith(store, OLD)).toBe(true)
    expect(ENCRYPTED_COLUMNS.map((c) => decryptWithKey(OLD, store.data[c].get("u1")!))).toEqual(claros)
  })

  it("retomável: um lote que falha não grava nada dele; rodar de novo termina o serviço", async () => {
    const store = new FakeStore()
    seed(store, OLD, ["cpfEncrypted"])
    store.failApplyOnCall = 2

    const r1 = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, batchSize: 2, columns: ["cpfEncrypted"] })
    // lote 1 (u1,u2) gravou; lote 2 (u3,u4) falhou inteiro; lote 3 (u5) gravou
    expect(r1.ok).toBe(false)
    expect(r1.totais).toMatchObject({ recifrados: 3, falhos: 2, conflitos: 0 })
    expect(r1.colunas[0].porMotivo).toEqual({ "erro-de-banco": 2 })
    expect(r1.colunas[0].ids.falhas.map((f) => f.id)).toEqual(["u3", "u4"])
    expect(decryptWithKey(NEW, store.data.cpfEncrypted.get("u1")!)).toContain("valor-1")
    expect(() => decryptWithKey(NEW, store.data.cpfEncrypted.get("u3")!)).toThrow() // ficou intacto na chave antiga
    expect(decryptWithKey(OLD, store.data.cpfEncrypted.get("u3")!)).toContain("valor-3")

    store.failApplyOnCall = null
    const r2 = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, columns: ["cpfEncrypted"] })
    expect(r2.ok).toBe(true)
    expect(r2.totais).toMatchObject({ jaNaChaveNova: 3, recifrados: 2, falhos: 0 })
    expect(allDecryptWith(store, NEW, ["cpfEncrypted"])).toBe(true)
  })

  it("falha parcial: linhas boas são recifradas, a ruim fica intacta e sai listada só por id", async () => {
    const store = new FakeStore()
    seed(store, OLD, ["cnpjEncrypted"])
    const alheio = encryptWithKey(OTHER, "cifrado por outra chave")
    store.data.cnpjEncrypted.set("ruim1", alheio)
    store.data.cnpjEncrypted.set("ruim2", "lixo-em-claro")

    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, columns: ["cnpjEncrypted"] })
    expect(rep.ok).toBe(false)
    expect(rep.totais).toMatchObject({ lidos: 7, recifrados: 5, falhos: 2 })
    expect(rep.colunas[0].porMotivo).toEqual({ "nenhuma-chave-decifra": 1, "formato-invalido": 1 })
    expect(rep.colunas[0].ids.falhas.map((f) => f.id).sort()).toEqual(["ruim1", "ruim2"])
    expect(store.data.cnpjEncrypted.get("ruim1")).toBe(alheio)
    expect(store.data.cnpjEncrypted.get("ruim2")).toBe("lixo-em-claro")
  })

  it("chave ANTIGA errada: não corrompe nada, e para ao atingir o limite de falhas", async () => {
    const store = new FakeStore()
    seed(store, OLD, ["cpfEncrypted"])
    const antes = store.snapshot()

    const rep = await runRotation(store, { oldKey: OTHER, newKey: NEW, apply: true, batchSize: 2, maxFailures: 3, columns: ["cpfEncrypted"] })
    expect(rep.ok).toBe(false)
    expect(rep.abortado).toBe("limite-de-falhas")
    expect(rep.totais.recifrados).toBe(0)
    expect(rep.totais.lidos).toBeLessThan(5) // parou antes de varrer tudo
    expect(store.writes).toBe(0)
    expect(store.snapshot()).toBe(antes)
  })

  it("o limite de falhas é GLOBAL: a soma entre as colunas conta, não cada uma isolada", async () => {
    const store = new FakeStore()
    const colunas = ["cpfEncrypted", "cnpjEncrypted", "totpSecretEnc"] as const
    seed(store, OLD, colunas)
    for (const c of colunas) {
      store.data[c].set("ruim1", "lixo")
      store.data[c].set("ruim2", "lixo")
    }

    // 2 falhas por coluna: nenhuma passa de 3 sozinha, mas a soma (4) passa
    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, maxFailures: 3, columns: colunas })
    expect(rep.abortado).toBe("limite-de-falhas")
    expect(rep.colunas.map((c) => c.coluna)).toEqual(["cpfEncrypted", "cnpjEncrypted"]) // a terceira nem foi lida
    expect(rep.totais.falhos).toBe(4)
  })

  it("conflito: linha que a aplicação mudou entre a leitura e a gravação NÃO é sobrescrita", async () => {
    const store = new FakeStore()
    seed(store, OLD, ["totpSecretEnc"])
    const escritaConcorrente = encryptWithKey(OLD, "segredo-novo-cadastrado-agora")
    store.beforeApply = (col) => store.data[col].set("u2", escritaConcorrente)

    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, columns: ["totpSecretEnc"] })
    expect(rep.ok).toBe(false)
    expect(rep.totais).toMatchObject({ recifrados: 4, conflitos: 1, falhos: 0 })
    expect(rep.colunas[0].ids.conflitos).toEqual(["u2"])
    expect(store.data.totpSecretEnc.get("u2")).toBe(escritaConcorrente) // o dado novo da aplicação foi preservado

    store.beforeApply = null
    const r2 = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, columns: ["totpSecretEnc"] })
    expect(r2.ok).toBe(true)
    expect(decryptWithKey(NEW, store.data.totpSecretEnc.get("u2")!)).toBe("segredo-novo-cadastrado-agora")
  })

  it("MORDE (gravar sem conferir): se a cifra corromper o resultado, NADA é gravado", async () => {
    const store = new FakeStore()
    seed(store, OLD)
    const antes = store.snapshot()
    const corruptora = (k: Buffer, p: string) => encryptWithKey(k, p + "!")

    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, encrypt: corruptora })
    expect(store.applyCalls).toBe(0)
    expect(store.writes).toBe(0)
    expect(store.snapshot()).toBe(antes)
    expect(rep.ok).toBe(false)
    expect(rep.totais.falhos).toBeGreaterThan(0)
    expect(rep.colunas.every((c) => c.porMotivo["ida-e-volta-divergente"] === c.falhos)).toBe(true)
  })

  it("erro de leitura no banco: aborta, sem gravar e sem registrar a mensagem do erro", async () => {
    const store = new FakeStore()
    seed(store, OLD)
    store.failFetchOnCall = 1
    const logs: string[] = []
    const rep = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, log: (m) => logs.push(m) })
    expect(rep.abortado).toBe("erro-de-leitura")
    expect(rep.ok).toBe(false)
    expect(store.writes).toBe(0)
    expect(logs.join("\n")).not.toContain(SENTINEL)
  })

  it("não entra em laço se o store não avançar o cursor", async () => {
    const preso: RotationStore = {
      fetchBatch: async () => [{ id: "u1", value: encryptWithKey(OLD, "1") }],
      applyBatch: async (_c, u) => u.map(() => true),
    }
    const rep = await runRotation(preso, { oldKey: OLD, newKey: NEW, apply: false, columns: ["cpfEncrypted"] })
    expect(rep.totais.lidos).toBeLessThanOrEqual(2)
  })
})

// ─── Nunca vaza claro, ciphertext ou chave ────────────────────────────────────

describe("o que sai (log, relatório) nunca contém claro, ciphertext nem chave", () => {
  it("cenário com sucesso, falha, conflito e erro de banco", async () => {
    const store = new FakeStore()
    seed(store, OLD, ["cpfEncrypted", "totpSecretEnc"])
    const alheio = encryptWithKey(OTHER, SENTINEL)
    store.data.cpfEncrypted.set("ruim", alheio)
    store.data.totpSecretEnc.set("ruim", "lixo-" + SENTINEL)
    store.beforeApply = (col) => {
      if (col === "cpfEncrypted") store.data.cpfEncrypted.set("u1", encryptWithKey(OLD, SENTINEL))
    }
    store.failApplyOnCall = 2 // o lote de totpSecretEnc

    const originais = ENCRYPTED_COLUMNS.flatMap((c) => [...store.data[c].values()]).filter((v): v is string => v !== null)
    const logs: string[] = []
    const res = await runRotation(store, { oldKey: OLD, newKey: NEW, apply: true, log: (m) => logs.push(m), columns: ["cpfEncrypted", "totpSecretEnc"] })
    const posteriores = ENCRYPTED_COLUMNS.flatMap((c) => [...store.data[c].values()]).filter((v): v is string => v !== null)

    const saida = [...logs, ...formatReport(res), JSON.stringify(res)].join("\n")
    expect(saida).not.toContain(SENTINEL)
    expect(saida).not.toContain(OLD.toString("hex"))
    expect(saida).not.toContain(NEW.toString("hex"))
    for (const ct of [...originais, ...posteriores]) {
      expect(saida).not.toContain(ct)
      expect(saida).not.toContain(ct.split(":")[2] || "corpo-vazio-ignorado")
    }
    // mas os ids e contagens estão lá
    expect(saida).toContain("id=ruim")
  })

  it("safeErrorLabel: nome e código, nunca a mensagem", () => {
    const e = Object.assign(new Error(`falhou com ${SENTINEL}`), { code: "P2028" })
    e.name = "PrismaClientKnownRequestError"
    expect(safeErrorLabel(e)).toBe("PrismaClientKnownRequestError:P2028")
    expect(safeErrorLabel("texto solto")).toBe("erro-desconhecido")
  })

  it("safeErrorLabel: erro de inicialização traz o `errorCode` (P1000 = credencial recusada)", () => {
    const e = Object.assign(new Error(`credencial ${SENTINEL} recusada`), { errorCode: "P1000" })
    e.name = "PrismaClientInitializationError"
    expect(safeErrorLabel(e)).toBe("PrismaClientInitializationError:P1000")
    expect(safeErrorLabel(e)).not.toContain(SENTINEL)
  })
})

// ─── Configuração de chaves ───────────────────────────────────────────────────

describe("resolveRotationKeys", () => {
  const hex = (b: Buffer) => b.toString("hex")

  it("aceita duas chaves válidas e distintas", () => {
    const r = resolveRotationKeys({ ENCRYPTION_KEY_OLD: hex(OLD), ENCRYPTION_KEY_NEW: hex(NEW) })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.oldKey.equals(OLD)).toBe(true)
      expect(r.newKey.equals(NEW)).toBe(true)
    }
  })

  it("recusa chaves IGUAIS", () => {
    const r = resolveRotationKeys({ ENCRYPTION_KEY_OLD: hex(OLD), ENCRYPTION_KEY_NEW: hex(OLD) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(" ")).toContain("iguais")
  })

  it.each([
    ["ausentes", {}],
    ["antiga ausente", { ENCRYPTION_KEY_NEW: hex(NEW) }],
    ["nova ausente", { ENCRYPTION_KEY_OLD: hex(OLD) }],
    ["só espaços", { ENCRYPTION_KEY_OLD: "   ", ENCRYPTION_KEY_NEW: hex(NEW) }],
    ["tamanho errado", { ENCRYPTION_KEY_OLD: hex(OLD), ENCRYPTION_KEY_NEW: "abcd" }],
    ["não-hex", { ENCRYPTION_KEY_OLD: "zz".repeat(32), ENCRYPTION_KEY_NEW: hex(NEW) }],
  ])("recusa: %s", (_nome, env) => {
    expect(resolveRotationKeys(env as Record<string, string>).ok).toBe(false)
  })

  it("recusa chave nova de baixa entropia (a chave de teste, só zeros, por exemplo)", () => {
    const r = resolveRotationKeys({ ENCRYPTION_KEY_OLD: hex(OLD), ENCRYPTION_KEY_NEW: "0".repeat(64) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(" ")).toContain("entropia")
  })

  it("ignora ENCRYPTION_KEY (a do runtime) e nunca põe valor de chave nas mensagens", () => {
    const r = resolveRotationKeys({ ENCRYPTION_KEY: hex(NEW), ENCRYPTION_KEY_OLD: "abcd", ENCRYPTION_KEY_NEW: hex(NEW) })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const msg = r.errors.join(" ")
      expect(msg).not.toContain(hex(NEW))
      expect(msg).not.toContain("abcd")
    }
  })

  it("fingerprintKey: 8 hex, estável, distinto entre chaves e sem conter a chave", () => {
    expect(fingerprintKey(OLD)).toMatch(/^[0-9a-f]{8}$/)
    expect(fingerprintKey(OLD)).toBe(fingerprintKey(OLD))
    expect(fingerprintKey(OLD)).not.toBe(fingerprintKey(NEW))
    expect(OLD.toString("hex").startsWith(fingerprintKey(OLD))).toBe(false) // é um hash, não um pedaço da chave
  })
})

// ─── Linha de comando e identificação do banco ────────────────────────────────

describe("parseRotationArgs", () => {
  it("padrão é dry-run", () => {
    const r = parseRotationArgs([])
    expect(r).toEqual({ ok: true, args: { apply: false, confirmarBanco: null, hmacFixada: false } })
  })

  it("lê as flags conhecidas", () => {
    expect(parseRotationArgs(["--apply", "--confirmar-banco=abc123", "--hmac-fixada"])).toEqual({
      ok: true,
      args: { apply: true, confirmarBanco: "abc123", hmacFixada: true },
    })
  })

  it.each([["--aply"], ["--apply=sim"], ["--lote=10"], ["--confirmar-banco"], ["staging"]])(
    "recusa flag desconhecida, valor onde não cabe ou posicional (erro de digitação nunca vira --apply): %s",
    (a) => expect(parseRotationArgs([a]).ok).toBe(false),
  )

  it("um erro de digitação ao lado de --apply também recusa tudo", () => {
    expect(parseRotationArgs(["--apply", "--hmac-fixda"]).ok).toBe(false)
  })
})

describe("describeDatabase / checkDatabaseConfirmation", () => {
  const pooler = "postgresql://postgres.zythygwvmrwrqmnrdufq:s3nh4-s3cr3t4@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

  it("pooler: extrai host e ref do usuário, sem expor a senha", () => {
    const d = describeDatabase(pooler)
    expect(d).toEqual({ host: "aws-1-sa-east-1.pooler.supabase.com", ref: "zythygwvmrwrqmnrdufq" })
    expect(JSON.stringify(d)).not.toContain("s3nh4")
  })

  it("conexão direta: ref vem do host", () => {
    expect(describeDatabase("postgresql://postgres:pw@db.jdxdndrhjxtkaifbpagr.supabase.co:5432/postgres")).toEqual({
      host: "db.jdxdndrhjxtkaifbpagr.supabase.co",
      ref: "jdxdndrhjxtkaifbpagr",
    })
  })

  it("ausente ou ilegível: null", () => {
    expect(describeDatabase(undefined)).toBeNull()
    expect(describeDatabase("")).toBeNull()
    expect(describeDatabase("isto nao e uma url")).toBeNull()
  })

  it("confirmação exige o ref exato; sem ref, o host", () => {
    const d = describeDatabase(pooler)!
    expect(checkDatabaseConfirmation(d, "zythygwvmrwrqmnrdufq")).toBe(true)
    expect(checkDatabaseConfirmation(d, "jdxdndrhjxtkaifbpagr")).toBe(false) // o outro ambiente
    expect(checkDatabaseConfirmation(d, "zythy")).toBe(false) // prefixo não basta
    expect(checkDatabaseConfirmation(d, null)).toBe(false)
    expect(checkDatabaseConfirmation({ host: "localhost", ref: null }, "localhost")).toBe(true)
  })
})

// ─── Adaptador Prisma: forma das consultas ────────────────────────────────────

describe("createPrismaStore (cliente falso: confere só a FORMA das consultas)", () => {
  function fakePrisma(findManyResult: unknown[] = [], counts: number[] = []) {
    const findMany = jest.fn().mockResolvedValue(findManyResult)
    const updateMany = jest.fn((args: unknown) => ({ op: args }))
    const $transaction = jest.fn(async (ops: unknown[]) => ops.map((_, i) => ({ count: counts[i] ?? 1 })))
    return { prisma: { user: { findMany, updateMany }, $transaction } as unknown as PrismaClient, findMany, updateMany, $transaction }
  }

  it("fetchBatch: coluna não-nula, ordenado por id, paginado por cursor, só id + coluna", async () => {
    const f = fakePrisma([{ id: "a", cpfEncrypted: "x:y:z" }, { id: "b", cpfEncrypted: null }])
    const rows = await createPrismaStore(f.prisma).fetchBatch("cpfEncrypted", null, 100)
    expect(f.findMany).toHaveBeenCalledWith({
      where: { cpfEncrypted: { not: null } },
      orderBy: { id: "asc" },
      take: 100,
      select: { id: true, cpfEncrypted: true },
    })
    expect(rows).toEqual([{ id: "a", value: "x:y:z" }]) // nulo descartado

    await createPrismaStore(f.prisma).fetchBatch("totpSecretEnc", "a", 7)
    expect(f.findMany).toHaveBeenLastCalledWith({
      where: { totpSecretEnc: { not: null }, id: { gt: "a" } },
      orderBy: { id: "asc" },
      take: 7,
      select: { id: true, totpSecretEnc: true },
    })
  })

  it("applyBatch: uma transação só, updateMany com compare-and-swap, resultado por item", async () => {
    const f = fakePrisma([], [1, 0])
    const applied = await createPrismaStore(f.prisma).applyBatch("cnpjEncrypted", [
      { id: "a", expected: "old-a", next: "new-a" },
      { id: "b", expected: "old-b", next: "new-b" },
    ])
    expect(f.$transaction).toHaveBeenCalledTimes(1)
    expect(f.updateMany).toHaveBeenNthCalledWith(1, { where: { id: "a", cnpjEncrypted: "old-a" }, data: { cnpjEncrypted: "new-a" } })
    expect(f.updateMany).toHaveBeenNthCalledWith(2, { where: { id: "b", cnpjEncrypted: "old-b" }, data: { cnpjEncrypted: "new-b" } })
    expect(applied).toEqual([true, false]) // count 0 = a linha mudou = conflito
  })
})

// ─── A lista de colunas não pode ficar desatualizada ──────────────────────────

/** Campos String cujo nome termina em Encrypted/Enc, por model, num texto de schema.prisma. */
function encryptedFieldsInSchema(schema: string): { model: string; column: string }[] {
  const out: { model: string; column: string }[] = []
  for (const block of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    for (const f of block[2].matchAll(/^\s+(\w*(?:Encrypted|Enc))\s+String\??/gm)) out.push({ model: block[1], column: f[1] })
  }
  return out
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "__tests__"].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listSourceFiles(full))
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

describe("guardas contra lista desatualizada", () => {
  const root = path.resolve(__dirname, "../../..")

  it("ENCRYPTED_COLUMNS = campos *Encrypted/*Enc do schema.prisma (todos no model User)", () => {
    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
    const found = encryptedFieldsInSchema(schema)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((f) => f.model === "User")).toBe(true) // o adaptador Prisma só conhece prisma.user
    expect(found.map((f) => f.column).sort()).toEqual([...ENCRYPTED_COLUMNS].sort())
  })

  it("MORDE: o detector enxerga uma coluna cifrada nova em outro model", () => {
    const schema = `model User {\n  id String @id\n  cpfEncrypted String?\n}\n\nmodel Payout {\n  id String @id\n  pixKeyEnc String?\n}\n`
    expect(encryptedFieldsInSchema(schema)).toEqual([
      { model: "User", column: "cpfEncrypted" },
      { model: "Payout", column: "pixKeyEnc" },
    ])
  })

  it("só os escritores conhecidos chamam encryptDocument/encryptPII (arquivo novo = revisar a rotação)", () => {
    const CONHECIDOS = [
      "app/api/test/enroll-admin-totp/route.ts",
      "app/api/users/me/complete-registration/route.ts",
      "lib/auth/mfa.ts",
      "lib/pjVerification.ts",
      "scripts/fix-incomplete-pf.ts",
    ]
    const escritores = ["app", "lib", "components", "hooks", "utils", "scripts"]
      .map((d) => path.join(root, d))
      .filter((d) => fs.existsSync(d))
      .flatMap(listSourceFiles)
      .filter((f) => {
        const rel = path.relative(root, f).split(path.sep).join("/")
        if (rel === "lib/crypto.ts" || rel === "lib/crypto-rotation.ts") return false
        return /\b(encryptDocument|encryptPII|encryptWithKey)\s*\(/.test(fs.readFileSync(f, "utf8"))
      })
      .map((f) => path.relative(root, f).split(path.sep).join("/"))
      .sort()
    // Falhou? Um código novo cifra dado com a ENCRYPTION_KEY. Conferir se a coluna onde ele grava
    // está em ENCRYPTED_COLUMNS (lib/crypto-rotation.ts) e no runbook, e só então acrescentar aqui.
    expect(escritores).toEqual(CONHECIDOS)
  })
})

// O diagnóstico de conexão roda contra a PRODUÇÃO e a saída vai para conversa/terminal:
// nem a senha nem a mensagem do Prisma podem aparecer nele.
describe("diagnóstico de conexão (connectionSummary / connectionFailureHint)", () => {
  const initError = (message: string) => {
    const e = new Error(message)
    e.name = "PrismaClientInitializationError"
    return e
  }

  it("resumo: usuário, porta e parâmetros, nunca a senha", () => {
    const resumo = connectionSummary(`postgresql://postgres.abc:${SENTINEL}@host.pooler.supabase.com:6543/postgres?pgbouncer=true`)
    expect(resumo).toBe("usuário=postgres.abc porta=6543 senha=presente parâmetros=pgbouncer")
    expect(resumo).not.toContain(SENTINEL)
  })

  it("resumo: acusa aspas ou espaço nas pontas da senha (colagem suja) e senha ausente", () => {
    expect(connectionSummary("postgresql://u:%22segredo%22@h:5432/db")).toContain("aspas ou espaço nas pontas")
    expect(connectionSummary("postgresql://u@h:5432/db")).toContain("senha=AUSENTE")
  })

  it("resumo: senha com % cru não derruba o diagnóstico; URL ilegível vira null sem vazar a entrada", () => {
    expect(connectionSummary("postgresql://u:ab%zz@h/db")).toContain("senha=presente")
    expect(connectionSummary(`DATABASE_URL=${SENTINEL}`)).toBeNull()
  })

  it.each([
    ["The provided database string is invalid. The scheme is not recognized in database URL.", "URL malformada"],
    ["Can't reach database server at `db.abc.supabase.co:5432`", "servidor inalcançável"],
    ["FATAL: (ENOTFOUND) tenant/user postgres.abc not found", "usuário ou projeto não encontrado"],
    ["Authentication failed against database server, the provided database credentials for `postgres` are not valid.", "credencial recusada"],
    ["algo que ninguém previu", "fora da lista"],
  ])("dica de conexão: %s", (mensagem, esperado) => {
    const dica = connectionFailureHint(initError(`${mensagem} ${SENTINEL}`))
    expect(dica).toContain(esperado)
    // texto FIXO por categoria: nada da mensagem original passa
    expect(dica).not.toContain(SENTINEL)
  })

  it("só erros de inicialização do Prisma ganham dica", () => {
    expect(connectionFailureHint(new Error("Can't reach database server"))).toBeNull()
    expect(connectionFailureHint("texto solto")).toBeNull()
  })
})
