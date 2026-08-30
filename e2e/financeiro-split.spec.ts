/**
 * E2E — Split financeiro ponta a ponta (comissão ShareO / repasse ao proprietário)
 *
 * Percorre o ciclo real de uma reserva — criação, confirmação, pagamento (via rota
 * de apoio E2E, que simula o webhook do checkout), retirada, devolução com foto e
 * confirm_return — e verifica que o `Payout` criado em `criarPayoutDaReserva`
 * (lib/payout.ts) bate exatamente com `calcSplit()` (lib/platform-config.ts) para
 * a taxa EFETIVA do sistema no momento do teste.
 *
 * 🔑 A taxa não é hardcoded (ver feedback-taxa-dinamica na memória do projeto):
 * lida de GET /api/platform-config/public, a mesma fonte que a Central de Ajuda
 * usa — se um SuperAdmin mudar `platformFeeRate`, o teste continua válido.
 *
 * A fórmula de `calcSplitEsperado` abaixo espelha `calcSplit()` em vez de
 * importá-la: specs de e2e/ rodam contra o staging JÁ publicado, sem tocar
 * `@/lib` (que puxaria Prisma e env de servidor) — o mesmo motivo por trás de
 * nenhum outro spec deste diretório importar de `lib/`. A própria `calcSplit`
 * já tem cobertura unitária em `__tests__/unit/lib/platform-config.test.ts`;
 * aqui o que se prova é a integração ponta a ponta, não a fórmula isolada.
 *
 * Preço do item escolhido (pricePerDay 5000, 2 dias = totalPrice 10000) para que
 * 15% em basis points caia num número inteiro de centavos com a taxa padrão
 * (1500 bps → platformFeeAmount 1500, ownerNetAmount 8500) — evita que um
 * arredondamento mascare um erro de fórmula.
 *
 * Pré-requisito: pnpm tsx scripts/create-staging-fixtures.ts (mesmas fixtures de
 * return-flow.spec.ts — o proprietário fixture já tem OwnerPaymentAccount com
 * Stripe Connect ativo em staging).
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'
import { SESSION_PATHS } from './fixtures/test-credentials'
import { apiWithRetry, markBookingPaidForTest, enviarFotoDevolucao, createTestItem, futureWindow, rndOffset } from './_support'

const hasSessions =
  fs.existsSync(SESSION_PATHS.locatario) &&
  fs.existsSync(SESSION_PATHS.proprietario)

/** Basis points → centavos (1500 → 15%). Espelha calcSplit() de lib/platform-config.ts — ver nota no cabeçalho. */
function calcSplitEsperado(totalPrice: number, feeRateBps: number) {
  const platformFeeAmount = Math.round(totalPrice * feeRateBps / 10000)
  const ownerNetAmount    = totalPrice - platformFeeAmount
  return { platformFeeAmount, ownerNetAmount }
}

