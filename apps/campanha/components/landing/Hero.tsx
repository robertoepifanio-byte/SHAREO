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
 * ⚠️ Enquanto `ARTE.heroPronta` for `false`, entra o placeholder com a mesma
 * proporção da arte final. Ver o passo a passo em lib/landing-content.ts.
 */
/**
 * Proporção da ilustração, declarada UMA vez — o placeholder e a arte final
 * precisam reservar a mesma caixa, senão a troca move o layout (CLS).
 */
const ASPECTO = "aspect-[4/3] md:aspect-[16/10]"

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
        {ARTE.heroPronta ? (
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet="/campanha/hero-h-1280.webp 1280w, /campanha/hero-h-1983.webp 1983w"
              sizes="(min-width: 1280px) 600px, 100vw"
            />
            <img
              src="/campanha/hero-v-1024.webp"
              srcSet="/campanha/hero-v-768.webp 768w, /campanha/hero-v-1024.webp 1024w"
              sizes="100vw"
              alt=""
              // `eager` sim (é a ilustração do topo, não pode ficar para o
              // fim), mas SEM `fetchPriority="high"`: o hint vale para o <img>
              // inteiro, não por <source>, e no mobile esta arte vem depois do
              // CTA e é decorativa. Priorizá-la ali seria disputar banda com a
              // fonte e o H1 — que é o LCP real no telefone, justamente o
              // aparelho que a mídia paga atinge.
              loading="eager"
              decoding="async"
              className={`w-full rounded-xl object-cover ${ASPECTO}`}
            />
          </picture>
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
