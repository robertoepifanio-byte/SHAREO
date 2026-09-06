import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { LoginSchema } from "@/lib/validations/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30d — alinhado ao TTL da blocklist/epoch Redis
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
      async authorize(credentials) {
        // 🪤 Validar com `LoginSchema` e não ler `credentials` cru. Antes daqui
        // o schema existia e NÃO era usado por ninguém — o login lia o campo
        // direto e fazia só `.toLowerCase()`, sem `.trim()`. Resultado: e-mail
        // colado do gerenciador de senhas com um espaço à direita não achava a
        // conta, e a pessoa via "credencial inválida" com a senha correta.
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user?.passwordHash) return null
        if (!user.isActive)      return null
        if (user.deletedAt)      return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
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
        token.loginAt   = Math.floor(Date.now() / 1000)  // SEC-CRIT-04: fixado no login, preservado nos refreshes
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
