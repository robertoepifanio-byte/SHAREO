/**
 * ShareO — Helpers compartilhados entre scripts de simulação/manutenção
 * -------------------------------------------------------------------------
 * Extraído de daily-sim.ts (sem alterar comportamento). Usado por:
 *   - scripts/daily-sim.ts
 *   - scripts/staging-cleanup.ts
 *   - scripts/seed-staging-demo.ts
 */

import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import path from "node:path"

// ─────────────────────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────────────────────

export interface SimUser {
  id: string
  name: string
  email: string
  password: string
  cpf: string
  http: HttpClient
}

// ─────────────────────────────────────────────────────────────────────────────
// Carregamento de ambiente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lê um arquivo .env e SOBRESCREVE process.env com seus valores.
 * Sobrescrever é intencional: garante que o ambiente escolhido (--env staging)
 * prevalece sobre qualquer valor já definido no shell (ex.: DATABASE_URL local).
 */
export function loadEnvFile(file: string): boolean {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) return false
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    process.env[m[1]] = v
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente HTTP com cookie-jar por usuário
// ─────────────────────────────────────────────────────────────────────────────

export class HttpClient {
  private jar = new Map<string, string>()
  constructor(private baseUrl: string, private e2eToken?: string) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { accept: "application/json", ...extra }
    if (this.e2eToken) h["x-e2e-token"] = this.e2eToken
    if (this.jar.size)
      h["cookie"] = [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
    return h
  }

  private absorb(res: Response) {
    const setCookies =
      (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
      (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : [])
    for (const c of setCookies) {
      const seg = c.split(";")[0]
      const eq = seg.indexOf("=")
      if (eq > 0) this.jar.set(seg.slice(0, eq).trim(), seg.slice(eq + 1).trim())
    }
  }

  async json(method: string, pathname: string, body?: unknown) {
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
        console.log(
          `    ⏳ rate-limit (429) em ${method} ${pathname} — aguardando ${waitS}s (${attempt + 1}/5)…`,
        )
        await new Promise((r) => setTimeout(r, waitS * 1000 + 500))
        continue
      }
      let data: unknown = null
      try {
        data = await res.json()
      } catch {
        /* no body */
      }
      return { status: res.status, ok: res.ok, data }
    }
  }

  /**
   * Sobe a foto de devolução (fase CHECKOUT) exigida antes de `mark_returned`.
   *
   * Desde 2026-08-23 a API responde 422 RETURN_PHOTO_REQUIRED quando a reserva
   * não tem nenhuma foto de devolução. Sem isto, TODO script de simulação para
   * no meio do ciclo — inclusive o robô diário, e em silêncio, porque ele só
   * registra o status e segue.
   *
   * O PNG precisa ser válido de verdade: a rota confere os magic bytes.
   */
  async uploadFotoDevolucao(bookingId: string) {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    )
    const fd = new FormData()
    fd.append("bookingId", bookingId)
    fd.append("phase", "CHECKOUT")
    fd.append("file", new Blob([png], { type: "image/png" }), "devolucao.png")

    // Sem content-type manual: o fetch monta o boundary do multipart sozinho.
    const res = await fetch(`${this.baseUrl}/api/bookings/${bookingId}/photos`, {
      method:  "POST",
      headers: this.headers(),
      body:    fd,
      redirect: "manual",
    })
    this.absorb(res)
    return { status: res.status, ok: res.ok }
  }

  /** Login por NextAuth credentials — guarda o cookie de sessão no jar. */
  async login(email: string, password: string): Promise<boolean> {
    const csrfRes = await fetch(this.baseUrl + "/api/auth/csrf", {
      headers: this.headers(),
    })
    this.absorb(csrfRes)
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

    const form = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: "/dashboard",
      json: "true",
    })
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

// ─────────────────────────────────────────────────────────────────────────────
// Retry helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Retry leve para erros transitórios de infra/pool. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  tries = 3,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw new Error(`${label} falhou após ${tries} tentativas: ${String(lastErr)}`)
}

/**
 * Retry para ops Prisma que dependem de uma linha recém-criada pela API.
 * O pooler do Supabase pode atrasar a visibilidade entre conexões distintas.
 * Absorve P2025 ("registro não encontrado") e P2003 ("FK ainda não visível").
 */
