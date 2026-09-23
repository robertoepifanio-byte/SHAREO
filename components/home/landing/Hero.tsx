// Fonte: apps/campanha/components/landing/Hero.tsx — CtaAncora vira CtaCadastro (/cadastro)
import { PrelaunchBadge } from "@/components/home/PrelaunchBadge"
import { CtaCadastro } from "./CtaCadastro"
import { UiIcon } from "./icons/UiIcon"
import { CTA_MICROCOPY, HERO_BENEFICIOS } from "@/lib/landing-content"

const ASPECTO = "aspect-[1888/833]"

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
      <div className="mx-auto grid max-w-[1360px] items-center gap-10 xl:grid-cols-[minmax(0,0.62fr)_1fr]">
        <div>
          <PrelaunchBadge className="mb-5" />

          <h1
            id="hero-titulo"
            className="mb-3 font-display text-[30px] font-extrabold leading-[1.15] text-white sm:text-[38px] xl:text-[42px]"
          >
            Tem algo parado?
            <br />
            <span className="text-accent">Faça isso virar dinheiro.</span>
          </h1>

          <p className="mb-6 max-w-[540px] text-[15px] leading-relaxed text-white/85 xl:text-base">
            O ShareO vai conectar pessoas que têm coisas sem uso com{" "}
            <span className="font-semibold text-accent">quem precisa delas</span> — perto de
            você, de forma simples e segura.
          </p>

          <ul className="mb-7 grid gap-5 sm:grid-cols-3">
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

          <CtaCadastro className="w-full sm:w-auto">Quero ser um dos primeiros</CtaCadastro>

          <p className="mt-3 text-xs text-white/70">{CTA_MICROCOPY}</p>
        </div>

        <img
          src="/campanha/hero-944.webp"
          srcSet="/campanha/hero-944.webp 944w, /campanha/hero-1888.webp 1888w"
          sizes="(min-width: 1280px) 800px, 100vw"
          alt={ALT_HERO}
          loading="eager"
          decoding="async"
          className={`w-full rounded-xl ${ASPECTO}`}
        />
      </div>
    </section>
  )
}
