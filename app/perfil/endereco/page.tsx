import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { EnderecoForm } from "./_EnderecoForm"

export const metadata: Metadata = { title: "Meu Endereço" }

export default async function EnderecoPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/endereco")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { cep: true },
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
          <h1 className="mb-2 text-xl font-bold text-primary">Endereço</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sua localização é usada para centralizar o mapa e exibir itens próximos.
          </p>

          <div className="rounded-xl border border-border bg-surface p-6">
            <EnderecoForm cep={user.cep} />
          </div>
        </div>
      </main>
    </div>
  )
}
