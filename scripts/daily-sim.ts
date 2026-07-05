/**
 * ShareO — Robô de Validação Diária (daily-sim)
 * ------------------------------------------------------------------------------
 * Simula um "dia" de operação do ShareO: cadastros, anúncios, locações,
 * pagamentos (Pix fictício), retiradas/devoluções, chat e repasse financeiro.
 * Acionado MANUALMENTE, 1× por dia. Cada execução = 1 "dia" de operação.
 *
 * Arquitetura HÍBRIDA (decisão dos fundadores):
 *   • Fluxos críticos via API HTTP real — exercita gates, validações, rate-limit
 *     e o split de comissão de verdade:
 *       register → login → complete-registration → criar item → criar reserva →
 *       confirmar → retirar → devolver → confirmar devolução → chat
 *   • Apoio via Prisma (sem endpoint público / admin):
 *       marcar e-mail verificado, publicar foto, Pix fictício (marcar pago +
 *       gravar split), conta de recebimento (PIX), repasse (payout).
 *
 * Ambiente: CONFIGURÁVEL, default LOCAL (nunca produção — D4 bloqueia).
 *   --env local   → banco local (.env / .env.local) + API http://localhost:3000
 *   --env staging → banco staging (.env.staging-migrate) + API staging.shareo.com.br
 *
 * Segurança:
 *   • Só toca dados marcados com o domínio @daily-sim.shareo.test (tag).
 *   • --reset apaga SOMENTE entidades desses usuários (no env escolhido).
 *   • Nunca roda contra produção.
 *
 * Uso:
 *   npx tsx scripts/daily-sim.ts --env local --users 5 --items 5 --bookings 5
 *   npx tsx scripts/daily-sim.ts --env local --repasse        # processa repasses
 *   npx tsx scripts/daily-sim.ts --env local --reset          # limpa a simulação
 *   npx tsx scripts/daily-sim.ts --help
 *
 * Logs/relatórios: scripts/daily-sim-logs/ (gitignored).
 */

import { PrismaClient } from "@prisma/client"
import { randomInt } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import {
  loadEnvFile as _loadEnvFile,
  HttpClient as _HttpClient,
  withRetry as _withRetry,
  dbRetry as _dbRetry,
  generateValidCPF as _generateValidCPF,
  markEmailVerified as _markEmailVerified,
  ensureOwnerPaymentAccount as _ensureOwnerPaymentAccount,
  markBookingPaid as _markBookingPaid,
  calcSplit as _calcSplit,
} from "./lib/sim-shared"

// Re-exportações dos helpers de sim-shared (backward-compat com este módulo)
// As implementações locais abaixo são mantidas para não alterar a lógica do daily-sim.

// ─────────────────────────────────────────────────────────────────────────────
// 0. Constantes de simulação
// ─────────────────────────────────────────────────────────────────────────────

const SIM_EMAIL_DOMAIN = "daily-sim.shareo.test" // tag de segurança p/ cleanup
const CONSENT_VERSION  = "v1.0"
const LOG_DIR          = path.join(process.cwd(), "scripts", "daily-sim-logs")
const DEFAULT_FEE_BPS  = 1500 // 15% (fallback se PlatformConfig não tiver a chave)

// Distribuição PONDERADA de desfechos das locações (soma = 100).
// Maioria sucesso; minoria com problemas variados.
const OUTCOME_WEIGHTS: Record<string, number> = {
  SUCCESS:         64, // ciclo completo: confirma → paga → retira → devolve → conclui → repasse
  LATE_RETURN:     10, // concluída, mas devolução após o prazo (taxa de atraso)
  CANCELLED:       12, // desistência (cancela em PENDING/CONFIRMED)
  DISPUTED:         8, // item danificado / disputa aberta
  PAYMENT_PENDING:  6, // pagamento não concluído (fica preso em CONFIRMED)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pools de dados fictícios — São Paulo capital
// ─────────────────────────────────────────────────────────────────────────────

const SP = { city: "São Paulo", state: "SP", lat: -23.5505, lng: -46.6333 }

const SP_BAIRROS = [
  "Pinheiros", "Vila Mariana", "Moema", "Itaim Bibi", "Tatuapé", "Santana",
  "Butantã", "Perdizes", "Lapa", "Saúde", "Vila Madalena", "Brooklin",
]

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Larissa", "Marcelo", "Natália", "Otávio", "Patrícia",
  "Rafael", "Sofia", "Thiago", "Vanessa", "William",
]
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa", "Ferreira",
  "Almeida", "Gomes", "Ribeiro", "Carvalho", "Araújo", "Barbosa", "Rocha",
]

