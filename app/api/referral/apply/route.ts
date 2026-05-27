/**
 * POST /api/referral/apply  — aplica um código de indicação para o usuário logado
 * Body: { code: string }
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { applyReferralCode } from "@/lib/referral"
import { z } from "zod"

const Schema = z.object({ code: z.string().min(1).max(20) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Código inválido." } }, { status: 400 })
  }

  const result = await applyReferralCode(session.user.id, parsed.data.code)

  if (!result.success) {
    return NextResponse.json({ error: { code: "REFERRAL_ERROR", message: result.error } }, { status: 422 })
  }

  return NextResponse.json({ data: { success: true } })
}
