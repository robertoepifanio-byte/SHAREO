import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const CredentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email:    { label: "E-mail",  type: "email"    },
        password: { label: "Senha",   type: "password" },
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user?.passwordHash)         return null
        if (!user.isActive)              return null
        if (user.deletedAt)              return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role, userType: user.userType }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id       = user.id
        token.role     = (user as any).role
        token.userType = (user as any).userType
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id                    = token.id as string
        ;(session.user as any).role        = token.role
        ;(session.user as any).userType    = token.userType
      }
      return session
    },
  },
})
