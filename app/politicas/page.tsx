import type { Metadata } from "next"
import Link from "next/link"
import { POLITICAS_UPDATED_AT, PoliticasConteudo } from "@shareo/legal"
import { AppHeader } from "@/components/layout/AppHeader"
import {
  getPlatformFeeRate,
  getPayoutWindowDays,
  formatPayoutWindow,
  CHECKOUT_MAX_CENTS,
} from "@/lib/platform-config"
import { formatPriceShort, formatPercentLabel } from "@/utils/format"

export const metadata: Metadata = {
  title: "Políticas do ShareO",
  description: "Termos de uso, política de privacidade (LGPD), responsabilidade e cancelamento do ShareO.",
}


/**
 * O TEXTO das Políticas mora em `@shareo/legal` — ver a nota em app/termos/page.tsx.
 * Aqui ficam metadata, breadcrumb, chrome do marketplace e a leitura da config.
 */
export default async function PoliticasPage() {
  const [feeRateBps, payoutWindowDays] = await Promise.all([
    getPlatformFeeRate(),
    getPayoutWindowDays(),
  ])

  const feeLabel    = formatPercentLabel(feeRateBps / 100)
  const maxLabel    = formatPriceShort(CHECKOUT_MAX_CENTS)
  const payoutLabel = formatPayoutWindow(payoutWindowDays)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-xs text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Políticas</li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="container py-12">
        <PoliticasConteudo
          atualizadoEm={POLITICAS_UPDATED_AT}
          feeLabel={feeLabel}
          maxLabel={maxLabel}
          payoutLabel={payoutLabel}
          hrefCentralAjuda="/ajuda"
        />
      </main>
    </div>
  )
}
