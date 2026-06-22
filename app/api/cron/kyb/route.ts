/**
 * GET /api/cron/kyb  (ADR-024 / H2)
 * Executado diariamente via Vercel Cron.
 *
 * (1) Retry da fila de revisão: re-consulta na Receita as contas PJ que ficaram
 *     pendentes (cnpjSituacaoVerificada=false, sem override admin) por causa do
 *     fail-open. Se a empresa estiver ATIVA agora, marca como verificada.
 * (2) Revalidação periódica de PJs já verificadas: re-consulta as contas verificadas
 *     há mais de 30 dias (sem override admin) para detectar empresa que ENCERROU
 *     após o cadastro. Se virou inativa/inexistente, volta para a fila de revisão.
 * (3) Retenção LGPD: nullifica cnpjDeclaracaoIp com mais de 5 anos, preservando
 *     cnpjDeclaracaoAt (timestamp não é PII forte).
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { decryptDocument } from "@/lib/crypto"
import { verifyCnpjAtReceita, PjVerificationError } from "@/lib/pjVerification"

export const runtime = "nodejs"
export const maxDuration = 60

const RETRY_BATCH = 50
// Revalidação periódica: lote menor (auto-throttle) e janela de 30 dias por conta.
const REVALIDATE_BATCH = 25
const REVALIDATE_AFTER_DAYS = 30

export async function GET(req: NextRequest) {
  // Proteção: apenas Vercel Cron ou CRON_SECRET correto.
  const auth = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ─── (1) Retry da fila de revisão ──────────────────────────────────────────
  const pending = await prisma.user.findMany({
    where: {
      userType:                  "PJ",
      cnpjSituacaoVerificada:    false,
      cnpjVerificacaoOverrideAt: null,
      cnpjEncrypted:             { not: null },
      deletedAt:                 null,
    },
    orderBy: { cnpjDeclaracaoAt: "asc" },
    take:    RETRY_BATCH,
    select:  { id: true, cnpjEncrypted: true },
  })

  let verified = 0
  let stillUnavailable = 0
  let inactive = 0

  for (const u of pending) {
    let cnpj: string
    try {
      cnpj = decryptDocument(u.cnpjEncrypted!)
    } catch {
      continue // CNPJ ilegível — deixa para revisão manual do admin
    }
    try {
      const v = await verifyCnpjAtReceita(cnpj)
      await prisma.user.update({
        where: { id: u.id },
        data: {
          cnpjRazaoSocial:        v.razaoSocial,
          cnpjSituacao:           v.situacao,
          cnpjDataAbertura:       v.dataAbertura,
          cnpjSituacaoVerificada: true,
          cnpjVerificadoAt:       new Date(),
        },
      })
      verified++
    } catch (e) {
      if (e instanceof PjVerificationError && (e.code === "CNPJ_INACTIVE" || e.code === "CNPJ_NOT_FOUND")) {
        // Empresa inativa/inexistente — deixa na fila para o admin decidir (encerrar).
        inactive++
      } else {
        stillUnavailable++ // segue indisponível — tenta de novo no próximo cron
      }
    }
  }

  // ─── (2) Revalidação periódica de PJs já verificadas ───────────────────────
  // Detecta empresa que encerrou/foi baixada APÓS o cadastro. Pega as verificadas
  // há mais de REVALIDATE_AFTER_DAYS dias (mais antigas primeiro), sem override admin.
  const staleThreshold = new Date()
  staleThreshold.setDate(staleThreshold.getDate() - REVALIDATE_AFTER_DAYS)

  const toRevalidate = await prisma.user.findMany({
    where: {
      userType:                  "PJ",
      cnpjSituacaoVerificada:    true,
      cnpjVerificacaoOverrideAt: null, // respeita a decisão manual do admin
      cnpjVerificadoAt:          { lt: staleThreshold },
      cnpjEncrypted:             { not: null },
      deletedAt:                 null,
    },
    orderBy: { cnpjVerificadoAt: "asc" },
    take:    REVALIDATE_BATCH,
    select:  { id: true, cnpjEncrypted: true },
  })

  let stillActive = 0
  let nowInactive = 0
  let revalUnavailable = 0

  for (const u of toRevalidate) {
    let cnpj: string
    try {
      cnpj = decryptDocument(u.cnpjEncrypted!)
    } catch {
      continue // CNPJ ilegível — não rebaixa o que já estava verificado
    }
    try {
      const v = await verifyCnpjAtReceita(cnpj)
      // Continua ATIVA: refresca o carimbo (sai da janela por mais 30 dias).
      await prisma.user.update({
        where: { id: u.id },
        data: {
          cnpjRazaoSocial:  v.razaoSocial,
          cnpjSituacao:     v.situacao,
          cnpjDataAbertura: v.dataAbertura,
          cnpjVerificadoAt: new Date(),
        },
      })
      stillActive++
    } catch (e) {
      if (e instanceof PjVerificationError && (e.code === "CNPJ_INACTIVE" || e.code === "CNPJ_NOT_FOUND")) {
        // Empresa encerrou/baixou após o cadastro → volta para a fila de revisão do admin.
        await prisma.user.update({
          where: { id: u.id },
          data: {
            cnpjSituacaoVerificada: false,
            cnpjVerificadoAt:       new Date(),
            ...(e.situacao && { cnpjSituacao: e.situacao }),
          },
        })
        nowInactive++
      } else {
        // Receita indisponível — NÃO mexe no carimbo; tenta de novo no próximo cron.
        revalUnavailable++
      }
    }
  }

  // ─── (3) Retenção do IP da declaração (5 anos) ─────────────────────────────
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

  const retention = await prisma.user.updateMany({
    where: {
      cnpjDeclaracaoIp: { not: null },
      cnpjDeclaracaoAt: { lt: fiveYearsAgo },
    },
    data: { cnpjDeclaracaoIp: null },
  })

  const summary = {
    ok: true,
    retryQueue: { checked: pending.length, verified, inactive, stillUnavailable },
    revalidation: { checked: toRevalidate.length, stillActive, nowInactive, unavailable: revalUnavailable },
    ipRetention: { cleared: retention.count },
  }
  console.warn("[cron/kyb]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
