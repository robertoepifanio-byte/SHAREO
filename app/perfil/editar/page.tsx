import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ProfileForm } from "../_ProfileForm"

export const metadata: Metadata = { title: "Editar Perfil" }

export default async function EditarPerfilPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/editar")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      name:         true,
      bio:          true,
      phone:        true,
      city:         true,
      state:        true,
      neighborhood: true,
      avatarUrl:    true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/perfil" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-6 text-xl font-bold text-primary">Editar Perfil</h1>

          <div className="rounded-xl border border-border bg-surface p-6">
            <ProfileForm user={user} redirectOnSave="/perfil" />
          </div>
        </div>
      </main>
    </div>
  )
}
