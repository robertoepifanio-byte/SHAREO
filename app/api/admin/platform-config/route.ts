import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"
import {
  clearPlatformConfigCache,
  AUTO_CANCEL_PENDING_HOURS_MIN,
  AUTO_CANCEL_PENDING_HOURS_MAX,
} from "@/lib/platform-config"

const PatchSchema = z.object({
  value:       z.string().min(1),
  description: z.string().max(200).optional(),
})

/**
 * Validadores de faixa por chave conhecida.
 * Retorna string de erro se inválido, undefined se ok.
 */
const KEY_RANGE_VALIDATORS: Record<string, (v: string) => string | undefined> = {
  autoCancelPendingHours: (v) => {
    const n = parseInt(v, 10)
    // String(n) !== v.trim() rejeita decimais ("12.5") e strings com lixo ("12abc")
    // porque parseInt parsa só o prefixo numérico, ocultando o sufixo inválido.
    if (isNaN(n) || String(n) !== v.trim() || n < AUTO_CANCEL_PENDING_HOURS_MIN || n > AUTO_CANCEL_PENDING_HOURS_MAX)
      return `autoCancelPendingHours deve ser um inteiro entre ${AUTO_CANCEL_PENDING_HOURS_MIN} e ${AUTO_CANCEL_PENDING_HOURS_MAX}.`
    return undefined
  },
}

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

  // Valida faixas para chaves conhecidas com restrição numérica.
  const rangeError = KEY_RANGE_VALIDATORS[key]?.(parsed.data.value)
  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 422 })
  }

  const config = await prisma.platformConfig.upsert({
    where:  { key },
    create: { key, value: parsed.data.value, description: parsed.data.description, updatedBy: session!.user.id },
    update: { value: parsed.data.value, description: parsed.data.description, updatedBy: session!.user.id },
  })

  // S14-M-11: invalida o cache em memória para refletir a mudança imediatamente
  // (nesta instância; outras instâncias serverless propagam dentro do TTL).
  clearPlatformConfigCache()

  auditLog(session!.user.id, "PLATFORM_CONFIG_UPDATED", "PlatformConfig", config.id, {
    key, value: parsed.data.value,
  })

  return NextResponse.json({ config })
}
