import { NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { APP_URL } from "@/lib/app-url"
import { buildOAuthAuthorizeUrl, isMercadoPagoActive } from "@/lib/mercadopago"

/**
 * Inicia o onboarding OAuth do locador (Modelo B / split — ADR-026).
 * Redireciona o locador autenticado para autorizar a conexão da conta Mercado Pago.
 *
 * Gating: flag mercadoPagoEnabled (default OFF) + credenciais. Com qualquer um
 * ausente, responde 404 (caminho inexistente) — o fluxo atual não é afetado.
 *
 * CSRF: gera um `state` aleatório e o guarda em cookie httpOnly; o callback valida.
 */
export async function GET() {
  if (!(await isMercadoPagoActive())) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Recurso indisponível." } },
      { status: 404 },
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(`${APP_URL}/login?callbackUrl=/perfil/recebimentos`)
  }

  const state = crypto.randomBytes(16).toString("hex")
  const authorizeUrl = buildOAuthAuthorizeUrl(state)

  const res = NextResponse.redirect(authorizeUrl)
  // Cookie de curta duração só para validar o retorno do MP (anti-CSRF).
  res.cookies.set("mp_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/api/mp/oauth/callback",
    maxAge:   600, // 10 min
  })
  return res
}
