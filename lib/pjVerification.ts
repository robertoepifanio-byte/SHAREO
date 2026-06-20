/**
 * KYB leve PJ (ADR-024) — ponto único de verdade para verificar o CNPJ na Receita
 * e montar os campos de atualização do usuário ao virar PJ.
 *
 * Consumido por:
 *   - app/api/users/me/upgrade-pj/route.ts          (PF existente → PJ)
 *   - app/api/users/me/complete-registration/route.ts (cadastro progressivo com userType=PJ)
 *
 * ⚠️ NODE.JS RUNTIME ONLY — usa @upstash/redis para cache (incompatível com Edge),
 * à semelhança de lib/rateLimit.ts. Não importar em rota/middleware `runtime = "edge"`.
 *
 * Fail-open controlado (decisão do fundador, 2026-06-20): se a Receita estiver
 * indisponível, o caller NÃO bloqueia — grava a PJ com cnpjSituacaoVerificada=false
 * (estado de revisão) e segue. Mitigações: timeout curto, 2 provedores, rate limit
 * por CNPJ (lib/rateLimit.ts RATE_LIMITS.upgradePjCnpj) e fila admin de revisão.
 */

import type { Prisma } from "@prisma/client"
import type { Redis as UpstashRedis } from "@upstash/redis"
import { hashDocument, encryptDocument, encryptPII } from "@/lib/crypto"
import { CONSENT_VERSION } from "@/lib/legal-config"

export type CnpjSituacao = "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA" | "NULA"

export interface PjVerificationInput {
  cnpj: string // 14 dígitos, já validado por validateCNPJ()
  responsavelLegal: string
  declaracaoIp: string // capturado pelo caller (X-Forwarded-For)
}

export interface PjVerificationResult {
  razaoSocial: string
  situacao: CnpjSituacao
  dataAbertura: Date | null
  source: "brasilapi" | "minhareceita" | "cache"
}

export type PjVerificationErrorCode =
  | "CNPJ_INACTIVE" // existe na Receita mas não está ATIVA
  | "CNPJ_NOT_FOUND" // 404 nos provedores
  | "VERIFICATION_UNAVAILABLE" // todos os provedores indisponíveis (→ fail-open)

export class PjVerificationError extends Error {
  code: PjVerificationErrorCode
  situacao?: CnpjSituacao
  constructor(code: PjVerificationErrorCode, situacao?: CnpjSituacao) {
    super(code)
    this.name = "PjVerificationError"
    this.code = code
    this.situacao = situacao
  }
}

// ─── Provedores ────────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = new Set(["brasilapi.com.br", "minhareceita.org"])
const TIMEOUT_MS = 5000
const BACKOFF_MS = 500

interface ReceitaPayload {
  razao_social?: string
  descricao_situacao_cadastral?: string
  situacao_cadastral?: string | number
  data_inicio_atividade?: string
}

function normalizeSituacao(p: ReceitaPayload): CnpjSituacao | null {
  const desc = (p.descricao_situacao_cadastral ?? "").toUpperCase().trim()
  if (desc === "ATIVA" || desc === "SUSPENSA" || desc === "INAPTA" || desc === "BAIXADA" || desc === "NULA") {
    return desc
  }
  // Fallback pelo código numérico da Receita (1=NULA, 2=ATIVA, 3=SUSPENSA, 4=INAPTA, 8=BAIXADA)
  const code = typeof p.situacao_cadastral === "string" ? parseInt(p.situacao_cadastral, 10) : p.situacao_cadastral
  switch (code) {
    case 1: return "NULA"
    case 2: return "ATIVA"
    case 3: return "SUSPENSA"
    case 4: return "INAPTA"
    case 8: return "BAIXADA"
    default: return null
  }
}

function parsePayload(p: ReceitaPayload, source: "brasilapi" | "minhareceita"): PjVerificationResult | null {
  const situacao = normalizeSituacao(p)
  const razaoSocial = (p.razao_social ?? "").trim()
  if (!situacao || !razaoSocial) return null
  const dataAbertura = p.data_inicio_atividade ? new Date(p.data_inicio_atividade) : null
  return {
    razaoSocial: razaoSocial.slice(0, 150),
    situacao,
    dataAbertura: dataAbertura && !isNaN(dataAbertura.getTime()) ? dataAbertura : null,
    source,
  }
}

/** Resultado bruto de um provedor: ok | notfound (404) | unavailable (erro/timeout). */
type ProviderOutcome =
  | { kind: "ok"; result: PjVerificationResult }
  | { kind: "notfound" }
  | { kind: "unavailable" }

