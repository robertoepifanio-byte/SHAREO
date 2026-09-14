import type { Metadata } from "next"
import { POLICY_UPDATED_AT, TermosConteudo } from "@shareo/legal"
import { PaginaLegal } from "@/components/PaginaLegal"
import { lerValoresLegais } from "@/lib/valores-legais"

export const metadata: Metadata = {
  title: "Termos de Uso — ShareO",
  description: "Leia os Termos de Uso do ShareO, a plataforma de economia circular para aluguel local de itens.",
}

/**
 * Mesmo documento que o marketplace publica em /termos — literalmente o mesmo
 * componente, de @shareo/legal. A campanha o hospeda para o visitante não ser
 * mandado para um produto que ainda não abriu.
 */
export default async function TermosPage() {
  const { feePct, payoutLabel, maxPorTransacao } = await lerValoresLegais()

  return (
    <PaginaLegal>
      <TermosConteudo
        atualizadoEm={POLICY_UPDATED_AT}
        feePct={feePct}
        payoutLabel={payoutLabel}
        maxPorTransacao={maxPorTransacao}
      />
    </PaginaLegal>
  )
}
