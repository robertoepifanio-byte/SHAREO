import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { hashDocument, encryptDocument } from "@/lib/crypto"
import { RegisterSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"
import { sendVerificationEmail } from "@/lib/email"
import crypto from "crypto"
import { generateUserSlug } from "@/lib/slugify"
import { applyReferralCode } from "@/lib/referral"

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rl = await checkRateLimit(`register:${ip}`, 5, 60_000) // 5 por minuto por IP
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

    // $transaction: criar user → gerar slug com o ID real → atualizar
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name:           d.name,
          email:          d.email,
          passwordHash,
          phone:          d.phone || null,
          userType:       d.userType,
          cpfHash:        d.cpf  ? hashDocument(d.cpf)    : null,
          cpfEncrypted:   d.cpf  ? encryptDocument(d.cpf)  : null,
          cnpjHash:       d.cnpj ? hashDocument(d.cnpj)   : null,
          cnpjEncrypted:  d.cnpj ? encryptDocument(d.cnpj) : null,
          city:           d.city,
          state:          d.state,
          cep:            d.zipCode || null,
          street:         d.street || null,
          neighborhood:   d.neighborhood || null,
          consentVersion: d.consentVersion,
          consentAt:      new Date(),
          consentIp:      ip,
        },
        select: { id: true, name: true, email: true },
      })

      return tx.user.update({
        where: { id: created.id },
        data:  { slug: generateUserSlug(created.name, created.id) },
        select: {
          id:         true,
          name:       true,
          email:      true,
          slug:       true,
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
    })

    // Aplicar código de indicação — fire-and-forget (não bloqueia registro)
    if (d.referralCode) {
      applyReferralCode(user.id, d.referralCode).catch((err) =>
        console.error("[register] referral apply error:", err instanceof Error ? err.message : err)
      )
    }

    // Token de verificação de e-mail — fire-and-forget
    const verifyToken   = crypto.randomBytes(32).toString("hex")
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h
    prisma.user
      .update({
        where: { id: user.id },
        data:  { emailVerifyToken: verifyToken, emailTokenExpiresAt: tokenExpiresAt },
      })
      .then(() => sendVerificationEmail(user.email, user.name, verifyToken))
      .catch((err) =>
        console.error("[register] verification email error:", err instanceof Error ? err.message : err)
      )

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message  : String(e)
    const stack = e instanceof Error ? e.stack     : undefined
    console.error("[POST /api/auth/register] INTERNAL_ERROR:", msg, stack)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente." } },
      { status: 500 },
    )
  }
}
