import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateItemSchema, ListItemsQuerySchema } from "@/lib/validations/items"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const query = ListItemsQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!query.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Parâmetros inválidos." } },
        { status: 400 }
      )
    }

    const { page, limit, search, categoryId, city, state, minPrice, maxPrice, ownerId } = query.data
    const skip = (page - 1) * limit

    const where = {
      isActive: ownerId ? undefined : true,
      isApproved: true,
      deletedAt: null,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(city && { city: { contains: city, mode: "insensitive" as const } }),
      ...(state && { state }),
      ...(ownerId && { ownerId }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        pricePerDay: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          pricePerDay: true,
          pricePerWeek: true,
          condition: true,
          city: true,
          state: true,
          neighborhood: true,
          latitude: true,
          longitude: true,
          isActive: true,
          viewCount: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
          owner:    { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
          images:   { select: { id: true, url: true }, orderBy: { order: "asc" }, take: 1 },
          _count:   { select: { reviews: true, favorites: true } },
        },
      }),
      prisma.item.count({ where }),
    ])

    return NextResponse.json({
      data: items,
      meta: { total, page, limit, hasNextPage: skip + items.length < total },
    })
  } catch (e) {
    console.error("[GET /api/items]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const parsed = CreateItemSchema.safeParse(body)

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

    const item = await prisma.item.create({
      data: {
        ownerId:       session.user.id,
        categoryId:    d.categoryId,
        title:         d.title,
        description:   d.description,
        condition:     d.condition,
        pricePerDay:   d.pricePerDay,
        pricePerWeek:  d.pricePerWeek ?? null,
        pricePerMonth: d.pricePerMonth ?? null,
        depositAmount:        d.depositAmount ?? null,
        estimatedRetailPrice: d.estimatedRetailPrice ?? null,
        address:              d.address ?? null,
        city:          d.city,
        state:         d.state,
        neighborhood:  d.neighborhood ?? null,
        latitude:      d.latitude,
        longitude:     d.longitude,
      },
      select: {
        id:          true,
        title:       true,
        city:        true,
        state:       true,
        pricePerDay: true,
        isActive:    true,
        createdAt:   true,
      },
    })

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/items]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}
