/**
 * ShareO — Seed de demonstração para staging
 * -------------------------------------------
 * Popula o banco de staging com dados realistas para validação dos fundadores:
 *   - 10 usuários PJ (CNPJ válido)
 *   - 50 usuários PF (CPF válido)
 *   - ~80 anúncios com 3 fotos coerentes cada
 *   - ~60 reservas em vários estágios do ciclo
 *   - Reviews nos dois sentidos para reservas COMPLETED
 *   - Chat (2–4 msgs) por reserva
 *
 * Domínio de e-mail: @demo.shareo.com.br (NUNCA @daily-sim.shareo.test)
 * Emails determinísticos → re-execução idempotente (skip-if-exists).
 *
 * NÃO processa repasses (payouts ficam PENDING até D4).
 * NÃO faz reset — dados permanecem para validação.
 *
 * Uso:
 *   npx tsx scripts/seed-staging-demo.ts
 *   npx tsx scripts/seed-staging-demo.ts --dry-run   # só compila, não executa
 *
 * IMPORTANTE: rodar APÓS staging-cleanup.ts --confirm para base limpa.
 */

import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import path from "node:path"
import {
  loadEnvFile,
  HttpClient,
  withRetry,
  dbRetry,
  generateValidCPF,
  generateValidCNPJ,
  markEmailVerified,
  ensureOwnerPaymentAccount,
  markBookingPaid,
  calcSplit,
  getFeeBps,
  getCategories,
  reaisToCents,
  fmtBRL,
} from "./lib/sim-shared"
import {
  CATALOG,
  CITIES,
  PF_FIRST_NAMES,
  PF_LAST_NAMES,
  PJ_NAMES,
  derivePrices,
  pickRentalDays,
  type CatalogItem,
  type City,
} from "./lib/demo-catalog"

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_DOMAIN = "demo.shareo.com.br"
const DEMO_PASSWORD = "DemoShareo@2026" // senha padrão de todos os demo users
const CONSENT_VERSION = "v1.0"

const LOG_DIR = path.join(process.cwd(), "scripts", "daily-sim-logs")

// Pesos de desfecho (mesmos do daily-sim, ajustados para seed)
const OUTCOME_WEIGHTS: Record<string, number> = {
  SUCCESS: 45,
  LATE_RETURN: 8,
  CANCELLED: 15,
  DISPUTED: 7,
  PAYMENT_PENDING: 5,
  ACTIVE: 10,   // deixar em andamento (ativo)
  CONFIRMED: 10, // confirmado mas não pago ainda
}

// Mensagens de chat
const CHAT_BORROWER = [
  "Olá! Ainda está disponível para o período?",
  "Ótimo, pode confirmar a retirada para amanhã cedo?",
  "Combinado! Vou retirar no horário.",
  "Obrigado, tudo certo com o item!",
  "Devolverei no prazo combinado.",
]
const CHAT_OWNER = [
  "Olá! Sim, está disponível. Pode reservar.",
  "Reserva confirmada! Passo o endereço na hora da retirada.",
  "Perfeito, estarei disponível no horário.",
  "Que bom que deu certo! Avalie quando puder.",
  "Obrigado pela devolução no prazo.",
]

// ─────────────────────────────────────────────────────────────────────────────
// RNG seedável
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

let rnd = mulberry32(20260617) // seed fixo para reprodutibilidade
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const jitter = (base: number, amp: number) => base + (rnd() - 0.5) * 2 * amp

