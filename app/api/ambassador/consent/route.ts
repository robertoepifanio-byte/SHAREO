/**
 * POST /api/ambassador/consent  — opt-in no programa de embaixadores (LGPD)
 * DELETE /api/ambassador/consent — revogar consentimento
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { createAmbassadorProfile, revokeAmbassadorProfile } from "@/lib/ambassador"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const userAgent = req.headers.get("user-agent") ?? ""

  try {
    const profile = await createAmbassadorProfile(session.user.id, { ip, userAgent })
    return NextResponse.json({ data: { profileId: profile.id } })
  } catch (e) {
    console.error("[ambassador/consent POST]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  try {
    await revokeAmbassadorProfile(session.user.id)
    return NextResponse.json({ data: { revoked: true } })
  } catch (e) {
    console.error("[ambassador/consent DELETE]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 })
  }
}
