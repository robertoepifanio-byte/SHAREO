import { NextResponse } from "next/server"
import { getPlatformFeeRate } from "@/lib/platform-config"

/**
 * GET /api/platform-config/public
 *
 * Endpoint público (sem autenticação) que expõe apenas a taxa da plataforma
 * em basis points. Usado pelo app mobile na tela "Estimativa de Ganhos".
 *
 * Não expõe nenhum outro dado de PlatformConfig — o endpoint admin com acesso
 * irrestrito ao banco fica em /api/admin/platform-config.
 *
 * A taxa raramente muda (< 1×/mês), então adicionamos Cache-Control de 60s
 * para aliviar o banco sem nunca servir um valor defasado por mais de 1 min.
 */
export async function GET() {
  const feeRateBps = await getPlatformFeeRate()
  return NextResponse.json(
    { data: { feeRateBps } },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  )
}