// Templates de item por slug de categoria (preço em REAIS/dia → vira centavos)
const ITEM_TEMPLATES: Record<string, { titles: string[]; desc: string; diaria: [number, number]; retail: number }> = {
  ferramentas: {
    titles: ["Furadeira de impacto", "Serra circular", "Parafusadeira Bosch", "Lixadeira orbital", "Esmerilhadeira"],
    desc: "Ferramenta em ótimo estado, revisada e pronta para uso. Acompanha maleta e acessórios básicos.",
    diaria: [25, 55], retail: 80000,
  },
  eletronicos: {
    titles: ["Projetor Full HD", "Câmera Sony A6400", "Drone DJI Mini", "Caixa de som JBL", "GoPro Hero 11"],
    desc: "Equipamento eletrônico conservado, com bateria boa e todos os cabos. Ideal para eventos e viagens.",
    diaria: [80, 160], retail: 350000,
  },
  "casa-jardim": {
    titles: ["Lavadora de alta pressão", "Aparador de grama", "Micro-ondas 30L", "Aspirador de pó", "Cortador de grama"],
    desc: "Eletrodoméstico funcionando perfeitamente, higienizado e pronto para entrega. Bivolt.",
    diaria: [25, 50], retail: 120000,
  },
  construcao: {
    titles: ["Betoneira 120L", "Escada extensível 7m", "Andaime tubular", "Martelete demolidor", "Compactador de solo"],
    desc: "Item de construção robusto, ideal para obras e reformas. Manutenção em dia, uso seguro.",
    diaria: [40, 90], retail: 200000,
  },
  esporte: {
    titles: ["Bicicleta MTB aro 29", "Barraca de camping 4p", "Prancha SUP inflável", "Kit de escalada", "Caiaque individual"],
    desc: "Equipamento esportivo bem cuidado, perfeito para o fim de semana. Acompanha acessórios.",
    diaria: [45, 110], retail: 250000,
  },
  festas: {
    titles: ["Kit som + microfone", "Tenda 3x3m", "Conjunto de mesas e cadeiras", "Máquina de fumaça", "Painel de LED"],
    desc: "Estrutura completa para festas e eventos. Itens limpos, testados e prontos para montagem.",
    diaria: [60, 140], retail: 300000,
  },
}

// Pools de mensagens de chat por fase
const CHAT = {
  borrower: [
    "Oi! Tenho interesse em alugar, ainda está disponível?",
    "Show, pode confirmar a retirada para amanhã?",
    "Combinado! Vou retirar no horário then.",
    "Tudo certo com o item, obrigado!",
    "O produto chegou com um pequeno arranhão, mas nada grave.",
  ],
  owner: [
    "Olá! Sim, está disponível. Pode reservar à vontade.",
    "Reserva confirmada! Te passo o código de retirada na hora.",
    "Perfeito, estarei no local no horário combinado.",
    "Que bom que deu tudo certo! Avalie quando puder. 🙂",
    "Obrigado por devolver no prazo, foi um prazer!",
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RNG seedável (mulberry32) + helpers
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

let rnd = mulberry32(Date.now())
const ri      = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const pick    = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const jitter  = (base: number, amp: number) => base + (rnd() - 0.5) * 2 * amp

function weightedOutcome(): string {
  const total = Object.values(OUTCOME_WEIGHTS).reduce((s, w) => s + w, 0)
  let r = rnd() * total
  for (const [k, w] of Object.entries(OUTCOME_WEIGHTS)) { if ((r -= w) < 0) return k }
  return "SUCCESS"
}

// CPF válido (dígitos verificadores corretos), formatado.
function generateValidCPF(): string {
  const d = Array.from({ length: 9 }, () => Math.floor(rnd() * 9))
  let r1 = d.reduce((s, n, i) => s + n * (10 - i), 0) % 11
  d.push(r1 < 2 ? 0 : 11 - r1)
  let r2 = d.reduce((s, n, i) => s + n * (11 - i), 0) % 11
  d.push(r2 < 2 ? 0 : 11 - r2)
  return `${d.slice(0, 3).join("")}.${d.slice(3, 6).join("")}.${d.slice(6, 9).join("")}-${d[9]}${d[10]}`
}

const reaisToCents = (r: number) => Math.round(r) * 100
const fmtBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

// Split idêntico ao checkout (lib/platform-config.calcSplit)
function calcSplit(totalPrice: number, feeBps: number) {
  const platformFeeAmount = Math.round((totalPrice * feeBps) / 10000)
  return { platformFeeRate: feeBps, platformFeeAmount, ownerNetAmount: totalPrice - platformFeeAmount }
}

// Imagem placeholder (Unsplash — host normalmente allowlisted no next/image)
function placeholderImage(slug: string, n: number): string {
  const ids: Record<string, string[]> = {
    ferramentas:   ["photo-1581147036324-c1c89c2c8b5c", "photo-1572981779307-38b8cabb2407"],
    eletronicos:   ["photo-1526170375885-4d8ecf77b99f", "photo-1473968512647-3e447244af8f"],
    "casa-jardim": ["photo-1558618666-fcd25c85cd64", "photo-1585659722983-3a675dabf23d"],
    construcao:    ["photo-1504307651254-35680f356dfd", "photo-1581094794329-c8112a89af12"],
    esporte:       ["photo-1485965120184-e220f721d03e", "photo-1571068316344-75bc76f77890"],
    festas:        ["photo-1530103862676-de8c9debad1d", "photo-1464366400600-7168b8af9bc3"],
  }
  const pool = ids[slug] ?? ids.ferramentas
  return `https://images.unsplash.com/${pool[n % pool.length]}?w=800&q=80&auto=format`
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Carregamento de ambiente (.env por env) + flags
// ─────────────────────────────────────────────────────────────────────────────

function loadEnvFile(file: string) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) return false
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    // SOBRESCREVE: o arquivo do --env escolhido é a fonte da verdade do alvo.
    // (Não usar "primeiro-vence": o shell pode ter DATABASE_URL/DIRECT_URL de outro
    // ambiente — ex.: local — e o robô acabaria gravando no banco errado.)
    process.env[m[1]] = v
  }
  return true
}

