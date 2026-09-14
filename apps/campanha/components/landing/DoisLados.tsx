import { Secao, TituloSecao } from "./Secao"
import { CtaAncora } from "./CtaAncora"
import { ArtePlaceholder } from "./ArtePlaceholder"
import { UiIcon } from "./icons/UiIcon"
import { ANCORAS, ARTE, DOIS_LADOS } from "@/lib/landing-content"

/**
 * Os dois lados do marketplace, lado a lado.
 *
 * Um marketplace bilateral tem duas propostas de valor distintas, e quem chega
 * pela mídia paga se identifica com uma delas — não com as duas. Mostrar as
 * duas explicitamente evita que metade do público conclua que a página "não é
 * para mim".
 *
 * Os dois CTAs vão para o MESMO formulário. Pré-selecionar a intenção exigiria
 * uma prop nova no FounderCaptureForm, que é intocável nesta rodada — e a
 * escolha "quero anunciar / quero alugar" é o primeiro campo do formulário, uma
 * linha abaixo de onde a pessoa aterrissa.
 */
/**
 * Proporção da foto, declarada UMA vez: o placeholder e a imagem definitiva
 * precisam reservar a mesma caixa, senão trocar um pelo outro move o layout
 * (CLS). Repetir a classe nos dois ramos é exatamente o tipo de invariante que
 * se quebra na primeira edição distraída.
 */
const ASPECTO = "aspect-[16/10] sm:aspect-auto sm:h-full"

const ESTILO_LADO = {
  proprietario: {
    fundoArte: "from-brand to-brand-hover",
    titulo: "text-brand",
    selo: "bg-brand text-white",
    variante: "solido" as const,
    icone: "moeda" as const,
  },
  locatario: {
    fundoArte: "from-blue-medium to-primary",
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
                {/*
                  `<img>` com srcSet, não `<picture>`: as duas larguras são a
                  MESMA foto reescalada, e nesse caso o navegador escolhe
                  sozinho. `<picture>` só se paga quando há art direction —
                  composições diferentes por breakpoint, como no hero.
                */}
                {ARTE.fotosProntas ? (
                  <img
                    src={`/campanha/lado-${item.lado}-640.webp`}
                    srcSet={`/campanha/lado-${item.lado}-640.webp 640w, /campanha/lado-${item.lado}-1280.webp 1280w`}
                    sizes="(min-width: 1280px) 230px, 38vw"
                    alt={item.altFoto}
                    loading="lazy"
                    decoding="async"
                    className={`w-full object-cover ${ASPECTO}`}
                  />
                ) : (
                  <ArtePlaceholder
                    aspecto={ASPECTO}
                    className={`rounded-none bg-gradient-to-br ${estilo.fundoArte}`}
                  />
                )}
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

                <CtaAncora variante={estilo.variante} larguraTotal>
                  {item.cta}
                </CtaAncora>
              </div>
            </div>
          )
        })}
      </div>
    </Secao>
  )
}
