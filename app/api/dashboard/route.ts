/**
 * GET /api/dashboard
 *
 * Agrega os dados do painel do usuário — espelha exatamente as queries
 * Prisma de app/dashboard/page.tsx e os sub-componentes
 * components/dashboard/{SuggestCard,MonthlyGoalProgress,UpcomingReturns}.tsx.
 *
 * Aceita tanto Bearer (mobile) quanto cookie de sessão NextAuth via
 * resolveUserId() — mesmo padrão adotado em todas as rotas mobile-friendly
 * do projeto (bookings, users/me, items, conversations, etc.).
 *
 * Não introduz campos ou relações além dos que já existem no schema.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { calcCO2Savings } from "@/lib/co2"

export async function GET(req: NextRequest) {
  try {
    const uid = await resolveUserId(req)
    if (!uid) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const now          = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // ── Queries paralelas — verbatim de app/dashboard/page.tsx linhas 37-108 ──
    const [
      itemCount,
      totalViewsAgg,
      activeBookings,
      monthEarningsAgg,
      recentBookings,
      lastBookingCategories,
      upcomingReturns,
    ] = await Promise.all([
      // itens anunciados
      prisma.item.count({ where: { ownerId: uid, deletedAt: null } }),

      // visualizações totais
      prisma.item.aggregate({
        where: { ownerId: uid, deletedAt: null },
        _sum:  { viewCount: true },
      }),

      // reservas ativas (como locatário ou locador)
      prisma.booking.count({
        where: {
          status: { in: ["CONFIRMED", "ACTIVE"] },
          OR: [{ borrowerId: uid }, { ownerId: uid }],
        },
      }),

      // ganhos do mês (como locador — bookings PAID no mês atual)
      prisma.booking.aggregate({
        where: {
          ownerId:       uid,
          paymentStatus: "PAID",
          status:        { in: ["ACTIVE", "RETURNED", "COMPLETED"] },
          startDate:     { gte: startOfMonth },
        },
        _sum: { totalPrice: true },
      }).catch(() => ({ _sum: { totalPrice: null } })),

      // últimas 3 reservas (como locatário ou locador, exceto canceladas)
      prisma.booking.findMany({
        where: {
          OR: [{ borrowerId: uid }, { ownerId: uid }],
          status: { not: "CANCELLED" },
        },
        orderBy: { createdAt: "desc" },
        take:    3,
        select: {
          id: true, status: true, startDate: true, endDate: true, totalPrice: true,
          item: {
            select: {
              title:  true,
              images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            },
          },
        },
      }).catch(() => []),

      // categorias das últimas reservas do usuário como locatário (para sugestões)
      prisma.booking.findMany({
        where: { borrowerId: uid, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take:    3,
        select: { item: { select: { categoryId: true } } },
      }).catch(() => []),

      // P2-58 — Próximas devoluções (proprietário): reservas ACTIVE ordenadas por endDate ASC
      prisma.booking.findMany({
        where: { ownerId: uid, status: "ACTIVE" },
        orderBy: { endDate: "asc" },
        take: 5,
        select: {
          id:       true,
          endDate:  true,
          item:     { select: { title: true } },
          borrower: { select: { name: true } },
        },
      }).catch(() => []),
    ])

    // ── Sugestões personalizadas — verbatim de app/dashboard/page.tsx linhas 111-130 ──
    const categoryIds = [
      ...new Set(
        lastBookingCategories
          .map((b) => b.item?.categoryId)
          .filter(Boolean) as string[],
      ),
    ]
    const suggestions = await prisma.item.findMany({
      where: {
        status:     "AVAILABLE",
        isApproved: true,
        deletedAt:  null,
        ownerId:    { not: uid },
        ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
      },
      take:    8,
      orderBy: { viewCount: "desc" },
      select: {
        id:          true,
        title:       true,
        pricePerDay: true,
        images:      { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
      },
    }).catch(() => [])

    // ── CO₂ — verbatim de app/dashboard/page.tsx linhas 133-143 ──
    const completedBookings = await prisma.booking.findMany({
      where:  { borrowerId: uid, status: "COMPLETED" },
      select: { startDate: true, endDate: true },
    }).catch(() => [])

    const totalDays = completedBookings.reduce((acc, b) => {
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
            86_400_000,
        ),
      )
      return acc + days
    }, 0)

    const { kgCO2, treesEquivalent } = calcCO2Savings(
      completedBookings.length,
      totalDays / Math.max(1, completedBookings.length),
    )

    return NextResponse.json({
      data: {
        itemCount,
        totalViews:      totalViewsAgg._sum.viewCount ?? 0,
        activeBookings,
        monthEarnings:   monthEarningsAgg._sum.totalPrice ?? 0,
        recentBookings:  recentBookings.map((b) => ({
          ...b,
          startDate: b.startDate.toISOString(),
          endDate:   b.endDate.toISOString(),
        })),
        suggestions,
        upcomingReturns: upcomingReturns.map((b) => ({
          ...b,
          endDate: b.endDate.toISOString(),
        })),
        co2Kg:           kgCO2,
        treesEquivalent,
      },
    })
  } catch (err) {
    console.error("[GET /api/dashboard]", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
