/**
 * POST /api/ambassador/consent  — opt-in no programa de embaixadores (LGPD)
 * DELETE /api/ambassador/consent — revogar consentimento
 *
 * Aceita Bearer JWT (app mobile) via resolveUserId — além de cookie NextAuth.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { createAmbassadorProfile, revokeAmbassadorProfile } from "@/lib/ambassador"

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const userAgent = req.headers.get("user-agent") ?? ""

  try {
    const profile = await createAmbassadorProfile(userId, { ip, userAgent })
    return NextResponse.json({ data: { profileId: profile.id } })
  } catch (e) {
    console.error("[ambassador/consent POST]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  try {
    await revokeAmbassadorProfile(userId)
    return NextResponse.json({ data: { revoked: true } })
  } catch (e) {
    console.error("[ambassador/consent DELETE]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}
