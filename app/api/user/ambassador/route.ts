/**
 * GET /api/user/ambassador  — stats + hasConsented do Programa Embaixadores (ADR-022)
 *
 * Endpoint criado para o app mobile (aceita Bearer JWT via resolveUserId).
 * Replica a mesma lógica do Server Component app/perfil/embaixador/page.tsx:
 *   - getAmbassadorStats(userId) de lib/ambassador.ts (não duplica lógica)
 *   - prisma.ambassadorProfile.findUnique (apenas id + revokedAt)
 * Retorna: { data: { stats, hasConsented } }
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { getAmbassadorStats } from "@/lib/ambassador"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const [stats, profile] = await Promise.all([
    getAmbassadorStats(userId),
    prisma.ambassadorProfile.findUnique({
      where:  { userId },
      select: { id: true, revokedAt: true },
    }),
  ])

  const hasConsented = !!(profile && !profile.revokedAt)

  return NextResponse.json({ data: { stats, hasConsented } })
}
