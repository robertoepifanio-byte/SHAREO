/**
 * Adianta o relógio da suíte para descobrir testes que dependem da data em que
 * rodam. Usado pelo script `test:futuro` (e pelo passo homônimo da CI), nunca
 * pela rodada normal.
 *
 * 🕓 Por que existe: em 02/09/2026 o teste de reemissão da taxa de atraso ficou
 * VERMELHO sozinho, às 12:00 UTC, sem ninguém tocar no código. A função lia
 * `new Date()` por dentro e o teste tinha datas fixas — passava só enquanto a
 * data real estivesse do lado certo delas. Não é um caso isolado possível: o
 * repo tem ~40 datas fixas em testes, e cada uma é uma bomba potencial.
 *
 * O que ele NÃO pega: `new Date()` avaliado no escopo do módulo, antes do
 * `beforeEach`. Pega o caso comum, que é relógio lido dentro do código sob
 * teste.
 *
 * Só `Date` é falsificado. Timers e I/O continuam reais — falsificá-los
 * penduraria qualquer teste que espere promessa ou timeout.
 */
const DESTINO = process.env.RELOGIO_EM ?? "2027-06-15T09:00:00Z"

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(DESTINO),
    doNotFake: [
      "setTimeout", "clearTimeout", "setInterval", "clearInterval",
      "setImmediate", "clearImmediate", "nextTick",
      "performance", "queueMicrotask", "requestAnimationFrame",
      "cancelAnimationFrame", "hrtime",
    ],
  })
})

afterEach(() => {
  jest.useRealTimers()
})
