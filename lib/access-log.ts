/**
 * lib/access-log.ts — Logger de acesso para conformidade com Marco Civil da Internet, art. 15.
 *
 * IMPORTANTE: confirmar prazo e escopo com jurídico antes de ativar em produção.
 *
 * Esta função é FIRE-AND-FORGET: não bloqueia a resposta HTTP. Nunca lança exceção.
 * A gravação ocorre SOMENTE quando PlatformConfig.accessLogsEnabled = "true".
 * Com a flag OFF (default), a função retorna imediatamente sem fazer I/O.
 *
 * Escopo de cobertura: apenas rotas de API autenticadas (/api/*), conforme
 * recomendação da auditoria s40. Rotas públicas (landing, /itens, etc.) ficam
 * fora do escopo desta implementação inicial — decidir com jurídico se necessário.
 *
 * Campos gravados (mínimos — art. 15 MCI):
 *   ts        : timestamp UTC do request
 *   ip        : endereço IP do cliente (x-forwarded-for pelo Vercel)
 *   userId    : ID interno do usuário autenticado (não PII direta — só o cuid interno)
 *   path      : path do request (sem query string para reduzir volume)
 *   method    : método HTTP
 *   status    : código HTTP da resposta
 *   requestId : x-vercel-id para correlação com os logs da Vercel
 *
 * Filtragem de PII: NÃO gravamos query strings (podem conter tokens/dados pessoais),
 * corpo do request, headers de autenticação ou User-Agent nesta implementação mínima.
 * O User-Agent pode ser adicionado futuramente se exigido pelo jurídico.
 */

import { prisma } from "@/lib/prisma"

// Cache em memória do estado da flag (TTL 60s — mesmo TTL do PlatformConfig)
// Evita um SELECT por request quando a flag está OFF.
let flagCache: { enabled: boolean; expiresAt: number } | null = null
const FLAG_TTL_MS = 60_000

async function isAccessLogsEnabled(): Promise<boolean> {
  const now = Date.now()
  if (flagCache && flagCache.expiresAt > now) return flagCache.enabled

  try {
    const row = await prisma.platformConfig.findUnique({
      where: { key: "accessLogsEnabled" },
      select: { value: true },
    })
    const enabled = row?.value === "true"
    flagCache = { enabled, expiresAt: now + FLAG_TTL_MS }
    return enabled
  } catch {
    // Falha ao ler config → fica OFF por segurança
    return false
  }
}

export interface AccessLogEntry {
  ip:        string
  userId?:   string | null
  path:      string
  method:    string
  status:    number
  requestId?: string | null
}

/**
 * Grava uma entrada de log de acesso de forma assíncrona/fire-and-forget.
 * Retorna imediatamente; a escrita ocorre em background.
 * Não lança exceção em nenhum cenário.
 */
export function logAccess(entry: AccessLogEntry): void {
  // Iniciamos a promise sem await — fire-and-forget
  void (async () => {
    try {
      const enabled = await isAccessLogsEnabled()
      if (!enabled) return

      await prisma.accessLog.create({
        data: {
          ip:        entry.ip,
          userId:    entry.userId ?? null,
          path:      entry.path,
          method:    entry.method,
          status:    entry.status,
          requestId: entry.requestId ?? null,
        },
      })
    } catch (e) {
      // Erros de logging nunca devem impactar o usuário — apenas registramos
      console.warn("[access-log] falha ao gravar entrada:", e instanceof Error ? e.message : e)
    }
  })()
}

/**
 * Extrai o IP real do cliente a partir dos headers do Vercel.
 * O Vercel injeta x-forwarded-for com o IP original do cliente.
 */
export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    // Pode ser "IP1, IP2, ..." — o primeiro é o cliente real
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  }
  return "unknown"
}
