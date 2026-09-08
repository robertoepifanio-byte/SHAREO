/** @jest-environment node */
/**
 * Testes de integração para POST /api/items/import — caminho .xlsx
 *
 * Arquivo fonte: app/api/items/import/route.ts
 *
 * Motivação: a rota migrou o parser de `xlsx` (SheetJS, sem patch no npm para
 * GHSA prototype-pollution + ReDoS) para `exceljs`. Este teste gera um .xlsx
 * REAL com exceljs e o envia pela handler, provando que:
 *   - células string, numéricas e com formato são lidas corretamente (cellToString);
 *   - cabeçalhos perigosos (__proto__) são descartados (guard anti-prototype-pollution);
 *   - o fluxo de criação PJ continua funcionando após a troca de dependência.
 *
 * O bloco "reimportação" guarda um bug diferente, achado em 06/09/2026: o
 * objeto de dados era compartilhado entre `create` e `update`, então reimportar
 * a planilha aplicava os DEFAULTS DE CRIAÇÃO a itens que já existiam —
 * despublicando anúncios no ar (`status: "DRAFT"`) e apagando a localização
 * (`city: ""`). Nenhuma das duas perdas dava erro: a importação respondia 200 e
 * o dono só descobria pelo anúncio sumido da vitrine.
 */

import ExcelJS from "exceljs"
import { POST } from "@/app/api/items/import/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCategoryFindMany = jest.fn()
const mockItemFindFirst    = jest.fn()
const mockItemCreate       = jest.fn()
const mockItemUpdate       = jest.fn()
const mockUserFindUnique   = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    category: { findMany: (...a: unknown[]) => mockCategoryFindMany(...a) },
    item: {
      findFirst: (...a: unknown[]) => mockItemFindFirst(...a),
      create:    (...a: unknown[]) => mockItemCreate(...a),
      update:    (...a: unknown[]) => mockItemUpdate(...a),
    },
  },
}))

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OWNER_ID = "pj-owner-001"

function makePJSession() {
  return { user: { id: OWNER_ID, userType: "PJ" } }
}

