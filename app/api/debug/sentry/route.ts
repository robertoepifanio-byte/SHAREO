// ⚠️ TEMPORÁRIO — verificação da migração @sentry/nextjs v10 (server runtime).
// Protegido por ?token=$SENTRY_TEST_TOKEN. REMOVER antes do merge do PR #319.
import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url      = new URL(req.url)
  const token    = url.searchParams.get("token")
  const expected = process.env.SENTRY_TEST_TOKEN

  // 404 (não 403) para não revelar a existência do endpoint sem o token.
  if (!expected || token !== expected) {
    return new NextResponse("Not found", { status: 404 })
  }

  const kind   = url.searchParams.get("kind") ?? "capture"
  const marker = `sentry-v10-verify-server-${Date.now()}`

  // kind=throw → erro não tratado: exercita onRequestError + init do server
  // (instrumentation.ts → sentry.server.config.ts).
  if (kind === "throw") {
    throw new Error(marker)
  }

  // kind=capture (padrão) → prova direta do transport do SDK server.
  const eventId = Sentry.captureException(new Error(marker))
  await Sentry.flush(2000)
  return NextResponse.json({ ok: true, runtime: "nodejs", marker, eventId })
}
