/**
 * ShareO — Top-up da base de validação no staging (Fase 4)
 * ---------------------------------------------------------
 * Objetivo: repor a base após a deduplicação agressiva da Fase 3 que colapsou
 * anúncios de donos diferentes para apenas 28 itens.
 *
 * Este script:
 *   1. Lê o estado atual do banco (donos, itens existentes, títulos)
 *   2. Adiciona itens até ~80 AVAILABLE, distribuídos por TODOS os donos demo
 *      - PJ com 3–5 itens, PF "proprietário" com 1–3 itens
 *      - ~15 PF ficam como locatários puros (sem itens)
 *   3. Garante que NENHUM título é exatamente duplicado
 *      (formato "<produto> — <bairro>"; se colidir, acrescenta sufixo único)
 *   4. Cria ~35 reservas novas (maioria COMPLETED) com chat, payouts PENDING e reviews
 *   5. Exibe relatório final com todos os critérios de verificação
 *
 * NUNCA faz reset. NUNCA mexe nos PENDING/ACTIVE/RETURNED já existentes.
 * Sempre usa .env.staging-migrate (banco real do staging).
 *
 * Uso:
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/topup-staging-demo.ts
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/topup-staging-demo.ts --dry-run
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/topup-staging-demo.ts --report
 */

import { PrismaClient } from "@prisma/client"
import {
  loadEnvFile,
  HttpClient,
  withRetry,
  dbRetry,
  markEmailVerified,
  ensureOwnerPaymentAccount,
  markBookingPaid,
  getFeeBps,
  getCategories,
  reaisToCents,
  fmtBRL,
  makePrisma,
} from "./lib/sim-shared"
import {
  CATALOG,
  CITIES,
  derivePrices,
  pickRentalDays,
  type CatalogItem,
  type City,
} from "./lib/demo-catalog"

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_DOMAIN = "demo.shareo.com.br"
const DEMO_PASSWORD = "DemoShareo@2026"
const BASE_URL = "https://staging.shareo.com.br"

// Meta de itens AVAILABLE após o top-up
const TARGET_ITEMS = 80

// Pesos de desfecho para as novas reservas
// Foco: maioria COMPLETED para repor payouts, com cobertura dos demais estados
const OUTCOME_WEIGHTS: Record<string, number> = {
  COMPLETED: 55,    // completa o ciclo → gera payout PENDING + review
  LATE_RETURN: 8,   // completa o ciclo com atraso
  CANCELLED: 15,    // cancela em algum ponto
  DISPUTED: 7,      // abre disputa após mark_active
  CONFIRMED: 10,    // confirmado mas aguardando pagamento
  ACTIVE: 5,        // pago e em andamento (não fecha o ciclo)
}

// Mensagens de chat para novas reservas
const CHAT_BORROWER = [
  "Olá! Ainda está disponível para o período?",
  "Ótimo! Posso buscar amanhã cedo?",
  "Combinado, obrigado pela atenção.",
  "Item recebido, tudo em perfeito estado!",
]
const CHAT_OWNER = [
  "Olá! Sim, pode reservar.",
  "Perfeito, confirmo a reserva.",
  "Qualquer dúvida pode me chamar aqui.",
  "Ótimo! Avalie quando puder.",
]

// Comentários de review
const REVIEW_COMMENTS_ITEM = [
  "Produto exatamente como descrito, ótima experiência.",
  "Item em excelente estado, muito bem conservado.",
  "Adorei! Voltarei a alugar com certeza.",
  "Rápido, prático e o item estava impecável.",
  "Ótima qualidade, superou as expectativas.",
]
const REVIEW_COMMENTS_OWNER = [
  "Proprietário super atencioso e pontual.",
  "Comunicação excelente, recomendo muito.",
  "Muito cuidadoso e honesto. Perfeito.",
  "Ótimo proprietário, sem nenhuma complicação.",
]
const REVIEW_COMMENTS_BORROWER = [
  "Locatário muito cuidadoso, devolveu tudo em ordem.",
  "Excelente locatário, super recomendo.",
  "Devolveu no prazo e em perfeito estado.",
  "Comunicação ágil e responsável. Voltaria a alugar.",
]

