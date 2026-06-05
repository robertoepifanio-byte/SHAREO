import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id:        string
      role:      "USER" | "ADMIN"
      userType:  "PF" | "PJ"
      adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
    }
  }

  interface User {
    role:      "USER" | "ADMIN"
    userType:  "PF" | "PJ"
    adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:        string
    role:      "USER" | "ADMIN"
    userType:  "PF" | "PJ"
    adminRole?: "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"
  }
}
