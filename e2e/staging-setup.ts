import fs from 'fs'
import path from 'path'
import { request, type APIRequestContext } from '@playwright/test'

const SESSION_PROPRIETARIO = path.resolve('e2e/fixtures/session-proprietario.json')
const TEST_ITEM_PATH       = path.resolve('e2e/fixtures/test-item-id.json')

/**
 * Pré-limpeza: cancela reservas CONFIRMED/PENDING residuais no item fixture, deixadas por runs
 * anteriores que falharam no meio do ciclo.
 *
 * Só CONFIRMED e ACTIVE bloqueiam novas reservas (DATE_CONFLICT) — ver POST /api/bookings. O dono
 * pode cancelar CONFIRMED (e PENDING); ACTIVE não é cancelável (apenas logado como aviso).
 *
 * Sem isto, as janelas de data acumulam lixo e geram 409 em cascata:
 *   - booking-flow #5 não cria o PENDING → não atualiza test-booking-id.json
 *   - review #6 avança um booking COMPLETED obsoleto → 422 INVALID_TRANSITION / BOOKING_NOT_REVIEWABLE
 *   - double-booking #10A não consegue criar o 1º PENDING
 *
 * Best-effort: qualquer falha aqui é ignorada (não derruba a suíte).
 */
async function cleanupFixtureItemBookings(base: string) {
  if (!fs.existsSync(SESSION_PROPRIETARIO) || !fs.existsSync(TEST_ITEM_PATH)) return

  let itemId: string | undefined
  try {
    itemId = (JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId?: string }).itemId
  } catch {
    return
  }
  if (!itemId) return

  const e2eToken = process.env.E2E_SECRET
  let owner: APIRequestContext
  try {
    owner = await request.newContext({
      baseURL:          base,
      storageState:     SESSION_PROPRIETARIO,
      extraHTTPHeaders: e2eToken ? { 'x-e2e-token': e2eToken } : {},
    })
  } catch {
    return
  }

  let cancelled = 0
  let activeLeftover = 0
  try {
    // CONFIRMED bloqueia datas e é cancelável pelo dono. PENDING não bloqueia, mas limpamos por higiene.
    for (const status of ['CONFIRMED', 'PENDING'] as const) {
      for (let pg = 1; pg <= 5; pg++) {
        const res = await owner.get(`/api/bookings?role=owner&status=${status}&page=${pg}&limit=50`).catch(() => null)
        if (!res || !res.ok()) break
        const body = (await res.json().catch(() => null)) as
          | { data?: Array<{ id: string; item?: { id?: string } }>; meta?: { hasMore?: boolean } }
          | null
        for (const b of body?.data ?? []) {
          if (b.item?.id !== itemId) continue
          const cancel = await owner
            .patch(`/api/bookings/${b.id}`, {
              data: { action: 'cancel', reason: 'Pré-limpeza E2E — libera a janela de datas do item fixture' },
            })
            .catch(() => null)
          if (cancel?.ok()) cancelled++
        }
        if (!body?.meta?.hasMore) break
      }
    }

    // ACTIVE não é cancelável — só registra para diagnóstico manual.
    const activeRes = await owner.get(`/api/bookings?role=owner&status=ACTIVE&limit=50`).catch(() => null)
    if (activeRes?.ok()) {
      const body = (await activeRes.json().catch(() => null)) as { data?: Array<{ item?: { id?: string } }> } | null
      activeLeftover = (body?.data ?? []).filter((b) => b.item?.id === itemId).length
    }
  } finally {
    await owner.dispose()
  }

  console.log(
    `[staging-setup] pré-limpeza item fixture: ${cancelled} reserva(s) cancelada(s)` +
      (activeLeftover ? `; ⚠️ ${activeLeftover} ACTIVE não-cancelável(is) (resolver manualmente)` : ''),
  )
}

export default async function globalSetup() {
  const BASE = process.env.STAGING_URL
    ?? 'https://shareo-rouge.vercel.app'

  const ctx = await request.newContext()

  // Aquece as serverless functions principais antes da suite rodar.
  // Evita cold start de 8-10s (Vercel Hobby) dentro dos timeouts de assertion.
  // /api/auth/register e /api/auth/callback/credentials são críticos para auth.spec.ts.
  const endpoints = [
    '/',
    '/login',
    '/cadastro',
    '/itens',
    '/api/health',
    '/api/auth/providers',
    '/api/auth/register',
    '/api/auth/callback/credentials',
  ]

  await Promise.all(
    endpoints.map(endpoint =>
      ctx.get(`${BASE}${endpoint}`).catch(() => null),
    ),
  )

  await ctx.dispose()

  // Pré-limpeza de reservas residuais que bloqueiam as janelas de data dos smokes de booking/review.
  await cleanupFixtureItemBookings(BASE).catch(e =>
    console.warn('[staging-setup] pré-limpeza falhou (ignorado):', e instanceof Error ? e.message : e),
  )
}
