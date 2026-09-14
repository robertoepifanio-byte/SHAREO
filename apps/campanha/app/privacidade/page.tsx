import type { Metadata } from "next"
import { POLICY_UPDATED_AT, PrivacidadeConteudo } from "@shareo/legal"
import { PaginaLegal } from "@/components/PaginaLegal"

export const metadata: Metadata = {
  title: "Política de Privacidade — ShareO",
  description: "Saiba como o ShareO coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
}

/**
 * A página que a revisão de anúncios do Meta e do Google exige que esteja
 * acessível a partir de qualquer página que capte dados — e a landing capta
 * e-mail, telefone e CEP. Publicá-la aqui é o que permite anunciar sem mandar o
 * visitante para o marketplace fechado.
 *
 * Não lê configuração: este documento não interpola taxa nem prazo.
 */
export default function PrivacidadePage() {
  return (
    <PaginaLegal>
      <PrivacidadeConteudo atualizadoEm={POLICY_UPDATED_AT} />
    </PaginaLegal>
  )
}
