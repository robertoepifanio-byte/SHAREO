import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { hashDocument, encryptDocument } from "@/lib/crypto"
import { RegisterSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rl = checkRateLimit(`register:${ip}`, 5, 60_000) // 5 por minuto por IP
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

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

    const d = parsed.data

    // Uniqueness: e-mail
    const emailExists = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } })
    if (emailExists) {
      return NextResponse.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "E-mail já cadastrado." } },
        { status: 409 },
      )
    }

    // Uniqueness: CPF
    if (d.userType === "PF" && d.cpf) {
      const cpfHash = hashDocument(d.cpf)
      const exists = await prisma.user.findUnique({ where: { cpfHash }, select: { id: true } })
      if (exists) {
        return NextResponse.json(
          { error: { code: "CPF_ALREADY_EXISTS", message: "CPF já cadastrado." } },
          { status: 409 },
        )
      }
    }

    // Uniqueness: CNPJ
    if (d.userType === "PJ" && d.cnpj) {
      const cnpjHash = hashDocument(d.cnpj)
      const exists = await prisma.user.findUnique({ where: { cnpjHash }, select: { id: true } })
      if (exists) {
        return NextResponse.json(
          { error: { code: "CNPJ_ALREADY_EXISTS", message: "CNPJ já cadastrado." } },
          { status: 409 },
        )
      }
    }

    const passwordHash = await bcrypt.hash(d.password, 12)
    const user = await prisma.user.create({
      data: {
        name:           d.name,
        email:          d.email,
        passwordHash,
        phone:          d.phone || null,
        userType:       d.userType,
        cpfHash:        d.cpf  ? hashDocument(d.cpf)   : null,
        cpfEncrypted:   d.cpf  ? encryptDocument(d.cpf) : null,
        cnpjHash:       d.cnpj ? hashDocument(d.cnpj)  : null,
        cnpjEncrypted:  d.cnpj ? encryptDocument(d.cnpj): null,
        city:           d.city,
        state:          d.state,
        neighborhood:   d.neighborhood || null,
        consentVersion: d.consentVersion,
        consentAt:      new Date(),
        consentIp:      ip,
      },
      select: {
        id:         true,
        name:       true,
        email:      true,
        userType:   true,
        role:       true,
        avatarUrl:  true,
        bio:        true,
        city:       true,
        state:      true,
        isVerified: true,
        createdAt:  true,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/register]", msg)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente." } },
      { status: 500 },
    )
  }
}
