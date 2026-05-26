import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateProfileSchema } from "@/lib/validations/users"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: {
        id:           true,
        name:         true,
        email:        true,
        bio:          true,
        phone:        true,
        city:         true,
        state:        true,
        neighborhood: true,
        avatarUrl:    true,
        userType:     true,
        isVerified:   true,
        createdAt:    true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: user })
  } catch (e) {
    console.error("[GET /api/users/me]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const body   = await req.json()
    const parsed = UpdateProfileSchema.safeParse(body)

    if (!parsed.success) {
      const details: Record<string, string[]> = {}
      for (const e of parsed.error.errors) {
        const key = e.path.join(".") || "form"
        details[key] = [...(details[key] ?? []), e.message]
      }
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details } },
        { status: 400 },
      )
    }

    const d       = parsed.data
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data:  {
        ...(d.name         !== undefined && { name:         d.name }),
        ...(d.bio          !== undefined && { bio:          d.bio }),
        ...(d.phone        !== undefined && { phone:        d.phone }),
        ...(d.city         !== undefined && { city:         d.city }),
        ...(d.state        !== undefined && { state:        d.state }),
        ...(d.neighborhood !== undefined && { neighborhood: d.neighborhood }),
        ...(d.avatarUrl    !== undefined && { avatarUrl:    d.avatarUrl }),
      },
      select: {
        id:           true,
        name:         true,
        bio:          true,
        phone:        true,
        city:         true,
        state:        true,
        neighborhood: true,
        avatarUrl:    true,
        updatedAt:    true,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/users/me]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
