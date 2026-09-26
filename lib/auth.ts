import NextAuth from "next-auth"
import type { JWT } from "next-auth/jwt"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { LoginSchema } from "@/lib/validations/auth"
import { checkAdminSecondFactor } from "@/lib/auth/mfa"
import { sessionAccess } from "@/lib/auth/mfa-gate"

/**
 * SEC-CRIT-04c: intervalo (s) da verificação periódica de deletedAt/isActive.
 *
 * isSessionStale (Redis) é fail-open: se o Upstash falha exatamente durante a
 * exclusão de conta, o cookie web permaneceria válido pelo maxAge completo (30d).
 * A cada PERIODIC_CHECK_INTERVAL_S o jwt callback consulta o banco e invalida o
 * token se a conta foi excluída ou desativada — reduzindo a janela de 30d para
 * no máximo 5 min, sem depender do Redis.
 *
 * Custo: ~1 query/5 min por sessão ativa, 0 no hot-path.
 * Bearer mobile (access 15 min): NÃO passa por aqui — janela máxima = tempo de
 * vida do access token; o refresh já checa deletedAt ao emitir novo token.
 *
 * Exportado para permitir override no teste unitário.
 */
export const PERIODIC_CHECK_INTERVAL_S = 5 * 60 // 5 minutos

/**
 * Lógica do jwt callback extraída para função testável.
 *
 * Exportada para os testes unitários de SEC-CRIT-04c; o NextAuth recebe a
 * referência da função, não um inline — comportamento idêntico em runtime.
 */
export async function jwtCallback({
  token,
  user,
}: {
  token: JWT
  user?: unknown
}): Promise<JWT | null> {
  // Calculado antes do bloco de login para reutilizar em loginAt e checkedAt
  // (evita dois Date.now() no mesmo request).
  const now = Math.floor(Date.now() / 1000)

  if (user) {
    const u = user as {
      id: string
      role: "USER" | "ADMIN"
      userType: "PF" | "PJ"
      adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
      mfa?: boolean
    }
    token.id        = u.id
    token.role      = u.role
    token.userType  = u.userType
    token.adminRole = u.adminRole
    token.mfa       = u.mfa
    token.loginAt   = now  // SEC-CRIT-04: fixado no login, preservado nos refreshes
    token.checkedAt = now  // SEC-CRIT-04c: marca o login como verificação inicial
  }

  // SEC-CRIT-04c: verificação periódica de conta excluída (sem Redis).
  // isSessionStale é fail-open — Redis fora durante a exclusão deixaria o
  // cookie web ativo por até 30d. Este bloco consulta o banco a cada
  // PERIODIC_CHECK_INTERVAL_S e retorna null (invalidando o token) se a
  // conta foi excluída ou desativada.
  //
  // Rotas que NÃO chamam auth() (ex.: Bearer via resolveUserId) não passam
  // aqui; para Bearer mobile (access 15 min) a janela é aceitável e o
  // refresh já checa deletedAt ao emitir novo token.
  const lastCheck = token.checkedAt ?? 0
  const userId    = token.id ?? null

  if (userId && now - lastCheck > PERIODIC_CHECK_INTERVAL_S) {
    const dbUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { deletedAt: true, isActive: true },
    })
    if (!dbUser || dbUser.deletedAt || !dbUser.isActive) {
      return null  // token nulo → auth() retorna null → 401/redirect no handler
    }
    token.checkedAt = now
  }

  return token
}

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
        code:     { label: "Código",  type: "text"     }, // 2FA de admin (TOTP ou código de recuperação)
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

        // Segundo fator SÓ depois de a senha estar certa — pedir o código a quem errou
        // a senha confirmaria a um estranho que aquele e-mail é de um admin.
        const code = typeof credentials?.code === "string" ? credentials.code : undefined
        const mfa = await checkAdminSecondFactor(user, code)

        return {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          role:      user.role,
          userType:  user.userType,
          adminRole: user.adminRole ?? undefined,
          mfa,
        }
      },
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session({ session, token }) {
      if (session.user) {
        session.user.id        = token.id as string
        session.user.userType  = token.userType as "PF" | "PJ"
        // Admin sem 2FA verificado sai rebaixado — ver lib/auth/mfa-gate.ts.
        const access = sessionAccess(token)
        session.user.role       = access.role
        session.user.adminRole  = access.adminRole
      }
      return session
    },
  },
})
