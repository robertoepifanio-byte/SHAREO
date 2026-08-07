import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { PRELAUNCH_ENABLED, NOINDEX_ENABLED } from "@/lib/prelaunch"

export const runtime    = "nodejs"
export const dynamic    = "force-dynamic"
export const revalidate = 0

/**
 * Código curto e estável da falha, seguro para expor em produção.
 *
 * A mensagem crua do Prisma carrega hostname/driver e fica restrita a dev
 * (S14-MIN-07), mas o CÓDIGO não identifica infraestrutura nenhuma — e é ele
 * que diz o que consertar:
 *   P1013 → connection string malformada (sobrou `VAR=` ou aspas no valor)
 *   P1000 → senha incorreta
 *   P1001 → não alcançou o servidor (host/porta)
 *   P2021 → tabela não existe (migrations não rodaram)
 *   NO_DATABASE_URL → variável vazia no runtime (escopo errado / Sensitive)
 *
 * Sem isso, um `db: "error"` obriga a adivinhar entre cinco causas distintas —
 * o que já custou horas de diagnóstico em dois ambientes.
 */
function codigoDeFalha(e: unknown): string {
  const err = e as { name?: string; code?: string; errorCode?: string; message?: string }
  const msg = err?.message ?? String(e)
  if (msg.includes("DATABASE_URL not configured")) return "NO_DATABASE_URL"
  const code = err?.code ?? err?.errorCode
  if (typeof code === "string" && code.length > 0) return code
  const m = msg.match(/\bP\d{4}\b/)
  if (m) return m[0]

  // Sem código conhecido: devolve tipo + as linhas ÚTEIS da mensagem, com
  // credencial removida. O Prisma abre com um cabeçalho genérico
  // ("Invalid `prisma.x()` invocation:") e só depois diz a causa — pegar a
  // primeira linha não ajudava.
  const util = msg
    .split("\n")
    .map((l) => l.trim())
    .filter((l) =>
      l.length > 0 &&
      !/^Invalid `.*` invocation/.test(l) &&
      !l.startsWith("-->") &&
      !/^\d+\s*\|/.test(l),
    )
    .join(" · ")
    // Remove só a parte de credencial (user:senha@). NÃO substituir a menção
    // literal a "postgresql://" — a mensagem mais útil do Prisma é justamente
    // "the URL must start with the protocol `postgresql://`", e escrubá-la
    // esconderia a causa que se quer diagnosticar.
    .replace(/\/\/[^@\s/]*:[^@\s/]*@/g, "//***:***@")
  return `${err?.name ?? "Error"}: ${util.slice(0, 240)}`
}

/**
 * Impressão digital da connection string que o RUNTIME recebeu.
 *
 * Existe porque "a variável está certa no painel" e "a função recebeu o valor
 * certo" são afirmações diferentes — e a segunda é a que importa. Comparando
 * comprimento + prefixo + hash truncado com o valor sabidamente bom, dá para
 * afirmar se são idênticos sem nunca expor a senha.
 *
 * Seguro em produção: prefixo é só o protocolo, e 8 hex de SHA-256 não permitem
 * reverter nem comparar por força bruta um segredo de alta entropia.
 */
async function digitalDaUrl(): Promise<Record<string, string | number | boolean>> {
  const raw = process.env.DATABASE_URL
  if (!raw) return { presente: false }
  const { createHash } = await import("crypto")
  return {
    presente:   true,
    tamanho:    raw.length,
    prefixo:    raw.slice(0, 15),
    hash:       createHash("sha256").update(raw).digest("hex").slice(0, 8),
    // Espaço/quebra de linha nas pontas é invisível no painel e quebra a auth.
    temEspacos: raw !== raw.trim(),
  }
}

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {}
  const errors: Record<string, string> = {}
  const codes:  Record<string, string> = {}

  // ── 1. Banco de dados ────────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.db = "ok"
  } catch (e) {
    checks.db = "error"
    codes.db  = codigoDeFalha(e)
    errors.db = e instanceof Error ? e.message : String(e)
  }

  // ── 2. Supabase Storage (bucket item-images) ─────────────────────────────
  try {
    const { error } = await createAdminClient()
      .storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "item-images")
      .list("", { limit: 1 })
    if (error) throw new Error(error.message)
    checks.storage = "ok"
  } catch (e) {
    checks.storage = "error"
    errors.storage = e instanceof Error ? e.message : String(e)
  }

  // ── 3. Bucket id-docs (privado) ──────────────────────────────────────────
  try {
    const { error } = await createAdminClient()
      .storage
      .from("id-docs")
      .list("", { limit: 1 })
    if (error) throw new Error(error.message)
    checks.storage_private = "ok"
  } catch (e) {
    checks.storage_private = "error"
    errors.storage_private = e instanceof Error ? e.message : String(e)
  }

  const allOk  = Object.values(checks).every((v) => v === "ok")
  const status = allOk ? 200 : 503

  // S14-MIN-07: a mensagem crua (hostname/driver/etc.) só é exposta fora de
  // produção. Em produção retornamos apenas o mapa `checks` (qual dependência
  // está degradada), sem detalhes internos que sirvam de recon de infra.
  const exposeErrors = process.env.NODE_ENV !== "production"

  return NextResponse.json(
    {
      status:    allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      // Flags inlinadas em build-time. Expostas aqui porque é a única forma
      // barata de conferir o valor no ARTEFATO DEPLOYADO — se a env var for
      // marcada Sensitive no Vercel, ela chega vazia no build e o gate de
      // pré-lançamento fica desligado em silêncio. Não é dado sensível: é
      // observável na própria navegação.
      flags: { prelaunch: PRELAUNCH_ENABLED, noindex: NOINDEX_ENABLED },
      // Só quando o banco falha — é diagnóstico, não telemetria de rotina.
      ...(checks.db === "error" && { dbUrl: await digitalDaUrl() }),
      // Códigos são seguros em produção (não identificam infra); a mensagem crua
      // continua restrita a dev.
      ...(Object.keys(codes).length > 0 && { codes }),
      ...(exposeErrors && Object.keys(errors).length > 0 && { errors }),
    },
    { status },
  )
}
