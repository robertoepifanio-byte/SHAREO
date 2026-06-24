import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemForm } from "@/components/items/ItemForm"
import { getPricingMultipliers } from "@/lib/platform-config"
import { prisma } from "@/lib/prisma"
import { completeRegistrationPath } from "@/lib/registration"

export const metadata: Metadata = { title: "Novo anúncio" }

export default async function NovoItemPage({
  searchParams,
}: {
  searchParams: Promise<{ categoriaId?: string; condicao?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/itens/novo")

  // Cadastro progressivo — anunciar exige cadastro completo
  const [me, sp] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { profileCompletedAt: true },
    }),
    searchParams,
  ])
  if (!me?.profileCompletedAt) redirect(completeRegistrationPath("/itens/novo"))

  const { weeklyMultiplier, monthlyMultiplier } = await getPricingMultipliers()

  const prefillCategoryId = sp.categoriaId ?? ""
  const prefillCondicao   = sp.condicao    ?? ""

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">Criar anúncio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compartilhe o que você tem para alugar e comece a ganhar
            </p>
          </div>
          <ItemForm
            mode="create"
            weeklyMultiplier={weeklyMultiplier}
            monthlyMultiplier={monthlyMultiplier}
            prefillCategoryId={prefillCategoryId}
            prefillCondicao={prefillCondicao}
          />
        </div>
      </main>
    </div>
  )
}
