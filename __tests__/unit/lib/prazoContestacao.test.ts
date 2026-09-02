/**
 * Prazo de contestação de disputa — 5 dias úteis.
 *
 * O prazo estava só no texto publicado: nada no sistema o calculava, e nem o
 * usuário nem a equipe sabiam quando vencia. Estes testes fixam a contagem,
 * porque um prazo MENOR que o prometido é exatamente o risco que o módulo
 * existe para evitar.
 */
import {
  prazoParaContestar, podeContestar, DIAS_UTEIS_CONTESTACAO,
} from "@/lib/prazoContestacao"

const dia = (iso: string) => new Date(`${iso}T12:00:00Z`)
const soData = (d: Date) => d.toISOString().slice(0, 10)

describe("prazoParaContestar", () => {
  it("são 5 dias úteis", () => {
    expect(DIAS_UTEIS_CONTESTACAO).toBe(5)
  })

  it("decisão na segunda vence na segunda seguinte", () => {
    // Seg 07/09 → ter, qua, qui, sex (4) → seg 14/09 (5º útil).
    expect(soData(prazoParaContestar(dia("2026-09-07")))).toBe("2026-09-14")
  })

  it("🪤 pula o fim de semana — decisão na quinta vence na quinta seguinte", () => {
    // Qui 03/09 → sex(1) · sáb/dom não contam · seg(2) ter(3) qua(4) qui(5).
    expect(soData(prazoParaContestar(dia("2026-09-03")))).toBe("2026-09-10")
  })

  it("decisão na sexta começa a contar só na segunda", () => {
    // Sex 04/09 → seg(1) ter(2) qua(3) qui(4) sex(5) = 11/09.
    expect(soData(prazoParaContestar(dia("2026-09-04")))).toBe("2026-09-11")
  })

  it("decisão no sábado não perde dias", () => {
    // Sáb 05/09 → seg(1) … sex(5) = 11/09, igual à sexta anterior.
    expect(soData(prazoParaContestar(dia("2026-09-05")))).toBe("2026-09-11")
  })

  it("o dia da decisão NÃO conta como o primeiro", () => {
    // Contar o próprio dia encurtaria o prazo em um dia — sempre contra o usuário.
    expect(soData(prazoParaContestar(dia("2026-09-07")))).not.toBe("2026-09-11")
  })

  it("vale o dia inteiro, até 23:59", () => {
    const prazo = prazoParaContestar(dia("2026-09-07"))
    // Quem lê "até 14/09" espera poder escrever no dia 14.
    expect(prazo.getUTCHours()).toBe(23)
    expect(prazo.getUTCMinutes()).toBe(59)
  })
})

describe("podeContestar", () => {
  const decisao = dia("2026-09-07") // segunda

  it("dentro da janela", () => {
    expect(podeContestar(decisao, dia("2026-09-08"))).toBe(true)
    expect(podeContestar(decisao, dia("2026-09-14"))).toBe(true)
  })

  it("fora da janela", () => {
    expect(podeContestar(decisao, dia("2026-09-15"))).toBe(false)
  })

  it("sem decisão registrada não há prazo correndo", () => {
    expect(podeContestar(null)).toBe(false)
  })
})
