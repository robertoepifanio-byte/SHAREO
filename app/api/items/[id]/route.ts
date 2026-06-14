import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateItemSchema } from "@/lib/validations/items"
import { geocodeItem } from "@/lib/geocodeItem"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id }     = await params
    const session    = await auth().catch(() => null)
    const userId     = session?.user.id
    const isAdmin    = session?.user.role === "ADMIN"

    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        owner: {
          select: {
            id: true, name: true, avatarUrl: true, isVerified: true,
            city: true, state: true, createdAt: true,
          },
        },
        images:  { orderBy: { order: "asc" }, take: 24 },  // bound de payload (ARQ-M-07)
        reviews: {
          where: { reviewType: "ITEM" },
          select: {
            id: true, rating: true, comment: true,
            reviewer: { select: { name: true, avatarUrl: true } },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { reviews: true, favorites: true, bookings: true } },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    // Itens não aprovados ou não disponíveis só visíveis para o dono ou admin
    const isOwner = userId === item.owner.id
    if ((!item.isApproved || item.status !== "AVAILABLE") && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    // Incremento de viewCount após a resposta (só conta para itens públicos)
    after(() =>
      prisma.item.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => console.error("[viewCount]", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: item })
  } catch (e) {
    console.error("[GET /api/items/[id]]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    if (existing.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Sem permissão." } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = UpdateItemSchema.safeParse(body)

    if (!parsed.success) {
      const details: Record<string, string[]> = {}
      for (const e of parsed.error.errors) {
        const key = e.path.join(".") || "form"
        details[key] = [...(details[key] ?? []), e.message]
      }
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details } },
        { status: 400 }
      )
    }

    const d = parsed.data
    const updated = await prisma.item.update({
      where: { id },
      data: {
        ...(d.title         !== undefined && { title:         d.title }),
        ...(d.description   !== undefined && { description:   d.description }),
        ...(d.categoryId    !== undefined && { categoryId:    d.categoryId }),
        ...(d.condition     !== undefined && { condition:     d.condition }),
        ...(d.pricePerDay   !== undefined && { pricePerDay:   d.pricePerDay }),
        ...(d.pricePerWeek  !== undefined && { pricePerWeek:  d.pricePerWeek }),
        ...(d.pricePerMonth !== undefined && { pricePerMonth: d.pricePerMonth }),
        ...(d.depositAmount !== undefined        && { depositAmount:        d.depositAmount }),
        ...(d.estimatedRetailPrice !== undefined && { estimatedRetailPrice: d.estimatedRetailPrice }),
        ...(d.address       !== undefined && { address:       d.address }),
        ...(d.city          !== undefined && { city:          d.city }),
        ...(d.state         !== undefined && { state:         d.state }),
        ...(d.neighborhood  !== undefined && { neighborhood:  d.neighborhood }),
        ...(d.latitude      !== undefined && { latitude:      d.latitude }),
        ...(d.longitude     !== undefined && { longitude:     d.longitude }),
        // Retrocompatibilidade: isActive no payload mapeado para status
        ...(d.isActive === false && { status: "PAUSED" as const }),
        ...(d.isActive === true  && { status: "AVAILABLE" as const }),
        ...(d.status   !== undefined && { status: d.status }),
        ...(d.voltage               !== undefined && { voltage:               d.voltage }),
        ...(d.requireIdVerification !== undefined && { requireIdVerification: d.requireIdVerification }),
        ...(d.requirePhone          !== undefined && { requirePhone:          d.requirePhone }),
      },
      select: { id: true, title: true, status: true, updatedAt: true, pricePerDay: true },
    })

    // Regeocodifica em background quando endereço muda
    // after() garante execução mesmo depois da resposta (fire-and-forget puro morre no Vercel)
    if (d.city || d.state || d.neighborhood) {
      after(() =>
        prisma.item.findUnique({ where: { id }, select: { city: true, state: true, neighborhood: true } })
          .then((it) => {
            if (it) return geocodeItem(id, { city: it.city, state: it.state, neighborhood: it.neighborhood })
          })
          .catch((e) => console.error("[geocodeItem PUT]", e instanceof Error ? e.message : e))
      )
    }

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PUT /api/items/[id]]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    if (existing.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Sem permissão." } },
        { status: 403 }
      )
    }

    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DELETED" },
    })

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[DELETE /api/items/[id]]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}
