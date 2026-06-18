/**
 * ShareO — Corrige PF demo com cadastro incompleto no staging
 * -----------------------------------------------------------
 * Identifica usuários @demo.shareo.com.br com profileCompletedAt IS NULL
 * e completa o cadastro via API real (PATCH /api/users/me/complete-registration).
 *
 * Estratégia para colisão de CPF:
 *   - Gera CPF com generateValidCPF(rnd)
 *   - Se a API retornar 409 (CPF_ALREADY_EXISTS), gera outro e retenta
 *   - Até MAX_CPF_ATTEMPTS tentativas por usuário
 *
 * Uso:
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/fix-incomplete-pf.ts
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/fix-incomplete-pf.ts --dry-run
 *
 * NUNCA --reset. Não cria itens. Não mexe em quem já está completo.
 */

import { PrismaClient } from "@prisma/client"
import {
  loadEnvFile,
  HttpClient,
  withRetry,
  generateValidCPF,
  generateValidCNPJ,
  makePrisma,
} from "./lib/sim-shared"
import { CITIES } from "./lib/demo-catalog"
import { hashDocument, encryptDocument } from "../lib/crypto"

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_DOMAIN = "demo.shareo.com.br"
const DEMO_PASSWORD = "DemoShareo@2026"
const BASE_URL = "https://staging.shareo.com.br"
const MAX_CPF_ATTEMPTS = 20 // tentativas máximas até gerar CPF único
const SLEEP_MS = 400 // throttle entre chamadas de API

// Endereços plausíveis para completar o perfil (varia por índice do usuário)
const STREETS = [
  "Rua das Flores",
  "Av. Paulista",
  "Rua XV de Novembro",
  "Av. Brasil",
  "Rua da Consolação",
  "Travessa dos Lírios",
  "Av. Getúlio Vargas",
  "Rua Sete de Setembro",
  "Av. Independência",
  "Rua do Comércio",
]

const NEIGHBORHOODS = [
  "Centro",
  "Boa Vista",
  "Jardim América",
  "Vila Nova",
  "Bairro Alto",
  "Santa Cruz",
  "Jardim Europa",
  "Nova Iguaçu",
  "Pinheiros",
  "Moema",
]

// CEPs plausíveis (8 dígitos) por estado
const CEP_BY_STATE: Record<string, string> = {
  SP: "01310100",
  RJ: "22041001",
  DF: "70040020",
  BA: "40020010",
  MG: "30110010",
  PR: "80010010",
  PE: "50010010",
  CE: "60010010",
  RS: "90010010",
  GO: "74010010",
  PA: "66010010",
  AM: "69010010",
}

// ─────────────────────────────────────────────────────────────────────────────
// RNG seedável (seed diferente do seed original para gerar CPFs diferentes)
// ─────────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// seed diferente do seed original (20260617) para não gerar CPFs já usados
const rnd = mulberry32(20260618)

// ─────────────────────────────────────────────────────────────────────────────
// Sleep helper
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura do usuário incompleto
// ─────────────────────────────────────────────────────────────────────────────

