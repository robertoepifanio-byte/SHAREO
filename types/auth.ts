import "next-auth"
import "next-auth/jwt"

// 🪤 Esta é a ÚNICA declaração dos tipos do NextAuth. Existia uma segunda em
// `types/next-auth.d.ts`, com `adminRole` e `loginAt`: o `.d.ts` é ignorado por
// `skipLibCheck` e perdia a disputa contra esta, então os campos que só ele declarava
// não existiam de fato para o compilador (e o conflito entre as duas não aparecia).
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: "USER" | "ADMIN"
      userType: "PF" | "PJ"
      adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
    }
  }
  interface User {
    role: "USER" | "ADMIN"
    userType: "PF" | "PJ"
    adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
    /** true quando o login passou pelo segundo fator (só admin). */
    mfa?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "USER" | "ADMIN"
    userType: "PF" | "PJ"
    adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
    /** true só quando o login passou pelo segundo fator (admin). */
    mfa?: boolean
    /** epoch (s) fixado no login — invalidação de sessão (SEC-CRIT-04) */
    loginAt?: number
  }
}
