import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rateLimit"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn:  "/login",
    error:   "/login",
    signOut: "/sair",
  },
  providers: [
    Credentials({
      credentials: {
        email:    { label: "E-mail",  type: "email"    },
        password: { label: "Senha",   type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate limiting por IP — 10 tentativas por minuto
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0].trim() ??
          request?.headers?.get("x-real-ip") ??
          "unknown"
        const rlIp = await checkRateLimit(`login:ip:${ip}`, 10, 60_000)
        if (!rlIp.allowed) return null

        // Rate limiting por email — 5 tentativas por 5 minutos (protege conta específica)
        const emailKey = (credentials.email as string).toLowerCase()
        const rlEmail = await checkRateLimit(`login:email:${emailKey}`, 5, 5 * 60_000)
        if (!rlEmail.allowed) return null

        const user = await prisma.user.findUnique({
          where: { email: emailKey },
        })

        if (!user?.passwordHash) return null
        if (!user.isActive)      return null
        if (user.deletedAt)      return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!valid) return null

        return {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          role:      user.role,
          userType:  user.userType,
          adminRole: user.adminRole ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & { role: "USER" | "ADMIN"; userType: "PF" | "PJ"; adminRole?: string }
        token.id        = u.id as string
        token.role      = u.role
        token.userType  = u.userType
        token.adminRole = u.adminRole ?? undefined
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id        = token.id as string
        session.user.role      = token.role as "USER" | "ADMIN"
        session.user.userType  = token.userType as "PF" | "PJ"
        session.user.adminRole = token.adminRole as "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL" | undefined
      }
      return session
    },
  },
})
