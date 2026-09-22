// Fonte: apps/campanha/components/landing/DoisLados.tsx — CtaAncora vira CtaCadastro (/cadastro)
import { Secao, TituloSecao } from "./Secao"
import { CtaCadastro } from "./CtaCadastro"
import { UiIcon } from "./icons/UiIcon"
import { ANCORAS, DOIS_LADOS } from "@/lib/landing-content"

const ASPECTO = "aspect-[16/10] sm:aspect-auto sm:h-full"

const ESTILO_LADO = {
  proprietario: {
    titulo: "text-brand",
    selo: "bg-brand text-white",
    variante: "solido" as const,
    icone: "moeda" as const,
  },
  locatario: {
    titulo: "text-blue-medium",
    selo: "bg-blue-medium text-white",
    variante: "azul" as const,
    icone: "local" as const,
  },
}

export function DoisLados() {
  return (
    <Secao id={ANCORAS.paraQuem} variante="suave" rotuladoPor="lados-titulo">
      <TituloSecao id="lados-titulo" className="mb-8">
        Você está de qual lado?
      </TituloSecao>

      <div className="grid gap-6 xl:grid-cols-2">
        {DOIS_LADOS.map((item) => {
          const estilo = ESTILO_LADO[item.lado]

          return (
            <div
              key={item.lado}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface sm:flex-row"
            >
              <div className="sm:w-[38%] sm:shrink-0">
                <img
                  src={`/campanha/lado-${item.lado}-640.webp`}
                  srcSet={`/campanha/lado-${item.lado}-640.webp 640w, /campanha/lado-${item.lado}-1280.webp 1280w`}
                  sizes="(min-width: 1280px) 230px, 38vw"
                  alt={item.altFoto}
                  loading="lazy"
                  decoding="async"
                  className={`w-full object-cover ${ASPECTO}`}
                />
              </div>

              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo.selo}`}
                    aria-hidden="true"
                  >
                    <UiIcon name={estilo.icone} />
                  </span>
                  <h3 className={`font-display text-lg font-extrabold leading-tight ${estilo.titulo}`}>
                    {item.titulo}
                  </h3>
                </div>

                <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {item.texto}
                </p>

                <CtaCadastro variante={estilo.variante} larguraTotal>
                  {item.cta}
                </CtaCadastro>
              </div>
            </div>
          )
        })}
      </div>
    </Secao>
  )
}
