import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"
import { EarningsCalc } from "./_EarningsCalc"
import { getPlatformFeeRate } from "@/lib/platform-config"

export const metadata: Metadata = {
  title:       "Quanto posso ganhar?",
  description: "Simule seus ganhos alugando itens parados em casa. Descubra quanto você pode faturar por mês.",
}

export default async function EarningsPage() {
  const feeRateBps = await getPlatformFeeRate()
  const feeLabel   = `${feeRateBps / 100}%`

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-10">
        <div className="mx-auto max-w-xl">

          {/* Hero */}
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand">
              Calculadora de ganhos
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-primary">
              Quanto posso ganhar?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seus itens parados podem gerar renda extra. Simule quanto você pode faturar
              alugando no ShareO — sem abrir mão do item.
            </p>
          </div>

          {/* Calculadora interativa */}
          <EarningsCalc />

          {/* Depoimento / prova social */}
          <div className="mt-8 rounded-xl border border-border bg-surface p-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
                M
              </div>
              <div>
                <p className="text-sm text-foreground">
                  &ldquo;Anunciei minha furadeira e câmera fotográfica. Em 2 meses já paguei metade do valor que gastei nelas.&rdquo;
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  — Marcelo S., Natal/RN
                </p>
              </div>
            </div>
          </div>

          {/* FAQ rápido */}
          <div className="mt-6 space-y-3">
            {[
              {
                q: "O ShareO cobra alguma taxa?",
                a: `Sim, uma taxa de serviço de ${feeLabel} sobre o valor da locação, cobrada do locatário. Você recebe o valor líquido diretamente via PIX, sem nenhuma mensalidade ou custo para anunciar.`,
              },
              {
                q: "Preciso estar disponível para entregas?",
                a: "Você define a logística: entrega, retirada ou ponto de encontro. Você tem controle total sobre quem aluga e quando.",
              },
              {
                q: "E se o item for danificado?",
                a: "O locatário passa por verificação de identidade antes de alugar. Caso haja dano, você abre uma disputa na plataforma com as fotos de check-in e check-out como evidência. A equipe ShareO medeia o caso em até 3 dias úteis.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-lg border border-border bg-surface">
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground">
                  {q}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    aria-hidden="true"
                    className="shrink-0 transition-transform group-open:rotate-180"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </summary>
                <div className="border-t border-border px-4 py-3">
                  <p className="text-sm text-muted-foreground">{a}</p>
                </div>
              </details>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
