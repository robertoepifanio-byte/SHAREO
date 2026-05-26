import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

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

const AUTH_ROUTES = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminRoute     = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
  // /perfil is protected but /perfil/[id] (public profile) is public
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) =>
    p === "/perfil" ? pathname === "/perfil" : pathname.startsWith(p)
  )
  const isAuthRoute      = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  if (!isAdminRoute && !isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
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
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && token) {
    const role = token.role as string | undefined
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icones/|images/).*)" ],
}
