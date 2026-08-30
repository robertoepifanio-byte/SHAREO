/**
 * GET /api/users/[id]/public
 *
 * Perfil público de um usuário — sem autenticação obrigatória.
 * Retorna apenas os campos que a página app/perfil/[id]/page.tsx exibe.
 *
 * Campos deliberadamente OMITIDOS (sensíveis / não exibidos pelo site):
 *   email, phone, cpfHash, cpfEncrypted, cnpjHash, cnpjEncrypted, passwordHash,
 *   street, cep, latitude, longitude, role, adminRole, idDocumentUrl, idSelfieUrl,
 *   referralCode, referredById e quaisquer campos financeiros.
 *
 * Auditoria de referência: painel-dois-atores 22/08 — endpoint de reserva
 * entregava endereço de casa do locador (street/cep) por excesso de select.
 * Aqui o select é conservador: só o que a página do site renderiza.
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { prisma }           from "@/lib/prisma"
import { getOwnerResponseBadge } from "@/lib/ownerStats"
import {
  getBorrowerBadge,
  getNextBorrowerBadge,
  isActiveReviewer,
  ACTIVE_REVIEWER_BADGE,
} from "@/lib/badges"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // ── Consultas paralelas: usuário + média de avaliações ─────────────────────
  const [user, reviewStats] = await Promise.all([
    prisma.user.findFirst({
      where:  { id, deletedAt: null, isActive: true },
      select: {
        // ── Identidade pública ────────────────────────────────────────────────
        id:               true,
        name:             true,
        bio:              true,
        // Localização geral (bairro/cidade/estado — sem rua, CEP ou coordenadas)
        city:             true,
        state:            true,
        neighborhood:     true,
        avatarUrl:        true,
        userType:         true,
        isVerified:       true,
        createdAt:        true,
        reputationPoints: true,   // P3-70: pontos de reputação
        // ── Contadores de atividade ───────────────────────────────────────────
        _count: {
          select: {
            // Todos os itens não-deletados (AVAILABLE/PAUSED/DRAFT — igual ao site linha 44)
            items: { where: { status: { in: ["AVAILABLE", "PAUSED", "DRAFT"] }, deletedAt: null } },
            // Aluguéis concluídos em ambos os papéis (exibido como "X aluguéis")
            bookingsAsOwner:    { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
            bookingsAsBorrower: { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
          },
        },
        // ── Anúncios ativos (máx. 6 para a seção "Anúncios de <Nome>") ───────
        items: {
          where:   { status: "AVAILABLE", isApproved: true, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take:    6,
          select: {
            id:           true,
            title:        true,
            pricePerDay:  true,
            city:         true,
            state:        true,
            neighborhood: true,
            // slug necessário para o ItemCard mobile (paleta de cores por categoria)
            category: { select: { name: true, slug: true } },
            // Apenas nome e isVerified — nunca id, email ou localização do proprietário
            owner:    { select: { name: true, isVerified: true } },
            images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            _count:   { select: { reviews: true, favorites: true } },
          },
        },
        // ── Últimas 5 avaliações recebidas ───────────────────────────────────
        reviewsReceived: {
          orderBy: { createdAt: "desc" },
          take:    5,
          select: {
            rating:          true,
            comment:         true,
            reviewType:      true,
            sentiment:       true,
            // Sub-atributos exibidos pelo ReviewDetails (site linhas 70-83)
            itemAsDescribed: true,
            punctuality:     true,
            communication:   true,
            conservation:    true,
            photoUrl:        true,
            createdAt:       true,
            // Só o nome do avaliador — nunca id, email ou avatarUrl
            reviewer: { select: { name: true } },
          },
        },
      },
    }),
    // Média e contagem global de avaliações recebidas
    prisma.review.aggregate({
      where:  { revieweeId: id },
      _avg:   { rating: true },
      _count: { _all: true },
    }),
  ])

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Perfil não encontrado." } },
      { status: 404 },
    )
  }

  // ── Consultas secundárias: badge de resposta e avaliador ativo ─────────────
  const [responseBadge, lastReview] = await Promise.all([
    getOwnerResponseBadge(user.id),
    prisma.review.findFirst({
      where:   { reviewerId: user.id },
      orderBy: { createdAt: "desc" },
      select:  { createdAt: true },
    }).catch(() => null),
  ])

  const borrowerBadge  = getBorrowerBadge(user._count.bookingsAsBorrower)
  const nextBadge      = getNextBorrowerBadge(user._count.bookingsAsBorrower)
  const activeReviewer = isActiveReviewer(lastReview?.createdAt)
  const totalDeals     = user._count.bookingsAsOwner + user._count.bookingsAsBorrower

  return NextResponse.json({
    data: {
      // Identidade e perfil
      id:               user.id,
      name:             user.name,
      bio:              user.bio,
      city:             user.city,
      state:            user.state,
      neighborhood:     user.neighborhood,
      avatarUrl:        user.avatarUrl,
      userType:         user.userType,
      isVerified:       user.isVerified,
      createdAt:        user.createdAt,
      reputationPoints: user.reputationPoints,
      // Estatísticas exibidas nos 3 cards do site (linhas 177-203)
      itemCount:    user._count.items,
      totalDeals,
      avgRating:    reviewStats._avg.rating,
      reviewCount:  reviewStats._count._all,
      // Badges computados no servidor (não repassa contadores brutos de aluguéis para o cliente)
      responseBadge,
      borrowerBadge,
      nextBadge,
      activeReviewer,
      activeReviewerBadge: activeReviewer ? ACTIVE_REVIEWER_BADGE : null,
      // Conteúdo
      items:           user.items,
      reviewsReceived: user.reviewsReceived,
    },
  })
}
