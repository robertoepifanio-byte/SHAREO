import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime    = "nodejs"
export const dynamic    = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {}
  const errors: Record<string, string> = {}

  // ── 1. Banco de dados ────────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.db = "ok"
  } catch (e) {
    checks.db = "error"
    errors.db = e instanceof Error ? e.message : String(e)
  }

  // ── 2. Supabase Storage (bucket item-images) ─────────────────────────────
  try {
    const { error } = await createAdminClient()
      .storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "item-images")
      .list("", { limit: 1 })
    if (error) throw new Error(error.message)
    checks.storage = "ok"
  } catch (e) {
    checks.storage = "error"
    errors.storage = e instanceof Error ? e.message : String(e)
  }

  // ── 3. Bucket id-docs (privado) ──────────────────────────────────────────
  try {
    const { error } = await createAdminClient()
      .storage
      .from("id-docs")
      .list("", { limit: 1 })
    if (error) throw new Error(error.message)
    checks.storage_private = "ok"
  } catch (e) {
    checks.storage_private = "error"
    errors.storage_private = e instanceof Error ? e.message : String(e)
  }

  const allOk  = Object.values(checks).every((v) => v === "ok")
  const status = allOk ? 200 : 503

  return NextResponse.json(
    {
      status:    allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      ...(Object.keys(errors).length > 0 && { errors }),
    },
    { status },
  )
}
