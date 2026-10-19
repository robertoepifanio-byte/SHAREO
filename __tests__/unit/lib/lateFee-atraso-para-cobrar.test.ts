/** @jest-environment node */
/**
 * atrasoParaCobrar — a regra única fim → houveAtraso → dias usada pelo cron, pelo
 * admin e pela cobrança sob demanda do locatário. Fixa a decisão do fundador
 * (19/10/2026): o teto de 30 dias só vale com o item ainda fora; devolvido,
 * o devido é o atraso real (45 dias = 45 dias).
 */
import { atrasoParaCobrar, fimDoAtrasoDe } from "@/lib/lateFee"

const FIM    = new Date("2026-01-01T12:00:00Z")
const AGORA  = new Date("2026-03-01T12:00:00Z") // 59 dias depois
const D45    = new Date("2026-02-15T12:00:00Z") // 45 dias depois

it("item ainda fora: corre até agora, com teto de 30 dias", () => {
  const r = atrasoParaCobrar({ endDate: FIM }, AGORA)!
  expect(r.fimDoAtraso).toEqual(AGORA)
  expect(r.dias).toBe(30)
})

it("devolvido: congela na devolução e NÃO aplica teto (45 dias = 45)", () => {
  const r = atrasoParaCobrar({ endDate: FIM, returnRequestedAt: D45 }, AGORA)!
  expect(r.fimDoAtraso).toEqual(D45)
  expect(r.dias).toBe(45)
})

it("returnRequestedAt vale mais que returnedAt", () => {
  expect(fimDoAtrasoDe({ returnRequestedAt: D45, returnedAt: AGORA }, AGORA)).toEqual(D45)
  expect(fimDoAtrasoDe({ returnedAt: D45 }, AGORA)).toEqual(D45)
})

it("admin (aplicarTeto:false) passa dos 30 dias com o item fora", () => {
  expect(atrasoParaCobrar({ endDate: FIM }, AGORA, { aplicarTeto: false })!.dias).toBe(59)
})

it("devolvido dentro do prazo: null", () => {
  expect(atrasoParaCobrar({ endDate: FIM, returnRequestedAt: new Date("2025-12-30T12:00:00Z") }, AGORA)).toBeNull()
})
