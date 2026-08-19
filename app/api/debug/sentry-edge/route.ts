// ⚠️ TEMPORÁRIO — verificação da migração @sentry/nextjs v10 (edge runtime).
// Protegido por ?token=$SENTRY_TEST_TOKEN. REMOVER antes do merge do PR #319.
import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url      = new URL(req.url)
  const token    = url.searchParams.get("token")
  const expected = process.env.SENTRY_TEST_TOKEN

  if (!expected || token !== expected) {
    return new NextResponse("Not found", { status: 404 })
  }

  const kind   = url.searchParams.get("kind") ?? "capture"
  const marker = `sentry-v10-verify-edge-${Date.now()}`

  // kind=throw → erro não tratado no edge: exercita o init do edge
  // (instrumentation.ts → sentry.edge.config.ts, o wiring mais frágil da migração).
  if (kind === "throw") {
    throw new Error(marker)
  }

  const eventId = Sentry.captureException(new Error(marker))
  await Sentry.flush(2000)
  return NextResponse.json({ ok: true, runtime: "edge", marker, eventId })
}
