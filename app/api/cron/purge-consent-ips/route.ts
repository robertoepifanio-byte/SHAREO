/**
 * GET /api/cron/purge-consent-ips
 * Executado mensalmente via Vercel Cron (dia 1, 03h UTC).
 *
 * Expurgo de IPs de consentimento — retenção LGPD (auditoria s40):
 *
 *   (A) User.consentIp (PF)
 *       IP do consentimento LGPD no cadastro de Pessoa Física.
 *       Sugestão: 5 anos (espelha cron PJ já existente em /api/cron/kyb).
 *       Referência do campo: User.consentAt (quando ocorreu o consentimento).
 *       ⚠️ CONFIRMAR PRAZO COM JURÍDICO.
 *
 *   (B) ContractAcceptance.ipAddress + userAgent
 *       IP e UA do aceite do contrato de locação.
 *       Sugestão: 5 anos após o término da reserva vinculada.
 *       "Término" = Booking.endDate (ou data de cancelamento se CANCELLED).
 *       ⚠️ CONFIRMAR PRAZO COM JURÍDICO.
 *
 *   (C) FounderLead.consentIp + consentUserAgent
 *       IP e UA do consentimento de marketing da lista de fundadores.
 *       Sugestão: 5 anos a partir de marketingConsentAt.
 *       ⚠️ CONFIRMAR PRAZO COM JURÍDICO.
 *
 * Padrão de expurgo: nullifica os campos de IP/UA (não deleta o registro inteiro).
 * O timestamp de consentimento (consentAt, acceptedAt, marketingConsentAt) é preservado
 * pois não é considerado PII forte — é dado de auditoria necessário.
 *
 * Idempotente: re-executar não afeta registros já zerados (WHERE ip IS NOT NULL).
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime     = "nodejs"
export const maxDuration = 60

// ⚠️ CONFIRMAR COM JURÍDICO — sugestão da auditoria s40: 5 anos
const RETENTION_YEARS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - RETENTION_YEARS)

  // ─── (A) User.consentIp — PF ───────────────────────────────────────────────
  // Espelha o padrão do cron PJ (/api/cron/kyb linha 143-153).
  // Critério de tempo: User.consentAt (quando PF deu o consentimento).
  // Exclui PJ para não duplicar com o cron kyb existente.
  const pfIpResult = await prisma.user.updateMany({
    where: {
      userType:  "PF",
      consentIp: { not: null },
      consentAt: { lt: fiveYearsAgo },
    },
    data: { consentIp: null },
  })

  // ─── (B) ContractAcceptance.ipAddress + userAgent ──────────────────────────
  // Critério de tempo: Booking.endDate da reserva vinculada.
  // Se a reserva foi cancelada, usa updatedAt como proxy (sem campo dedicado de término).
  // A lógica: nullifica IP/UA de contratos cujo booking.endDate < cutoff
  // (e booking não está mais ACTIVE/PENDING — já encerrado de alguma forma).
  const contractResult = await prisma.contractAcceptance.updateMany({
    where: {
      ipAddress: { not: null },
      booking: {
        endDate: { lt: fiveYearsAgo },
        // Só expurga de reservas já encerradas (não PENDING/CONFIRMED/ACTIVE)
        status: { in: ["COMPLETED", "CANCELLED", "RETURNED", "DISPUTED"] },
      },
    },
    data: {
      ipAddress: null,
      userAgent: null,
    },
  })

  // ─── (C) FounderLead.consentIp + consentUserAgent ──────────────────────────
  // Critério de tempo: FounderLead.marketingConsentAt.
  const founderResult = await prisma.founderLead.updateMany({
    where: {
      consentIp:        { not: null },
      marketingConsentAt: { lt: fiveYearsAgo },
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
    note:           "CONFIRMAR PRAZOS COM JURÍDICO antes de ativar em producao",
  }
  console.warn("[cron/purge-consent-ips]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
