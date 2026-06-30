import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { encryptPII } from "@/lib/crypto"
import { exchangeOAuthCode, isMercadoPagoActive } from "@/lib/mercadopago"

const SETTINGS = "/perfil/recebimentos"

/** Redireciona de volta à tela de recebimentos com um status legível. */
function back(status: string) {
  return NextResponse.redirect(`${APP_URL}${SETTINGS}?mp=${status}`)
}

/**
 * Callback do OAuth do Mercado Pago (Modelo B — ADR-026).
 * O MP redireciona o locador para cá com `code` + `state`. Validamos o `state`
 * (anti-CSRF) contra o cookie, trocamos o `code` pelos tokens do vendedor e os
 * guardamos CRIPTOGRAFADOS na conta de recebimento do locador.
 *
 * Desacoplamento PIX: faz UPSERT — cria a conta sem PIX caso o locador não tenha
 * pré-cadastrado chave PIX. Campos pixKeyType/pixKey/holderName são agora nullable
 * (migration 20260630000000_decouple_pix_from_mp).
 *
 * Gating: flag mercadoPagoEnabled + credenciais. Sem isso, 404.
 */
export async function GET(req: NextRequest) {
  if (!(await isMercadoPagoActive())) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Recurso indisponível." } },
      { status: 404 },
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(`${APP_URL}/login?callbackUrl=${SETTINGS}`)
  }

  const url   = new URL(req.url)
  const code  = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  // O locador negou a autorização no painel do MP.
  if (error || !code) return back("cancelado")

  // Anti-CSRF: o state precisa bater com o cookie gravado no /connect.
  const cookieState = req.cookies.get("mp_oauth_state")?.value
  if (!state || !cookieState || state !== cookieState) {
    return back("erro_state")
  }

  try {
    const tokens = await exchangeOAuthCode(code)

    // UPSERT: cria a conta de recebimento se o locador ainda não tiver uma.
    // Com o desacoplamento PIX, não é mais obrigatório ter PIX cadastrado antes
    // de conectar o Mercado Pago — a conta é criada só com os campos mp*.
    // Campos PIX (pixKey, pixKeyType, holderName) ficam nulos até o locador
    // cadastrá-los manualmente em /perfil/recebimentos.
    const mpData = {
      mpUserId:         tokens.mpUserId,
      mpAccessToken:    encryptPII(tokens.accessToken),
      mpRefreshToken:   encryptPII(tokens.refreshToken),
      mpPublicKey:      tokens.publicKey,
      mpTokenExpiresAt: tokens.expiresAt,
      mpConnectedAt:    new Date(),
      mpLiveMode:       tokens.liveMode,
    }

    await prisma.ownerPaymentAccount.upsert({
      where:  { userId: session.user.id },
      update: mpData,
      create: {
        userId: session.user.id,
        ...mpData,
      },
    })

    const res = back("conectado")
    res.cookies.delete("mp_oauth_state")
    return res
  } catch (e: unknown) {
    console.error("[GET /api/mp/oauth/callback]", e instanceof Error ? e.message : e)
    return back("erro")
  }
}
