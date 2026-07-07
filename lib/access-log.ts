/**
 * lib/access-log.ts — Logger de acesso para conformidade com Marco Civil da Internet, art. 15.
 *
 * DECISOES (2026-06-30):
 *   A2 — Escopo: rotas autenticadas + acoes sensiveis (login/logout, alteracoes cadastrais,
 *        consentimentos, movimentacoes financeiras, acesso a dados de terceiros).
 *        Navegacao anonima NAO e logada. Ver docs/juridico/retencao-logs-art15.md para o escopo completo.
 *   A3 — Opcao II escolhida: tabela `access_logs` no PostgreSQL Supabase (sa-east-1/Brasil).
 *        Opcao I (Vercel Log Drain → EUA) descartada por implicar transferencia internacional (art.33 LGPD).
 *   A4 — Retencao legal: flag `legalHold` por registro impede o expurgo automatico (purge-access-logs)
 *        para registros sob ordem judicial. Acionar via SQL (Supabase Dashboard, MFA obrigatorio).
 *
 * CONFIABILIDADE: `logAccess()` usa `after()` do `next/server` (Next.js 15) para garantir que
 * o write nao seja perdido quando a lambda Vercel congelar apos o envio da resposta HTTP.
 * O fire-and-forget simples (`void (async () => {})()`) violava a regra do projeto:
 * "void promise morre quando a lambda congela apos a resposta" (ver CLAUDE.md / feedback-fire-and-forget-vercel.md).
 *
 * COMO USAR: chamar `logAccess(entry)` ANTES do `return NextResponse.json(...)` no handler.
 * O `after()` registra o callback para execucao pos-resposta; o retorno do handler nao e bloqueado.
 * Nao lanca excecao em nenhum cenario — erros de logging sao emitidos como `console.warn`.
 *
 * A gravacao ocorre SOMENTE quando PlatformConfig.accessLogsEnabled = "true" (default OFF).
 * Com a flag OFF, a funcao apenas enfileira um after() que retorna cedo sem fazer I/O.
 *
 * Campos gravados (minimos — art. 15 MCI):
 *   ts        : timestamp UTC do request
 *   ip        : endereco IP do cliente (x-forwarded-for pelo Vercel)
 *   userId    : ID interno do usuario autenticado (nao PII direta — so o cuid interno)
 *   path      : path do request (sem query string para reduzir volume)
 *   method    : metodo HTTP
 *   status    : codigo HTTP da resposta
 *   requestId : x-vercel-id para correlacao com os logs da Vercel
 *
 * Filtragem de PII: NAO gravamos query strings (podem conter tokens/dados pessoais),
 * corpo do request, headers de autenticacao ou User-Agent nesta implementacao minima.
 * O User-Agent pode ser adicionado futuramente se exigido pelo juridico.
 */

import { after } from "next/server"
import { prisma } from "@/lib/prisma"

// Cache em memoria do estado da flag (TTL 60s — mesmo TTL do PlatformConfig)
// Evita um SELECT por request quando a flag esta OFF.
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
    // Falha ao ler config → fica OFF por seguranca
    return false
  }
}

export interface AccessLogEntry {
  ip:         string
  userId?:    string | null
  path:       string
  method:     string
  status:     number
  requestId?: string | null
}

/**
 * Registra uma entrada de log de acesso usando `after()` do Next.js 15.
 *
 * O `after()` garante que o callback execute APOS a resposta HTTP ser enviada,
 * mantendo a lambda Vercel viva ate a conclusao do write. Isso e critico para
 * logs de conformidade: o fire-and-forget simples (`void (async () => {})()`)
 * pode perder writes quando a lambda e congelada imediatamente apos o return.
 *
 * Deve ser chamado DENTRO do contexto de um request handler (App Router route.ts).
 * Nao lanca excecao em nenhum cenario.
 */
export function logAccess(entry: AccessLogEntry): void {
  // after() enfileira o callback para execucao pos-resposta.
  // A lambda permanece viva ate o callback completar (ou timeout Vercel).
  after(async () => {
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
      // Erros de logging nunca devem impactar o usuario — apenas registramos
      console.warn("[access-log] falha ao gravar entrada:", e instanceof Error ? e.message : e)
    }
  })
}

/**
 * Extrai o IP real do cliente a partir dos headers do Vercel.
 * O Vercel injeta x-forwarded-for com o IP original do cliente.
 */
export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    // Pode ser "IP1, IP2, ..." — o primeiro e o cliente real
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  }
  return "unknown"
}
