/**
 * lib/e2eGuard.ts
 *
 * HOC que aplica as três camadas de segurança das rotas /api/test/*:
 *  1. E2E_BYPASS_DISABLED=true → rota não existe (kill-switch de produção).
 *  2. E2E_SECRET ausente no ambiente → rota não existe.
 *  3. Header x-e2e-token deve corresponder a E2E_SECRET.
 *
 * Uso:
 *   export const POST = withE2EGuard(async (req) => { ... })
 *
 * Runbook D4: em produção NUNCA setar E2E_SECRET; garantir E2E_BYPASS_DISABLED=true.
 * O middleware.ts adiciona defesa em profundidade no nível de roteamento usando o
 * mesmo sinal E2E_BYPASS_DISABLED.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

type RouteHandler = (req: NextRequest) => Promise<NextResponse | Response>

export function withE2EGuard(handler: RouteHandler): RouteHandler {
  return async function guardedHandler(req: NextRequest) {
    // Camada 1: kill-switch — E2E_BYPASS_DISABLED=true apaga a rota
    if (process.env.E2E_BYPASS_DISABLED === "true") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Camada 2: E2E_SECRET deve estar configurado no ambiente
    const e2eSecret = process.env.E2E_SECRET
    if (!e2eSecret) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Camada 3: header x-e2e-token deve corresponder a E2E_SECRET
    const token = req.headers.get("x-e2e-token")
    if (token !== e2eSecret) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Token E2E inválido." } },
        { status: 401 },
      )
    }

    return handler(req)
  }
}
