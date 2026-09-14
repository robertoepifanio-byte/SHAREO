import type { Metadata } from "next"
import { POLITICAS_UPDATED_AT, PoliticasConteudo } from "@shareo/legal"
import { PaginaLegal } from "@/components/PaginaLegal"
import { lerValoresLegais } from "@/lib/valores-legais"

export const metadata: Metadata = {
  title: "Políticas do ShareO",
  description: "Termos de uso, política de privacidade (LGPD), responsabilidade e cancelamento do ShareO.",
}


/**
 * `hrefCentralAjuda` vai `null`: a Central de Ajuda é rota do marketplace e a
 * campanha não a tem. A frase continua inteira, só não vira link — melhor do
 * que mandar o visitante para uma página que ele não consegue abrir.
 */
export default async function PoliticasPage() {
  const { feeLabel, maxLabel, payoutLabel } = await lerValoresLegais()

  return (
    <PaginaLegal>
      <PoliticasConteudo
        atualizadoEm={POLITICAS_UPDATED_AT}
        feeLabel={feeLabel}
        maxLabel={maxLabel}
        payoutLabel={payoutLabel}
        hrefCentralAjuda={null}
      />
    </PaginaLegal>
  )
}
