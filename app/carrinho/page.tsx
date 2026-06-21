import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { getPlatformFeeRate, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"
import { CartView } from "./_CartView"

export const metadata: Metadata = { title: "Sua locação" }

/**
 * Carrinho de locação (Story B / ADR-025): vários itens do mesmo anunciante numa
 * só locação. O conteúdo vive no client (localStorage); aqui só garantimos auth e
 * passamos a taxa/teto vigentes para o resumo de preço.
 */
export default async function CarrinhoPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/carrinho")

  const feeRateBps = await getPlatformFeeRate()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 text-2xl font-bold text-primary">Sua locação</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Vários itens do mesmo anunciante, alugados juntos num só período.
          </p>
          <CartView feeRatePct={feeRateBps / 100} checkoutMaxCents={CHECKOUT_MAX_CENTS} />
        </div>
      </main>
    </div>
  )
}
