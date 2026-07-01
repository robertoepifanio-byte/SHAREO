/**
 * Testes unitários para lib/rental-contract.ts
 *
 * Funções cobertas:
 *  - hashContractText       — hash SHA-256 do texto do contrato
 *  - RENTAL_CONTRACT_TEXT   — texto existente, não vazio
 *  - RENTAL_CONTRACT_VERSION — versão exportada
 *  - RENTAL_CONTRACT_TEXT_HASH — hash pré-computado consistente
 *
 * Nota: este arquivo é um RASCUNHO jurídico (pendente D4).
 * Os testes fixam apenas o comportamento da função hashContractText
 * e garantem integridade entre o hash pré-computado e o texto vigente.
 * NÃO testam o conteúdo jurídico do contrato.
 */

import {
  hashContractText,
  RENTAL_CONTRACT_TEXT,
  RENTAL_CONTRACT_TEXT_HASH,
  RENTAL_CONTRACT_VERSION,
} from "@/lib/rental-contract"

// ---------------------------------------------------------------------------
// hashContractText
// ---------------------------------------------------------------------------

describe("hashContractText", () => {
  it("retorna uma string hex não vazia", () => {
    const hash = hashContractText("texto de teste")
    expect(typeof hash).toBe("string")
    expect(hash.length).toBeGreaterThan(0)
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
  })

  it("SHA-256 produz 64 caracteres hex", () => {
    const hash = hashContractText("texto de teste")
    expect(hash).toHaveLength(64)
  })

  it("é determinístico — mesmo input produz mesmo hash", () => {
    const texto = "Contrato de locação de bem móvel"
    expect(hashContractText(texto)).toBe(hashContractText(texto))
  })

  it("inputs diferentes produzem hashes diferentes", () => {
    const h1 = hashContractText("versão 1 do contrato")
    const h2 = hashContractText("versão 2 do contrato")
    expect(h1).not.toBe(h2)
  })

  it("sensível a maiúsculas/minúsculas (v1 ≠ V1)", () => {
    expect(hashContractText("contrato")).not.toBe(hashContractText("Contrato"))
  })

  it("string vazia gera hash válido (não lança exceção)", () => {
    expect(() => hashContractText("")).not.toThrow()
    expect(hashContractText("")).toHaveLength(64)
  })

  it("suporta caracteres UTF-8 (acentos, ç, ã)", () => {
    const portugues = "Locação de bem móvel — cláusula de cancelamento"
    const hash = hashContractText(portugues)
    expect(hash).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// RENTAL_CONTRACT_TEXT
// ---------------------------------------------------------------------------

describe("RENTAL_CONTRACT_TEXT", () => {
  it("é uma string não vazia", () => {
    expect(typeof RENTAL_CONTRACT_TEXT).toBe("string")
    expect(RENTAL_CONTRACT_TEXT.length).toBeGreaterThan(0)
  })

  it("contém o marcador de rascunho (aviso D4)", () => {
    // O texto deve conter o aviso de que é um rascunho pendente de revisão jurídica
    expect(RENTAL_CONTRACT_TEXT).toMatch(/RASCUNHO/i)
  })

  it("menciona 'ShareO' como intermediadora", () => {
    expect(RENTAL_CONTRACT_TEXT).toMatch(/ShareO/i)
  })
})

// ---------------------------------------------------------------------------
// RENTAL_CONTRACT_VERSION
// ---------------------------------------------------------------------------

describe("RENTAL_CONTRACT_VERSION", () => {
  it("é uma string não vazia", () => {
    expect(typeof RENTAL_CONTRACT_VERSION).toBe("string")
    expect(RENTAL_CONTRACT_VERSION.length).toBeGreaterThan(0)
  })

  it("começa com 'v' (formato semver)", () => {
    expect(RENTAL_CONTRACT_VERSION.startsWith("v")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// RENTAL_CONTRACT_TEXT_HASH — consistência entre hash pré-computado e texto
// ---------------------------------------------------------------------------

describe("RENTAL_CONTRACT_TEXT_HASH", () => {
  it("é uma string hex de 64 caracteres (SHA-256)", () => {
    expect(typeof RENTAL_CONTRACT_TEXT_HASH).toBe("string")
    expect(RENTAL_CONTRACT_TEXT_HASH).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(RENTAL_CONTRACT_TEXT_HASH)).toBe(true)
  })

  it("é idêntico ao hash calculado ao vivo do RENTAL_CONTRACT_TEXT", () => {
    // Esta é a verificação mais importante: garante que o hash pré-computado
    // está sincronizado com o texto atual. Se o texto mudar sem atualizar
    // o hash, este teste falhará — como deve ser.
    expect(RENTAL_CONTRACT_TEXT_HASH).toBe(hashContractText(RENTAL_CONTRACT_TEXT))
  })

  it("hash pré-computado muda se o texto mudar (demonstração de integridade)", () => {
    const hashTextoOriginal = hashContractText(RENTAL_CONTRACT_TEXT)
    const hashTextoModificado = hashContractText(RENTAL_CONTRACT_TEXT + " [MODIFICADO]")
    expect(hashTextoOriginal).not.toBe(hashTextoModificado)
  })
})
