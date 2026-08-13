/**
 * @jest-environment node
 *
 * Auto-cancelamento de reservas PENDING sem resposta do proprietário.
 *
 * O que estes testes protegem:
 *  - `pendingHours` padrão é 12h (não 2h — cancelava reservas legítimas de
 *    proprietários que estavam dormindo ou trabalhando; alterado em 2026-08-13).
 *  - O valor é lido do banco quando disponível (PlatformConfig: autoCancelPendingHours).
 *  - Valores inválidos ou banco fora do ar caem no default seguro.
 *  - `ownerHours` (48h, fluxo distinto) NÃO é afetado por esta mudança.
 *
 * Referência: lib/platform-config.ts — getAutoCancelConfig()
 *             app/api/cron/expire-bookings/route.ts — consome pendingHours
 */

import { getAutoCancelConfig, clearPlatformConfigCache } from "@/lib/platform-config"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: { platformConfig: { findMany: jest.fn() } },
}))

const findMany = prisma.platformConfig.findMany as jest.Mock

function comConfig(overrides: Record<string, string> = {}) {
  clearPlatformConfigCache()
  const entries = Object.entries(overrides).map(([key, value]) => ({ key, value }))
  findMany.mockResolvedValue(entries)
}

beforeEach(() => jest.clearAllMocks())
afterEach(() => clearPlatformConfigCache())

// ---------------------------------------------------------------------------
// pendingHours — cancela PENDING sem resposta do proprietário
// ---------------------------------------------------------------------------

describe("getAutoCancelConfig — pendingHours", () => {
  it("default é 12h quando a chave não existe no banco", async () => {
    comConfig()
    const { pendingHours } = await getAutoCancelConfig()
    expect(pendingHours).toBe(12)
  })

  it("NÃO é 2h (regressão: valor antigo que cancelava reservas legítimas)", async () => {
    comConfig()
    const { pendingHours } = await getAutoCancelConfig()
    expect(pendingHours).not.toBe(2)
  })

  it("usa o valor configurado pelo admin quando presente", async () => {
    comConfig({ autoCancelPendingHours: "24" })
    const { pendingHours } = await getAutoCancelConfig()
    expect(pendingHours).toBe(24)
  })

  it.each([
    ["0",    "zero cancelaria imediatamente"],
    ["-1",   "negativo"],
    ["abc",  "texto não numérico"],
    ["",     "string vazia"],
  ])("ignora '%s' (%s) e usa o default de 12h", async (valor) => {
    comConfig({ autoCancelPendingHours: valor })
    const { pendingHours } = await getAutoCancelConfig()
    expect(pendingHours).toBe(12)
  })

  it("banco fora do ar não derruba o cron — devolve o default de 12h", async () => {
    clearPlatformConfigCache()
    findMany.mockRejectedValue(new Error("connection refused"))
    const { pendingHours } = await getAutoCancelConfig()
    expect(pendingHours).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// ownerHours — fluxo distinto (proprietário demora a devolver), não afetado
// ---------------------------------------------------------------------------

describe("getAutoCancelConfig — ownerHours (não afetado pela mudança)", () => {
  it("default de ownerHours permanece 48h", async () => {
    comConfig()
    const { ownerHours } = await getAutoCancelConfig()
    expect(ownerHours).toBe(48)
  })

  it("ownerHours é lido do banco independentemente de pendingHours", async () => {
    comConfig({ autoCancelOwnerHours: "72" })
    const { ownerHours } = await getAutoCancelConfig()
    expect(ownerHours).toBe(72)
  })

  it("pendingHours e ownerHours podem ser configurados de forma independente", async () => {
    comConfig({ autoCancelPendingHours: "6", autoCancelOwnerHours: "96" })
    const cfg = await getAutoCancelConfig()
    expect(cfg.pendingHours).toBe(6)
    expect(cfg.ownerHours).toBe(96)
  })
})
