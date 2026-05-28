import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateProfileSchema } from "@/lib/validations/users"

/** Resolves user ID from NextAuth session OR mobile Bearer JWT */
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1. Try Bearer token (mobile)
  const bearer = req.headers.get("authorization")
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7)
    try {
      const key = new TextEncoder().encode(process.env.AUTH_SECRET ?? "")
      const { payload } = await jwtVerify(token, key)
      if (typeof payload.sub === "string") return payload.sub
    } catch {
      // fall through to session check
    }
  }
  // 2. Try NextAuth session (web)
  const session = await auth()
  return session?.user?.id ?? null
}

// LGPD art. 18 — direito ao esquecimento
export async function DELETE() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const userId = session.user.id

    // Bloquear exclusão se houver locação em andamento (ACTIVE)
    const activeBooking = await prisma.booking.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ borrowerId: userId }, { ownerId: userId }],
      },
      select: { id: true },
    })

    if (activeBooking) {
      return NextResponse.json(
        {
          error: {
            code: "ACTIVE_BOOKING",
            message:
              "Você possui uma locação em andamento. Aguarde a devolução antes de excluir a conta.",
          },
        },
        { status: 409 },
      )
    }

    // Cancelar reservas pendentes / confirmadas do usuário
    await prisma.booking.updateMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [{ borrowerId: userId }, { ownerId: userId }],
      },
      data: { status: "CANCELLED" },
    })

    // Anonimizar PII e soft-delete — dados de transações concluídas são mantidos
    // por obrigação fiscal (art. 9 LGPD c/c art. 37 Código Comercial).
    await prisma.user.update({
      where: { id: userId },
      data: {
        name:         "Usuário removido",
        email:        `removed-${userId}@shareo.invalid`,
        passwordHash: null,
        phone:        null,
        bio:          null,
        avatarUrl:    null,
        city:         null,
        state:        null,
        neighborhood: null,
        latitude:     null,
        longitude:    null,
        cpfHash:      null,
        cpfEncrypted: null,
        cnpjHash:     null,
        cnpjEncrypted:null,
        isActive:     false,
        deletedAt:    new Date(),
      },
    })

    return NextResponse.json({ data: { message: "Conta excluída com sucesso." } })
  } catch (e: unknown) {
    console.error("[DELETE /api/users/me]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const user = await prisma.user.findUnique({
      where:  { id: userId },
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
        ...(d.slug         !== undefined && { slug:         d.slug }),
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