export async function dbRetry<T>(
  fn: () => Promise<T>,
  label: string,
  tries = 6,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code !== "P2025" && code !== "P2003") throw e
      lastErr = e
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw new Error(
    `${label}: registro ainda não visível após ${tries} tentativas (${String(lastErr)})`,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Geradores de documentos válidos
// ─────────────────────────────────────────────────────────────────────────────

/** Gera CPF com dígitos verificadores corretos, formatado (xxx.xxx.xxx-xx). */
export function generateValidCPF(rnd: () => number): string {
  const d = Array.from({ length: 9 }, () => Math.floor(rnd() * 9))
  let r1 = d.reduce((s, n, i) => s + n * (10 - i), 0) % 11
  d.push(r1 < 2 ? 0 : 11 - r1)
  let r2 = d.reduce((s, n, i) => s + n * (11 - i), 0) % 11
  d.push(r2 < 2 ? 0 : 11 - r2)
  return `${d.slice(0, 3).join("")}.${d.slice(3, 6).join("")}.${d.slice(6, 9).join("")}-${d[9]}${d[10]}`
}

/**
 * Gera CNPJ com dígitos verificadores corretos, formatado (xx.xxx.xxx/xxxx-xx).
 * Espelha o algoritmo de validateCNPJ em utils/cnpj.ts.
 */
export function generateValidCNPJ(rnd: () => number): string {
  // CNPJ: 12 dígitos base + 2 verificadores
  // Formato: d[0..1] / d[2..4] / d[5..7] / d[8..11] - d[12] d[13]
  // Rejeita sequências repetidas; tenta até 5 vezes para garantir unicidade
  for (let attempt = 0; attempt < 5; attempt++) {
    // 8 dígitos de empresa + 4 dígitos de filial (0001 para matriz)
    const empresa = Array.from({ length: 8 }, () => Math.floor(rnd() * 10))
    const filial = [0, 0, 0, 1]
    const base = [...empresa, ...filial]

    // Rejeita sequências repetidas
    if (/^(\d)\1{11}$/.test(base.join(""))) continue

    const calc = (digits: number[], limit: number, weights: number[]): number => {
      const sum = digits
        .slice(0, limit)
        .reduce((acc, val, i) => acc + val * weights[i], 0)
      const rem = sum % 11
      return rem < 2 ? 0 : 11 - rem
    }

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    const d12 = calc(base, 12, w1)
    const full = [...base, d12]
    const d13 = calc(full, 13, w2)
    const all = [...full, d13]

    const s = all.join("")
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`
  }
  // Fallback determinístico se todos falharem
  return "11.222.333/0001-81"
}

// ─────────────────────────────────────────────────────────────────────────────
// Operações de apoio via Prisma
// ─────────────────────────────────────────────────────────────────────────────

export async function markEmailVerified(prisma: PrismaClient, userId: string) {
  await dbRetry(
    () => prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    "markEmailVerified",
  )
}

export async function ensureOwnerPaymentAccount(
  prisma: PrismaClient,
  userId: string,
  name: string,
  pixKey: string, // CPF ou CNPJ sem formatação
  pixKeyType: "CPF" | "CNPJ" = "CPF",
): Promise<string> {
  const existing = await prisma.ownerPaymentAccount.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (existing) return existing.id
  const acc = await prisma.ownerPaymentAccount.create({
    data: {
      userId,
      pixKeyType,
      pixKey: pixKey.replace(/\D/g, ""),
      holderName: name,
      status: "VERIFIED",
    },
    select: { id: true },
  })
  return acc.id
}

/** Split idêntico ao checkout (lib/platform-config.calcSplit). */
export function calcSplit(totalPrice: number, feeBps: number) {
  const platformFeeAmount = Math.round((totalPrice * feeBps) / 10000)
  return {
    platformFeeRate: feeBps,
    platformFeeAmount,
    ownerNetAmount: totalPrice - platformFeeAmount,
  }
}

/** Pix fictício: marca pago + grava o split (espelha o checkout). */
export async function markBookingPaid(
  prisma: PrismaClient,
  bookingId: string,
  totalPrice: number,
  feeBps: number,
) {
  const split = calcSplit(totalPrice, feeBps)
  await dbRetry(
    () =>
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: "PAID",
          paidAt: new Date(),
          platformFeeRate: split.platformFeeRate,
          platformFeeAmount: split.platformFeeAmount,
          ownerNetAmount: split.ownerNetAmount,
        },
      }),
    "markBookingPaid",
  )
  return split
}

export const reaisToCents = (r: number) => Math.round(r) * 100
export const fmtBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários de banco
// ─────────────────────────────────────────────────────────────────────────────

export async function getFeeBps(prisma: PrismaClient, defaultBps = 1500): Promise<number> {
  try {
    const c = await prisma.platformConfig.findUnique({ where: { key: "platformFeeRate" } })
    const v = c ? parseInt(c.value, 10) : NaN
    return Number.isFinite(v) && v >= 0 && v <= 10000 ? v : defaultBps
  } catch {
    return defaultBps
  }
}

export async function getCategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  const rows = await prisma.category.findMany({ select: { id: true, slug: true } })
  return new Map(rows.map((r) => [r.slug, r.id]))
}

/** Cria cliente Prisma usando DIRECT_URL para leitura-após-escrita consistente. */
export function makePrisma(): PrismaClient {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  return directUrl ? new PrismaClient({ datasourceUrl: directUrl }) : new PrismaClient()
}
