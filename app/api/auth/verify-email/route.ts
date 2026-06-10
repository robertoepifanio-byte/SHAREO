import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url))
  }

  const user = await prisma.user.findUnique({
    where:  { emailVerifyToken: token },
    select: { id: true, emailTokenExpiresAt: true, emailVerified: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url))
  }

  if (!user.emailTokenExpiresAt || user.emailTokenExpiresAt < new Date()) {
    return NextResponse.redirect(new URL("/verify-email?error=expired", req.url))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified:       new Date(),
      emailVerifyToken:    null,
      emailTokenExpiresAt: null,
    },
  })

  return NextResponse.redirect(new URL("/verify-email?success=1", req.url))
}
