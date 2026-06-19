import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { AmbassadorSection } from "./_AmbassadorSection"
import { getAmbassadorStats } from "@/lib/ambassador"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Programa Embaixadores — ShareO" }

export default async function EmbaixadorPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/embaixador")

  const [stats, profile] = await Promise.all([
    getAmbassadorStats(session.user.id),
    prisma.ambassadorProfile.findUnique({
      where:  { userId: session.user.id },
      select: { id: true, revokedAt: true },
    }),
  ])

  const hasConsented = !!(profile && !profile.revokedAt)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-primary">Programa Embaixadores</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bronze · Prata · Ouro — comissões sobre a taxa ShareO por cada locação dos seus indicados.
            </p>
          </div>
          <AmbassadorSection stats={stats} hasConsented={hasConsented} />
        </div>
      </main>
    </div>
  )
}
