import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/perfil",
  "/mensagens",
  "/favoritos",
  "/meus-anuncios",
  "/itens/novo",
  "/api/bookings",
  "/api/users",
  "/api/chat",
]

const ADMIN_PREFIXES = ["/admin", "/api/admin"]

const AUTH_ROUTES = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isAdminRoute     = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute      = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  // Usuário autenticado tenta acessar página de auth → redireciona para dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Rota protegida sem sessão → redireciona para login
  if ((isProtectedRoute || isAdminRoute) && !session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Rota admin: requer role ADMIN
  if (isAdminRoute && session?.user) {
    const role = (session.user as { role?: string }).role
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icones/|images/).*)" ],
}
