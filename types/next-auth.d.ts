import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id:       string
      role:     "USER" | "ADMIN"
      userType: "PF" | "PJ"
    }
  }

  interface User {
    role:     "USER" | "ADMIN"
    userType: "PF" | "PJ"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:       string
    role:     "USER" | "ADMIN"
    userType: "PF" | "PJ"
  }
}
