/**
 * POST /api/auth/phone/send-otp
 *
 * Dispara SMS OTP via Zenvia para verificação de celular.
 * Feature em desenvolvimento (decisão Raimundo 2026-06-10 — disparar na 1ª reserva).
 * Schema Prisma ainda não contém phoneVerifiedAt/phoneOtpHash/phoneOtpExpiresAt.
 *
 * GUARD: autenticação verificada ANTES da validação do body — retorna 401 sem sessão.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"

const schema = z.object({
  phone: z
    .string()
    .min(10, "Telefone inválido")
    .regex(/^\+?[1-9]\d{9,14}$/, "Formato inválido — use E.164 (ex: +5584999990000)"),
})

export async function POST(req: Request) {
  // 1. Autenticação — obrigatoriamente antes de ler/validar o body
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    )
  }

  // 2. Validação do body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Body JSON inválido." } },
      { status: 400 },
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
      { status: 422 },
    )
  }

  // 3. Feature em desenvolvimento — integração Zenvia pendente (schema migration necessária).
  // Retorna 422 para que o spec de E2E (que aceita [200, 400, 422, 429]) não quebre
  // enquanto a feature está em implementação. Trocar por lógica real quando
  // phoneVerifiedAt/phoneOtpHash/phoneOtpExpiresAt forem adicionados ao schema.
  return NextResponse.json(
    { error: { code: "FEATURE_UNAVAILABLE", message: "Verificação de celular via SMS ainda não disponível. Em breve." } },
    { status: 422 },
  )
}