interface IncompleteUser {
  id: string
  email: string
  name: string | null
  userType: string
  city: string | null
  state: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 1 — Identificar PF demo incompletos via Prisma
// ─────────────────────────────────────────────────────────────────────────────

async function findIncompleteUsers(prisma: PrismaClient): Promise<IncompleteUser[]> {
  // Busca todos os demo com profileCompletedAt null (email termina em @demo.shareo.com.br)
  const users = await prisma.user.findMany({
    where: {
      email: { endsWith: `@${DEMO_DOMAIN}` },
      profileCompletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      userType: true,
      city: true,
      state: true,
    },
    orderBy: { email: "asc" },
  })
  return users as IncompleteUser[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 2 — Completar cadastro via API real
// ─────────────────────────────────────────────────────────────────────────────

interface CompleteResult {
  email: string
  success: boolean
  method: "api" | "prisma-fallback"
  cpf?: string
  error?: string
  attempts: number
}

async function completeUserRegistration(
  prisma: PrismaClient,
  user: IncompleteUser,
  e2eToken: string | undefined,
  idx: number,
  dryRun: boolean,
): Promise<CompleteResult> {
  const http = new HttpClient(BASE_URL, e2eToken)

  // Determina cidade — usa a do usuário ou faz fallback para o catálogo
  const cityEntry = CITIES[idx % CITIES.length]
  const city = user.city || cityEntry.city
  const state = user.state || cityEntry.state
  const street = STREETS[idx % STREETS.length]
  const neighborhood = NEIGHBORHOODS[idx % NEIGHBORHOODS.length]
  const zipCode = CEP_BY_STATE[state] || "01310100"
  const phone = `+5511${String(900000000 + idx).slice(0, 9)}`

  console.log(`\n  [${idx + 1}] ${user.email}`)
  console.log(`       cidade: ${city}/${state}`)

  if (dryRun) {
    console.log(`       [DRY-RUN] pularia — geraria CPF e chamaria PATCH /api/users/me/complete-registration`)
    return { email: user.email, success: true, method: "api", attempts: 0 }
  }

  // Login
  console.log(`       → login...`)
  let loginOk = false
  try {
    loginOk = await http.login(user.email, DEMO_PASSWORD)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`       ✗ erro no login: ${msg}`)
  }

  if (!loginOk) {
    // Fallback via Prisma direto (gera CPF + encripta + seta profileCompletedAt)
    console.log(`       ⚠ login falhou — usando fallback Prisma direto`)
    return await completViaPrisma(prisma, user, idx, city, state)
  }

  // Para PJ usa CNPJ; para PF (ou default) usa CPF
  const isPJ = user.userType === "PJ"
  const docLabel = isPJ ? "CNPJ" : "CPF"
  const generateDoc = isPJ ? () => generateValidCNPJ(rnd) : () => generateValidCPF(rnd)

  // Tenta completar cadastro via API com retry de documento em caso de colisão
  let lastError = ""
  for (let attempt = 1; attempt <= MAX_CPF_ATTEMPTS; attempt++) {
    const doc = generateDoc()
    console.log(`       → complete-registration (tentativa ${attempt}, ${docLabel} ${doc.slice(0, 7)}...)`)

    const body = isPJ
      ? { userType: "PJ", cnpj: doc, city, state, phone, zipCode, street, neighborhood }
      : { userType: "PF", cpf: doc, city, state, phone, zipCode, street, neighborhood }

    let res: { status: number; ok: boolean; data: unknown }
    try {
      res = await withRetry(
        () => http.json("PATCH", "/api/users/me/complete-registration", body),
        `complete-registration:${user.email}:attempt${attempt}`,
        3,
      )
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      console.error(`       ✗ erro na chamada: ${lastError}`)
      await sleep(SLEEP_MS)
      continue
    }

    if (res.status === 200) {
      console.log(`       ✓ cadastro completo via API (${docLabel})`)
      return { email: user.email, success: true, method: "api", cpf: doc, attempts: attempt }
    }

    if (res.status === 409) {
      // Colisão de documento — gera novo e retenta
      const errData = res.data as { error?: { code?: string } }
      console.log(`       ↩ ${docLabel} colidiu (409 ${errData?.error?.code}) — gerando novo...`)
      await sleep(200)
      continue
    }

    // Outros erros: logar e desistir desta tentativa via API
    lastError = `status ${res.status}: ${JSON.stringify((res.data as { error?: unknown })?.error ?? res.data)}`
    console.error(`       ✗ erro ${res.status}: ${lastError}`)

    // Se for erro 401, o login pode ter expirado — não adianta continuar
    if (res.status === 401) break
    await sleep(SLEEP_MS)
  }

  // Esgotou tentativas via API — tenta fallback Prisma
  console.log(`       ⚠ API esgotou ${MAX_CPF_ATTEMPTS} tentativas — usando fallback Prisma direto`)
  return await completViaPrisma(prisma, user, idx, city, state)
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback via Prisma direto (quando login falha ou API esgota tentativas)
// ─────────────────────────────────────────────────────────────────────────────

async function completViaPrisma(
  prisma: PrismaClient,
  user: IncompleteUser,
  idx: number,
  city: string,
  state: string,
): Promise<CompleteResult> {
  for (let attempt = 1; attempt <= MAX_CPF_ATTEMPTS; attempt++) {
    const isPJ = user.userType === "PJ"
    const doc = isPJ ? generateValidCNPJ(rnd) : generateValidCPF(rnd)
    const docHash = hashDocument(doc)
    const docLabel = isPJ ? "CNPJ" : "CPF"

    // Verifica colisão no banco (campo correto por tipo)
    const clashWhere = isPJ
      ? { cnpjHash: docHash, id: { not: user.id } }
      : { cpfHash: docHash, id: { not: user.id } }
    const clash = await prisma.user.findFirst({
      where: clashWhere,
      select: { id: true },
    })

    if (clash) {
      console.log(`       ↩ ${docLabel} hash colidiu no Prisma (tentativa ${attempt}) — gerando novo...`)
      continue
    }

    const docEncrypted = encryptDocument(doc)
    const street = STREETS[idx % STREETS.length]
    const neighborhood = NEIGHBORHOODS[idx % NEIGHBORHOODS.length]
    const zipCode = CEP_BY_STATE[state] || "01310100"
    const phone = `+5511${String(900000000 + idx).slice(0, 9)}`

    const docData = isPJ
      ? { cnpjHash: docHash, cnpjEncrypted: docEncrypted, cpfHash: null, cpfEncrypted: null }
      : { cpfHash: docHash, cpfEncrypted: docEncrypted, cnpjHash: null, cnpjEncrypted: null }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        userType: isPJ ? "PJ" : "PF",
        ...docData,
        phone,
        cep: zipCode,
        street,
        neighborhood,
        city,
        state,
        profileCompletedAt: new Date(),
        ageDeclaredAt: new Date(),
      },
    })

    console.log(`       ✓ cadastro completo via Prisma direto (${docLabel} ${doc.slice(0, 7)}...)`)
    return { email: user.email, success: true, method: "prisma-fallback", cpf: doc, attempts: attempt }
  }