function weightedOutcome(): string {
  const total = Object.values(OUTCOME_WEIGHTS).reduce((s, w) => s + w, 0)
  let r = rnd() * total
  for (const [k, w] of Object.entries(OUTCOME_WEIGHTS)) { if ((r -= w) < 0) return k }
  return "SUCCESS"
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

class Logger {
  lines: string[] = []
  errors: string[] = []

  log(msg: string) { const l = `  ${msg}`; this.lines.push(l); console.log(l) }
  head(msg: string) { const l = `\n${msg}`; this.lines.push(l); console.log(l) }
  error(msg: string) { const l = `  ✗ ${msg}`; this.lines.push(l); this.errors.push(l); console.error(l) }

  write(summary: Record<string, unknown>) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const base = path.join(LOG_DIR, `seed-demo-${stamp}`)
    fs.writeFileSync(`${base}.json`, JSON.stringify({ summary, errors: this.errors }, null, 2))
    fs.writeFileSync(`${base}.log`, this.lines.join("\n") + "\n")
    return base
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delay helper (throttle para não estourar pool free do Supabase)
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─────────────────────────────────────────────────────────────────────────────
// Estruturas de usuário demo
// ─────────────────────────────────────────────────────────────────────────────

interface DemoUser {
  id: string
  name: string
  email: string
  userType: "PF" | "PJ"
  doc: string // CPF ou CNPJ formatado
  city: City
  http: HttpClient
  isOwner: boolean // true se vai anunciar itens
}

// ─────────────────────────────────────────────────────────────────────────────
// Publicar item com 3 fotos (ao invés de 1 como no daily-sim)
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
// Registrar e preparar usuário (skip-if-exists)
// ─────────────────────────────────────────────────────────────────────────────

async function registerAndPrepare(
  prisma: PrismaClient,
  baseUrl: string,
  e2eToken: string | undefined,
  log: Logger,
  email: string,
  name: string,
  userType: "PF" | "PJ",
  doc: string,
  city: City,
): Promise<DemoUser | null> {
  const http = new HttpClient(baseUrl, e2eToken)

  // Skip-if-exists: tenta login direto primeiro
  const loginOk = await http.login(email, DEMO_PASSWORD)
  if (loginOk) {
    const meRes = await http.json("GET", "/api/users/me")
    if (meRes.status === 200 && meRes.data) {
      const data = meRes.data as { id: string }
      log.log(`↩ skip (já existe): ${name} <${email}>`)
      return { id: data.id, name, email, userType, doc, city, http, isOwner: false }
    }
  }

  // Registrar novo usuário
  const reg = await withRetry(
    () =>
      http.json("POST", "/api/auth/register", {
        name,
        email,
        password: DEMO_PASSWORD,
        city: city.city,
        state: city.state,
        consentVersion: CONSENT_VERSION,
      }),
    `register:${email}`,
  )

  if (reg.status !== 201) {
    // 409 = já existe mas senha diferente — logar e continuar
    if (reg.status === 409) {
      log.error(`conflito 409 em ${email} — usuário já existe com outra senha, pulando`)
      return null
    }
    log.error(`cadastro ${email} → ${reg.status} ${JSON.stringify((reg.data as { error?: string })?.error ?? "")}`)
    return null
  }

  const regData = reg.data as { data: { id: string } }
  const id = regData.data.id

  // Verificar e-mail via Prisma (gate de reserva)
  await markEmailVerified(prisma, id)
  await sleep(200)

  // Login
  const ok = await http.login(email, DEMO_PASSWORD)
  if (!ok) { log.error(`login ${email} falhou`); return null }

  // Completar cadastro (CPF/CNPJ)
  const compBody =
    userType === "PF"
      ? { userType: "PF", cpf: doc, city: city.city, state: city.state, phone: "+5511999990001" }
      : { userType: "PJ", cnpj: doc, city: city.city, state: city.state, phone: "+5511999990002" }

  const comp = await withRetry(
    () => http.json("PATCH", "/api/users/me/complete-registration", compBody),
    `complete-registration:${email}`,
  )
  if (comp.status !== 200) {
    log.error(`completar cadastro ${email} → ${comp.status} ${JSON.stringify((comp.data as { error?: string })?.error ?? "")}`)
  }

  // Conta de recebimento PIX
  await ensureOwnerPaymentAccount(
    prisma,
    id,
    name,
    doc.replace(/\D/g, ""),
    userType === "PF" ? "CPF" : "CNPJ",
  )

  log.log(`✓ ${userType} ${name} <${email}> @ ${city.city}/${city.state}`)
  return { id, name, email, userType, doc, city, http, isOwner: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Criar item (anúncio)
// ─────────────────────────────────────────────────────────────────────────────

async function createItem(
  prisma: PrismaClient,
  categories: Map<string, string>,
  log: Logger,
  owner: DemoUser,
  catalogItem: CatalogItem,
): Promise<{ id: string; item: CatalogItem; pricePerDay: number } | null> {
  const categoryId = categories.get(catalogItem.categorySlug)
  if (!categoryId) {
    log.error(`categoria não encontrada: ${catalogItem.categorySlug}`)
    return null
  }

  const bairro = pick(owner.city.bairros)
  const prices = derivePrices(catalogItem.pricePerDayReais)
  const lat = jitter(owner.city.lat, 0.05)
  const lng = jitter(owner.city.lng, 0.05)

  const res = await withRetry(
    () =>
      owner.http.json("POST", "/api/items", {
        title: `${catalogItem.title} — ${bairro}`,
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
    log.error(`anúncio "${catalogItem.title}" → ${res.status} ${JSON.stringify((res.data as { error?: string })?.error ?? "")}`)
    return null
  }

  const resData = res.data as { data: { id: string } }
  const itemId = resData.data.id
  await publishItemWith3Photos(prisma, itemId, catalogItem.images)

  log.log(
    `  ✓ item "${catalogItem.title.slice(0, 40)}" ${fmtBRL(prices.pricePerDay)}/dia (${owner.name})`,
  )
  return { id: itemId, item: catalogItem, pricePerDay: prices.pricePerDay }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat helper
// ─────────────────────────────────────────────────────────────────────────────

async function sendChat(
  conversationId: string,
  borrower: DemoUser,
  owner: DemoUser,
  turns: number,
) {
  for (let t = 0; t < turns; t++) {
    const fromBorrower = t % 2 === 0
    const who = fromBorrower ? borrower : owner
    const msg = fromBorrower
      ? CHAT_BORROWER[Math.min(t, CHAT_BORROWER.length - 1)]
      : CHAT_OWNER[Math.min(t, CHAT_OWNER.length - 1)]
    await who.http
      .json("POST", `/api/conversations/${conversationId}/messages`, { content: msg })
      .catch(() => {/* ignora falha de chat */})
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ciclo de reserva
// ─────────────────────────────────────────────────────────────────────────────

async function runBooking(
  prisma: PrismaClient,
  feeBps: number,
  log: Logger,
  borrower: DemoUser,
  owner: DemoUser,
  item: { id: string; item: CatalogItem; pricePerDay: number },
  startOffsetDays: number,
): Promise<{ id: string; outcome: string } | null> {
  const outcome = weightedOutcome()
  const days = pickRentalDays(item.pricePerDay, rnd)
  const start = new Date()
  start.setDate(start.getDate() + startOffsetDays)
  start.setHours(10, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + days)

  const created = await withRetry(
    () =>
      borrower.http.json("POST", "/api/bookings", {
        itemId: item.id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        borrowerNote: "Reserva do seed de demonstração — dados fictícios.",
      }),
    "create-booking",
  )

  if (created.status !== 201) {
    log.error(`reserva → ${created.status} ${JSON.stringify((created.data as { error?: string })?.error ?? "")}`)
    return null
  }

  const createdData = created.data as { data: { id: string; conversationId: string; totalPrice: number } }
  const bookingId = createdData.data.id
  const conversationId = createdData.data.conversationId
  const totalPrice = createdData.data.totalPrice

  // Chat inicial
  await sendChat(
    conversationId,
    borrower,
    owner,
    Math.floor(rnd() * 3) + 2,
  )

  const act = (u: DemoUser, body: Record<string, unknown>) =>
    u.http.json("PATCH", `/api/bookings/${bookingId}`, body)

  // CANCELLED: cancela antes ou depois de confirmar
  if (outcome === "CANCELLED") {
    if (rnd() < 0.5) await act(owner, { action: "confirm" })
    const canceller = rnd() < 0.5 ? borrower : owner
    await act(canceller, {
      action: "cancel",
      reason: pick(["Mudança de planos", "Encontrei outra opção", "Não preciso mais"]),
    })
    log.log(`    ↩ CANCELADA (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // CONFIRMED: só confirma, sem pagar (em andamento)
  if (outcome === "CONFIRMED") {
    await act(owner, { action: "confirm" })
    log.log(`    ⏳ CONFIRMADA, aguardando pagamento (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // Demais: confirmar + pagar
  const conf = await act(owner, { action: "confirm" })
  if (conf.status !== 200) {
    log.error(`confirmar → ${conf.status}`)
    return { id: bookingId, outcome: "ERROR" }
  }

  if (outcome === "PAYMENT_PENDING") {
    log.log(`    ⏳ PAYMENT_PENDING (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  const split = await markBookingPaid(prisma, bookingId, totalPrice, feeBps)

  // ACTIVE: pago mas não retirado ainda
  if (outcome === "ACTIVE") {
    log.log(`    🔄 ACTIVE — pago, aguardando retirada (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // Retirada: pega pickupToken
  const tokenRow = await dbRetry(async () => {
    const r = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { pickupToken: true },
    })
    if (!r?.pickupToken)
      throw Object.assign(new Error("pickupToken ainda não visível"), { code: "P2025" })
    return r
  }, "pickupToken")

  const active = await act(owner, { action: "mark_active", pickupToken: tokenRow?.pickupToken })
  if (active.status !== 200) {
    log.error(`retirar → ${active.status}`)
    return { id: bookingId, outcome: "ERROR" }
  }

  // DISPUTED
  if (outcome === "DISPUTED") {
    const who = rnd() < 0.5 ? borrower : owner
    await act(who, {
      action: "open_dispute",
      reason: pick(["Item com defeito na devolução", "Peça danificada", "Discordância sobre o estado"]),
    })
    log.log(`    ⚠ DISPUTADA (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // Devolução + confirmação → COMPLETED
  await act(borrower, { action: "mark_returned" })
  await act(owner, { action: "confirm_return" })

  if (outcome === "LATE_RETURN") {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        endDate: new Date(Date.now() - 36 * 3600 * 1000),
        lateFeeAmount: Math.round(item.pricePerDay * 0.5),
      },
    })
    log.log(`    ⏰ CONCLUÍDA COM ATRASO — repasse ${fmtBRL(split.ownerNetAmount)}`)
  } else {
    log.log(`    ✓ CONCLUÍDA — repasse ${fmtBRL(split.ownerNetAmount)}`)
  }

  return { id: bookingId, outcome }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews para reservas COMPLETED
// ─────────────────────────────────────────────────────────────────────────────

async function createReviews(
  log: Logger,
  borrower: DemoUser,
  owner: DemoUser,
  bookingId: string,
  itemId: string,
) {
  const ratings = [4, 5]
  const comments = [
    "Ótima experiência, produto exatamente como descrito.",
    "Muito bom, recomendo! Proprietário super atencioso.",
    "Produto em excelente estado, locação sem problemas.",
    "Adorei a facilidade e o item estava impecável.",
    "Locatário muito cuidadoso, devolveu tudo em ordem.",
    "Experiência perfeita, voltarei a alugar com certeza.",
  ]

  // Locatário avalia o item
  await borrower.http
    .json("POST", "/api/reviews", {
      bookingId,
      revieweeId: owner.id,
      itemId,
      reviewType: "ITEM",
      rating: pick(ratings),
      comment: pick(comments),
    })
    .catch(() => {/* ignora */})

  // Locatário avalia o proprietário
  await borrower.http
    .json("POST", "/api/reviews", {
      bookingId,
      revieweeId: owner.id,
      reviewType: "OWNER",
      rating: pick(ratings),
      comment: pick(comments),
    })
    .catch(() => {/* ignora */})

  // Proprietário avalia o locatário
  await owner.http
    .json("POST", "/api/reviews", {
      bookingId,
      revieweeId: borrower.id,
      reviewType: "BORROWER",
      rating: pick(ratings),
      comment: pick(comments),
    })
    .catch(() => {/* ignora */})

  log.log(`      ✓ reviews criadas`)
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run")

  if (!loadEnvFile(".env.staging-migrate")) {
    console.error("✗ .env.staging-migrate não encontrado.")
    process.exit(1)
  }

  const baseUrl = "https://staging.shareo.com.br"
  const e2eToken = process.env.E2E_SECRET

  if (!e2eToken) {
    console.warn("⚠  E2E_SECRET ausente — rate-limit pode bloquear o seed no staging.")
  }

  if (dryRun) {
    console.log("✓ Modo --dry-run: arquivo compila corretamente. Nenhum dado foi criado.")
    console.log(`  Configurado para: ${baseUrl}`)
    console.log(`  E2E_SECRET: ${e2eToken ? "presente" : "AUSENTE"}`)
    console.log(`  Catálogo: ${CATALOG.length} itens em ${new Set(CATALOG.map((c) => c.categorySlug)).size} categorias`)
    console.log(`  Cidades: ${CITIES.length}`)
    return
  }

  console.log("\nShareO — Seed de Demonstração (staging)")
  console.log("─".repeat(60))
  console.log(`API: ${baseUrl}`)
  console.log(`E2E_SECRET: ${e2eToken ? "presente" : "AUSENTE"}`)
  console.log("─".repeat(60))

  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  const prisma = directUrl ? new PrismaClient({ datasourceUrl: directUrl }) : new PrismaClient()
  const log = new Logger()

  try {
    const feeBps = await getFeeBps(prisma)
    const categories = await getCategories(prisma)

    if (!categories.size) {
      console.error("✗ Nenhuma categoria no banco. O seed de categorias precisa ter rodado antes.")
      process.exit(1)
    }

    log.log(`Taxa da plataforma: ${feeBps}bp (${feeBps / 100}%)`)
    log.log(`Categorias disponíveis: ${[...categories.keys()].join(", ")}`)

    // ── 1. Usuários PJ (10) ──────────────────────────────────────────────────
    log.head("1/4 Criando usuários PJ (10)...")
    const pjUsers: DemoUser[] = []

    for (let i = 0; i < 10; i++) {
      const idx = String(i + 1).padStart(2, "0")
      const email = `demo_pj_${idx}@${DEMO_DOMAIN}`
      const name = PJ_NAMES[i % PJ_NAMES.length]
      const city = CITIES[i % CITIES.length]
      const cnpj = generateValidCNPJ(rnd)

      const user = await registerAndPrepare(
        prisma, baseUrl, e2eToken, log,
        email, name, "PJ", cnpj, city,
      )
      if (user) {
        user.isOwner = true
        pjUsers.push(user)
      }
      await sleep(300)
    }

    log.log(`\nPJ criados/existentes: ${pjUsers.length}/10`)

    // ── 2. Usuários PF (50) ──────────────────────────────────────────────────
    log.head("2/4 Criando usuários PF (50)...")
    const pfUsers: DemoUser[] = []

    for (let i = 0; i < 50; i++) {
      const idx = String(i + 1).padStart(2, "0")
      const email = `demo_pf_${idx}@${DEMO_DOMAIN}`
      const firstName = PF_FIRST_NAMES[i % PF_FIRST_NAMES.length]
      const lastName = PF_LAST_NAMES[i % PF_LAST_NAMES.length]
      const name = `${firstName} ${lastName}`
      const city = CITIES[i % CITIES.length]
      const cpf = generateValidCPF(rnd)

      const user = await registerAndPrepare(
        prisma, baseUrl, e2eToken, log,
        email, name, "PF", cpf, city,
      )
      if (user) {
        // ~35 dos 50 PF são proprietários; o resto é só locatário
        user.isOwner = i < 35
        pfUsers.push(user)
      }
      await sleep(250)
    }

    log.log(`\nPF criados/existentes: ${pfUsers.length}/50`)

    // ── 3. Anúncios (~80 itens) ──────────────────────────────────────────────
    log.head("3/4 Criando anúncios...")
    const allItems: { id: string; item: CatalogItem; pricePerDay: number; owner: DemoUser }[] = []
    const allOwners = [
      ...pjUsers,
      ...pfUsers.filter((u) => u.isOwner),
    ]

    // PJ: 3–5 itens cada
    for (const pj of pjUsers) {
      const count = Math.floor(rnd() * 3) + 3 // 3–5
      for (let j = 0; j < count; j++) {
        const catalogItem = CATALOG[Math.floor(rnd() * CATALOG.length)]
        const created = await createItem(prisma, categories, log, pj, catalogItem)
        if (created) allItems.push({ ...created, owner: pj })
        await sleep(200)
      }
    }

    // PF donos: 1–3 itens cada
    for (const pf of pfUsers.filter((u) => u.isOwner)) {
      const count = Math.floor(rnd() * 3) + 1 // 1–3
      for (let j = 0; j < count; j++) {
        const catalogItem = CATALOG[Math.floor(rnd() * CATALOG.length)]
        const created = await createItem(prisma, categories, log, pf, catalogItem)
        if (created) allItems.push({ ...created, owner: pf })
        await sleep(200)
      }
    }

    log.log(`\nAnúncios criados: ${allItems.length}`)

    if (!allItems.length) {
      log.error("Nenhum anúncio criado — abortando reservas.")
      return
    }

    // ── 4. Reservas (~60) ────────────────────────────────────────────────────
    log.head("4/4 Criando reservas (~60)...")

    // Locatários = todos os PF (incluindo os donos, que também podem locar)
    const borrowerPool = pfUsers

    let bookingsMade = 0
    const completedBookings: { bookingId: string; itemId: string; borrower: DemoUser; owner: DemoUser }[] = []

    for (let i = 0; i < 60; i++) {
      const item = allItems[i % allItems.length]
      const candidateBorrowers = borrowerPool.filter((u) => u.id !== item.owner.id)
      if (!candidateBorrowers.length) continue

      const borrower = pick(candidateBorrowers)
      // Espacar datas em 6 dias para evitar conflito no mesmo item
      const startOffset = 1 + i * 6

      log.log(`  Reserva ${i + 1}/60: "${item.item.title.slice(0, 35)}" — ${borrower.name} ← ${item.owner.name}`)
      const result = await runBooking(prisma, feeBps, log, borrower, item.owner, item, startOffset)

      if (result) {
        bookingsMade++
        if (result.outcome === "SUCCESS" || result.outcome === "LATE_RETURN") {
          completedBookings.push({
            bookingId: result.id,
            itemId: item.id,
            borrower,
            owner: item.owner,
          })
        }
      }

      await sleep(300)
    }

    log.log(`\nReservas criadas: ${bookingsMade}`)
    log.log(`Reservas COMPLETED: ${completedBookings.length}`)

    // ── Reviews ──────────────────────────────────────────────────────────────
    log.head("Criando reviews para reservas COMPLETED...")
    let reviewsCreated = 0

    for (const cb of completedBookings) {
      log.log(`  Reviews para booking ${cb.bookingId.slice(0, 16)}...`)
      await createReviews(log, cb.borrower, cb.owner, cb.bookingId, cb.itemId)
      reviewsCreated++
      await sleep(200)
    }

    log.log(`\nReviews criadas para: ${reviewsCreated} reservas`)

    // ── Resumo ───────────────────────────────────────────────────────────────
    log.head("Resumo do seed")
    const summary = {
      pjUsers: pjUsers.length,
      pfUsers: pfUsers.length,
      items: allItems.length,
      bookings: bookingsMade,
      completedBookings: completedBookings.length,
      reviewsCreated,
      errors: log.errors.length,
    }

    const maxLabel = Math.max(...Object.keys(summary).map((k) => k.length))
    for (const [k, v] of Object.entries(summary)) {
      log.log(`  ${k.padEnd(maxLabel + 2)} ${v}`)
    }

    const base = log.write(summary)
    log.head(`Relatório salvo em: ${path.relative(process.cwd(), base)}.json`)

    if (log.errors.length > 0) {
      console.warn(`\n⚠  ${log.errors.length} erro(s) durante o seed. Verifique o log para detalhes.`)
    }

    console.log("\n✓ Seed concluído. Payouts ficam PENDING até D4.\n")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
