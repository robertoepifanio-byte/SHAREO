/**
 * Testes unitários para lib/validations/storageUrl.ts
 *
 * Funções cobertas:
 *  - isOwnStoragePhotoUrl — guard de SSRF: aceita só fotos do Supabase Storage da plataforma
 */

import { isOwnStoragePhotoUrl } from "@/lib/validations/storageUrl"

const FAKE_SUPABASE_URL = "https://zythygwvmrwrqmnrdufq.supabase.co"

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = FAKE_SUPABASE_URL
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})

// ---------------------------------------------------------------------------
// isOwnStoragePhotoUrl
// ---------------------------------------------------------------------------

describe("isOwnStoragePhotoUrl", () => {
  describe("URLs aceitas (hospeadas no Supabase Storage da plataforma)", () => {
    it("aceita URL do bucket item-images", () => {
      const url = `${FAKE_SUPABASE_URL}/storage/v1/object/public/item-images/photo.jpg`
      expect(isOwnStoragePhotoUrl(url)).toBe(true)
    })

    it("aceita URL do bucket booking-photos", () => {
      const url = `${FAKE_SUPABASE_URL}/storage/v1/object/public/booking-photos/dispute123.jpg`
      expect(isOwnStoragePhotoUrl(url)).toBe(true)
    })

    it("aceita URL com subpasta no path", () => {
      const url = `${FAKE_SUPABASE_URL}/storage/v1/object/public/item-images/user123/foto456.jpg`
      expect(isOwnStoragePhotoUrl(url)).toBe(true)
    })

    it("funciona quando NEXT_PUBLIC_SUPABASE_URL tem barra final", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = `${FAKE_SUPABASE_URL}/`
      const url = `${FAKE_SUPABASE_URL}/storage/v1/object/public/item-images/photo.jpg`
      expect(isOwnStoragePhotoUrl(url)).toBe(true)
    })
  })

  describe("URLs rejeitadas (host externo ou path incorreto)", () => {
    it("rejeita URL de outro projeto Supabase (ref diferente)", () => {
      const url = "https://outro-projeto.supabase.co/storage/v1/object/public/item-images/foto.jpg"
      expect(isOwnStoragePhotoUrl(url)).toBe(false)
    })

    it("rejeita URL do Wikipedia (domínio externo)", () => {
      expect(isOwnStoragePhotoUrl("https://upload.wikimedia.org/foto.jpg")).toBe(false)
    })

    it("rejeita URL do S3 da AWS (não é Supabase Storage)", () => {
      expect(isOwnStoragePhotoUrl("https://s3.amazonaws.com/meu-bucket/foto.jpg")).toBe(false)
    })

    it("rejeita URL do CDN externo", () => {
      expect(isOwnStoragePhotoUrl("https://cdn.exemplo.com/fotos/item.jpg")).toBe(false)
    })

    it("rejeita URL que usa o host correto mas path errado", () => {
      // URL do Supabase mas não é objeto público de storage
      const url = `${FAKE_SUPABASE_URL}/rest/v1/items`
      expect(isOwnStoragePhotoUrl(url)).toBe(false)
    })

    it("rejeita URL que usa http:// em vez de https://", () => {
      const url = `http://zythygwvmrwrqmnrdufq.supabase.co/storage/v1/object/public/item-images/foto.jpg`
      expect(isOwnStoragePhotoUrl(url)).toBe(false)
    })

    it("rejeita string vazia", () => {
      expect(isOwnStoragePhotoUrl("")).toBe(false)
    })

    it("rejeita string que não é URL", () => {
      expect(isOwnStoragePhotoUrl("nao-e-uma-url")).toBe(false)
    })
  })

  describe("quando NEXT_PUBLIC_SUPABASE_URL não está definida", () => {
    it("retorna false (fail-closed — sem env var não autoriza nada)", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      const url = `${FAKE_SUPABASE_URL}/storage/v1/object/public/item-images/foto.jpg`
      expect(isOwnStoragePhotoUrl(url)).toBe(false)
    })
  })
})
