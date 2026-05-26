import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & { role: "USER" | "ADMIN"; userType: "PF" | "PJ" }
        token.id       = u.id as string
        token.role     = u.role
        token.userType = u.userType
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id as string
        session.user.role     = token.role as "USER" | "ADMIN"
        session.user.userType = token.userType as "PF" | "PJ"
      }
      return session
    },
  },
}
