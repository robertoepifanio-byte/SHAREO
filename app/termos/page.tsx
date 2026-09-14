import type { Metadata } from "next"
import Link from "next/link"
import { TermosConteudo } from "@shareo/legal"
import { AppHeader } from "@/components/layout/AppHeader"
import { POLICY_UPDATED_AT } from "@/lib/legal-config"
import { getPlatformFeeRate, getPayoutWindowDays, formatPayoutWindow, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"
import { formatPercentValue, formatPrice } from "@/utils/format"

export const metadata: Metadata = {
  title: "Termos de Uso — ShareO",
  description: "Leia os Termos de Uso do ShareO, a plataforma de economia circular para aluguel local de itens.",
}

/**
 * O TEXTO dos Termos mora em `@shareo/legal`, não aqui.
 *
 * Motivo: a landing da campanha (apps/campanha) publica o mesmo documento e não
 * importa nada da raiz. Com duas cópias, a primeira revisão jurídica deixaria o
 * visitante de um dos dois aceitando um texto que não é o vigente. Esta página
 * ficou com o que é dela: metadata, chrome do marketplace e a leitura dos
 * valores de configuração.
 */
export default async function TermosPage() {
  // Taxa vigente lida da configuração da plataforma (sem hardcode — ver getPlatformFeeRate).
  // 🪤 Sequencial de propósito: os dois getters batem no mesmo loadConfig(), que
  // tem cache mas NÃO deduplica chamadas em voo. Em Promise.all, num cache frio as
  // duas disparam `findMany` antes de qualquer uma popular o cache — duas queries
  // em vez de uma, sem ganho de latência (a segunda já acha o cache quente).
  const feeRate = await getPlatformFeeRate()
  const payoutWindowDays = await getPayoutWindowDays()
  // Os três usam os formatadores de @shareo/legal, os MESMOS que a landing da
  // campanha usa para preencher as mesmas props deste componente. Montar a
  // grafia à mão aqui faria os dois apps publicarem o número diferente.
  const feePct = formatPercentValue(feeRate / 100)
  // Prazo de repasse também vem da config: os Termos prometiam "toda
  // segunda-feira" enquanto o cron roda diariamente por janela de N dias.
  const payoutLabel = formatPayoutWindow(payoutWindowDays)
  const maxPorTransacao = formatPrice(CHECKOUT_MAX_CENTS)
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <TermosConteudo
          atualizadoEm={POLICY_UPDATED_AT}
          feePct={feePct}
          payoutLabel={payoutLabel}
          maxPorTransacao={maxPorTransacao}
        />

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-sm">
          <Link href="/privacidade" className="text-brand hover:underline">Política de Privacidade</Link>
          <Link href="/ajuda" className="text-brand hover:underline">Central de Ajuda</Link>
        </div>
      </main>
    </div>
  )
}