async function fetchProvider(url: string, source: "brasilapi" | "minhareceita"): Promise<ProviderOutcome> {
  try {
    const resp = await fetch(url, {
      redirect: "error", // impede 3xx para destino arbitrário
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    // Cinto + suspensório: confirma que o host final continua na allowlist.
    try {
      if (!ALLOWED_HOSTS.has(new URL(resp.url).hostname)) return { kind: "unavailable" }
    } catch {
      return { kind: "unavailable" }
    }
    if (resp.status === 404) return { kind: "notfound" }
    if (!resp.ok) return { kind: "unavailable" }
    const json = (await resp.json()) as ReceitaPayload
    const result = parsePayload(json, source)
    return result ? { kind: "ok", result } : { kind: "unavailable" }
  } catch {
    // timeout, rede, JSON inválido, redirect bloqueado → indisponível (nunca loga PII)
    return { kind: "unavailable" }
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function tryProvider(url: string, source: "brasilapi" | "minhareceita"): Promise<ProviderOutcome> {
  const first = await fetchProvider(url, source)
  if (first.kind !== "unavailable") return first
  await delay(BACKOFF_MS) // 1 retry
  return fetchProvider(url, source)
}

// ─── Cache best-effort (Upstash Redis) ──────────────────────────────────────────

let redisClient: UpstashRedis | null | undefined
async function getRedis() {
  if (redisClient !== undefined) return redisClient
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
  if (!hasUpstash) {
    redisClient = null
    return null
  }
  const { Redis } = await import("@upstash/redis")
  redisClient = Redis.fromEnv()
  return redisClient
}

const cacheKey = (cnpj: string) => `cnpj:lookup:${cnpj}`

// ─── API pública ────────────────────────────────────────────────────────────────

/**
 * Consulta a situação cadastral do CNPJ na Receita.
 * - ATIVA → retorna PjVerificationResult.
 * - existe mas inativa → lança PjVerificationError("CNPJ_INACTIVE", situacao).
 * - 404 nos dois provedores → lança PjVerificationError("CNPJ_NOT_FOUND").
 * - provedores indisponíveis → lança PjVerificationError("VERIFICATION_UNAVAILABLE") → caller faz fail-open.
 */
export async function verifyCnpjAtReceita(cnpj: string): Promise<PjVerificationResult> {
  const digits = cnpj.replace(/\D/g, "")
  if (!/^\d{14}$/.test(digits)) throw new PjVerificationError("CNPJ_NOT_FOUND")

  // Cache (best-effort): só situações já resolvidas são cacheadas; erro nunca.
  const redis = await getRedis().catch(() => null)
  if (redis) {
    try {
      const cached = (await redis.get(cacheKey(digits))) as PjVerificationResult | null
      if (cached) {
        if (cached.situacao !== "ATIVA") throw new PjVerificationError("CNPJ_INACTIVE", cached.situacao)
        return { ...cached, source: "cache", dataAbertura: cached.dataAbertura ? new Date(cached.dataAbertura) : null }
      }
    } catch (e) {
      if (e instanceof PjVerificationError) throw e
      // falha de cache não quebra o fluxo
    }
  }

  const brasilapi = await tryProvider(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, "brasilapi")
  let outcome = brasilapi
  if (outcome.kind === "unavailable") {
    outcome = await tryProvider(`https://minhareceita.org/${digits}`, "minhareceita")
  }

  if (outcome.kind === "unavailable") throw new PjVerificationError("VERIFICATION_UNAVAILABLE")
  if (outcome.kind === "notfound") throw new PjVerificationError("CNPJ_NOT_FOUND")

  const result = outcome.result
  // Cacheia o resultado resolvido (TTL 7d p/ ATIVA, 24h p/ demais).
  if (redis) {
    try {
      const ttl = result.situacao === "ATIVA" ? 7 * 24 * 3600 : 24 * 3600
      await redis.set(cacheKey(digits), JSON.stringify(result), { ex: ttl })
    } catch {
      // ignore
    }
  }

  if (result.situacao !== "ATIVA") throw new PjVerificationError("CNPJ_INACTIVE", result.situacao)
  return result
}

// ─── Montagem dos campos de update ──────────────────────────────────────────────

/**
 * Campos do User para virar PJ. `verification = null` ⇒ fail-open (Receita indisponível):
 * grava a declaração + CNPJ, mas cnpjSituacaoVerificada=false (entra na fila de revisão admin).
 */
export function buildPjUpdateData(
  input: PjVerificationInput,
  verification: PjVerificationResult | null,
): Prisma.UserUpdateInput {
  const now = new Date()
  const base: Prisma.UserUpdateInput = {
    userType: "PJ",
    cnpjHash: hashDocument(input.cnpj),
    cnpjEncrypted: encryptDocument(input.cnpj),
    cnpjResponsavelLegalEncrypted: encryptPII(input.responsavelLegal.trim()),
    cnpjDeclaracaoAt: now,
    cnpjDeclaracaoIp: input.declaracaoIp,
    cnpjDeclaracaoVersion: CONSENT_VERSION,
  }
  if (!verification) {
    // fail-open: pendente de revisão
    return { ...base, cnpjSituacaoVerificada: false }
  }
  return {
    ...base,
    cnpjRazaoSocial: verification.razaoSocial,
    cnpjSituacao: verification.situacao,
    cnpjDataAbertura: verification.dataAbertura,
    cnpjSituacaoVerificada: true,
    cnpjVerificadoAt: now,
  }
}