interface Flags {
  env: "local" | "staging"
  users: number; items: number; bookings: number
  repasse: boolean; reset: boolean; help: boolean
  seed?: number; baseUrl?: string; day?: number
}

function parseFlags(argv: string[]): Flags {
  const f: Flags = { env: "local", users: 5, items: 5, bookings: 5, repasse: false, reset: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case "--env":      f.env = next() === "staging" ? "staging" : "local"; break
      case "--users":    f.users = parseInt(next(), 10); break
      case "--items":    f.items = parseInt(next(), 10); break
      case "--bookings": f.bookings = parseInt(next(), 10); break
      case "--seed":     f.seed = parseInt(next(), 10); break
      case "--day":      f.day = parseInt(next(), 10); break
      case "--base-url": f.baseUrl = next(); break
      case "--repasse":  f.repasse = true; break
      case "--reset":    f.reset = true; break
      case "--help": case "-h": f.help = true; break
    }
  }
  return f
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cliente HTTP com cookie-jar por usuário + login (NextAuth credentials)
// ─────────────────────────────────────────────────────────────────────────────

class HttpClient {
  private jar = new Map<string, string>()
  constructor(private baseUrl: string, private e2eToken?: string) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { accept: "application/json", ...extra }
    if (this.e2eToken) h["x-e2e-token"] = this.e2eToken
    if (this.jar.size) h["cookie"] = [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
    return h
  }

  private absorb(res: Response) {
    const setCookies = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
      ?? (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : [])
    for (const c of setCookies) {
      const seg = c.split(";")[0]
      const eq = seg.indexOf("=")
      if (eq > 0) this.jar.set(seg.slice(0, eq).trim(), seg.slice(eq + 1).trim())
    }
  }

  async json(method: string, pathname: string, body?: unknown) {
    // Resiliente a rate-limit (429): sem o bypass do E2E_SECRET, o staging limita
    // register a 5/min, login a 10/min etc. Em 429, respeita o Retry-After e re-tenta.
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(this.baseUrl + pathname, {
        method,
        headers: this.headers(body ? { "content-type": "application/json" } : undefined),
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
      })
      this.absorb(res)
      if (res.status === 429 && attempt < 5) {
        const ra = Number(res.headers.get("retry-after"))
        const waitS = Math.min(Number.isFinite(ra) && ra > 0 ? ra : 20, 65)
        console.log(`    ⏳ rate-limit (429) em ${method} ${pathname} — aguardando ${waitS}s e re-tentando (${attempt + 1}/5)…`)
        await new Promise((r) => setTimeout(r, waitS * 1000 + 500))
        continue
      }
      let data: any = null
      try { data = await res.json() } catch { /* no body */ }
      return { status: res.status, ok: res.ok, data }
    }
  }

  /** Login por NextAuth credentials → guarda o cookie de sessão no jar. */
  async login(email: string, password: string): Promise<boolean> {
    const csrfRes = await fetch(this.baseUrl + "/api/auth/csrf", { headers: this.headers() })
    this.absorb(csrfRes)
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

    const form = new URLSearchParams({ csrfToken, email, password, callbackUrl: "/dashboard", json: "true" })
    const res = await fetch(this.baseUrl + "/api/auth/callback/credentials", {
      method: "POST",
      headers: this.headers({ "content-type": "application/x-www-form-urlencoded" }),
      body: form.toString(),
      redirect: "manual",
    })
    this.absorb(res)

    const me = await this.json("GET", "/api/users/me")
    return me.status === 200
  }
}

// retry leve para erros transitórios (pool/infra)
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))) }
  }
  throw new Error(`${label} falhou após ${tries} tentativas: ${String(lastErr)}`)
}

