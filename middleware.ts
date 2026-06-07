import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"
import { isAdminBlocked } from "@/lib/redis-admin-blocklist"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/perfil",
  "/mensagens",
  "/favoritos",
  "/meus-anuncios",
  "/itens/novo",
  "/api/bookings",
  "/api/conversations",
  "/api/users",
]

const ADMIN_PREFIXES = ["/admin", "/api/admin"]

// Rotas de autenticação: redireciona usuários já logados para /dashboard.
// /esqueci-senha/[token] (redefinição com token) deve permanecer acessível
// mesmo com sessão ativa — por isso usamos correspondência exata para ela.
const AUTH_ROUTES = ["/login", "/cadastro"]
const AUTH_EXACT  = ["/esqueci-senha"]   // só a raiz, não sub-rotas com token

const isDev = process.env.NODE_ENV === "development"

// ─── CSP com nonce ────────────────────────────────────────────────────────────

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString("base64")
}

function buildCsp(nonce: string): string {
  if (isDev) {
    // Dev: unsafe-inline + unsafe-eval para Next.js Fast Refresh e Mapbox WASM
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
      "worker-src blob: 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: *.supabase.co *.mapbox.com",
      "connect-src 'self' ws: wss: *.supabase.co api.mapbox.com events.mapbox.com *.tiles.mapbox.com https://viacep.com.br",
      "font-src 'self' data:",
      "frame-src 'none'",
    ].join("; ")
  }
  return [
    "default-src 'self'",
    // nonce cobre scripts inline do Next.js, JSON-LD e GA4; wasm-unsafe-eval é exigido pelo Mapbox GL
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' blob: https://www.googletagmanager.com`,
    "worker-src blob: 'self'",
    // unsafe-inline para styles permanece — Tailwind e Mapbox GL injetam estilos inline
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: *.supabase.co *.mapbox.com https://www.google-analytics.com",
    "connect-src 'self' wss://*.supabase.co api.mapbox.com events.mapbox.com *.tiles.mapbox.com *.sentry.io https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://viacep.com.br",
    "font-src 'self' data:",
    "frame-src 'none'",
  ].join("; ")
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const nonce = generateNonce()
  const csp   = buildCsp(nonce)

  // Propaga o nonce no request para que o Next.js App Router o aplique
  // automaticamente nos seus próprios scripts de hidratação
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)

  // Helper: NextResponse.next() com nonce forwarded e CSP no response
  function nextWithCsp(): NextResponse {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set("Content-Security-Policy", csp)
    return res
  }

  const { pathname } = req.nextUrl

  const isAdminRoute     = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
  // /perfil is protected but /perfil/[id] (public profile) is public
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) =>
    p === "/perfil" ? pathname === "/perfil" : pathname.startsWith(p)
  )
  const isAuthRoute =
    AUTH_ROUTES.some((p) => pathname.startsWith(p)) ||
    AUTH_EXACT.some((p)  => pathname === p || pathname === p + "/")

  if (!isAdminRoute && !isProtectedRoute && !isAuthRoute) {
    return nextWithCsp()
  }

  // Cron/service calls autenticados via CRON_SECRET passam direto no middleware;
  // a rota de destino valida o secret novamente antes de executar.
  if (isAdminRoute) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return nextWithCsp()
    }
  }

  const isSecure = process.env.NODE_ENV === "production"
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
  })

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if ((isProtectedRoute || isAdminRoute) && !token) {
    // API routes retornam 401 JSON (fetch não segue redirect; cliente trata via React Query)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && token) {
    const role   = token.role as string | undefined
    const userId = token.id  as string | undefined

    if (role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
          { status: 403 },
        )
      }
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    if (userId && await isAdminBlocked(userId)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Conta de administrador desativada ou rebaixada." } },
          { status: 403 },
        )
      }
      return NextResponse.redirect(new URL("/sair", req.url))
    }
  }

  return nextWithCsp()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icones/|images/).*)" ],
}
