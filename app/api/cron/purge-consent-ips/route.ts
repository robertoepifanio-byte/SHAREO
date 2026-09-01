/**
 * GET /api/cron/purge-consent-ips
 * Executado mensalmente via Vercel Cron (dia 1, 03h UTC).
 *
 * Expurgo de IPs de consentimento — retencao LGPD (prazo confirmado com juridico em
 * 2026-06-30, decisao A1: 5 anos para todos os campos abaixo):
 *
 *   (A) User.consentIp (PF)
 *       IP do consentimento LGPD no cadastro de Pessoa Fisica.
 *       Prazo: 5 anos a partir de User.consentAt.
 *       EXCECAO: User.legalHoldConsent=true → campo NAO e nullificado (A4).
 *
 *   (B) ContractAcceptance.ipAddress + userAgent
 *       IP e UA do aceite do contrato de locacao.
 *       Prazo: 5 anos apos o termino da reserva vinculada (Booking.endDate).
 *       EXCECAO: ContractAcceptance.legalHold=true → campos NAO sao nullificados (A4).
 *
 *   (C) FounderLead.consentIp + consentUserAgent
 *       IP e UA do consentimento de marketing da lista de fundadores.
 *       Prazo: 5 anos a partir de marketingConsentAt.
 *       EXCECAO: FounderLead.legalHold=true → campos NAO sao nullificados (A4).
 *
 * Padrao de expurgo: nullifica os campos de IP/UA (nao deleta o registro inteiro).
 * O timestamp de consentimento (consentAt, acceptedAt, marketingConsentAt) e preservado
 * pois nao e considerado PII forte — e dado de auditoria necessario.
 *
 * Para acionar retencao legal (A4), executar via SQL no Supabase Dashboard (MFA obrigatorio).
 * Ver migration 20260630100000_add_legal_hold para instrucoes.
 *
 * Idempotente: re-executar nao afeta registros ja zerados (WHERE ip IS NOT NULL).
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime     = "nodejs"
export const maxDuration = 60

// 5 anos (LGPD art. 7o IX + CTN art. 173).
// Prazo confirmado com juridico em 2026-06-30 (decisao A1).
const RETENTION_YEARS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - RETENTION_YEARS)

  // ─── (A) User.consentIp — PF ───────────────────────────────────────────────
  // Espelha o padrao do cron PJ (/api/cron/kyb linha 143-153).
  // Criterio de tempo: User.consentAt (quando PF deu o consentimento).
  // Exclui PJ para nao duplicar com o cron kyb existente.
  // PULA usuarios com legalHoldConsent=true (retencao legal ativa — A4).
  const pfIpResult = await prisma.user.updateMany({
    where: {
      userType:         "PF",
      consentIp:        { not: null },
      consentAt:        { lt: fiveYearsAgo },
      legalHoldConsent: false,
    },
    data: { consentIp: null },
  })

  // ─── (B) ContractAcceptance.ipAddress + userAgent ──────────────────────────
  // Criterio de tempo: Booking.endDate da reserva vinculada.
  // A logica: nullifica IP/UA de contratos cujo booking.endDate < cutoff
  // (e booking nao esta mais ACTIVE/PENDING — ja encerrado de alguma forma).
  // PULA contratos com legalHold=true (retencao legal ativa — A4).
  const contractResult = await prisma.contractAcceptance.updateMany({
    where: {
      ipAddress:  { not: null },
      legalHold:  false,
      booking: {
        endDate: { lt: fiveYearsAgo },
        // So expurga de reservas ja encerradas (nao PENDING/CONFIRMED/ACTIVE)
        status: { in: ["COMPLETED", "CANCELLED", "RETURNED"] },
        // ...e nunca com disputa em aberto: o IP do aceite e prova no
        // caso em mediacao. DISPUTED saiu da lista acima porque disputa
        // deixou de ser status; a protecao virou explicita.
        disputeStatus: { not: "OPEN" },
      },
    },
    data: {
      ipAddress: null,
      userAgent: null,
    },
  })

  // ─── (C) FounderLead.consentIp + consentUserAgent ──────────────────────────
  // Criterio de tempo: FounderLead.marketingConsentAt.
  // PULA leads com legalHold=true (retencao legal ativa — A4).
  const founderResult = await prisma.founderLead.updateMany({
    where: {
      consentIp:          { not: null },
      marketingConsentAt: { lt: fiveYearsAgo },
      legalHold:          false,
    },
    data: {
      consentIp:       null,
      consentUserAgent: null,
    },
  })

  const summary = {
    ok:             true,
    retentionYears: RETENTION_YEARS,
    cutoffDate:     fiveYearsAgo.toISOString(),
    pfConsentIp:    { cleared: pfIpResult.count },
    contractIpUa:   { cleared: contractResult.count },
    founderIpUa:    { cleared: founderResult.count },
    note:           "LGPD art. 7o IX + prazo fiscal 5 anos (A1). legalHold=true/legalHoldConsent=true preservados (A4).",
  }
  console.warn("[cron/purge-consent-ips]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