// Re-tenta ops Prisma que dependem de uma linha recém-criada pela API.
// O pooler do Supabase pode atrasar a visibilidade da linha entre conexões
// distintas (a API grava de um lado; o robô lê de outro). Absorve P2025
// ("registro não encontrado") e P2003 ("FK ainda não visível").
async function dbRetry<T>(fn: () => Promise<T>, label: string, tries = 6): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() }
    catch (e) {
      const code = (e as { code?: string })?.code
      if (code !== "P2025" && code !== "P2003") throw e
      lastErr = e
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw new Error(`${label}: registro ainda não visível após ${tries} tentativas (${String(lastErr)})`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Logger + estado persistente entre execuções
// ─────────────────────────────────────────────────────────────────────────────

interface SimState {
  env: string; dayCounter: number; seed: number
  userIds: string[]; itemIds: string[]
  bookings: { id: string; outcome: string }[]
  payoutsCreated: number; payoutsPaid: number
}

function statePath(env: string)  { return path.join(LOG_DIR, `state-${env}.json`) }

function loadState(env: string, seed: number): SimState {
  try { return JSON.parse(fs.readFileSync(statePath(env), "utf8")) } catch {
    return { env, dayCounter: 0, seed, userIds: [], itemIds: [], bookings: [], payoutsCreated: 0, payoutsPaid: 0 }
  }
}
function saveState(s: SimState) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.writeFileSync(statePath(s.env), JSON.stringify(s, null, 2))
}

class Logger {
  events: any[] = []
  lines: string[] = []
  log(msg: string)  { const l = `  ${msg}`; this.lines.push(l); console.log(l) }
  head(msg: string) { const l = `\n${msg}`; this.lines.push(l); console.log(l) }
  event(type: string, payload: Record<string, unknown>) { this.events.push({ ts: new Date().toISOString(), type, ...payload }) }
  write(env: string, day: number, summary: Record<string, unknown>) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const base = path.join(LOG_DIR, `day-${String(day).padStart(2, "0")}-${env}-${stamp}`)
    fs.writeFileSync(`${base}.json`, JSON.stringify({ env, day, summary, events: this.events }, null, 2))
    fs.writeFileSync(`${base}.log`, this.lines.join("\n") + "\n")
    return base
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Operações de apoio via Prisma (sem endpoint público / admin)
// ─────────────────────────────────────────────────────────────────────────────

async function getFeeBps(prisma: PrismaClient): Promise<number> {
  try {
    const c = await prisma.platformConfig.findUnique({ where: { key: "platformFeeRate" } })
    const v = c ? parseInt(c.value, 10) : NaN
    return Number.isFinite(v) && v >= 0 && v <= 10000 ? v : DEFAULT_FEE_BPS
  } catch { return DEFAULT_FEE_BPS }
}

async function getCategories(prisma: PrismaClient) {
  const rows = await prisma.category.findMany({ select: { id: true, slug: true } })
  return new Map(rows.map((r) => [r.slug, r.id]))
}

async function markEmailVerified(prisma: PrismaClient, userId: string) {
  await dbRetry(() => prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }), "markEmailVerified")
}

async function ensureOwnerPaymentAccount(prisma: PrismaClient, userId: string, name: string, cpf: string) {
  const existing = await prisma.ownerPaymentAccount.findUnique({ where: { userId }, select: { id: true } })
  if (existing) return existing.id
  const acc = await prisma.ownerPaymentAccount.create({
    data: { userId, pixKeyType: "CPF", pixKey: cpf.replace(/\D/g, ""), holderName: name, status: "VERIFIED" },
    select: { id: true },
  })
  return acc.id
}

/** Publica o item: insere foto (DRAFT→AVAILABLE) — espelha POST /api/items/[id]/images. */
async function publishItemWithPhoto(prisma: PrismaClient, itemId: string, slug: string) {
  await dbRetry(async () => {
    await prisma.itemImage.create({ data: { itemId, url: placeholderImage(slug, ri(0, 1)), order: 0 } })
    await prisma.item.update({ where: { id: itemId }, data: { status: "AVAILABLE", isApproved: true } })
  }, "publishItemWithPhoto")
}

/** Pix fictício: marca pago + grava o split (espelha o checkout). */
async function markBookingPaid(prisma: PrismaClient, bookingId: string, totalPrice: number, feeBps: number) {
  const split = calcSplit(totalPrice, feeBps)
  await dbRetry(() => prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PAID", paidAt: new Date(),
      platformFeeRate: split.platformFeeRate, platformFeeAmount: split.platformFeeAmount,
      ownerNetAmount: split.ownerNetAmount,
    },
  }), "markBookingPaid")
  return split
}

/** Representa atraso: empurra endDate p/ o passado e grava taxa de atraso. */
async function markLate(prisma: PrismaClient, bookingId: string, dailyPrice: number) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { returnedAt: true } })
  const ret = b?.returnedAt ?? new Date()
  await prisma.booking.update({
    where: { id: bookingId },
    data: { endDate: new Date(ret.getTime() - 36 * 3600 * 1000), lateFeeAmount: Math.round(dailyPrice * 0.5) },
  })
}

