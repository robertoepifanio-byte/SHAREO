/**
 * ShareO — Polimento da base de validação (staging) — Fase 3
 * -----------------------------------------------------------
 * Subcomandos (podem ser combinados ou rodados individualmente):
 *
 *   --dedup     Deduplicar itens por título (manter 1, deletar restantes)
 *   --bookings  Adicionar reservas PENDING, ACTIVE e RETURNED
 *   --pj        Criar 2 PJ adicionais (demo_pj_09 e demo_pj_10) com 3 itens cada
 *   --report    Apenas exibe o relatório final (contagens do banco)
 *   --all       Equivalente a --dedup --bookings --pj (depois exibe relatório)
 *
 * Exemplos:
 *   npx tsx scripts/polish-staging-demo.ts --all
 *   npx tsx scripts/polish-staging-demo.ts --dedup
 *   npx tsx scripts/polish-staging-demo.ts --bookings
 *   npx tsx scripts/polish-staging-demo.ts --pj
 *   npx tsx scripts/polish-staging-demo.ts --report
 *
 * NUNCA usa --reset. Nunca deleta dados da keep-list.
 * Sempre usa .env.staging-migrate (banco real do staging).
 */

import { PrismaClient } from "@prisma/client"
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
  getFeeBps,
  getCategories,
  fmtBRL,
  makePrisma,
} from "./lib/sim-shared"
import {
  CATALOG,
  CITIES,
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
const DEMO_PASSWORD = "DemoShareo@2026"
const CONSENT_VERSION = "v1.0"
const BASE_URL = "https://staging.shareo.com.br"

// ─────────────────────────────────────────────────────────────────────────────
// RNG seedável (seed diferente do seed-staging-demo para não colidir)
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

const rnd = mulberry32(20260618) // seed diferente do seed-staging-demo
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const jitter = (base: number, amp: number) => base + (rnd() - 0.5) * 2 * amp
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─────────────────────────────────────────────────────────────────────────────
// Mensagens de chat (reutilizadas em novas reservas)
// ─────────────────────────────────────────────────────────────────────────────

const CHAT_BORROWER = [
  "Olá! Ainda está disponível para o período?",
  "Ótimo! Posso buscar amanhã cedo?",
  "Combinado, obrigado pela atenção.",
]
const CHAT_OWNER = [
  "Olá! Sim, pode reservar.",
  "Perfeito, confirmo a reserva. Estarei disponível.",
  "Qualquer dúvida pode me chamar aqui.",
]

// ─────────────────────────────────────────────────────────────────────────────
// Normalização de título (para agrupamento de duplicatas)
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  // Remove sufixos gerados pelo seed: " — NomeDoBairro" e " — NomeDaBairro"
  // Ex: "Furadeira de Impacto Bosch 20V — Pinheiros" → "Furadeira de Impacto Bosch 20V"
  return title
    .replace(/\s*[—–-]\s+\S.*$/, "") // remove o " — Bairro" do final
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMANDO 1: Deduplicar itens por título
// ─────────────────────────────────────────────────────────────────────────────

async function deduplicateItems(prisma: PrismaClient) {
  console.log("\n── DEDUPLICAR ITENS ─────────────────────────────────────────")

  // Busca todos os itens AVAILABLE com contagem de bookings
  const items = await prisma.item.findMany({
    where: { status: "AVAILABLE" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Total de itens AVAILABLE antes: ${items.length}`)

  // Agrupar por título normalizado
  const groups = new Map<string, typeof items>()
  for (const item of items) {
    const key = normalizeTitle(item.title)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  // Identificar grupos com duplicatas
  const toDelete: string[] = []
  let groupsWithDups = 0

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue
    groupsWithDups++

    // Ordena: mais bookings primeiro; empate → menor createdAt (mais antigo) primeiro
    const sorted = [...group].sort((a, b) => {
      const bookingDiff = b._count.bookings - a._count.bookings
      if (bookingDiff !== 0) return bookingDiff
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const [keep, ...dups] = sorted
    console.log(
      `  Grupo "${key.slice(0, 50)}": manter ${keep.id.slice(0, 8)} (${keep._count.bookings} bookings, ${keep.createdAt.toISOString().slice(0, 10)}), deletar ${dups.length}`,
    )
    for (const d of dups) {
      toDelete.push(d.id)
    }
  }

  if (toDelete.length === 0) {
    console.log("Nenhum item duplicado encontrado. Nada a fazer.")
    return { itemsDeletedCount: 0, bookingsDeletedCount: 0 }
  }

  console.log(`\n${groupsWithDups} grupos com duplicatas. ${toDelete.length} itens a deletar.`)

  // Para cada item a deletar, remover dependências em ordem FK-safe
  let totalBookingsDeleted = 0
  let totalItemsDeleted = 0

  for (const itemId of toDelete) {
    // Busca bookings do item
    const bookings = await prisma.booking.findMany({
      where: { itemId },
      select: { id: true },
    })
    const bookingIds = bookings.map((b) => b.id)

    if (bookingIds.length > 0) {
      // Busca conversations dos bookings
      const convs = await prisma.conversation.findMany({
        where: { bookingId: { in: bookingIds } },
        select: { id: true },
      })
      const convIds = convs.map((c) => c.id)

      if (convIds.length > 0) {
        await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } })
        await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: convIds } } })
        await prisma.conversation.deleteMany({ where: { id: { in: convIds } } })
      }

      await prisma.payout.deleteMany({ where: { bookingId: { in: bookingIds } } })
      await prisma.platformTransaction.deleteMany({ where: { bookingId: { in: bookingIds } } })
      await prisma.ambassadorCommission.deleteMany({ where: { bookingId: { in: bookingIds } } })
      await prisma.review.deleteMany({ where: { bookingId: { in: bookingIds } } })
      await prisma.bookingPhoto.deleteMany({ where: { bookingId: { in: bookingIds } } })
      await prisma.contractAcceptance.deleteMany({ where: { bookingId: { in: bookingIds } } })
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } })

      totalBookingsDeleted += bookingIds.length
    }

    // Dependências do item
    await prisma.favorite.deleteMany({ where: { itemId } })
    await prisma.itemImage.deleteMany({ where: { itemId } })
    await prisma.item.delete({ where: { id: itemId } })

    totalItemsDeleted++
    process.stdout.write(`\r  Deletando item ${totalItemsDeleted}/${toDelete.length}...`)
  }

  console.log(`\n\n✓ Deduplificação concluída.`)
  console.log(`  Itens deletados: ${totalItemsDeleted}`)
  console.log(`  Bookings removidos (dos itens deletados): ${totalBookingsDeleted}`)

  // Verificação final: itens restantes
  const remaining = await prisma.item.count({ where: { status: "AVAILABLE" } })
  console.log(`  Itens AVAILABLE restantes: ${remaining}`)

  return { itemsDeletedCount: totalItemsDeleted, bookingsDeletedCount: totalBookingsDeleted }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMANDO 2: Adicionar reservas PENDING, ACTIVE e RETURNED
// ─────────────────────────────────────────────────────────────────────────────

interface DemoUserLight {
  id: string
  name: string
  email: string
  http: HttpClient
}

async function loadDemoUser(
  email: string,
  e2eToken: string | undefined,
): Promise<DemoUserLight | null> {
  const http = new HttpClient(BASE_URL, e2eToken)
  const ok = await http.login(email, DEMO_PASSWORD)
  if (!ok) return null
  const me = await http.json("GET", "/api/users/me")
  if (me.status !== 200 || !me.data) return null
  // API retorna { data: { id, name, ... } }
  const payload = me.data as { data?: { id: string; name: string }; id?: string; name?: string }
  const inner = payload.data ?? payload
  if (!inner?.id) return null
  return { id: inner.id, name: inner.name ?? email, email, http }
}

async function sendChatMessages(
  conversationId: string,
  borrower: DemoUserLight,
  owner: DemoUserLight,
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
    await sleep(100)
  }
}

async function addNewBookings(prisma: PrismaClient, e2eToken: string | undefined) {
  console.log("\n── ADICIONAR RESERVAS PENDING / ACTIVE / RETURNED ───────────")

  // Carrega pool de locatários PF demo (01-20) e itens disponíveis com donos
  console.log("  Carregando usuários e itens do banco...")

  const availableItems = await prisma.item.findMany({
    where: { status: "AVAILABLE" },
    select: {
      id: true,
      title: true,
      pricePerDay: true,
      ownerId: true,
      owner: { select: { id: true, name: true, email: true } },
    },
    take: 60,
    orderBy: { createdAt: "asc" },
  })

  if (availableItems.length === 0) {
    console.error("  Nenhum item AVAILABLE encontrado — abortando.")
    return
  }

  // Pool de locatários: PF demo 01 a 30 (para ter variedade)
  const borrowerEmails = Array.from({ length: 30 }, (_, i) =>
    `demo_pf_${String(i + 1).padStart(2, "0")}@${DEMO_DOMAIN}`,
  )

  // Mapear emails de dono disponíveis para não logar inutilmente
  const ownerEmailSet = new Set(availableItems.map((i) => i.owner.email))
  const ownerLoginMap = new Map<string, DemoUserLight>()

  console.log(`  Logando proprietários (${ownerEmailSet.size} únicos)...`)
  for (const email of ownerEmailSet) {
    const u = await loadDemoUser(email, e2eToken)
    if (u) ownerLoginMap.set(email, u)
    await sleep(200)
  }

  console.log(`  Logando locatários (amostra de 15)...`)
  const borrowerUsers: DemoUserLight[] = []
  for (const email of borrowerEmails.slice(0, 15)) {
    const u = await loadDemoUser(email, e2eToken)
    if (u) borrowerUsers.push(u)
    await sleep(200)
  }

  if (borrowerUsers.length === 0) {
    console.error("  Nenhum locatário carregado — abortando.")
    return
  }

  const feeBps = await getFeeBps(prisma)
  const now = new Date()

  // Helper para data de início/fim com offset (para evitar conflito)
  function makeDates(offsetDays: number, durationDays: number) {
    const start = new Date(now)
    start.setDate(start.getDate() + offsetDays)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + durationDays)
    return { start, end }
  }

  // Pega um item que não seja do locatário e cujo dono esteja logado
  function pickItem(borrowerId: string): typeof availableItems[0] | null {
    const candidates = availableItems.filter(
      (i) => i.ownerId !== borrowerId && ownerLoginMap.has(i.owner.email),
    )
    if (!candidates.length) return null
    return candidates[Math.floor(rnd() * candidates.length)]
  }

  let pendingCount = 0
  let activeCount = 0
  let returnedCount = 0

  // ── 8 PENDING ────────────────────────────────────────────────────────────

  console.log("\n  Criando 8 reservas PENDING...")
  for (let i = 0; i < 8; i++) {
    const borrower = borrowerUsers[i % borrowerUsers.length]
    const item = pickItem(borrower.id)
    if (!item) { console.log(`    ⚠ sem item disponível para ${borrower.name}`); continue }

    const days = pickRentalDays(item.pricePerDay, rnd)
    const { start, end } = makeDates(200 + i * 10, days) // datas no futuro distante

    const res = await withRetry(
      () =>
        borrower.http.json("POST", "/api/bookings", {
          itemId: item.id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          borrowerNote: "Aguardando confirmação do proprietário — dado de demonstração.",
        }),
      `pending-booking-${i}`,
    )

    if (res.status !== 201) {
      const errMsg = JSON.stringify(res.data ?? "")
      console.log(`    ⚠ PENDING ${i + 1} → ${res.status} ${errMsg}`)
      // Se cadastro incompleto, tenta próximo locatário
      if (errMsg.includes("REGISTRATION_INCOMPLETE")) {
        const altBorrower = borrowerUsers[(i + 8) % borrowerUsers.length]
        if (altBorrower && altBorrower.id !== borrower.id && altBorrower.id !== item.ownerId) {
          const res2 = await altBorrower.http.json("POST", "/api/bookings", {
            itemId: item.id,
            startDate: makeDates(200 + i * 10, pickRentalDays(item.pricePerDay, rnd)).start.toISOString(),
            endDate: makeDates(200 + i * 10, pickRentalDays(item.pricePerDay, rnd)).end.toISOString(),
            borrowerNote: "Reserva de demonstração — PENDING.",
          }).catch(() => null)
          if (res2?.status === 201) {
            const altData = res2.data as { data: { id: string; conversationId: string; totalPrice: number } }
            const owner2 = ownerLoginMap.get(item.owner.email)!
            await sendChatMessages(altData.data.conversationId, altBorrower, owner2, 2)
            pendingCount++
            console.log(`    ✓ PENDING [${pendingCount}] "${item.title.slice(0, 35)}" — ${fmtBRL(altData.data.totalPrice)} — ${altBorrower.name} (alt)`)
          }
        }
      }
      await sleep(500)
      continue
    }

    const pendingData = res.data as { data: { id: string; conversationId: string; totalPrice: number } }
    const { id: bookingId, conversationId, totalPrice } = pendingData.data

    const owner = ownerLoginMap.get(item.owner.email)!
    await sendChatMessages(conversationId, borrower, owner, 2)

    pendingCount++
    console.log(
      `    ✓ PENDING [${pendingCount}] "${item.title.slice(0, 35)}" — ${fmtBRL(totalPrice)} — ${borrower.name}`,
    )
    await sleep(400)
  }

  // ── 8 ACTIVE ─────────────────────────────────────────────────────────────
  // Estratégia: POST com datas futuras (passa validação da API) →
  // confirm (owner API) → markBookingPaid (Prisma) → buscar pickupToken →
  // mark_active (owner API) → corrigir datas no passado (Prisma, cosmético)

  console.log("\n  Criando 8 reservas ACTIVE...")
  for (let i = 0; i < 8; i++) {
    const borrower = borrowerUsers[(i + 3) % borrowerUsers.length]
    const item = pickItem(borrower.id)
    if (!item) { console.log(`    ⚠ sem item para ${borrower.name}`); continue }

    const days = pickRentalDays(item.pricePerDay, rnd)
    // Datas futuras para passar validação → depois ajustamos via Prisma
    const { start, end } = makeDates(210 + i * 10, days)

    const res = await withRetry(
      () =>
        borrower.http.json("POST", "/api/bookings", {
          itemId: item.id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          borrowerNote: "Locação em andamento — dado de demonstração.",
        }),
      `active-booking-${i}`,
    )

    if (res.status !== 201) {
      console.log(`    ⚠ ACTIVE ${i + 1} → ${res.status} ${JSON.stringify((res.data as { error?: string; message?: string } | null) ?? "")}`)
      await sleep(500)
      continue
    }

    const resData = res.data as { data: { id: string; conversationId: string; totalPrice: number } }
    const { id: bookingId, conversationId, totalPrice } = resData.data
    const owner = ownerLoginMap.get(item.owner.email)!

    // Confirmar (owner)
    const conf = await owner.http.json("PATCH", `/api/bookings/${bookingId}`, { action: "confirm" })
    if (conf.status !== 200) {
      console.log(`    ⚠ confirmar booking ${bookingId.slice(0, 8)} → ${conf.status}`)
      await sleep(300)
      continue
    }

    // Marcar como pago (Prisma direto)
    await markBookingPaid(prisma, bookingId, totalPrice, feeBps)

    // Buscar pickupToken
    const tokenRow = await dbRetry(async () => {
      const r = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { pickupToken: true },
      })
      if (!r?.pickupToken)
        throw Object.assign(new Error("pickupToken não visível"), { code: "P2025" })
      return r
    }, `pickupToken-active-${i}`)

    // mark_active (owner com pickupToken)
    const active = await owner.http.json("PATCH", `/api/bookings/${bookingId}`, {
      action: "mark_active",
      pickupToken: tokenRow?.pickupToken,
    })
    if (active.status !== 200) {
      console.log(`    ⚠ mark_active ${bookingId.slice(0, 8)} → ${active.status}`)
      await sleep(300)
      continue
    }

    // Ajustar datas para o passado (cosmético: mostra como locação em andamento)
    const pastStart = new Date(now)
    pastStart.setDate(pastStart.getDate() - (i + 1))
    const pastEnd = new Date(pastStart)
    pastEnd.setDate(pastEnd.getDate() + days)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { startDate: pastStart, endDate: pastEnd },
    }).catch(() => {/* ignora se falhar — o status ACTIVE já está correto */})

    await sendChatMessages(conversationId, borrower, owner, 3)

    activeCount++
    console.log(
      `    ✓ ACTIVE [${activeCount}] "${item.title.slice(0, 35)}" — ${fmtBRL(totalPrice)} — ${borrower.name}`,
    )
    await sleep(400)
  }

  // ── 4 RETURNED (devolvido mas aguardando confirm_return do dono) ──────────
  // Mesmo padrão: POST futuro → avança status via API → ajusta datas via Prisma

  console.log("\n  Criando 4 reservas RETURNED...")
  for (let i = 0; i < 4; i++) {
    const borrower = borrowerUsers[(i + 7) % borrowerUsers.length]
    const item = pickItem(borrower.id)
    if (!item) { console.log(`    ⚠ sem item para ${borrower.name}`); continue }

    const days = pickRentalDays(item.pricePerDay, rnd)
    const { start, end } = makeDates(220 + i * 10, days)

    const res = await withRetry(
      () =>
        borrower.http.json("POST", "/api/bookings", {
          itemId: item.id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          borrowerNote: "Devolvido — aguardando confirmação do proprietário. Dado de demonstração.",
        }),
      `returned-booking-${i}`,
    )

    if (res.status !== 201) {
      console.log(`    ⚠ RETURNED ${i + 1} → ${res.status} ${JSON.stringify((res.data as { error?: string; message?: string } | null) ?? "")}`)
      await sleep(500)
      continue
    }

    const resData2 = res.data as { data: { id: string; conversationId: string; totalPrice: number } }
    const { id: bookingId, conversationId, totalPrice } = resData2.data
    const owner = ownerLoginMap.get(item.owner.email)!

    // confirm
    const conf = await owner.http.json("PATCH", `/api/bookings/${bookingId}`, { action: "confirm" })
    if (conf.status !== 200) { console.log(`    ⚠ confirmar → ${conf.status}`); continue }

    await markBookingPaid(prisma, bookingId, totalPrice, feeBps)

    const tokenRow = await dbRetry(async () => {
      const r = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { pickupToken: true },
      })
      if (!r?.pickupToken)
        throw Object.assign(new Error("pickupToken não visível"), { code: "P2025" })
      return r
    }, `pickupToken-returned-${i}`)

    const activeRes = await owner.http.json("PATCH", `/api/bookings/${bookingId}`, {
      action: "mark_active",
      pickupToken: tokenRow?.pickupToken,
    })
    if (activeRes.status !== 200) { console.log(`    ⚠ mark_active → ${activeRes.status}`); continue }

    // Locatário marca como devolvido (sem confirm_return do dono ainda)
    await borrower.http.uploadFotoDevolucao(bookingId)
    const returned = await borrower.http.json("PATCH", `/api/bookings/${bookingId}`, {
      action: "mark_returned",
    })
    if (returned.status !== 200) {
      console.log(`    ⚠ mark_returned → ${returned.status}`)
      continue
    }

    // Ajustar datas para o passado (cosmético)
    const pastStart2 = new Date(now)
    pastStart2.setDate(pastStart2.getDate() - (days + 2 + i))
    const pastEnd2 = new Date(pastStart2)
    pastEnd2.setDate(pastEnd2.getDate() + days)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { startDate: pastStart2, endDate: pastEnd2 },
    }).catch(() => {/* ignora */})

    await sendChatMessages(conversationId, borrower, owner, 3)

    returnedCount++
    console.log(
      `    ✓ RETURNED [${returnedCount}] "${item.title.slice(0, 35)}" — ${fmtBRL(totalPrice)} — ${borrower.name}`,
    )
    await sleep(400)
  }

  console.log(`\n✓ Novas reservas criadas: PENDING=${pendingCount}, ACTIVE=${activeCount}, RETURNED=${returnedCount}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMANDO 3: Criar 2 PJ adicionais (demo_pj_09 e demo_pj_10)
// ─────────────────────────────────────────────────────────────────────────────

async function addExtraPjUsers(prisma: PrismaClient, e2eToken: string | undefined) {
  console.log("\n── CRIAR 2 PJ ADICIONAIS (demo_pj_09, demo_pj_10) ──────────")

  const categories = await getCategories(prisma)
  const feeBps = await getFeeBps(prisma)  // eslint-disable-line @typescript-eslint/no-unused-vars

  // PJ 09 e 10 (os índices 8 e 9 do array — base-0)
  const newPjDefs = [
    { idx: "09", nameOverride: "Equipamentos Machado ME" },
    { idx: "10", nameOverride: "Festas & Cia Produções Ltda" },
  ]

  for (const def of newPjDefs) {
    const email = `demo_pj_${def.idx}@${DEMO_DOMAIN}`
    const name = def.nameOverride
    const city = CITIES[(parseInt(def.idx, 10) - 1) % CITIES.length]

    console.log(`\n  Processando ${name} <${email}> @ ${city.city}/${city.state}`)

    const http = new HttpClient(BASE_URL, e2eToken)

    // Skip-if-exists
    const loginOk = await http.login(email, DEMO_PASSWORD)
    if (loginOk) {
      const me = await http.json("GET", "/api/users/me")
      if (me.status === 200 && me.data) {
        // API retorna { data: { id, ... } }
        const payload = me.data as { data?: { id: string } }
        const data = payload.data ?? (me.data as { id: string })
        console.log(`  ↩ skip (já existe): ${name} <${email}> id=${data.id.slice(0, 8)}`)

        // Verifica se já tem itens — se não tiver, cria
        const existingItems = await prisma.item.count({ where: { ownerId: data.id } })
        if (existingItems >= 3) {
          console.log(`    ↩ já tem ${existingItems} item(ns), pulando criação.`)
          continue
        }

        // Tenta completar cadastro PJ (idempotente — o servidor aceita re-completar)
        const cnpjForComp = generateValidCNPJ(rnd)
        const rawCnpj = cnpjForComp.replace(/\D/g, "")
        // Verifica se pixKey já existe antes de tentar
        const existingAcc = await prisma.ownerPaymentAccount.findFirst({
          where: { userId: data.id },
          select: { id: true },
        })
        if (!existingAcc) {
          const compRes = await http.json("PATCH", "/api/users/me/complete-registration", {
            userType: "PJ",
            cnpj: cnpjForComp,
            city: city.city,
            state: city.state,
            phone: "+5511999990004",
          })
          if (compRes.status === 200) {
            await ensureOwnerPaymentAccount(prisma, data.id, name, rawCnpj, "CNPJ")
            console.log(`    ✓ cadastro completado para ${name}`)
          } else {
            console.log(`    ⚠ completar cadastro → ${compRes.status} (tentando criar itens mesmo assim)`)
          }
        }

        // Cria os itens que faltam
        const ownerUser: DemoUserLight = { id: data.id, name, email, http }
        await createItemsForPj(prisma, categories, ownerUser, city, 3 - existingItems)
        continue
      }
    }

    // Gerar CNPJ com colisão-safe: tenta até encontrar um não usado
    let cnpj = ""
    for (let attempt = 0; attempt < 10; attempt++) {
      cnpj = generateValidCNPJ(rnd)
      const rawCnpj = cnpj.replace(/\D/g, "")
      // Verifica se cnpjHash/pixKey já existe (proteção extra)
      const existing = await prisma.ownerPaymentAccount.findFirst({
        where: { pixKey: rawCnpj },
      })
      if (!existing) break
      console.log(`    ⟳ CNPJ ${cnpj} já em uso, gerando outro...`)
    }

    // Registrar
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
      `register-pj:${email}`,
    )

    if (reg.status !== 201) {
      console.error(`  ✗ cadastro ${email} → ${reg.status} ${JSON.stringify((reg.data as { error?: string })?.error ?? "")}`)
      continue
    }

    const regData = reg.data as { data: { id: string } }
    const userId = regData.data.id

    await markEmailVerified(prisma, userId)
    await sleep(200)

    const loginOk2 = await http.login(email, DEMO_PASSWORD)
    if (!loginOk2) {
      console.error(`  ✗ login ${email} falhou`)
      continue
    }

    // Completar cadastro PJ
    const comp = await withRetry(
      () =>
        http.json("PATCH", "/api/users/me/complete-registration", {
          userType: "PJ",
          cnpj,
          city: city.city,
          state: city.state,
          phone: "+5511999990003",
        }),
      `complete-pj:${email}`,
    )

    if (comp.status !== 200) {
      console.error(`  ✗ completar cadastro ${email} → ${comp.status} ${JSON.stringify((comp.data as { error?: string })?.error ?? "")}`)
    }

    // Conta de recebimento PIX
    await ensureOwnerPaymentAccount(
      prisma, userId, name,
      cnpj.replace(/\D/g, ""), "CNPJ",
    )

    console.log(`  ✓ PJ criado: ${name} <${email}> CNPJ=${cnpj}`)

    // Criar 3 itens
    const ownerUser: DemoUserLight = { id: userId, name, email, http }
    await createItemsForPj(prisma, categories, ownerUser, city, 3)

    await sleep(300)
  }
}

async function createItemsForPj(
  prisma: PrismaClient,
  categories: Map<string, string>,
  owner: DemoUserLight,
  city: City,
  count: number,
) {
  console.log(`    Criando ${count} item(ns) para ${owner.name}...`)
  const http = owner.http

  // Escolhe itens do catálogo (sem repetir no mesmo PJ nesta chamada)
  const shuffled = [...CATALOG].sort(() => rnd() - 0.5).slice(0, count)

  for (const catalogItem of shuffled) {
    const categoryId = categories.get(catalogItem.categorySlug)
    if (!categoryId) {
      console.error(`    ✗ categoria ${catalogItem.categorySlug} não encontrada`)
      continue
    }

    const bairro = city.bairros[Math.floor(rnd() * city.bairros.length)]
    const prices = derivePrices(catalogItem.pricePerDayReais)
    const lat = jitter(city.lat, 0.05)
    const lng = jitter(city.lng, 0.05)

    const res = await withRetry(
      () =>
        http.json("POST", "/api/items", {
          title: `${catalogItem.title} — ${bairro}`,
          description: catalogItem.description,
          categoryId,
          condition: catalogItem.condition,
          pricePerDay: prices.pricePerDay,
          pricePerWeek: prices.pricePerWeek,
          pricePerMonth: prices.pricePerMonth,
          estimatedRetailPrice: Math.round(catalogItem.estimatedRetailReais) * 100,
          city: city.city,
          state: city.state,
          neighborhood: bairro,
          latitude: lat,
          longitude: lng,
          requireIdVerification: false,
          requirePhone: false,
        }),
      `create-item-pj:${catalogItem.title}`,
    )

    if (res.status !== 201) {
      console.error(`    ✗ item "${catalogItem.title.slice(0, 35)}" → ${res.status}`)
      await sleep(300)
      continue
    }

    const resData = res.data as { data: { id: string } }
    const itemId = resData.data.id

    // 3 fotos coerentes
    await dbRetry(async () => {
      for (let i = 0; i < 3; i++) {
        await prisma.itemImage.create({
          data: { itemId, url: catalogItem.images[i], order: i },
        })
      }
      await prisma.item.update({
        where: { id: itemId },
        data: { status: "AVAILABLE", isApproved: true },
      })
    }, "publishItemWith3Photos-pj")

    console.log(`    ✓ item "${catalogItem.title.slice(0, 40)}" ${fmtBRL(prices.pricePerDay)}/dia`)
    await sleep(250)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO FINAL
// ─────────────────────────────────────────────────────────────────────────────

async function printReport(prisma: PrismaClient) {
  console.log("\n── RELATÓRIO FINAL ──────────────────────────────────────────")

  // Usuários por userType e domínio
  const [pfDemo, pjDemo, keepList, allUsers] = await Promise.all([
    prisma.user.count({
      where: { email: { endsWith: `@${DEMO_DOMAIN}` }, userType: "PF" },
    }),
    prisma.user.count({
      where: { email: { endsWith: `@${DEMO_DOMAIN}` }, userType: "PJ" },
    }),
    prisma.user.count({
      where: {
        NOT: { email: { endsWith: `@${DEMO_DOMAIN}` } },
      },
    }),
    prisma.user.count(),
  ])

  console.log("\n  USUÁRIOS:")
  console.log(`    PF demo (@${DEMO_DOMAIN}): ${pfDemo}`)
  console.log(`    PJ demo (@${DEMO_DOMAIN}): ${pjDemo}`)
  console.log(`    keep-list (não-demo):         ${keepList}`)
  console.log(`    TOTAL:                         ${allUsers}`)

  // Itens AVAILABLE e verificação de fotos
  const itemsAvailable = await prisma.item.count({ where: { status: "AVAILABLE" } })

  // Itens com != 3 fotos
  const itemsWith3Photos = await prisma.item.count({
    where: {
      status: "AVAILABLE",
      images: { some: {} },
    },
  })

  // Query raw para contar itens com exatamente 3 imagens
  type ItemImageCountRow = { itemId: string; count: bigint }
  const imageCountsRaw = await prisma.$queryRaw<ItemImageCountRow[]>`
    SELECT "itemId", COUNT(*) as count
    FROM "item_images"
    GROUP BY "itemId"
  `

  const itemsWith3 = imageCountsRaw.filter((r) => Number(r.count) === 3).length
  const itemsWithout3 = itemsAvailable - itemsWith3

  console.log("\n  ITENS:")
  console.log(`    AVAILABLE:                 ${itemsAvailable}`)
  console.log(`    Com exatamente 3 fotos:    ${itemsWith3}`)
  console.log(`    Com != 3 fotos (PROBLEMA): ${itemsWithout3}`)

  // Títulos duplicados restantes (normalizado)
  const allItemTitles = await prisma.item.findMany({
    where: { status: "AVAILABLE" },
    select: { title: true },
  })
  const titleGroups = new Map<string, number>()
  for (const { title } of allItemTitles) {
    const key = normalizeTitle(title)
    titleGroups.set(key, (titleGroups.get(key) ?? 0) + 1)
  }
  const dupTitles = [...titleGroups.entries()].filter(([, count]) => count > 1)
  console.log(`    Títulos duplicados:        ${dupTitles.length}`)
  if (dupTitles.length > 0) {
    for (const [title, count] of dupTitles.slice(0, 5)) {
      console.log(`      "${title.slice(0, 50)}" (${count}x)`)
    }
  }

  // Bookings por status (via raw para evitar limitação do groupBy com _count no orderBy)
  type BookingStatusRow = { status: string; count: bigint }
  const bookingStatusRaw = await prisma.$queryRaw<BookingStatusRow[]>`
    SELECT status, COUNT(*) as count FROM "bookings" GROUP BY status ORDER BY count DESC
  `
  const bookingStatusCounts = bookingStatusRaw.map((r) => ({
    status: r.status,
    _count: { _all: Number(r.count) },
  }))

  console.log("\n  RESERVAS por status:")
  let totalBookings = 0
  for (const { status, _count } of bookingStatusCounts) {
    console.log(`    ${status.padEnd(18)} ${_count._all}`)
    totalBookings += _count._all
  }
  console.log(`    ${"TOTAL".padEnd(18)} ${totalBookings}`)

  // Payouts PENDING
  const payoutsPending = await prisma.payout.count({ where: { status: "PENDING" } })
  console.log(`\n  PAYOUTS PENDING: ${payoutsPending}`)

  // Reviews
  const reviews = await prisma.review.count()
  console.log(`  REVIEWS: ${reviews}`)

  // Bookings com totalPrice > 50000
  const overLimit = await prisma.booking.count({
    where: { totalPrice: { gt: 50000 } },
  })
  console.log(`\n  Bookings com totalPrice > R$500: ${overLimit} (deve ser 0)`)
  if (overLimit > 0) {
    console.warn("  ⚠ ATENÇÃO: existem reservas acima do teto de R$500!")
  }

  // Verificação: PENDING e ACTIVE presentes
  const statusMap = new Map(bookingStatusCounts.map((r) => [r.status, r._count._all]))
  const hasPending = (statusMap.get("PENDING") ?? 0) > 0
  const hasActive = (statusMap.get("ACTIVE") ?? 0) > 0
  const hasReturned = (statusMap.get("RETURNED") ?? 0) > 0

  console.log("\n  COBERTURA DE ESTADOS:")
  console.log(`    PENDING presentes:  ${hasPending ? "✓" : "✗ FALTANDO"}`)
  console.log(`    ACTIVE presentes:   ${hasActive ? "✓" : "✗ FALTANDO"}`)
  console.log(`    RETURNED presentes: ${hasReturned ? "✓" : "✗ FALTANDO"}`)

  console.log("\n─────────────────────────────────────────────────────────────")
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const runAll = args.includes("--all")
  const runDedup = runAll || args.includes("--dedup")
  const runBookings = runAll || args.includes("--bookings")
  const runPj = runAll || args.includes("--pj")
  const runReport = runAll || args.includes("--report") || args.length === 0

  if (!loadEnvFile(".env.staging-migrate")) {
    console.error("✗ .env.staging-migrate não encontrado. Necessário para rodar o polimento.")
    process.exit(1)
  }

  const e2eToken = process.env.E2E_SECRET
  if (!e2eToken) {
    console.warn("⚠  E2E_SECRET ausente — rate-limit pode bloquear operações via API.")
  }

  console.log("\nShareO — Polimento da base de staging (Fase 3)")
  console.log("─".repeat(60))
  console.log(`Subcomandos ativos: ${[
    runDedup && "--dedup",
    runBookings && "--bookings",
    runPj && "--pj",
    (runReport || args.length === 0) && "--report",
  ].filter(Boolean).join(", ")}`)
  console.log("─".repeat(60))

  const prisma = makePrisma()

  try {
    if (runDedup) {
      await deduplicateItems(prisma)
    }

    if (runBookings) {
      await addNewBookings(prisma, e2eToken)
    }

    if (runPj) {
      await addExtraPjUsers(prisma, e2eToken)
    }

    if (runReport || args.length === 0) {
      await printReport(prisma)
    }

    console.log("\n✓ polish-staging-demo concluído.\n")
  } catch (err) {
    console.error("\n✗ Erro fatal:", err instanceof Error ? err.stack : err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
