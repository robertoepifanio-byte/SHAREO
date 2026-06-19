import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CompleteRegistrationForm } from "./CompleteRegistrationForm"

export const metadata: Metadata = {
  title: "Completar cadastro",
  description: "Conclua seu cadastro para anunciar ou alugar no ShareO.",
}

function safeCallback(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw
  // só caminhos internos (evita open redirect)
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard"
}

export default async function CompletarCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const cb = safeCallback(callbackUrl)

  const session = await auth()
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/cadastro/completar?callbackUrl=${cb}`)}`)
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      profileCompletedAt: true,
      userType: true,
      phone: true,
      cep: true,
      street: true,
      neighborhood: true,
      city: true,
      state: true,
    },
  })

  // Já completo → segue direto ao destino
  if (user?.profileCompletedAt) {
    redirect(cb)
  }

  return (
    <CompleteRegistrationForm
      callbackUrl={cb}
      initial={{
        userType:     user?.userType ?? "PF",
        phone:        user?.phone ?? "",
        cep:          user?.cep ?? "",
        street:       user?.street ?? "",
        neighborhood: user?.neighborhood ?? "",
        city:         user?.city ?? "",
        state:        user?.state ?? "",
      }}
    />
  )
}
