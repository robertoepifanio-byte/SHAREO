import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: "USER" | "ADMIN"
      userType: "PF" | "PJ"
    }
  }
  interface User {
    role: "USER" | "ADMIN"
    userType: "PF" | "PJ"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "USER" | "ADMIN"
    userType: "PF" | "PJ"
  }
}
