import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"

const PatchSchema = z.object({
  value:       z.string().min(1),
  description: z.string().max(200).optional(),
})

export async function GET() {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const configs = await prisma.platformConfig.findMany({
    orderBy: { key: "asc" },
  })

  return NextResponse.json({ configs })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN")
  } catch {
    return NextResponse.json({ error: "Acesso negado — apenas ADMIN_SUPERADMIN" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")
  if (!key) return NextResponse.json({ error: "Parâmetro 'key' obrigatório" }, { status: 400 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const config = await prisma.platformConfig.upsert({
    where:  { key },
    create: { key, value: parsed.data.value, description: parsed.data.description, updatedBy: session!.user.id },
    update: { value: parsed.data.value, description: parsed.data.description, updatedBy: session!.user.id },
  })

  auditLog(session!.user.id, "PLATFORM_CONFIG_UPDATED", "PlatformConfig", config.id, {
    key, value: parsed.data.value,
  })

  return NextResponse.json({ config })
}