test.describe('financeiro — split de comissão ponta a ponta (real booking cycle)', () => {
  test.skip(!hasSessions, 'Requer session-locatario.json e session-proprietario.json')

  test('reserva paga → devolvida → Payout bate exatamente com calcSplit() na taxa efetiva', async ({ browser }) => {
    test.setTimeout(150_000)

    const propCtx = await browser.newContext({ storageState: SESSION_PATHS.proprietario })
    const locCtx  = await browser.newContext({ storageState: SESSION_PATHS.locatario })
    const prop    = await propCtx.newPage()
    const loc     = await locCtx.newPage()

    let itemId:    string | null = null
    let bookingId: string | null = null

    try {
      // ── 0. Taxa efetiva do sistema + item de preço conhecido, em paralelo ───
      // (independentes: a taxa não depende do item nem vice-versa)
      const [cfgRes, itemId_] = await Promise.all([
        apiWithRetry(() => loc.request.get('/api/platform-config/public')),
        createTestItem(prop, `Split financeiro E2E ${Date.now()}`, 'Item de teste E2E — split financeiro (pode ser removido)'),
      ])
      expect(cfgRes.ok(), 'GET /api/platform-config/public falhou').toBeTruthy()
      const { data: cfg } = await cfgRes.json() as { data: { feeRateBps: number } }
      expect(Number.isInteger(cfg.feeRateBps)).toBe(true)
      console.log(`  taxa efetiva: ${cfg.feeRateBps} bps (${cfg.feeRateBps / 100}%)`)

      test.skip(!itemId_, 'Não foi possível criar o item de teste (setup falhou)')
      itemId = itemId_

      // ── 1. Reserva de 2 dias (pricePerDay 5000 × 2 = totalPrice 10000) ──────
      await test.step('reserva de 2 dias', async () => {
        const { start, end } = futureWindow(rndOffset(600, 660), 2)
        const createBookingRes = await apiWithRetry(() =>
          loc.request.post('/api/bookings', {
            data: { itemId: itemId!, startDate: start, endDate: end, borrowerNote: 'E2E — split financeiro.' },
          })
        )
        const createBody = await createBookingRes.json().catch(() => ({}))
        expect(createBookingRes.status(), `criação da reserva falhou: ${JSON.stringify(createBody)}`).toBe(201)
        bookingId = (createBody as { data: { id: string; totalPrice: number } }).data.id
        expect((createBody as { data: { totalPrice: number } }).data.totalPrice, 'totalPrice deve ser 10000 (5000 × 2 dias)').toBe(10000)
      })

      // ── 2. Confirma, marca pago, retira ─────────────────────────────────────
      await test.step('confirma, marca pago e retira (ACTIVE)', async () => {
        const confirmRes = await apiWithRetry(() =>
          prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm' } })
        )
        expect(confirmRes.ok(), `confirm falhou (${confirmRes.status()})`).toBeTruthy()

        const detailRes = await apiWithRetry(() => prop.request.get(`/api/bookings/${bookingId!}`))
        const pickupToken = (await detailRes.json() as { data: { pickupToken: string | null } }).data.pickupToken
        expect(pickupToken).toBeTruthy()

        await markBookingPaidForTest(prop.request, bookingId!)

        const activeRes = await apiWithRetry(() =>
          prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'mark_active', pickupToken } })
        )
        expect(activeRes.ok(), `mark_active falhou (${activeRes.status()})`).toBeTruthy()
      })

      // ── 3. Devolve (com foto obrigatória), locador confirma recebimento, e o
      //      Payout — criado com `await` DENTRO do confirm_return (não é
      //      fire-and-forget: app/api/bookings/[id]/route.ts aguarda
      //      criarPayoutDaReserva antes de responder) — já está lá no GET
      //      seguinte, sem precisar de retry/poll. ──────────────────────────
      await test.step('devolve, confirma recebimento (COMPLETED) e confere o Payout', async () => {
        const fotoRes = await enviarFotoDevolucao(loc.request, bookingId!)
        expect(fotoRes.ok(), `upload da foto de devolução falhou (${fotoRes.status()})`).toBeTruthy()

        const returnedRes = await apiWithRetry(() =>
          loc.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'mark_returned' } })
        )
        expect(returnedRes.ok(), `mark_returned falhou (${returnedRes.status()})`).toBeTruthy()

        const completeRes = await apiWithRetry(() =>
          prop.request.patch(`/api/bookings/${bookingId!}`, { data: { action: 'confirm_return' } })
        )
        const completeBody = await completeRes.json().catch(() => ({}))
        expect(completeRes.status(), `confirm_return falhou: ${JSON.stringify(completeBody)}`).toBe(200)
        expect((completeBody as { data: { status: string } }).data.status).toBe('COMPLETED')

        const esperado = calcSplitEsperado(10000, cfg.feeRateBps)
        console.log(`  esperado: ownerNet=${esperado.ownerNetAmount} platformFee=${esperado.platformFeeAmount}`)

        const payoutsRes = await apiWithRetry(() => prop.request.get('/api/user/payouts'))
        expect(payoutsRes.ok(), `GET /api/user/payouts falhou (${payoutsRes.status()})`).toBeTruthy()
        const { data } = await payoutsRes.json() as { data: { payouts: { amount: number; booking: { id: string } }[] } }
        const payout = data.payouts.find((p) => p.booking.id === bookingId)

        expect(payout, 'Payout da reserva não apareceu em /api/user/payouts após confirm_return').toBeTruthy()
        expect(payout!.amount, `Payout deveria ser ${esperado.ownerNetAmount} (85% de 10000 à taxa ${cfg.feeRateBps}bps)`).toBe(esperado.ownerNetAmount)

        // Comissão da ShareO = a diferença — não existe endpoint que exponha
        // platformFeeAmount por reserva ao proprietário (dado da plataforma, não
        // dele), então a prova é por dedução: total − repasse = taxa.
        const comissaoImplicita = 10000 - payout!.amount
        expect(comissaoImplicita, 'comissão implícita (total − repasse) deve bater com platformFeeAmount').toBe(esperado.platformFeeAmount)

        console.log(`  ✓ Payout real: ${payout!.amount} (repasse 85%) | comissão ShareO: ${comissaoImplicita} (15%)`)
      })
    } finally {
      if (itemId) await prop.request.delete(`/api/items/${itemId}`).catch(() => {})
    }
  })
})
