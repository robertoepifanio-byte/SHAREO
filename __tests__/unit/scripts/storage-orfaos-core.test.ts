/** @jest-environment node */
/**
 * Testes de unidade para scripts/lib/storage-orfaos-core.ts
 *
 * Cobre:
 *   - extrairPadrao: mapeamento de caminho → tipo de chave por bucket
 *   - classificarArquivo: ativo / órfão / indeterminado
 *   - validarRef / validarRefSupabaseUrl: trava de ambiente
 *
 * Não importa Prisma nem Supabase SDK — usa LookupDB injetável.
 */
import {
  extrairPadrao,
  classificarArquivo,
  validarRef,
  validarRefSupabaseUrl,
  REFS_CONHECIDOS,
  type LookupDB,
} from "../../../scripts/lib/storage-orfaos-core"

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type DBOverrides = {
  userExists?:      (id: string) => Promise<boolean>
  ownerOfItem?:     (id: string) => Promise<string | null>
  ownerOfBooking?:  (id: string) => Promise<{ ownerId: string; borrowerId: string } | null>
}

function makeDB(overrides: DBOverrides = {}): LookupDB {
  return {
    userExists:     overrides.userExists     ?? jest.fn().mockResolvedValue(true),
    ownerOfItem:    overrides.ownerOfItem    ?? jest.fn().mockResolvedValue("owner1"),
    ownerOfBooking: overrides.ownerOfBooking ?? jest.fn().mockResolvedValue({ ownerId: "o1", borrowerId: "b1" }),
  }
}

// IDs realistas (cuid-like)
const UID     = "cluser123456789ab"
const ITEM_ID = "clitem123456789ab"
const BKNG_ID = "clbook123456789ab"

// ────────────────────────────────────────────────────────────────────────────
// extrairPadrao
// ────────────────────────────────────────────────────────────────────────────

describe("extrairPadrao — id-docs", () => {
  it("reconhece id-verification/<userId>/doc.jpg", () => {
    const r = extrairPadrao("id-docs", `id-verification/${UID}/document-123.jpg`)
    expect(r).toEqual({ tipo: "userId", userId: UID })
  })

  it("desconhece caminho sem id-verification/", () => {
    expect(extrairPadrao("id-docs", `${UID}/selfie.jpg`).tipo).toBe("desconhecido")
  })

  it("desconhece caminho só com prefixo (sem userId)", () => {
    expect(extrairPadrao("id-docs", "id-verification/").tipo).toBe("desconhecido")
  })
})

describe("extrairPadrao — item-images", () => {
  it("reconhece <itemId>/<filename>", () => {
    const r = extrairPadrao("item-images", `${ITEM_ID}/foto.jpg`)
    expect(r).toEqual({ tipo: "itemId", itemId: ITEM_ID })
  })

  it("reconhece uploads/<userId>/<filename>", () => {
    const r = extrairPadrao("item-images", `uploads/${UID}/avatar.png`)
    expect(r).toEqual({ tipo: "userId", userId: UID })
  })

  it("desconhece arquivo na raiz (sem separador)", () => {
    expect(extrairPadrao("item-images", "arquivo.jpg").tipo).toBe("desconhecido")
  })

  it("desconhece ID muito curto (menos de 4 chars)", () => {
    expect(extrairPadrao("item-images", "ab/foto.jpg").tipo).toBe("desconhecido")
  })
})

describe("extrairPadrao — booking-photos", () => {
  it("reconhece bookings/<bookingId>/<fase>/<arquivo>", () => {
    const r = extrairPadrao("booking-photos", `bookings/${BKNG_ID}/checkin/123-${UID}.jpg`)
    expect(r).toEqual({ tipo: "bookingId", bookingId: BKNG_ID })
  })

  it("reconhece uploads/<userId>/<arquivo>", () => {
    const r = extrairPadrao("booking-photos", `uploads/${UID}/avaliacao.jpg`)
    expect(r).toEqual({ tipo: "userId", userId: UID })
  })

  it("desconhece bookings/<id> sem segmento de fase", () => {
    // Só dois segmentos: bookings/<id> — não tem o terceiro
    expect(extrairPadrao("booking-photos", `bookings/${BKNG_ID}`).tipo).toBe("desconhecido")
  })
})

describe("extrairPadrao — bucket desconhecido", () => {
  it("retorna desconhecido para bucket não mapeado", () => {
    expect(extrairPadrao("outro-bucket", "qualquer/coisa.jpg").tipo).toBe("desconhecido")
  })
})