  return {
    email: user.email,
    success: false,
    method: "prisma-fallback",
    error: `Esgotou ${MAX_CPF_ATTEMPTS} tentativas sem encontrar documento único`,
    attempts: MAX_CPF_ATTEMPTS,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificação final
// ─────────────────────────────────────────────────────────────────────────────

async function countCompletedPF(prisma: PrismaClient): Promise<{ complete: number; incomplete: number; total: number }> {
  const [complete, incomplete] = await Promise.all([
    prisma.user.count({
      where: {
        email: { endsWith: `@${DEMO_DOMAIN}` },
        profileCompletedAt: { not: null },
      },
    }),
    prisma.user.count({
      where: {
        email: { endsWith: `@${DEMO_DOMAIN}` },
        profileCompletedAt: null,
      },
    }),
  ])
  return { complete, incomplete, total: complete + incomplete }
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run")

  console.log("\nShareO — Fix PF Demo Incompletos")
  console.log("─".repeat(60))

  if (!loadEnvFile(".env.staging-migrate")) {
    console.error("✗ .env.staging-migrate não encontrado — abortando.")
    process.exit(1)
  }

  const e2eToken = process.env.E2E_SECRET
  if (!e2eToken) {
    console.warn("⚠  E2E_SECRET ausente — rate-limit pode bloquear chamadas de API.")
  }

  const prisma = makePrisma()

  try {
    // ── Contagem inicial ─────────────────────────────────────────────────────
    const before = await countCompletedPF(prisma)
    console.log(`\nContagem ANTES:`)
    console.log(`  Demo @${DEMO_DOMAIN} total: ${before.total}`)
    console.log(`  Com profileCompletedAt: ${before.complete}`)
    console.log(`  Sem profileCompletedAt (incompletos): ${before.incomplete}`)

    // ── Identifica incompletos ───────────────────────────────────────────────
    const incompleteUsers = await findIncompleteUsers(prisma)
    console.log(`\nUsuários demo PF incompletos encontrados: ${incompleteUsers.length}`)

    if (incompleteUsers.length === 0) {
      console.log("Nenhum usuário incompleto. Nada a fazer.")
      return
    }

    // Lista os incompletos
    console.log("\nLista dos incompletos:")
    for (const u of incompleteUsers) {
      console.log(`  ${u.email} | id=${u.id.slice(0, 16)}... | userType=${u.userType} | cidade=${u.city}/${u.state}`)
    }

    if (dryRun) {
      console.log("\n[DRY-RUN] Parando antes de modificar dados.")
      return
    }

    // ── Completar cadastro de cada um ────────────────────────────────────────
    console.log("\nCompletando cadastros...")
    const results: CompleteResult[] = []

    for (let idx = 0; idx < incompleteUsers.length; idx++) {
      const user = incompleteUsers[idx]
      await sleep(SLEEP_MS)
      const result = await completeUserRegistration(prisma, user, e2eToken, idx, dryRun)
      results.push(result)
      await sleep(SLEEP_MS)
    }

    // ── Verificação final ────────────────────────────────────────────────────
    await sleep(1000) // espera propagação no pool
    const after = await countCompletedPF(prisma)

    // ── Relatório ────────────────────────────────────────────────────────────
    const succeeded = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)
    const viaApi = results.filter((r) => r.success && r.method === "api")
    const viaPrisma = results.filter((r) => r.success && r.method === "prisma-fallback")

    console.log("\n" + "─".repeat(60))
    console.log("RELATÓRIO FINAL")
    console.log("─".repeat(60))
    console.log(`Usuários demo incompletos identificados: ${incompleteUsers.length}`)
    console.log(`Completados com sucesso: ${succeeded.length}`)
    console.log(`  → Via API (fluxo real): ${viaApi.length}`)
    console.log(`  → Via Prisma (fallback): ${viaPrisma.length}`)
    console.log(`Falhas: ${failed.length}`)

    if (failed.length > 0) {
      console.log("\nFalhas detalhadas:")
      for (const f of failed) {
        console.log(`  ✗ ${f.email}: ${f.error}`)
      }
    }

    console.log(`\nContagem DEPOIS:`)
    console.log(`  Demo @${DEMO_DOMAIN} total: ${after.total}`)
    console.log(`  Com profileCompletedAt: ${after.complete}`)
    console.log(`  Sem profileCompletedAt (incompletos): ${after.incomplete}`)
    console.log(`\nMeta: ${after.complete}/${after.total} demo completos (meta era 50/50 PF)`)

    if (after.incomplete > 0) {
      console.warn(`\n⚠  Ainda há ${after.incomplete} usuários demo incompletos.`)
    } else {
      console.log("\n✓ Todos os usuários demo estão com cadastro completo.")
    }

    // Confirma que nenhum CPF colidiu (todos os CPFs usados são distintos)
    const cpfsUsed = results.filter((r) => r.cpf).map((r) => r.cpf!)
    const uniqueCpfs = new Set(cpfsUsed)
    if (cpfsUsed.length === uniqueCpfs.size) {
      console.log(`✓ Nenhuma colisão de CPF entre os ${cpfsUsed.length} CPFs gerados.`)
    } else {
      console.warn(`⚠  ATENÇÃO: ${cpfsUsed.length - uniqueCpfs.size} CPFs duplicados detectados no relatório local.`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