/** Repasse: marca payouts PENDING da simulação como COMPLETED. */
async function processPayouts(prisma: PrismaClient, userIds: string[]): Promise<{ count: number; total: number }> {
  const pending = await prisma.payout.findMany({
    where: { status: "PENDING", booking: { ownerId: { in: userIds } } },
    select: { id: true, amount: true },
  })
  for (const p of pending) {
    await prisma.payout.update({ where: { id: p.id }, data: { status: "COMPLETED", processedAt: new Date() } })
  }
  return { count: pending.length, total: pending.reduce((s, p) => s + p.amount, 0) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Limpeza (--reset) — só entidades dos usuários da simulação
// ─────────────────────────────────────────────────────────────────────────────

async function resetSimulation(prisma: PrismaClient): Promise<Record<string, number>> {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${SIM_EMAIL_DOMAIN}` } },
    select: { id: true },
  })
  const ids = users.map((u) => u.id)
  if (!ids.length) return { users: 0 }

  const bookings = await prisma.booking.findMany({
    where: { OR: [{ ownerId: { in: ids } }, { borrowerId: { in: ids } }] },
    select: { id: true },
  })
  const bIds = bookings.map((b) => b.id)
  const items = await prisma.item.findMany({ where: { ownerId: { in: ids } }, select: { id: true } })
  const iIds = items.map((i) => i.id)
  const convs = await prisma.conversation.findMany({ where: { bookingId: { in: bIds } }, select: { id: true } })
  const cIds = convs.map((c) => c.id)

  const counts: Record<string, number> = {}
  const del = async (label: string, fn: () => Promise<{ count: number }>) => { counts[label] = (await fn()).count }

  // ordem segura de FKs
  await del("messages",        () => prisma.message.deleteMany({ where: { conversationId: { in: cIds } } }))
  await del("convParticipants",() => prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: cIds } } }))
  await del("conversations",   () => prisma.conversation.deleteMany({ where: { id: { in: cIds } } }))
  await del("payouts",         () => prisma.payout.deleteMany({ where: { bookingId: { in: bIds } } }))
  await del("platformTx",      () => prisma.platformTransaction.deleteMany({ where: { bookingId: { in: bIds } } }))
  await del("reviews",         () => prisma.review.deleteMany({ where: { bookingId: { in: bIds } } }))
  await del("bookingPhotos",   () => prisma.bookingPhoto.deleteMany({ where: { bookingId: { in: bIds } } }))
  await del("contractAccept",  () => prisma.contractAcceptance.deleteMany({ where: { bookingId: { in: bIds } } }))
  await del("coupons",         () => prisma.coupon.deleteMany({ where: { bookingId: { in: bIds } } }))
  await del("bookings",        () => prisma.booking.deleteMany({ where: { id: { in: bIds } } }))
  await del("favorites",       () => prisma.favorite.deleteMany({ where: { OR: [{ itemId: { in: iIds } }, { userId: { in: ids } }] } }))
  await del("itemImages",      () => prisma.itemImage.deleteMany({ where: { itemId: { in: iIds } } }))
  await del("items",           () => prisma.item.deleteMany({ where: { id: { in: iIds } } }))
  await del("ownerAccounts",   () => prisma.ownerPaymentAccount.deleteMany({ where: { userId: { in: ids } } }))
  await del("notifications",   () => prisma.notification.deleteMany({ where: { userId: { in: ids } } }))
  await del("users",           () => prisma.user.deleteMany({ where: { id: { in: ids } } }))

  // limpa o state file do env
  try { fs.rmSync(statePath(process.env.__SIM_ENV ?? "local")) } catch { /* noop */ }
  return counts
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Fluxos de usuário (via API)
// ─────────────────────────────────────────────────────────────────────────────

interface SimUser { id: string; name: string; email: string; password: string; cpf: string; http: HttpClient }

async function registerAndPrepare(
  prisma: PrismaClient, baseUrl: string, e2eToken: string | undefined, log: Logger, idx: number, ts: number,
): Promise<SimUser | null> {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
  const email = `sim_${ts}_${idx}@${SIM_EMAIL_DOMAIN}`
  const password = "SimDaily@2026"
  const cpf = generateValidCPF()
  const http = new HttpClient(baseUrl, e2eToken)

  const reg = await withRetry(() => http.json("POST", "/api/auth/register", {
    name, email, password, city: SP.city, state: SP.state, consentVersion: CONSENT_VERSION,
  }), "register")
  if (reg.status !== 201) { log.log(`✗ cadastro ${email} → ${reg.status} ${JSON.stringify(reg.data?.error ?? "")}`); return null }
  const id: string = reg.data.data.id

  await markEmailVerified(prisma, id) // gate de reserva (apoio Prisma)

  if (!(await http.login(email, password))) { log.log(`✗ login ${email}`); return null }

  const comp = await withRetry(() => http.json("PATCH", "/api/users/me/complete-registration", {
    userType: "PF", cpf, city: SP.city, state: SP.state, phone: "+5511999990000",
  }), "complete-registration")
  if (comp.status !== 200) { log.log(`✗ completar cadastro ${email} → ${comp.status} ${JSON.stringify(comp.data?.error ?? "")}`); return null }

  await ensureOwnerPaymentAccount(prisma, id, name, cpf) // habilita repasse quando for dono

  log.log(`✓ usuário ${name} <${email}>`)
  log.event("user.created", { id, name, email })
  return { id, name, email, password, cpf, http }
}

async function createItem(
  prisma: PrismaClient, categories: Map<string, string>, log: Logger, owner: SimUser,
): Promise<{ id: string; slug: string; pricePerDay: number } | null> {
  const slug = pick([...categories.keys()])
  const tpl = ITEM_TEMPLATES[slug] ?? ITEM_TEMPLATES.ferramentas
  const categoryId = categories.get(slug)!
  const title = `${pick(tpl.titles)} — ${pick(SP_BAIRROS)}`
  const pricePerDay = reaisToCents(ri(tpl.diaria[0], tpl.diaria[1]))

  const res = await withRetry(() => owner.http.json("POST", "/api/items", {
    title, description: tpl.desc, categoryId, condition: pick(["NEW", "EXCELLENT", "GOOD", "FAIR"]),
    pricePerDay, pricePerWeek: pricePerDay * 3, pricePerMonth: pricePerDay * 15,
    estimatedRetailPrice: tpl.retail, city: SP.city, state: SP.state, neighborhood: pick(SP_BAIRROS),
    latitude: jitter(SP.lat, 0.08), longitude: jitter(SP.lng, 0.08),
    requireIdVerification: false, requirePhone: false,
  }), "create-item")
  if (res.status !== 201) { log.log(`✗ anúncio (${owner.name}) → ${res.status} ${JSON.stringify(res.data?.error ?? "")}`); return null }

  const id: string = res.data.data.id
  await publishItemWithPhoto(prisma, id, slug) // foto + DRAFT→AVAILABLE (apoio Prisma)
  log.log(`✓ anúncio "${title}" ${fmtBRL(pricePerDay)}/dia (${owner.name})`)
  log.event("item.created", { id, title, slug, pricePerDay, ownerId: owner.id })
  return { id, slug, pricePerDay }
}

async function sendChat(log: Logger, conversationId: string, borrower: SimUser, owner: SimUser, turns: number) {
  for (let t = 0; t < turns; t++) {
    const fromBorrower = t % 2 === 0
    const who = fromBorrower ? borrower : owner
    const msg = fromBorrower ? CHAT.borrower[Math.min(t, CHAT.borrower.length - 1)] : CHAT.owner[Math.min(t, CHAT.owner.length - 1)]
    const res = await who.http.json("POST", `/api/conversations/${conversationId}/messages`, { content: msg })
    if (res.status === 201) log.event("chat.message", { conversationId, from: fromBorrower ? "borrower" : "owner" })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Orquestração de uma locação (com desfecho ponderado)
// ─────────────────────────────────────────────────────────────────────────────

async function runBooking(
  prisma: PrismaClient, feeBps: number, log: Logger,
  borrower: SimUser, owner: SimUser, item: { id: string; slug: string; pricePerDay: number }, startOffsetDays: number,
): Promise<{ id: string; outcome: string } | null> {
  const outcome = weightedOutcome()
  const days = ri(1, 3)
  const start = new Date(); start.setDate(start.getDate() + startOffsetDays); start.setHours(12, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + days)

  const created = await withRetry(() => borrower.http.json("POST", "/api/bookings", {
    itemId: item.id, startDate: start.toISOString(), endDate: end.toISOString(),
    borrowerNote: "Reserva gerada pelo robô de validação diária.",
  }), "create-booking")
  if (created.status !== 201) { log.log(`✗ reserva → ${created.status} ${JSON.stringify(created.data?.error ?? "")}`); return null }
  const bookingId: string = created.data.data.id
  const conversationId: string = created.data.data.conversationId
  const totalPrice: number = created.data.data.totalPrice
  log.event("booking.created", { id: bookingId, outcome, totalPrice, borrowerId: borrower.id, ownerId: owner.id })

  // Chat inicial
  await sendChat(log, conversationId, borrower, owner, ri(2, 4))

  // PATCH helper (dono ou locatário)
  const act = (u: SimUser, body: Record<string, unknown>) => u.http.json("PATCH", `/api/bookings/${bookingId}`, body)

  // Desistência: cancela em PENDING (ou após confirmar)
  if (outcome === "CANCELLED") {
    if (rnd() < 0.5) await act(owner, { action: "confirm" })
    const canceller = rnd() < 0.5 ? borrower : owner
    await act(canceller, { action: "cancel", reason: pick(["Mudança de planos", "Não preciso mais", "Encontrei outra opção"]) })
    log.log(`↩ reserva CANCELADA (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // Demais desfechos começam por confirmar (gera pickupToken)
  const conf = await act(owner, { action: "confirm" })
  if (conf.status !== 200) { log.log(`✗ confirmar → ${conf.status}`); return { id: bookingId, outcome: "ERROR" } }

  // Pagamento pendente: para por aqui (não paga, não retira)
  if (outcome === "PAYMENT_PENDING") {
    log.log(`⏳ reserva CONFIRMADA, pagamento PENDENTE (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // Pix fictício (apoio Prisma) — marca pago + split
  const split = await markBookingPaid(prisma, bookingId, totalPrice, feeBps)
  log.event("payment.paid", { id: bookingId, ...split })

  // Retirada (precisa do pickupToken gerado no confirm)
  const tokenRow = await dbRetry(async () => {
    const r = await prisma.booking.findUnique({ where: { id: bookingId }, select: { pickupToken: true } })
    if (!r?.pickupToken) throw Object.assign(new Error("pickupToken ainda não visível"), { code: "P2025" })
    return r
  }, "pickupToken")
  const active = await act(owner, { action: "mark_active", pickupToken: tokenRow?.pickupToken })
  if (active.status !== 200) { log.log(`✗ retirar → ${active.status} ${JSON.stringify(active.data?.error ?? "")}`); return { id: bookingId, outcome: "ERROR" } }

  // Disputa: item danificado durante o uso
  if (outcome === "DISPUTED") {
    const who = rnd() < 0.5 ? borrower : owner
    await act(who, { action: "open_dispute", reason: pick(["Item danificado na devolução", "Peça com defeito", "Divergência no estado do item"]) })
    log.log(`⚠ reserva em DISPUTA (${fmtBRL(totalPrice)})`)
    return { id: bookingId, outcome }
  }

  // Devolução + confirmação → COMPLETED (gera Payout)
  await act(borrower, { action: "mark_returned" })
  await act(owner, { action: "confirm_return" })

  if (outcome === "LATE_RETURN") {
    await markLate(prisma, bookingId, item.pricePerDay)
    log.log(`⏰ reserva CONCLUÍDA com ATRASO — repasse ${fmtBRL(split.ownerNetAmount)} (taxa ${fmtBRL(split.platformFeeAmount)})`)
  } else {
    log.log(`✓ reserva CONCLUÍDA — repasse ${fmtBRL(split.ownerNetAmount)} (taxa ${fmtBRL(split.platformFeeAmount)})`)
  }
  log.event("booking.completed", { id: bookingId, outcome, ...split })
  return { id: bookingId, outcome }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. main
// ─────────────────────────────────────────────────────────────────────────────

const HELP = `
ShareO — Robô de Validação Diária (daily-sim)

Uso:
  npx tsx scripts/daily-sim.ts [opções]

Opções:
  --env <local|staging>  Ambiente alvo (default: local). Produção é bloqueada (D4).
  --users <n>            Novos cadastros nesta execução (default: 5)
  --items <n>            Novos anúncios nesta execução (default: 5)
  --bookings <n>         Locações a simular nesta execução (default: 5)
  --repasse              Processa os repasses (payouts) pendentes da simulação
  --reset                Apaga TODOS os dados da simulação no env (tag @${SIM_EMAIL_DOMAIN})
  --seed <n>             Semente do RNG (reprodutibilidade)
  --day <n>              Força o número do "dia" (default: incrementa o contador)
  --base-url <url>       Sobrescreve a URL da API
  -h, --help             Mostra esta ajuda

Desfechos (ponderados): ${Object.entries(OUTCOME_WEIGHTS).map(([k, v]) => `${k} ${v}%`).join(" · ")}
`

async function main() {
  const flags = parseFlags(process.argv.slice(2))
  if (flags.help) { console.log(HELP); return }

  // ── ambiente ──
  process.env.__SIM_ENV = flags.env
  if (flags.env === "staging") {
    if (!loadEnvFile(".env.staging-migrate")) { console.error("✗ .env.staging-migrate não encontrado — necessário p/ --env staging"); process.exit(1) }
  } else {
    loadEnvFile(".env.local"); loadEnvFile(".env")
  }
  const baseUrl = flags.baseUrl ?? (flags.env === "staging" ? "https://staging.shareo.com.br" : "http://localhost:3000")
  const e2eToken = process.env.E2E_SECRET

  if (flags.env === "staging") {
    console.log("⚠  ALVO = STAGING. Dados fictícios serão inseridos no banco de homologação.")
    if (!e2eToken) console.log("⚠  E2E_SECRET ausente — rate-limit pode bloquear a rajada no staging.")
  }

  // Conexão DIRETA (não-pooler) p/ leitura-após-escrita consistente com o que a
  // API acabou de gravar — o pooler do Supabase pode atrasar a visibilidade da
  // linha entre conexões distintas. Cai no DATABASE_URL se não houver DIRECT_URL.
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  const prisma = directUrl ? new PrismaClient({ datasourceUrl: directUrl }) : new PrismaClient()
  const log = new Logger()

  try {
    // ── reset ──
    if (flags.reset) {
      log.head(`🧹 RESET da simulação (${flags.env})`)
      const counts = await resetSimulation(prisma)
      Object.entries(counts).forEach(([k, v]) => log.log(`${k}: ${v}`))
      log.head("Reset concluído.")
      return
    }

    const seed = flags.seed ?? Math.floor(Date.now() % 2_147_483_647)
    rnd = mulberry32(seed)

    const state = loadState(flags.env, seed)
    const day = flags.day ?? state.dayCounter + 1
    const ts = Date.now()

    log.head(`🤖 ShareO daily-sim — DIA ${day} · env=${flags.env} · seed=${seed}`)
    log.log(`API: ${baseUrl}`)

    const feeBps = await getFeeBps(prisma)
    const categories = await getCategories(prisma)
    if (!categories.size) { console.error("✗ Nenhuma categoria no banco. Rode o seed antes."); process.exit(1) }

    // ── 1. Cadastros ──
    log.head(`👤 Cadastros (até ${flags.users})`)
    const newUsers: SimUser[] = []
    for (let i = 0; i < flags.users; i++) {
      const u = await registerAndPrepare(prisma, baseUrl, e2eToken, log, i, ts)
      if (u) { newUsers.push(u); state.userIds.push(u.id) }
    }
    if (!newUsers.length) { console.error("✗ Nenhum usuário criado — abortando."); process.exit(1) }

    // ── 2. Anúncios ──
    log.head(`📦 Anúncios (até ${flags.items})`)
    const newItems: { id: string; slug: string; pricePerDay: number; owner: SimUser }[] = []
    for (let i = 0; i < flags.items; i++) {
      const owner = newUsers[i % newUsers.length]
      const it = await createItem(prisma, categories, log, owner)
      if (it) { newItems.push({ ...it, owner }); state.itemIds.push(it.id) }
    }

    // ── 3. Locações ──
    log.head(`🔁 Locações (até ${flags.bookings})`)
    const userById = new Map(newUsers.map((u) => [u.id, u]))
    let made = 0
    for (let i = 0; i < flags.bookings && newItems.length; i++) {
      const item = newItems[ri(0, newItems.length - 1)]
      const owner = item.owner
      const candidates = newUsers.filter((u) => u.id !== owner.id)
      if (!candidates.length) break
      const borrower = pick(candidates)
      // espaça as datas em 4 dias (> duração máx. de 3) p/ evitar conflito de datas no mesmo item
      const res = await runBooking(prisma, feeBps, log, borrower, owner, item, 1 + i * 4)
      if (res) { state.bookings.push(res); made++ }
    }
    void userById

    // ── 4. Repasse (opcional / último dia) ──
    let repasse = { count: 0, total: 0 }
    if (flags.repasse) {
      log.head("💸 Repasse financeiro (payouts pendentes)")
      repasse = await processPayouts(prisma, state.userIds)
      state.payoutsPaid += repasse.count
      log.log(`Repassados ${repasse.count} payouts — total ${fmtBRL(repasse.total)}`)
    }

    // ── Resumo ──
    const byOutcome: Record<string, number> = {}
    // slice(-0) pegaria TODO o histórico — só conta as locações DESTE run
    for (const b of (made > 0 ? state.bookings.slice(-made) : [])) byOutcome[b.outcome] = (byOutcome[b.outcome] ?? 0) + 1

    log.head("📊 Resumo do dia")
    log.log(`Usuários novos:  ${newUsers.length}  (acumulado ${state.userIds.length})`)
    log.log(`Anúncios novos:  ${newItems.length}  (acumulado ${state.itemIds.length})`)
    log.log(`Locações:        ${made}  → ${Object.entries(byOutcome).map(([k, v]) => `${k}:${v}`).join(" · ") || "—"}`)
    if (flags.repasse) log.log(`Repasses:        ${repasse.count} (${fmtBRL(repasse.total)})`)

    state.dayCounter = day
    saveState(state)
    const base = log.write(flags.env, day, {
      newUsers: newUsers.length, newItems: newItems.length, bookings: made, byOutcome, repasse, seed,
    })
    log.head(`📝 Relatório: ${path.relative(process.cwd(), base)}.json (+ .log)`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e); process.exit(1) })
