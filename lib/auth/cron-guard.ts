/**
 * Guard de autenticação para rotas de cron.
 * Centraliza a verificação do CRON_SECRET que era duplicada em 11 handlers.
 *
 * Padrão de uso:
 *   const denied = assertCronAuth(request)
 *   if (denied) return denied
 *
 * Retorna NextResponse 401 se a autenticação falhar, null se aprovada.
 * PRESERVA exatamente o corpo e status 401 usados pelos handlers originais.
 */
import { NextResponse } from "next/server"

export function assertCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  const auth   = req.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
