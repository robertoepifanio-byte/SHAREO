import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { ReferralSection } from "../_ReferralSection"
import { getReferralStats } from "@/lib/referral"

export const metadata: Metadata = { title: "Programa de Indicação" }

export default async function IndicacoesPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/indicacoes")

  const stats = await getReferralStats(session.user.id)

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
          <h1 className="mb-6 text-xl font-bold text-primary">Programa de Indicação</h1>
          <ReferralSection stats={stats} />
        </div>
      </main>
    </div>
  )
}
