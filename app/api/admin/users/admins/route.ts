import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { unblockAdminToken } from "@/lib/redis-admin-blocklist"

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{10,}$/

const CreateSchema = z.object({
  name:      z.string().min(2).max(100),
  email:     z.string().email().transform((e) => e.toLowerCase()),
  password:  z.string()
    .min(10, "Mínimo 10 caracteres.")
    .max(100)
    .regex(PASSWORD_REGEX, "Senha deve conter maiúscula, número e caractere especial (!@#$%^&*)."),
  adminRole: z.enum(["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL"]),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    requireAdminRole(session, "ADMIN_SUPERADMIN")

    const rl = await checkRateLimit(`admin-create:${session!.user.id}`, RATE_LIMITS.adminCreate.limit, RATE_LIMITS.adminCreate.windowMs, req)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { name, email, password, adminRole } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Já existe um usuário com este e-mail." } },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "ADMIN", adminRole },
      select: { id: true, name: true, email: true, adminRole: true, isActive: true, createdAt: true },
    })

    await unblockAdminToken(user.id)

    after(() =>
      prisma.adminLog.create({
        data: {
          adminId:    session!.user.id,
          action:     "CREATE_ADMIN",
          entityType: "User",
          entityId:   user.id,
          metadata:   JSON.stringify({ adminRole }),
        },
      }).catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })
    if (e instanceof Error && e.message === "FORBIDDEN")
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })
    console.warn("[POST /api/admin/users/admins]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}
