import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { NOINDEX_ENABLED } from "@/lib/seo-flags"
import { isEmailProviderConfigured } from "@/lib/email"
import { cryptoKeyStatus } from "@/lib/crypto"
import { codigoDeFalha, codigoDeFalhaStorage } from "@/lib/health/failure-codes"

export const runtime    = "nodejs"
export const dynamic    = "force-dynamic"
export const revalidate = 0

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
    codes.storage  = codigoDeFalhaStorage(e)
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
    codes.storage_private  = codigoDeFalhaStorage(e)
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
      // Flag inlinada em build-time. Exposta aqui porque é a única forma barata
      // de conferir o valor no ARTEFATO DEPLOYADO — marcada como Sensitive no
      // Vercel, ela chega vazia no build do staging (que usa `vercel pull`) e o
      // ambiente passa a ser indexável em silêncio. Não é dado sensível: é
      // observável no próprio robots.txt.
      // `email` NÃO entra em `checks` de propósito: o passo de health do deploy
      // aborta o deploy quando o status não é 200, e derrubar deploys por causa
      // de e-mail — que não está no caminho de nenhuma requisição — trocaria uma
      // falha silenciosa por outra pior. Promover a `checks` quando os dois
      // ambientes estiverem verdes.
      //
      // Diz só se a chave CHEGOU ao runtime, sem validá-la com o provedor: é a
      // pergunta que ficou sem resposta por horas em 31/08/2026, quando a
      // variável estava certa no painel da Vercel e mesmo assim nenhum e-mail
      // saía. Nenhuma tela disponível respondia isso.
      // `crypto` fica fora de `checks` pela mesma razão do `email`, acima.
      flags: {
        noindex: NOINDEX_ENABLED,
        email:   isEmailProviderConfigured() ? "ok" : "sem-chave",
        crypto:  cryptoKeyStatus(),
      },
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
