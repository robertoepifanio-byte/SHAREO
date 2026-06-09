import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemForm } from "@/components/items/ItemForm"
import { getPricingMultipliers } from "@/lib/platform-config"

export const metadata: Metadata = { title: "Novo anúncio" }

export default async function NovoItemPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/itens/novo")

  const { weeklyMultiplier, monthlyMultiplier } = await getPricingMultipliers()

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
          <ItemForm mode="create" weeklyMultiplier={weeklyMultiplier} monthlyMultiplier={monthlyMultiplier} />
        </div>
      </main>
    </div>
  )
}
