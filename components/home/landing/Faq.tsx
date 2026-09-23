// Fonte: apps/campanha/components/landing/Faq.tsx — CtaAncora vira CtaCadastro (/cadastro)
import { Secao, TituloSecao } from "./Secao"
import { CtaCadastro } from "./CtaCadastro"
import { UiIcon } from "./icons/UiIcon"
import { ANCORAS, CTA_MICROCOPY, FAQ } from "@/lib/landing-content"

export function Faq() {
  return (
    <Secao id={ANCORAS.faq} variante="suave" rotuladoPor="faq-titulo">
      <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr] xl:gap-12">
        <div>
          <TituloSecao id="faq-titulo" className="mb-2">
            Perguntas frequentes
          </TituloSecao>
          <p className="mb-6 text-[15px] text-muted-foreground">
            Ainda ficou com alguma dúvida?
          </p>

          <div className="grid gap-3">
            {FAQ.map((item) => (
              <details
                key={item.p}
                className="group rounded-xl border border-border bg-surface px-5 py-1"
              >
                <summary className="flex min-h-tap cursor-pointer select-none list-none items-center justify-between gap-3 py-3 text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
                  {item.p}
                  <UiIcon
                    name="mais"
                    size={18}
                    className="shrink-0 text-brand transition-transform group-open:rotate-45"
                  />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.r}</p>
              </details>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-2 font-display text-lg font-extrabold leading-tight text-primary">
            Estamos começando agora.
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            E queremos você entre os primeiros. Entrar na lista leva menos de um minuto.
          </p>
          <CtaCadastro larguraTotal>Quero ser um fundador</CtaCadastro>
          <p className="mt-3 text-xs text-muted-foreground">{CTA_MICROCOPY}</p>
        </aside>
      </div>
    </Secao>
  )
}
