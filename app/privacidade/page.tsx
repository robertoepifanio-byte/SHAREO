import type { Metadata } from "next"
import Link from "next/link"
import { PrivacidadeConteudo } from "@shareo/legal"
import { AppHeader } from "@/components/layout/AppHeader"
import { POLICY_UPDATED_AT } from "@/lib/legal-config"

export const metadata: Metadata = {
  title: "Política de Privacidade — ShareO",
  description: "Saiba como o ShareO coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
}

/**
 * O TEXTO da Política mora em `@shareo/legal` — ver a nota em app/termos/page.tsx.
 * Esta é a página que a revisão de anúncios do Meta e do Google exige que esteja
 * acessível de qualquer página que capte dados, e é por isso que a landing da
 * campanha publica a sua própria a partir do mesmo componente.
 */
export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <PrivacidadeConteudo atualizadoEm={POLICY_UPDATED_AT} />

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-sm">
          <Link href="/termos" className="text-brand hover:underline">Termos de Uso</Link>
          <Link href="/ajuda" className="text-brand hover:underline">Central de Ajuda</Link>
        </div>
      </main>
    </div>
  )
}
