import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { prisma } from "@/lib/prisma"

// LGPD art. 20 — portabilidade de dados
// Auditoria s40 / ressalva #3: export estava incompleto — omitia mensagens/conversas,
// dados financeiros (PlatformTransaction/Payout), KYC/verificação de identidade e ambassador.
// Bearer token suportado via resolveUserId para acesso pelo app mobile.
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const [
      user,
      items,
      bookings,
      reviews,
      favorites,
      conversations,
      financialTransactions,
      payouts,
      kyc,
      ambassador,
      contractAcceptances,
    ] = await Promise.all([
      // ── Dados do perfil ────────────────────────────────────────────────────
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id:              true,
          name:            true,
          email:           true,
          phone:           true,
          bio:             true,
          city:            true,
          state:           true,
          neighborhood:    true,
          userType:        true,
          isVerified:      true,
          consentAt:       true,
          consentVersion:  true,
          // KYC básico (status — URLs de docs não exportadas por segurança)
          idVerificationStatus: true,
          idSubmittedAt:        true,
          idVerifiedAt:         true,
          // Prova de consentimento biométrico (LGPD art. 20 — direito do titular).
          // idSelfieConsentIp fica FORA (dado de auditoria interna, não PII do titular).
          idSelfieConsentAt:      true,
          idSelfieConsentVersion: true,
          idSelfieConsentTextHash: true,
          createdAt:       true,
        },
      }),

      // ── Anúncios ──────────────────────────────────────────────────────────
      prisma.item.findMany({
        where: { ownerId: userId, deletedAt: null },
        select: {
          id:          true,
          title:       true,
          description: true,
          pricePerDay: true,
          condition:   true,
          city:        true,
          state:       true,
          status:      true,
          createdAt:   true,
          category:    { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // ── Reservas ──────────────────────────────────────────────────────────
      prisma.booking.findMany({
        where: { OR: [{ borrowerId: userId }, { ownerId: userId }] },
        select: {
          id:                 true,
          status:             true,
          startDate:          true,
          endDate:            true,
          totalDays:          true,
          totalPrice:         true,
          platformFeeAmount:  true,
          ownerNetAmount:     true,
          createdAt:          true,
          item:    { select: { title: true } },
          borrower: { select: { name: true } },
          owner:    { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // ── Avaliações ────────────────────────────────────────────────────────
      prisma.review.findMany({
        where: { reviewerId: userId },
        select: {
          id:         true,
          rating:     true,
          comment:    true,
          reviewType: true,
          createdAt:  true,
          reviewee:   { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // ── Favoritos ─────────────────────────────────────────────────────────
      prisma.favorite.findMany({
        where: { userId },
        select: {
          createdAt: true,
          item:      { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // ── Conversas e mensagens (só as do próprio titular) ──────────────────
      // Não exportamos mensagens de terceiros — só o conteúdo enviado pelo titular.
      prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        select: {
          id:            true,
          lastMessageAt: true,
          booking:       { select: { id: true } },
          messages: {
            where:   { senderId: userId, deletedAt: null },
            select:  { id: true, content: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      }),

      // ── Dados financeiros — PlatformTransaction (ADR-017) ─────────────────
      // Valores, datas, splits. Sem dados de terceiros (só as reservas do titular).
      prisma.platformTransaction.findMany({
        where: {
          booking: {
            OR: [{ borrowerId: userId }, { ownerId: userId }],
          },
        },
        select: {
          id:          true,
          type:        true,
          amount:      true,
          description: true,
          createdAt:   true,
          bookingId:   true,
        },
        orderBy: { createdAt: "desc" },
      }),

      // ── Dados financeiros — Payout (ADR-017) ──────────────────────────────
      prisma.payout.findMany({
        where: {
          ownerPaymentAccount: { userId },
        },
        select: {
          id:             true,
          amount:         true,
          status:         true,
          eligibleAfter:  true,
          processedAt:    true,
          createdAt:      true,
          bookingId:      true,
        },
        orderBy: { createdAt: "desc" },
      }),

      // ── KYC / Verificação de identidade ───────────────────────────────────
      // URLs de documentos NÃO exportadas (acesso privado no Storage; solicitar
      // separadamente ao DPO se necessário). Exportamos apenas o status e datas.
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          idVerificationStatus: true,
          idSubmittedAt:        true,
          idVerifiedAt:         true,
          idRejectionReason:    true,
        },
      }),

      // ── Programa de Embaixadores ───────────────────────────────────────────
      prisma.ambassadorProfile.findUnique({
        where: { userId },
        select: {
          currentTier:                  true,
          activeReferralsCnt:           true,
          totalCommissionPendingCents:  true,
          totalCommissionPaidCents:     true,
          totalCommissionCancelledCents: true,
          // Chave PIX do embaixador (PII financeira) — inclusa pois é dado do titular
          user: {
            select: {
              ownerPaymentAccount: {
                select: { pixKeyType: true, pixKey: true, holderName: true },
              },
            },
          },
        },
      }),

      // ── Aceites de contrato ────────────────────────────────────────────────
      prisma.contractAcceptance.findMany({
        where: { booking: { OR: [{ borrowerId: userId }, { ownerId: userId }] } },
        select: {
          id:              true,
          acceptedAt:      true,
          contractVersion: true,
          bookingId:       true,
          // IP e User-Agent inclusos — são dados de conexão do titular (MCI art.15)
          ipAddress: true,
          userAgent:  true,
        },
        orderBy: { acceptedAt: "desc" },
      }),
    ])

    const payload = {
      exportedAt: new Date().toISOString(),
      _notice: [
        "Este arquivo contém todos os dados pessoais armazenados pela ShareO sobre sua conta.",
        "Documentos de identidade (RG/CNH/selfie) são armazenados em área privada e não",
        "são incluídos neste export por segurança. Para obtê-los, entre em contato com",
        "privacidade@shareo.com.br informando seu CPF e a solicitação.",
      ],
      perfil: user,
      verificacaoIdentidade: kyc,
      anuncios: items,
      reservas: bookings,
      avaliacoes: reviews,
      favoritos: favorites,
      conversas: conversations.map((c) => ({
        id:            c.id,
        bookingId:     c.booking?.id ?? null,
        lastMessageAt: c.lastMessageAt,
        // Apenas mensagens enviadas pelo próprio titular
        minhasMensagens: c.messages,
      })),
      financeiro: {
        transacoes: financialTransactions,
        repasses:   payouts,
      },
      embaixador: ambassador
        ? {
            tier:                     ambassador.currentTier,
            indicacoesAtivas:         ambassador.activeReferralsCnt,
            comissaoPendenteCentavos: ambassador.totalCommissionPendingCents,
            comissaoPagaCentavos:     ambassador.totalCommissionPaidCents,
            comissaoCanceladaCentavos: ambassador.totalCommissionCancelledCents,
            contaPagamento:           ambassador.user.ownerPaymentAccount,
          }
        : null,
      aceitesContrato: contractAcceptances,
    }

    const filename = `shareo-meus-dados-${new Date().toISOString().split("T")[0]}.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    console.error("[GET /api/users/me/export]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