// ────────────────────────────────────────────────────────────────────────────
// classificarArquivo
// ────────────────────────────────────────────────────────────────────────────

describe("classificarArquivo — caminho desconhecido", () => {
  it("retorna indeterminado para caminho sem padrão", async () => {
    const db  = makeDB()
    const res = await classificarArquivo("item-images", "sem-barra", db)
    expect(res.status).toBe("indeterminado")
    expect(res.motivo).toMatch(/não reconhecido/)
  })
})

describe("classificarArquivo — userId direto", () => {
  it("ativo quando usuário existe sem deletedAt", async () => {
    const db  = makeDB({ userExists: jest.fn().mockResolvedValue(true) })
    const res = await classificarArquivo("id-docs", `id-verification/${UID}/selfie.jpg`, db)
    expect(res.status).toBe("ativo")
  })

  it("órfão quando usuário não existe", async () => {
    const db  = makeDB({ userExists: jest.fn().mockResolvedValue(false) })
    const res = await classificarArquivo("id-docs", `id-verification/${UID}/selfie.jpg`, db)
    expect(res.status).toBe("orfao")
    expect(res.motivo).toMatch(/não existe/)
  })
})

describe("classificarArquivo — itemId", () => {
  it("ativo quando item existe e dono existe", async () => {
    const db = makeDB({
      ownerOfItem: jest.fn().mockResolvedValue("owner1"),
      userExists:  jest.fn().mockResolvedValue(true),
    })
    const res = await classificarArquivo("item-images", `${ITEM_ID}/foto.jpg`, db)
    expect(res.status).toBe("ativo")
  })

  it("órfão quando item existe mas dono foi excluído", async () => {
    const db = makeDB({
      ownerOfItem: jest.fn().mockResolvedValue("owner_deletado"),
      userExists:  jest.fn().mockResolvedValue(false),
    })
    const res = await classificarArquivo("item-images", `${ITEM_ID}/foto.jpg`, db)
    expect(res.status).toBe("orfao")
    expect(res.motivo).toMatch(/dono/)
  })

  it("indeterminado quando item não está no banco", async () => {
    const db = makeDB({ ownerOfItem: jest.fn().mockResolvedValue(null) })
    const res = await classificarArquivo("item-images", `${ITEM_ID}/foto.jpg`, db)
    expect(res.status).toBe("indeterminado")
    expect(res.motivo).toMatch(/não encontrado/)
  })
})

describe("classificarArquivo — bookingId", () => {
  it("ativo quando reserva existe e ao menos um participante tem conta ativa", async () => {
    const db = makeDB({
      ownerOfBooking: jest.fn().mockResolvedValue({ ownerId: "o1", borrowerId: "b1" }),
      userExists: jest.fn()
        .mockResolvedValueOnce(false)  // owner: deletado
        .mockResolvedValueOnce(true),  // borrower: ativo
    })
    const res = await classificarArquivo("booking-photos", `bookings/${BKNG_ID}/checkin/f.jpg`, db)
    expect(res.status).toBe("ativo")
  })

  it("órfão quando AMBOS os participantes não têm conta ativa", async () => {
    const db = makeDB({
      ownerOfBooking: jest.fn().mockResolvedValue({ ownerId: "o1", borrowerId: "b1" }),
      userExists: jest.fn().mockResolvedValue(false),
    })
    const res = await classificarArquivo("booking-photos", `bookings/${BKNG_ID}/checkin/f.jpg`, db)
    expect(res.status).toBe("orfao")
    expect(res.motivo).toMatch(/ambos/)
  })

  it("indeterminado quando reserva não está no banco", async () => {
    const db = makeDB({ ownerOfBooking: jest.fn().mockResolvedValue(null) })
    const res = await classificarArquivo("booking-photos", `bookings/${BKNG_ID}/checkin/f.jpg`, db)
    expect(res.status).toBe("indeterminado")
    expect(res.motivo).toMatch(/não encontrada/)
  })
})

