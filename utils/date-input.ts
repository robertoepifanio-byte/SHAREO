/**
 * Valores para `<input type="date">` e `<input type="datetime-local">`.
 *
 * 🪤 A armadilha que este módulo existe para fechar: `toISOString()` serializa em
 * UTC, mas os dois inputs leem a string como horário LOCAL. Usar um direto no
 * outro desloca o campo pelo offset do fuso — no Brasil (UTC−3), 3 horas.
 *
 * O repositório já tinha descoberto e remendado isso TRÊS vezes em separado
 * (`app/carrinho/_CartView.tsx`, `app/itens/[id]/_PriceCalc.tsx`, e o conserto de
 * 21/08/2026 na retirada/devolução), cada uma sob um nome diferente. As cópias
 * chegaram a divergir entre si. Este módulo é o lar único — qualquer valor de
 * input de data sai daqui.
 *
 * Como cada campo falha quando erra:
 *   - `datetime-local`: o valor nasce adiantado pelo offset inteiro. Foi o que
 *     impediu confirmar retirada e devolução — o horário pré-preenchido chegava
 *     ao servidor no futuro e o Zod recusava.
 *   - `date`: o valor vira o dia seguinte na janela noturna (21h–00h em UTC−3),
 *     o que bloqueia locação no mesmo dia e pode pôr um `min=` um dia à frente
 *     da única escolha legal.
 */

/**
 * "YYYY-MM-DDTHH:MM" no fuso do usuário, para `<input type="datetime-local">`.
 *
 * Descontar `getTimezoneOffset()` antes de serializar faz o ISO carregar os
 * componentes locais. O `.slice(0, 16)` já corta nos minutos, então não há
 * segundos a zerar.
 */
export function toDatetimeLocalValue(date: Date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

/** "YYYY-MM-DD" no fuso do usuário, para `<input type="date">`. */
export function toDateInputValue(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Soma dias a uma data de input ("YYYY-MM-DD"), devolvendo o mesmo formato.
 *
 * Ancora no meio-dia LOCAL antes de somar: é o que protege a conta do horário
 * de verão e de qualquer offset entre −12h e +12h. A cópia em
 * `components/booking/ExtendBookingForm.tsx` não tinha essa âncora e por isso
 * divergia das outras duas.
 */
export function addDaysToDateInput(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toDateInputValue(d)
}
