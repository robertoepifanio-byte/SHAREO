import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"
import { extractClientIp } from "@/lib/access-log"

/**
 * GET /api/stats/public
 *
 * Endpoint público (sem autenticação) para estatísticas exibidas em páginas
 * de marketing (Sobre, no site e no app). itemCount = mesma contagem usada
 * em "itens cadastrados" de app/sobre/page.tsx (todos os itens não-excluídos,
 * qualquer status — mais amplo que "itens disponíveis" da Home, que só conta
 * status AVAILABLE).
 *
 * Cache-Control de 60s — número muda devagar, alivia o banco.
 * Rate limit 60/min por IP (achado revisão s41: público sem auth deve ter
 * limite server-side, não só cache CDN que é bypass-ável).
 */
export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`stats-public:${extractClientIp(req)}`, 60, 60_000, req)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const itemCount = await prisma.item.count({ where: { deletedAt: null } }).catch(() => 0)
  return NextResponse.json(
    { data: { itemCount } },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  )
}
