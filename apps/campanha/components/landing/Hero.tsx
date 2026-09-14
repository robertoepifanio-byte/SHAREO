import { PrelaunchBadge } from "@/components/PrelaunchBadge"
import { CtaAncora } from "./CtaAncora"
import { ArtePlaceholder } from "./ArtePlaceholder"
import { UiIcon } from "./icons/UiIcon"
import { ARTE, CTA_MICROCOPY, HERO_BENEFICIOS } from "@/lib/landing-content"

/**
 * Hero da landing.
 *
 * A mudança estrutural do redesenho está aqui: antes o topo era uma ARTE com
 * todo o texto dentro dela (1983×793), o que custava ~116 KB antes de qualquer
 * palavra aparecer, não escalava com a fonte do sistema, não era selecionável,
 * traduzível nem indexável (WCAG 1.4.5) — e empurrava o primeiro campo do
 * formulário para ~1.400px de rolagem no mobile.
 *
 * Agora o H1 é texto. A imagem passa a ser ilustração de apoio: decorativa
 * (`alt=""`), porque tudo que ela dizia está escrito ao lado. No mobile ela vem
 * DEPOIS do CTA — a ordem do DOM é a ordem de leitura, e o botão precisa caber
 * na primeira tela.
 *
 * ⚠️ Enquanto `ARTE.hero` for `false`, entra o placeholder com a mesma
 * proporção da arte final. Ver o passo a passo em lib/landing-content.ts.
 */
/**
 * Proporção NATIVA da arte (1888×833), declarada UMA vez — o placeholder e a
 * imagem final precisam reservar a mesma caixa, senão a troca move o layout.
 *
 * Usar a proporção da própria arte, e não uma escolhida por nós, é o que
 * dispensa `object-cover`: em qualquer largura a composição aparece inteira.
 * Com `cover` numa caixa mais alta, o corte comeria o cartão "furadeira parada
 * → ShareO → renda extra" na borda direita, que é o argumento visual da peça.
 */
const ASPECTO = "aspect-[1888/833]"

/**
 * A arte traz texto embutido — o fluxo "furadeira parada → ShareO → renda
 * extra" e a pergunta manuscrita. O alt descreve o que está DESENHADO em vez de
 * transcrever as frases: elas repetem, quase palavra por palavra, o H1 e o
 * parágrafo ao lado, e reler isso seria redundância para quem usa leitor de
 * tela.
 */
const ALT_HERO =
  "Furadeira, câmera, caixa de som, projetor, bicicleta, escada e um carro " +
  "em volta de uma seta circular, ilustrando o caminho de um item parado até " +
  "virar renda extra."

export function Hero() {
  return (
    <section
      id="topo"
      aria-labelledby="hero-titulo"
      className="bg-gradient-to-br from-primary to-navy-deep px-5 py-12 sm:px-6 xl:py-16"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 xl:grid-cols-[1.05fr_1fr] xl:gap-12">
        <div>
          <PrelaunchBadge className="mb-5" />

          <h1
            id="hero-titulo"
            className="mb-4 font-display text-[30px] font-extrabold leading-[1.15] text-white sm:text-[38px] xl:text-[48px]"
          >
            Tem algo parado?
            <br />
            <span className="text-accent">Faça isso virar dinheiro.</span>
          </h1>

          <p className="mb-7 max-w-[540px] text-[15px] leading-relaxed text-white/85 xl:text-base">
            O ShareO vai conectar pessoas que têm coisas sem uso com{" "}
            <span className="font-semibold text-accent">quem precisa delas</span> — perto de
            você, de forma simples e segura.
          </p>

          <ul className="mb-8 grid gap-5 sm:grid-cols-3">
            {HERO_BENEFICIOS.map((beneficio) => (
              <li key={beneficio.titulo} className="flex gap-3 sm:flex-col sm:gap-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/30 text-accent"
                  aria-hidden="true"
                >
                  <UiIcon name={beneficio.icone} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{beneficio.titulo}</span>
                  <span className="block text-xs leading-snug text-white/70">{beneficio.texto}</span>
                </span>
              </li>
            ))}
          </ul>

          <CtaAncora className="w-full sm:w-auto">Quero ser um dos primeiros</CtaAncora>

          <p className="mt-3 text-xs text-white/70">{CTA_MICROCOPY}</p>
        </div>

        {/*
          `order-last` no mobile não é necessário — a arte já está depois do
          bloco de texto no DOM. Em xl o grid a coloca à direita naturalmente.
        */}
        {ARTE.hero ? (
          <img
            src="/campanha/hero-944.webp"
            srcSet="/campanha/hero-944.webp 944w, /campanha/hero-1888.webp 1888w"
            sizes="(min-width: 1280px) 620px, 100vw"
            alt={ALT_HERO}
            // `eager` sim (é a ilustração do topo, não pode ficar para o fim),
            // mas SEM `fetchPriority="high"`: no mobile esta arte vem depois do
            // CTA, e priorizá-la seria disputar banda com a fonte e o H1 — que
            // é o LCP real no telefone, justamente o aparelho que a mídia paga
            // atinge.
            loading="eager"
            decoding="async"
            className={`w-full rounded-xl ${ASPECTO}`}
          />
        ) : (
          <ArtePlaceholder
            aspecto={ASPECTO}
            icones={["furadeira", "bicicleta", "projetor", "som", "escada"]}
          />
        )}
      </div>
    </section>
  )
}
