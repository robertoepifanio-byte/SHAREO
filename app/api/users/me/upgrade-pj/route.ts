import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashDocument, encryptDocument } from "@/lib/crypto"
import { validateCNPJ } from "@/utils/cnpj"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"

const Schema = z.object({
  cnpj: z
    .string()
    .min(14, "CNPJ inválido")
    .refine((v) => validateCNPJ(v), "CNPJ inválido"),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const rl = checkRateLimit(`upgrade-pj:${session.user.id}`, 5, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    // Apenas contas PF podem fazer upgrade
    const current = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { userType: true },
    })

    if (!current) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    if (current.userType === "PJ") {
      return NextResponse.json(
        { error: { code: "ALREADY_PJ", message: "Conta já é Pessoa Jurídica." } },
        { status: 409 },
      )
    }

    const body   = await req.json()
    const parsed = Schema.safeParse(body)

    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ")
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: msg } },
        { status: 400 },
      )
    }

    const { cnpj } = parsed.data

    // Verificar unicidade do CNPJ
    const cnpjHash = hashDocument(cnpj)
    const exists = await prisma.user.findUnique({ where: { cnpjHash }, select: { id: true } })
    if (exists) {
      return NextResponse.json(
        { error: { code: "CNPJ_ALREADY_EXISTS", message: "CNPJ já cadastrado em outra conta." } },
        { status: 409 },
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        userType:      "PJ",
        cnpjHash,
        cnpjEncrypted: encryptDocument(cnpj),
      },
    })

    return NextResponse.json({ data: { message: "Conta atualizada para Pessoa Jurídica." } })
  } catch (e: unknown) {
    console.error("[POST /api/users/me/upgrade-pj]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
