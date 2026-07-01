/**
 * Testes unitários para lib/validations/messages.ts
 *
 * Schemas cobertos:
 *  - SendMessageSchema — conteúdo da mensagem do chat interno
 */

import { SendMessageSchema } from "@/lib/validations/messages"

// ---------------------------------------------------------------------------
// SendMessageSchema
// ---------------------------------------------------------------------------

describe("SendMessageSchema", () => {
  describe("casos válidos", () => {
    it("aceita mensagem simples", () => {
      expect(SendMessageSchema.safeParse({ content: "Olá, o item está disponível?" }).success).toBe(true)
    })

    it("aceita mensagem de 1 caractere (mínimo)", () => {
      expect(SendMessageSchema.safeParse({ content: "!" }).success).toBe(true)
    })

    it("aceita mensagem com exatamente 2000 caracteres (máximo)", () => {
      expect(SendMessageSchema.safeParse({ content: "a".repeat(2000) }).success).toBe(true)
    })

    it("aceita mensagem com emojis e caracteres especiais", () => {
      expect(
        SendMessageSchema.safeParse({ content: "Perfeito! Pode trazer às 14h 😊👍" }).success,
      ).toBe(true)
    })

    it("aceita mensagem com quebras de linha", () => {
      expect(
        SendMessageSchema.safeParse({ content: "Olá!\nPode trazer amanhã?\nObrigado." }).success,
      ).toBe(true)
    })
  })

  describe("casos inválidos", () => {
    it("rejeita mensagem vazia (min=1)", () => {
      const r = SendMessageSchema.safeParse({ content: "" })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("content"))).toBe(true)
    })

    it("rejeita mensagem com mais de 2000 caracteres", () => {
      const r = SendMessageSchema.safeParse({ content: "x".repeat(2001) })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("content"))).toBe(true)
    })

    it("rejeita quando content está ausente", () => {
      expect(SendMessageSchema.safeParse({}).success).toBe(false)
    })

    it("rejeita quando content é null", () => {
      expect(SendMessageSchema.safeParse({ content: null }).success).toBe(false)
    })
  })

  describe("invariantes", () => {
    it("data.content preserva o conteúdo original quando válido", () => {
      const msg = "Olá, o item ainda está disponível para 01/07?"
      const r = SendMessageSchema.safeParse({ content: msg })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.content).toBe(msg)
    })
  })
})