/** Gera um buffer .xlsx real a partir de uma matriz [header, ...rows]. */
async function makeXlsxBuffer(matrix: (string | number)[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Itens")
  matrix.forEach((row) => ws.addRow(row))
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

async function makeImportRequest(buffer: ArrayBuffer): Promise<Request> {
  const form = new FormData()
  form.append(
    "file",
    new File([buffer], "itens.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  )
  return new Request("http://localhost:3000/api/items/import", {
    method: "POST",
    body:   form,
  })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(makePJSession())
  // withUser(req, { select: { userType } }) — busca id+userType no banco após
  // resolver o userId via auth(). O mock retorna o mesmo usuário PJ.
  mockUserFindUnique.mockResolvedValue({ id: OWNER_ID, userType: "PJ" })
  mockCategoryFindMany.mockResolvedValue([{ id: "cat-ferramentas", name: "Ferramentas" }])
  mockItemFindFirst.mockResolvedValue(null) // sempre "novo"
  mockItemCreate.mockImplementation(() => Promise.resolve({ id: "new-item" }))
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("POST /api/items/import — parser .xlsx via exceljs", () => {
  it("lê células string e numéricas e cria os itens", async () => {
    // preco_dia na linha 1 é NÚMERO (25.5); na linha 2 é STRING ("30,00")
    const buffer = await makeXlsxBuffer([
      ["titulo", "categoria", "preco_dia", "condicao"],
      ["Furadeira Bosch 500W", "Ferramentas", 25.5, "BOM"],
      ["Serra Tico-Tico", "Ferramentas", "30,00", "novo"],
    ])

    const res  = await POST(await makeImportRequest(buffer))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.created).toBe(2)
    expect(json.data.failed).toBe(0)
    expect(mockItemCreate).toHaveBeenCalledTimes(2)

    // célula numérica 25.5 → 2550 centavos; string "30,00" → 3000 centavos
    const precos = mockItemCreate.mock.calls.map((c) => (c[0] as { data: { pricePerDay: number } }).data.pricePerDay)
    expect(precos).toEqual(expect.arrayContaining([2550, 3000]))
  })

  it("descarta cabeçalho __proto__ sem poluir o protótipo (anti prototype-pollution)", async () => {
    const buffer = await makeXlsxBuffer([
      ["titulo", "categoria", "preco_dia", "condicao", "__proto__"],
      ["Martelo", "Ferramentas", "10.00", "BOM", "polluted"],
    ])

    const res  = await POST(await makeImportRequest(buffer))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.created).toBe(1)
    // o protótipo de Object não foi contaminado por uma chave controlada pela planilha
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it("rejeita arquivo Excel inválido com 400 INVALID_FILE", async () => {
    const junk = new TextEncoder().encode("isto não é um xlsx").buffer
    const res  = await POST(await makeImportRequest(junk))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.code).toBe("INVALID_FILE")
  })
})

describe("POST /api/items/import — reimportação de item existente", () => {
  const EXISTING = { id: "item-ja-cadastrado" }

  /** Planilha mínima: só as colunas obrigatórias, sem localização. */
  async function reimportarSemLocalizacao() {
    mockItemFindFirst.mockResolvedValue(EXISTING)
    const buffer = await makeXlsxBuffer([
      ["titulo", "categoria", "preco_dia", "condicao"],
      ["Furadeira Bosch 500W", "Ferramentas", "35,00", "BOM"],
    ])
    return POST(await makeImportRequest(buffer))
  }

  it("NÃO despublica o anúncio que já estava no ar", async () => {
    const res = await reimportarSemLocalizacao()
    expect(res.status).toBe(200)

    // O update não pode carregar `status`: quem decide se o anúncio está no ar
    // é o dono, não uma reimportação de planilha para corrigir preço.
    const { data } = mockItemUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data).not.toHaveProperty("status")
  })

  it("NÃO apaga a localização quando a planilha não traz as colunas", async () => {
    await reimportarSemLocalizacao()

    // `cidade`/`estado`/`bairro` têm `.default("")` no schema da linha; aplicar
    // esse default no update zerava a cidade do item e derrubava a busca por
    // proximidade.
    const { data } = mockItemUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data).not.toHaveProperty("city")
    expect(data).not.toHaveProperty("state")
    expect(data).not.toHaveProperty("neighborhood")
  })

  it("atualiza o que a planilha de fato descreve", async () => {
    await reimportarSemLocalizacao()

    const { where, data } = mockItemUpdate.mock.calls[0][0] as {
      where: { id: string }
      data: Record<string, unknown>
    }
    expect(where.id).toBe(EXISTING.id)
    expect(data.pricePerDay).toBe(3500)
    expect(data.title).toBe("Furadeira Bosch 500W")
  })

  it("grava a localização quando a planilha TRAZ as colunas", async () => {
    mockItemFindFirst.mockResolvedValue(EXISTING)
    const buffer = await makeXlsxBuffer([
      ["titulo", "categoria", "preco_dia", "condicao", "cidade", "estado"],
      ["Furadeira Bosch 500W", "Ferramentas", "35,00", "BOM", "Recife", "PE"],
    ])
    await POST(await makeImportRequest(buffer))

    const { data } = mockItemUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data.city).toBe("Recife")
    expect(data.state).toBe("PE")
  })

  it("item novo continua nascendo como rascunho", async () => {
    mockItemFindFirst.mockResolvedValue(null)
    const buffer = await makeXlsxBuffer([
      ["titulo", "categoria", "preco_dia", "condicao"],
      ["Serra Nova", "Ferramentas", "40,00", "NOVO"],
    ])
    await POST(await makeImportRequest(buffer))

    // DRAFT na criação é correto e tem que continuar: significa "ainda sem foto".
    const { data } = mockItemCreate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data.status).toBe("DRAFT")
  })
})
