import { NextRequest, NextResponse } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/meus-anuncios/desempenho
 *
 * Retorna métricas de performance dos itens do próprio usuário autenticado
 * (visualizações, reservas, receita, avaliações, favoritos).
 *
 * SEC: filtro obrigatório `ownerId = userId` em TODAS as queries Prisma — nunca
 * expõe dados de outro anunciante. Erro de auditoria anterior (painel-dois-atores
 * 2026-08-22) foi exatamente vazar dados por filtro fraco / select excessivo.
 *
 * Autenticação: suporta Bearer JWT (app mobile) e cookie NextAuth (web), via
 * resolveUserId — padrão estabelecido para evitar 401s no app (feedback
 * feedback-auth-cookie-only-mobile-401).
 *
 * Restrito a usuários PJ — retorna 403 com code PJ_REQUIRED para PF.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json(
      { error: { message: "Não autenticado", code: "UNAUTHENTICATED" } },
      { status: 401 },
    )
  }

  // Verificar userType — recurso restrito a PJ
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { userType: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: { message: "Usuário não encontrado" } },
      { status: 404 },
    )
  }

  if (user.userType !== "PJ") {
    return NextResponse.json(
      { error: { message: "Analytics exclusivo para contas PJ", code: "PJ_REQUIRED" } },
      { status: 403 },
    )
  }

  // SEC: `ownerId: userId` garante isolamento — nunca remover este filtro.
  // `deletedAt: null` exclui itens removidos (soft delete).
  const items = await prisma.item.findMany({
    where:   { ownerId: userId, deletedAt: null },
    orderBy: { viewCount: "desc" },
    select: {
      id:        true,
      title:     true,
      status:    true,
      viewCount: true,
      images: {
        select:  { url: true },
        orderBy: { order: "asc" },
        take:    1,
      },
      _count: {
        select: { favorites: true },
      },
      bookings: {
        where:  { status: { in: ["RETURNED", "COMPLETED"] } },
        select: { totalPrice: true },
      },
      reviews: {
        select: { rating: true },
      },
    },
  })

  // ── Totais ─────────────────────────────────────────────────────────────────
  const totalViews    = items.reduce((s, i) => s + i.viewCount, 0)
  const totalRevenue  = items.reduce(
    (s, i) => s + i.bookings.reduce((b, bk) => b + bk.totalPrice, 0),
    0,
  )
  const totalBookings = items.reduce((s, i) => s + i.bookings.length, 0)
  const allRatings    = items.flatMap((i) => i.reviews.map((r) => r.rating))
  const avgRating     = allRatings.length > 0
    ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
    : null

  return NextResponse.json({
    data: {
      totals: {
        views:        totalViews,
        bookings:     totalBookings,
        revenue:      totalRevenue,
        avgRating,
        ratingsCount: allRatings.length,
      },
      items: items.map((item) => {
        const revenue     = item.bookings.reduce((s, b) => s + b.totalPrice, 0)
        const ratings     = item.reviews.map((r) => r.rating)
        const avgItemRating = ratings.length > 0
          ? ratings.reduce((s, r) => s + r, 0) / ratings.length
          : null

        return {
          id:             item.id,
          title:          item.title,
          status:         item.status,
          viewCount:      item.viewCount,
          favoritesCount: item._count.favorites,
          bookingsCount:  item.bookings.length,
          revenue,
          avgRating:      avgItemRating,
          ratingsCount:   ratings.length,
          imageUrl:       item.images[0]?.url ?? null,
        }
      }),
    },
  })
}
