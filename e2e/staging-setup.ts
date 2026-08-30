import fs from 'fs'
import { request, type APIRequestContext } from '@playwright/test'
import { TEST_ITEM_PATH } from './fixtures/test-paths'
import { SESSION_PATHS } from './fixtures/test-credentials'

const SESSION_PROPRIETARIO = SESSION_PATHS.proprietario

/** Lê o itemId do fixture. `undefined` = arquivo ausente ou ilegível (segue em frente calado). */
function readFixtureItemId(): string | undefined {
  if (!fs.existsSync(TEST_ITEM_PATH)) return undefined
  try {
    return (JSON.parse(fs.readFileSync(TEST_ITEM_PATH, 'utf-8')) as { itemId?: string }).itemId
  } catch {
    return undefined
  }
}

/**
 * Falha cedo, e com instrução, quando o item fixture sumiu do banco: sem ele `POST /api/bookings`
 * responde 422 ITEM_UNAVAILABLE e a suíte desaba em ~30 falhas espalhadas que não apontam a causa.
 */
function assertFixtureItemExists(itemId: string, status: number) {
  if (status >= 200 && status < 300) return
  throw new Error(
    `Item fixture ${itemId} não existe mais no staging (GET /api/items/${itemId} → ${status}).\n` +
    `Os smokes de reserva/review/devolução dependem dele e falhariam todos com 422 ITEM_UNAVAILABLE.\n` +
    `Conserto: rode o seed (idempotente, não apaga nada) antes da suíte:\n` +
    `  node --env-file=.env.staging-migrate --import tsx scripts/seed-staging-full.ts`,
  )
}

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
async function cleanupFixtureItemBookings(base: string, itemId: string) {
  if (!fs.existsSync(SESSION_PROPRIETARIO)) return

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

  // O GET do item fixture entra no MESMO Promise.all do aquecimento: é público como os demais,
  // custa latência incremental zero e ainda aquece /api/items/[id], que os smokes de reserva mais
  // usam — em vez de pagar um cold start serial só para essa checagem.
  const fixtureItemId = readFixtureItemId()
  const fixtureProbe  = fixtureItemId ? `/api/items/${fixtureItemId}` : null

  const [, fixtureRes] = await Promise.all([
    Promise.all(endpoints.map(endpoint => ctx.get(`${BASE}${endpoint}`).catch(() => null))),
    fixtureProbe ? ctx.get(`${BASE}${fixtureProbe}`).catch(() => null) : Promise.resolve(null),
  ])

  await ctx.dispose()

  // Sem o item fixture não há suíte: falha aqui, com instrução, em vez de ~30 falhas em cascata.
  // `fixtureRes === null` = falha de rede no probe; não é evidência de item ausente, deixa passar.
  if (fixtureItemId && fixtureRes) assertFixtureItemExists(fixtureItemId, fixtureRes.status())

  // Pré-limpeza de reservas residuais que bloqueiam as janelas de data dos smokes de booking/review.
  if (!fixtureItemId) return
  await cleanupFixtureItemBookings(BASE, fixtureItemId).catch(e =>
    console.warn('[staging-setup] pré-limpeza falhou (ignorado):', e instanceof Error ? e.message : e),
  )
}