describe("classificarArquivo — erro de lookup", () => {
  it("retorna indeterminado quando o DB lança, sem propagar a exceção", async () => {
    const db = makeDB({ userExists: jest.fn().mockRejectedValue(new Error("banco indisponível")) })
    const res = await classificarArquivo("id-docs", `id-verification/${UID}/selfie.jpg`, db)
    expect(res.status).toBe("indeterminado")
    expect(res.motivo).toMatch(/erro de lookup/)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// validarRef — trava de ambiente
// ────────────────────────────────────────────────────────────────────────────

const URL_STAGING = `postgres://postgres.${REFS_CONHECIDOS.staging}:senha@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`
const URL_PROD    = `postgres://postgres.${REFS_CONHECIDOS.prod}:senha@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`
const URL_HOST_STAGING = `postgres://user:senha@db.${REFS_CONHECIDOS.staging}.supabase.co:5432/postgres`

describe("validarRef — DATABASE_URL", () => {
  it("aceita staging quando ref é staging (via user)", () => {
    const { ok } = validarRef(URL_STAGING, REFS_CONHECIDOS.staging)
    expect(ok).toBe(true)
  })

  it("aceita staging quando ref é staging (via host db.*)", () => {
    const { ok } = validarRef(URL_HOST_STAGING, REFS_CONHECIDOS.staging)
    expect(ok).toBe(true)
  })

  it("rejeita staging quando ref é prod", () => {
    const { ok } = validarRef(URL_STAGING, REFS_CONHECIDOS.prod)
    expect(ok).toBe(false)
  })

  it("rejeita prod quando ref é staging", () => {
    const { ok } = validarRef(URL_PROD, REFS_CONHECIDOS.staging)
    expect(ok).toBe(false)
  })

  it("🪤 rejeitar se a trava for removida: prod aceita prod", () => {
    // Este teste FALHA se alguém comentar a trava de ref — é o canário.
    const { ok } = validarRef(URL_PROD, REFS_CONHECIDOS.prod)
    expect(ok).toBe(true)   // deveria estar protegido; se ok=false, a trava foi removida errada
  })

  it("🪤 igualdade estrita — rejeita prefixo parcial do ref de staging (falha se voltar a startsWith)", () => {
    // "zythy" é prefixo do ref de staging mas não é o ref completo.
    // Com startsWith() isto passaria — com === falha corretamente.
    const { ok } = validarRef(URL_STAGING, REFS_CONHECIDOS.staging.slice(0, 8))
    expect(ok).toBe(false)
  })

  it("🪤 igualdade estrita — rejeita prefixo parcial do ref de prod (falha se voltar a startsWith)", () => {
    const { ok } = validarRef(URL_PROD, REFS_CONHECIDOS.prod.slice(0, 8))
    expect(ok).toBe(false)
  })
})

describe("validarRef — trava limpeza-dados-teste-prod", () => {
  it("🪤 recusa staging — a trava NUNCA deve rodar limpeza de prod em staging", () => {
    // Simula: ref passado = prod, mas DATABASE_URL é de staging
    const { ok } = validarRef(URL_STAGING, REFS_CONHECIDOS.prod)
    expect(ok).toBe(false)
  })

  it("🪤 recusa staging explicitamente como --ref prod", () => {
    // O script exige argRef === REF_PROD E validarRef retornar true.
    // Se DATABASE_URL for de staging mas argRef for prod → validarRef retorna false → aborta.
    const { ok } = validarRef(URL_STAGING, REFS_CONHECIDOS.prod)
    expect(ok).toBe(false)
  })
})

describe("validarRefSupabaseUrl", () => {
  const SUPABASE_STAGING = `https://${REFS_CONHECIDOS.staging}.supabase.co`
  const SUPABASE_PROD    = `https://${REFS_CONHECIDOS.prod}.supabase.co`

  it("aceita staging com ref staging", () => {
    expect(validarRefSupabaseUrl(SUPABASE_STAGING, REFS_CONHECIDOS.staging).ok).toBe(true)
  })

  it("rejeita staging com ref prod", () => {
    expect(validarRefSupabaseUrl(SUPABASE_STAGING, REFS_CONHECIDOS.prod).ok).toBe(false)
  })

  it("aceita prod com ref prod", () => {
    expect(validarRefSupabaseUrl(SUPABASE_PROD, REFS_CONHECIDOS.prod).ok).toBe(true)
  })

  it("retorna refEncontrado correto", () => {
    const { refEncontrado } = validarRefSupabaseUrl(SUPABASE_STAGING, REFS_CONHECIDOS.staging)
    expect(refEncontrado).toBe(REFS_CONHECIDOS.staging)
  })

  it("🪤 igualdade estrita — rejeita prefixo parcial (falha se voltar a startsWith)", () => {
    const { ok } = validarRefSupabaseUrl(SUPABASE_STAGING, REFS_CONHECIDOS.staging.slice(0, 8))
    expect(ok).toBe(false)
  })
})