// ─────────────────────────────────────────────────────────────────────────────
// RNG seedável (seed diferente dos scripts anteriores)
// ─────────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(20260619) // seed novo para Fase 4
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const jitter = (base: number, amp: number) => base + (rnd() - 0.5) * 2 * amp
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function weightedOutcome(): string {
  const total = Object.values(OUTCOME_WEIGHTS).reduce((s, w) => s + w, 0)
  let r = rnd() * total
  for (const [k, w] of Object.entries(OUTCOME_WEIGHTS)) {
    if ((r -= w) < 0) return k
  }
  return "COMPLETED"
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

interface DemoOwner {
  id: string
  name: string
  email: string
  city: City
  userType: "PF" | "PJ"
  http: HttpClient
  itemCount: number // itens já existentes no banco
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de título único
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera um título único globalmente.
 * Formato base: "<produto> — <bairro>"
 * Se já existir no conjunto `existingTitles`, acrescenta sufixo numérico.
 */
function makeUniqueTitle(
  product: string,
  bairro: string,
  existingTitles: Set<string>,
): string {
  const base = `${product} — ${bairro}`
  if (!existingTitles.has(base)) {
    existingTitles.add(base)
    return base
  }
  // Tenta com sufixo numérico até encontrar um livre
  for (let n = 2; n <= 99; n++) {
    const candidate = `${product} — ${bairro} #${n}`
    if (!existingTitles.has(candidate)) {
      existingTitles.add(candidate)
      return candidate
    }
  }
  // Fallback extremo: UUID curto
  const uid = Math.random().toString(36).slice(2, 8)
  const fallback = `${product} — ${bairro} (${uid})`
  existingTitles.add(fallback)
  return fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Publicar item com 3 fotos
// ─────────────────────────────────────────────────────────────────────────────

async function publishItemWith3Photos(
  prisma: PrismaClient,
  itemId: string,
  images: [string, string, string],
) {
  await dbRetry(async () => {
    for (let i = 0; i < 3; i++) {
      await prisma.itemImage.create({
        data: { itemId, url: images[i], order: i },
      })
    }
    await prisma.item.update({
      where: { id: itemId },
      data: { status: "AVAILABLE", isApproved: true },
    })
  }, "publishItemWith3Photos")
}

// ─────────────────────────────────────────────────────────────────────────────
// Login de usuário existente (os donos já foram criados no seed anterior)
// ─────────────────────────────────────────────────────────────────────────────

async function loginUser(
  email: string,
  e2eToken: string | undefined,
): Promise<HttpClient | null> {
  const http = new HttpClient(BASE_URL, e2eToken)
  const ok = await http.login(email, DEMO_PASSWORD)
  if (!ok) return null
  return http
}

// ─────────────────────────────────────────────────────────────────────────────
// Criar item para um dono existente
// ─────────────────────────────────────────────────────────────────────────────

async function createItemForOwner(
  prisma: PrismaClient,
  categories: Map<string, string>,
  owner: DemoOwner,
  catalogItem: CatalogItem,
  existingTitles: Set<string>,
): Promise<string | null> {
  const categoryId = categories.get(catalogItem.categorySlug)
  if (!categoryId) {
    console.error(`  categoria nao encontrada: ${catalogItem.categorySlug}`)
    return null
  }

  const bairro = pick(owner.city.bairros)
  const title = makeUniqueTitle(catalogItem.title, bairro, existingTitles)
  const prices = derivePrices(catalogItem.pricePerDayReais)
  const lat = jitter(owner.city.lat, 0.05)
  const lng = jitter(owner.city.lng, 0.05)

  const res = await withRetry(
    () =>
      owner.http.json("POST", "/api/items", {
        title,
        description: catalogItem.description,
        categoryId,
        condition: catalogItem.condition,
        pricePerDay: prices.pricePerDay,
        pricePerWeek: prices.pricePerWeek,
        pricePerMonth: prices.pricePerMonth,
        estimatedRetailPrice: reaisToCents(catalogItem.estimatedRetailReais),
        city: owner.city.city,
        state: owner.city.state,
        neighborhood: bairro,
        latitude: lat,
        longitude: lng,
        requireIdVerification: false,
        requirePhone: false,
      }),
    `create-item:${catalogItem.title}`,
  )

  if (res.status !== 201) {
    console.error(
      `  item "${title.slice(0, 45)}" → ${res.status} ${JSON.stringify(
        (res.data as { error?: string })?.error ?? "",
      )}`,
    )
    return null
  }

  const resData = res.data as { data: { id: string } }
  const itemId = resData.data.id
  await publishItemWith3Photos(prisma, itemId, catalogItem.images)

  console.log(`    + item "${title.slice(0, 50)}" ${fmtBRL(prices.pricePerDay)}/dia`)
  return itemId
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat helper
// ─────────────────────────────────────────────────────────────────────────────

async function sendChat(
  conversationId: string,
  borrowerHttp: HttpClient,
  ownerHttp: HttpClient,
  turns: number,
) {
  for (let t = 0; t < turns; t++) {
    const fromBorrower = t % 2 === 0
    const http = fromBorrower ? borrowerHttp : ownerHttp
    const msgs = fromBorrower ? CHAT_BORROWER : CHAT_OWNER
    const msg = msgs[Math.min(t, msgs.length - 1)]
    await http
      .json("POST", `/api/conversations/${conversationId}/messages`, { content: msg })
      .catch(() => {/* ignora falha de chat */})
    await sleep(80)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ciclo de reserva completo (com desfecho ponderado)
// ─────────────────────────────────────────────────────────────────────────────

async function runBooking(
  prisma: PrismaClient,
  feeBps: number,
  borrowerHttp: HttpClient,
  borrowerId: string,
  ownerHttp: HttpClient,
  ownerId: string,
  itemId: string,
  pricePerDay: number,
  startOffsetDays: number,
): Promise<{ outcome: string; bookingId: string; itemId: string } | null> {
  const outcome = weightedOutcome()
  const days = pickRentalDays(pricePerDay, rnd)

  const start = new Date()
  start.setDate(start.getDate() + startOffsetDays)
  start.setHours(10, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + days)

  const created = await withRetry(
    () =>
      borrowerHttp.json("POST", "/api/bookings", {
        itemId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        borrowerNote: "Reserva de demonstração — dados fictícios.",
      }),
    "create-booking",
  )

  if (created.status !== 201) {
    const errData = created.data as { error?: string; message?: string } | null
    console.error(
      `    reserva → ${created.status} ${JSON.stringify(errData?.error ?? errData?.message ?? "")}`,
    )
    return null
  }

  const createdData = created.data as {
    data: { id: string; conversationId: string; totalPrice: number }
  }
  const { id: bookingId, conversationId, totalPrice } = createdData.data

  // Chat inicial (2-3 turnos)
  await sendChat(conversationId, borrowerHttp, ownerHttp, Math.floor(rnd() * 2) + 2)

  const actOwner = (body: Record<string, unknown>) =>
    ownerHttp.json("PATCH", `/api/bookings/${bookingId}`, body)
  const actBorrower = (body: Record<string, unknown>) =>
    borrowerHttp.json("PATCH", `/api/bookings/${bookingId}`, body)

  // ── CANCELLED ────────────────────────────────────────────────────────────
  if (outcome === "CANCELLED") {
    if (rnd() < 0.5) await actOwner({ action: "confirm" })
    const isOwner = rnd() < 0.5
    await (isOwner ? actOwner : actBorrower)({
      action: "cancel",
      reason: pick(["Mudança de planos", "Encontrei outra opção", "Não preciso mais"]),
    })
    console.log(`    CANCELADA ${fmtBRL(totalPrice)}`)
    return { outcome, bookingId, itemId }
  }

  // ── CONFIRMED (confirmado, aguardando pagamento) ──────────────────────────
  if (outcome === "CONFIRMED") {
    await actOwner({ action: "confirm" })
    console.log(`    CONFIRMADA aguardando pag. ${fmtBRL(totalPrice)}`)
    return { outcome, bookingId, itemId }
  }

  // Confirmar
  const conf = await actOwner({ action: "confirm" })
  if (conf.status !== 200) {
    console.error(`    confirmar → ${conf.status}`)
    return null
  }

  // Marcar como pago
  await markBookingPaid(prisma, bookingId, totalPrice, feeBps)

  // ── ACTIVE (pago, sem retirada) ───────────────────────────────────────────
  if (outcome === "ACTIVE") {
    console.log(`    ACTIVE pago aguardando retirada ${fmtBRL(totalPrice)}`)
    return { outcome, bookingId, itemId }
  }

  // Buscar pickupToken
  const tokenRow = await dbRetry(async () => {
    const r = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { pickupToken: true },
    })
    if (!r?.pickupToken)
      throw Object.assign(new Error("pickupToken nao visivel"), { code: "P2025" })
    return r
  }, "pickupToken")

  const activeRes = await actOwner({
    action: "mark_active",
    pickupToken: tokenRow?.pickupToken,
  })
  if (activeRes.status !== 200) {
    console.error(`    mark_active → ${activeRes.status}`)
    return null
  }

  // ── DISPUTED ─────────────────────────────────────────────────────────────
  if (outcome === "DISPUTED") {
    const isOwner = rnd() < 0.5
    await (isOwner ? actOwner : actBorrower)({
      action: "open_dispute",
      reason: pick(["Item com defeito", "Peça danificada", "Discordância sobre o estado"]),
    })
    console.log(`    DISPUTADA ${fmtBRL(totalPrice)}`)
    return { outcome, bookingId, itemId }
  }

  // ── COMPLETED / LATE_RETURN → completa o ciclo ───────────────────────────
  await borrowerHttp.uploadFotoDevolucao(bookingId)
  await actBorrower({ action: "mark_returned" })
  await actOwner({ action: "confirm_return" })

  if (outcome === "LATE_RETURN") {
    // Marca devolução com atraso (cosmético via Prisma)
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        endDate: new Date(Date.now() - 36 * 3600 * 1000),
        lateFeeAmount: Math.round(pricePerDay * 0.5),
      },
    }).catch(() => {})
    console.log(`    CONCLUIDA COM ATRASO ${fmtBRL(totalPrice)}`)
  } else {
    console.log(`    CONCLUIDA ${fmtBRL(totalPrice)}`)
  }

  return { outcome, bookingId, itemId }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews para reservas COMPLETED / LATE_RETURN
// ─────────────────────────────────────────────────────────────────────────────

async function createReviews(
  borrowerHttp: HttpClient,
  borrowerId: string,
  ownerHttp: HttpClient,
  ownerId: string,
  bookingId: string,
  itemId: string,
) {
  const ratings = [4, 5]

  // Locatário avalia o item
  await borrowerHttp
    .json("POST", "/api/reviews", {
      bookingId,
      revieweeId: ownerId,
      itemId,
      reviewType: "ITEM",
      rating: pick(ratings),
      comment: pick(REVIEW_COMMENTS_ITEM),
    })
    .catch(() => {})

  await sleep(100)

  // Locatário avalia o proprietário
  await borrowerHttp
    .json("POST", "/api/reviews", {
      bookingId,
      revieweeId: ownerId,
      reviewType: "OWNER",
      rating: pick(ratings),
      comment: pick(REVIEW_COMMENTS_OWNER),
    })
    .catch(() => {})

  await sleep(100)

  // Proprietário avalia o locatário
  await ownerHttp
    .json("POST", "/api/reviews", {
      bookingId,
      revieweeId: borrowerId,
      reviewType: "BORROWER",
      rating: pick(ratings),
      comment: pick(REVIEW_COMMENTS_BORROWER),
    })
    .catch(() => {})
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório final
// ─────────────────────────────────────────────────────────────────────────────

async function printReport(prisma: PrismaClient) {
  console.log("\n══════════════════════════════════════════════════════════════")
  console.log("  RELATORIO FINAL — Fase 4 Top-up")
  console.log("══════════════════════════════════════════════════════════════")

  // Usuários
  const [pfDemo, pjDemo, keepList, allUsers] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: `@${DEMO_DOMAIN}` }, userType: "PF" } }),
    prisma.user.count({ where: { email: { endsWith: `@${DEMO_DOMAIN}` }, userType: "PJ" } }),
    prisma.user.count({ where: { NOT: { email: { endsWith: `@${DEMO_DOMAIN}` } } } }),
    prisma.user.count(),
  ])

  console.log("\n  USUARIOS:")
  console.log(`    PF demo (@${DEMO_DOMAIN}):  ${pfDemo}`)
  console.log(`    PJ demo (@${DEMO_DOMAIN}):  ${pjDemo}`)
  console.log(`    keep-list (nao-demo):        ${keepList}`)
  console.log(`    TOTAL:                       ${allUsers}`)

  // Donos demo sem nenhum item
  const demoOwners = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true, email: true, _count: { select: { items: true } } },
  })
  const ownersWithItems = demoOwners.filter((u) => u._count.items > 0).length
  const ownersWithoutItems = demoOwners.filter((u) => u._count.items === 0).length

  console.log(`\n  DONOS DEMO:`)
  console.log(`    Com ao menos 1 item:    ${ownersWithItems}`)
  console.log(`    Sem nenhum item:        ${ownersWithoutItems} (esperado ~15 PF locatarios puros)`)

  // Itens AVAILABLE
  const itemsAvailable = await prisma.item.count({ where: { status: "AVAILABLE" } })

  // Contagem de fotos por item (via raw)
  type ImageCountRow = { itemId: string; cnt: bigint }
  const imageCounts = await prisma.$queryRaw<ImageCountRow[]>`
    SELECT "itemId", COUNT(*) as cnt
    FROM "item_images"
    WHERE "itemId" IN (
      SELECT id FROM "items" WHERE status = 'AVAILABLE'
    )
    GROUP BY "itemId"
  `
  const itemsWith3 = imageCounts.filter((r) => Number(r.cnt) === 3).length
  const itemsWithout3 = itemsAvailable - itemsWith3

  console.log("\n  ITENS:")
  console.log(`    AVAILABLE:             ${itemsAvailable} (meta: ~${TARGET_ITEMS})`)
  console.log(`    Com exatamente 3 fotos: ${itemsWith3}`)
  console.log(`    Com != 3 fotos (PROB): ${itemsWithout3}`)

  // Títulos exatamente duplicados
  const allTitles = await prisma.item.findMany({
    where: { status: "AVAILABLE" },
    select: { title: true },
  })
  const titleCount = new Map<string, number>()
  for (const { title } of allTitles) {
    titleCount.set(title, (titleCount.get(title) ?? 0) + 1)
  }
  const exactDups = [...titleCount.entries()].filter(([, n]) => n > 1)
  console.log(`    Titulos exatamente duplicados: ${exactDups.length} (esperado: 0)`)
  if (exactDups.length > 0) {
    for (const [t, n] of exactDups.slice(0, 5)) {
      console.log(`      "${t.slice(0, 55)}" (${n}x)`)
    }
  }

  // Bookings por status
  type BookingStatusRow = { status: string; count: bigint }
  const bookingRows = await prisma.$queryRaw<BookingStatusRow[]>`
    SELECT status, COUNT(*) as count FROM "bookings" GROUP BY status ORDER BY count DESC
  `
  const statusMap = new Map(bookingRows.map((r) => [r.status, Number(r.count)]))
  const totalBookings = [...statusMap.values()].reduce((s, v) => s + v, 0)

  console.log("\n  RESERVAS por status:")
  for (const [status, count] of statusMap) {
    console.log(`    ${status.padEnd(20)} ${count}`)
  }
  console.log(`    ${"TOTAL".padEnd(20)} ${totalBookings}`)

  // Cobertura de estados
  const allStates = ["PENDING", "CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED", "CANCELLED", "DISPUTED"]
  console.log("\n  COBERTURA DE ESTADOS (todos os 7 devem estar presentes):")
  for (const s of allStates) {
    const n = statusMap.get(s) ?? 0
    console.log(`    ${s.padEnd(12)} ${n > 0 ? `${n} OK` : "0 FALTANDO"}`)
  }

  // Payouts PENDING
  const payoutsPending = await prisma.payout.count({ where: { status: "PENDING" } })
  console.log(`\n  PAYOUTS PENDING: ${payoutsPending} (meta: algumas dezenas)`)

  // Reviews
  const reviews = await prisma.review.count()
  console.log(`  REVIEWS: ${reviews}`)

  // Bookings acima do teto R$500
  const overLimit = await prisma.booking.count({ where: { totalPrice: { gt: 50000 } } })
  console.log(`\n  Bookings totalPrice > R$500: ${overLimit} (deve ser 0)`)
  if (overLimit > 0) console.warn("  ATENCAO: existem reservas acima do teto!")

  console.log("\n══════════════════════════════════════════════════════════════\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const reportOnly = process.argv.includes("--report")

  if (!loadEnvFile(".env.staging-migrate")) {
    console.error("✗ .env.staging-migrate nao encontrado.")
    process.exit(1)
  }

  const e2eToken = process.env.E2E_SECRET
  if (!e2eToken) {
    console.warn("⚠  E2E_SECRET ausente — rate-limit pode bloquear operacoes via API.")
  }

  if (dryRun) {
    console.log("✓ Modo --dry-run: arquivo compila. Nenhum dado criado.")
    console.log(`  Catalogo: ${CATALOG.length} itens, ${CITIES.length} cidades`)
    console.log(`  Meta de itens: ${TARGET_ITEMS}`)
    return
  }

  const prisma = makePrisma()

  try {
    if (reportOnly) {
      await printReport(prisma)
      return
    }

    console.log("\nShareO — Top-up da base de staging (Fase 4)")
    console.log("─".repeat(60))
    console.log(`API: ${BASE_URL}`)
    console.log(`E2E_SECRET: ${e2eToken ? "presente" : "AUSENTE"}`)
    console.log("─".repeat(60))

    const feeBps = await getFeeBps(prisma)
    const categories = await getCategories(prisma)

    if (!categories.size) {
      console.error("✗ Nenhuma categoria no banco.")
      process.exit(1)
    }

    console.log(`Taxa da plataforma: ${feeBps}bp (${feeBps / 100}%)`)
    console.log(`Categorias: ${[...categories.keys()].join(", ")}`)

    // ── PASSO 1: Carregar títulos existentes ─────────────────────────────────
    console.log("\n[1/3] Carregando titulos existentes no banco...")

    const existingItemRows = await prisma.item.findMany({
      where: { status: "AVAILABLE" },
      select: {
        id: true,
        title: true,
        pricePerDay: true,
        ownerId: true,
      },
    })
    const currentItemCount = existingItemRows.length
    const existingTitles = new Set(existingItemRows.map((r) => r.title))

    console.log(`  Itens AVAILABLE atuais: ${currentItemCount}`)
    console.log(`  Titulos registrados no controle de unicidade: ${existingTitles.size}`)

    // ── PASSO 2: Carregar donos demo e seus itens ─────────────────────────────
    console.log("\n[2/3] Carregando donos demo do banco...")

    // Busca todos os users demo com contagem de itens
    const demoUsers = await prisma.user.findMany({
      where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        city: true,
        state: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    console.log(`  Usuarios demo encontrados: ${demoUsers.length}`)

    // Mapear cidade pelo city/state do user para o objeto City do catálogo
    function matchCity(cityName: string | null, stateName: string | null): City {
      if (cityName && stateName) {
        const found = CITIES.find(
          (c) => c.city.toLowerCase() === (cityName ?? "").toLowerCase() &&
                 c.state.toLowerCase() === (stateName ?? "").toLowerCase(),
        )
        if (found) return found
      }
      // Fallback: cidade aleatória pelo índice do user
      return CITIES[Math.floor(rnd() * CITIES.length)]
    }

    // Separar PJ e PF proprietários (PF com isOwner=true nos primeiros 35)
    // O seed original marcou os 35 primeiros PF como proprietários e os últimos 15 como puros locatários.
    // Recriamos essa lógica: PF demo_pf_01..35 = potenciais donos, 36..50 = locatários puros.
    const pjDemoUsers = demoUsers.filter((u) => u.userType === "PJ")
    const pfDemoUsers = demoUsers.filter((u) => u.userType === "PF")

    // PF potencialmente proprietários: demo_pf_01 a 35 (primeiros 35 por email order)
    const pfSorted = pfDemoUsers.slice().sort((a, b) => a.email.localeCompare(b.email))
    const pfOwners = pfSorted.slice(0, 35)
    const pfBorrowers = pfSorted.slice(0) // todos os PF podem ser locatários

    console.log(`  PJ: ${pjDemoUsers.length}, PF proprietarios: ${pfOwners.length}, PF locatarios pool: ${pfBorrowers.length}`)

    // ── Calcular quantos itens precisa adicionar por dono ────────────────────
    const itemsNeeded = Math.max(0, TARGET_ITEMS - currentItemCount)
    console.log(`\n  Itens atuais: ${currentItemCount}, meta: ${TARGET_ITEMS}, a criar: ${itemsNeeded}`)

    if (itemsNeeded <= 0) {
      console.log("  Meta ja atingida, nenhum item a criar.")
    } else {
      // Construir fila de "trabalho" de itens por dono
      // PJ: meta 3-5 itens; PF dono: meta 1-3 itens; prioridade aos donos sem item
      type OwnerWork = { user: typeof demoUsers[0]; targetItems: number }
      const work: OwnerWork[] = []

      for (const u of pjDemoUsers) {
        const has = u._count.items
        const target = Math.floor(rnd() * 3) + 3 // 3-5
        if (has < target) work.push({ user: u, targetItems: target - has })
      }

      for (const u of pfOwners) {
        const has = u._count.items
        const target = Math.floor(rnd() * 3) + 1 // 1-3
        if (has < target) work.push({ user: u, targetItems: target - has })
      }

      // Ordenar: donos sem nenhum item primeiro (prioridade)
      work.sort((a, b) => {
        const aHas = a.user._count.items
        const bHas = b.user._count.items
        if (aHas === 0 && bHas > 0) return -1
        if (aHas > 0 && bHas === 0) return 1
        return 0
      })

      // Login dos donos (lazy — só loga quando for criar item)
      const httpCache = new Map<string, HttpClient>()

      async function getHttp(email: string): Promise<HttpClient | null> {
        if (httpCache.has(email)) return httpCache.get(email)!
        console.log(`    [login] ${email}`)
        const http = await loginUser(email, e2eToken)
        if (http) httpCache.set(email, http)
        return http
      }

      let itemsCreated = 0
      let remaining = itemsNeeded

      // Embaralha o catálogo para variar os produtos entre donos
      const catalogShuffled = [...CATALOG].sort(() => rnd() - 0.5)
      let catalogIdx = 0

      console.log(`\n[2.1] Criando itens para ${work.length} donos com deficit...`)

      for (const { user, targetItems } of work) {
        if (remaining <= 0) break

        const city = matchCity(user.city, user.state)
        const toCreate = Math.min(targetItems, remaining)

        console.log(`\n  ${user.name} <${user.email}> (${user._count.items} existentes, +${toCreate} novos)`)

        const http = await getHttp(user.email)
        if (!http) {
          console.error(`    login falhou para ${user.email}, pulando`)
          continue
        }

        const owner: DemoOwner = {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType as "PF" | "PJ",
          city,
          http,
          itemCount: user._count.items,
        }

        for (let n = 0; n < toCreate; n++) {
          // Cicla pelo catálogo para variar produtos
          const catalogItem = catalogShuffled[catalogIdx % catalogShuffled.length]
          catalogIdx++

          const itemId = await createItemForOwner(
            prisma,
            categories,
            owner,
            catalogItem,
            existingTitles,
          )
          if (itemId) {
            itemsCreated++
            remaining--
          }
          await sleep(220)
        }

        await sleep(150)
      }

      console.log(`\n  Itens criados nesta fase: ${itemsCreated}`)
      console.log(`  Total AVAILABLE estimado: ${currentItemCount + itemsCreated}`)
    }

    // ── PASSO 3: Criar ~35 reservas novas ────────────────────────────────────
    console.log("\n[3/3] Criando ~35 reservas novas (foco em COMPLETED)...")

    // Recarregar itens AVAILABLE com dados atualizados
    const availableItems = await prisma.item.findMany({
      where: { status: "AVAILABLE" },
      select: {
        id: true,
        pricePerDay: true,
        ownerId: true,
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    if (!availableItems.length) {
      console.error("  Nenhum item AVAILABLE — abortando reservas.")
    } else {
      // Pool de locatários: PF demo (todos os 50)
      // Já temos o pfBorrowers com objetos do banco; precisamos do HttpClient
      // Logar apenas uma amostra para não sobrecarregar: os primeiros 20
      console.log("  Logando locatarios (amostra de 20 PF)...")
      const borrowerHttpMap = new Map<string, { http: HttpClient; id: string }>()

      const borrowerSample = pfBorrowers.slice(0, 20)
      for (const u of borrowerSample) {
        const http = await loginUser(u.email, e2eToken)
        if (http) borrowerHttpMap.set(u.id, { http, id: u.id })
        await sleep(180)
      }

      const borrowerList = [...borrowerHttpMap.entries()].map(([id, v]) => ({ id, http: v.http }))
      console.log(`  Locatarios logados: ${borrowerList.length}`)

      // Cache de proprietários (alguns já logados na etapa anterior, outros precisam logar)
      const ownerHttpMap = new Map<string, HttpClient>()

      // Pre-logar proprietários únicos dos itens disponíveis (amostra)
      const ownerEmailsNeeded = new Set(
        availableItems.slice(0, 60).map((i) => i.owner.email),
      )
      console.log(`  Logando proprietarios (${ownerEmailsNeeded.size} unicos)...`)
      for (const email of ownerEmailsNeeded) {
        if (!ownerHttpMap.has(email)) {
          const http = await loginUser(email, e2eToken)
          if (http) ownerHttpMap.set(email, http)
          await sleep(180)
        }
      }

      let bookingsMade = 0
      const completedBookings: Array<{
        bookingId: string
        itemId: string
        borrowerId: string
        borrowerHttp: HttpClient
        ownerHttp: HttpClient
        ownerId: string
      }> = []

      const TARGET_BOOKINGS = 35

      for (let i = 0; i < TARGET_BOOKINGS; i++) {
        // Escolher item com proprietário logado
        const eligibleItems = availableItems.filter(
          (item) => ownerHttpMap.has(item.owner.email),
        )
        if (!eligibleItems.length) {
          console.warn("  Nenhum item elegivel, parando.")
          break
        }

        const item = eligibleItems[i % eligibleItems.length]
        const ownerHttp = ownerHttpMap.get(item.owner.email)!

        // Locatário diferente do dono
        const eligibleBorrowers = borrowerList.filter((b) => b.id !== item.ownerId)
        if (!eligibleBorrowers.length) continue
        const borrower = eligibleBorrowers[Math.floor(rnd() * eligibleBorrowers.length)]

        // Offset de data: espalhar em até 700 dias para evitar conflito no mesmo item
        const startOffset = 300 + i * 20

        console.log(
          `\n  Reserva ${i + 1}/${TARGET_BOOKINGS}: "${item.owner.name}" <- locatario ${borrower.id.slice(0, 8)}`,
        )

        const result = await runBooking(
          prisma,
          feeBps,
          borrower.http,
          borrower.id,
          ownerHttp,
          item.ownerId,
          item.id,
          item.pricePerDay,
          startOffset,
        )

        if (result) {
          bookingsMade++
          if (result.outcome === "COMPLETED" || result.outcome === "LATE_RETURN") {
            completedBookings.push({
              bookingId: result.bookingId,
              itemId: result.itemId,
              borrowerId: borrower.id,
              borrowerHttp: borrower.http,
              ownerHttp,
              ownerId: item.ownerId,
            })
          }
        }

        await sleep(300)
      }

      console.log(`\n  Reservas criadas: ${bookingsMade}`)
      console.log(`  Reservas COMPLETED para review: ${completedBookings.length}`)

      // ── Reviews ────────────────────────────────────────────────────────────
      if (completedBookings.length > 0) {
        console.log("\n  Criando reviews para reservas COMPLETED...")
        let reviewsMade = 0

        for (const cb of completedBookings) {
          await createReviews(
            cb.borrowerHttp,
            cb.borrowerId,
            cb.ownerHttp,
            cb.ownerId,
            cb.bookingId,
            cb.itemId,
          )
          reviewsMade++
          console.log(`    reviews criadas para booking ${cb.bookingId.slice(0, 16)}`)
          await sleep(200)
        }

        console.log(`  Reviews criadas: ${reviewsMade} grupos (3 por reserva = ~${reviewsMade * 3} reviews)`)
      }
    }

    // ── Relatório final ───────────────────────────────────────────────────────
    await printReport(prisma)

    console.log("✓ Fase 4 — Top-up concluido. Payouts ficam PENDING ate D4.\n")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
