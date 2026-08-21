/** @jest-environment node */
/**
 * Valores de `<input type="date">` e `<input type="datetime-local">`.
 *
 * Arquivo fonte: utils/date-input.ts
 *
 * Por que este teste existe: em 21/08/2026, confirmar a retirada de uma reserva
 * em staging falhava com "Dados inválidos." mesmo com o código de 6 dígitos
 * correto. O campo de horário era pré-preenchido com
 * `new Date().toISOString().slice(0, 16)` — componentes em UTC — enquanto o
 * input lê a string como horário LOCAL. No Brasil (UTC−3) o campo nascia 3h no
 * futuro, e o servidor recusava pelo refinamento "não pode ser no futuro".
 *
 * Travava retirada (mark_active) E devolução (mark_returned) para todo usuário
 * a oeste de Greenwich. A variante de data pura (`type="date"`) erra só na
 * janela noturna, mas erra igual — e o repositório já a tinha remendado três
 * vezes em separado antes de existir este módulo.
 *
 * 🪤 O offset é MOCKADO, não herdado do ambiente. A CI roda em UTC, onde a
 * implementação quebrada e a correta produzem exatamente a mesma string — um
 * teste que dependesse do fuso da máquina passaria com o bug de volta.
 */
import { toDatetimeLocalValue, toDateInputValue, addDaysToDateInput } from "@/utils/date-input"

/** 21/08/2026 18:59:30 UTC — o instante real do bug em staging. */
const INSTANTE = new Date("2026-08-21T18:59:30.000Z")

/**
 * Fixa o fuso para o corpo do teste.
 *
 * Mocka `getTimezoneOffset` (usado por toDatetimeLocalValue) e os getters locais
 * (usados por toDateInputValue), porque as duas funções leem o fuso por
 * caminhos diferentes — mockar só um deixaria metade do módulo à mercê da CI.
 */
function comOffsetDe(minutos: number, fn: () => void) {
  const spies = [
    jest.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(minutos),
    jest.spyOn(Date.prototype, "getFullYear").mockImplementation(function (this: Date) {
      return new Date(this.getTime() - minutos * 60_000).getUTCFullYear()
    }),
    jest.spyOn(Date.prototype, "getMonth").mockImplementation(function (this: Date) {
      return new Date(this.getTime() - minutos * 60_000).getUTCMonth()
    }),
    jest.spyOn(Date.prototype, "getDate").mockImplementation(function (this: Date) {
      return new Date(this.getTime() - minutos * 60_000).getUTCDate()
    }),
  ]
  try {
    fn()
  } finally {
    spies.forEach((s) => s.mockRestore())
  }
}

describe("toDatetimeLocalValue", () => {
  it("em UTC−3 (Brasil) devolve o horário local, não o de UTC", () => {
    comOffsetDe(180, () => {
      // A versão antiga devolvia "2026-08-21T18:59", adiantando o campo em 3h.
      expect(toDatetimeLocalValue(INSTANTE)).toBe("2026-08-21T15:59")
    })
  })

  it("em UTC+2 devolve o horário local — a correção não é 'menos 3 horas'", () => {
    comOffsetDe(-120, () => {
      expect(toDatetimeLocalValue(INSTANTE)).toBe("2026-08-21T20:59")
    })
  })

  it("em UTC os dois comportamentos coincidem — por isso o bug passou despercebido", () => {
    comOffsetDe(0, () => {
      expect(toDatetimeLocalValue(INSTANTE)).toBe(INSTANTE.toISOString().slice(0, 16))
    })
  })

  it("atravessa a virada do dia sem pular a data", () => {
    // 22/08 00:30 UTC ainda é 21/08 21:30 em São Paulo.
    comOffsetDe(180, () => {
      expect(toDatetimeLocalValue(new Date("2026-08-22T00:30:00.000Z"))).toBe("2026-08-21T21:30")
    })
  })

  it("nunca produz um horário no futuro — é a comparação que o servidor faz", () => {
    const antes = Date.now()
    const enviado = new Date(toDatetimeLocalValue()) // o navegador relê como local
    expect(enviado.getTime()).toBeLessThanOrEqual(antes)
    // e só recua a truncagem dos segundos, não o offset inteiro
    expect(antes - enviado.getTime()).toBeLessThan(60_000)
  })
})

describe("toDateInputValue", () => {
  it("na janela noturna em UTC−3 não adianta a data", () => {
    // 22/08 00:30 UTC ainda é 21/08 no Brasil. `toISOString().slice(0, 10)`
    // devolveria "2026-08-22" e bloquearia locação no mesmo dia.
    comOffsetDe(180, () => {
      expect(toDateInputValue(new Date("2026-08-22T00:30:00.000Z"))).toBe("2026-08-21")
    })
  })

  it("aceita string ISO — as reservas guardam a data como ISO completo", () => {
    comOffsetDe(180, () => {
      expect(toDateInputValue("2026-08-21T15:00:00.000Z")).toBe("2026-08-21")
    })
  })

  it("preenche mês e dia com zero à esquerda", () => {
    comOffsetDe(0, () => {
      expect(toDateInputValue(new Date("2026-01-05T10:00:00.000Z"))).toBe("2026-01-05")
    })
  })
})

describe("addDaysToDateInput", () => {
  it("soma dias mantendo o formato do input", () => {
    comOffsetDe(180, () => {
      expect(addDaysToDateInput("2026-08-21", 1)).toBe("2026-08-22")
    })
  })

  it("aceita dias negativos — usado no filtro de 30 dias do admin", () => {
    comOffsetDe(180, () => {
      expect(addDaysToDateInput("2026-08-21", -30)).toBe("2026-07-22")
    })
  })

  it("atravessa a virada do mês e do ano", () => {
    comOffsetDe(180, () => {
      expect(addDaysToDateInput("2026-12-31", 1)).toBe("2027-01-01")
    })
  })

  it("tolera ISO completo na entrada — é o que ExtendBookingForm passa", () => {
    comOffsetDe(180, () => {
      expect(addDaysToDateInput("2026-08-21T15:00:00.000Z", 1)).toBe("2026-08-22")
    })
  })
})
