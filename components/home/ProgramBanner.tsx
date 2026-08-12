/**
 * Banner de programa (Fundadores, Embaixadores) na landing de pré-lançamento.
 *
 * Segue a mesma técnica do CampaignBanner — duas artes distintas servidas por
 * <picture> + <source media>, .webp pré-otimizado por
 * scripts/generate-campaign-banners.mjs — pelos mesmos motivos documentados lá:
 * `next/image` não suporta `media`, e o truque de `hidden md:block` faria o
 * navegador baixar as DUAS orientações em todo acesso mobile.
 *
 * ── A diferença em relação ao banner do hero ─────────────────────────────────
 * A arte do hero é cinematográfica (2,50:1) e sangra a página inteira. Estas são
 * quase quadradas (1,50:1 e 1,42:1): a 100vw num desktop de 1920px passariam de
 * 1.300px de altura e tomariam a tela toda. Por isso ficam contidas num
 * contêiner central com cantos arredondados — legível sem virar página inteira.
 *
 * ⚠️ Os arquivos vivem em public/campanha/, que já consta da ALLOW_PREFIX em
 * lib/prelaunch.ts. Asset fora dessa lista leva 307 e a imagem quebra em
 * silêncio (o navegador mostra só o alt).
 */

interface Props {
  /** Prefixo dos arquivos em public/campanha/ (ex.: "fundadores"). */
  slug: string
  /** Largura nativa da arte horizontal — é a maior variante gerada. */
  larguraHorizontal: number
  /**
   * Classes de proporção, passadas como literal porque o JIT do Tailwind não
   * enxerga nome de classe montado em runtime.
   */
  aspecto: string
  /**
   * Descrição completa da arte — ver nota sobre alt no CampaignBanner.
   *
   * Como o banner inteiro é um link, este texto vira o nome acessível dele.
   * Por isso deve TERMINAR com a ação ("Entrar na lista..."): quem usa leitor de
   * tela ouve a descrição e, no fim, para onde o clique leva.
   */
  alt: string
  /** `true` no primeiro banner visível, para não entrar em lazy sem necessidade. */
  prioritario?: boolean
}

export function ProgramBanner({ slug, larguraHorizontal, aspecto, alt, prioritario = false }: Props) {
  return (
    <div className="bg-background px-6 pb-14">
      {/*
        O banner inteiro é clicável porque a própria arte traz um CTA impresso
        ("CADASTRE-SE AGORA", "INDICAR AMIGOS AGORA"). Sem link, o texto prometia
        uma ação que não acontecia — e o destino que ele sugere (/cadastro) está
        fechado de propósito pelo gate durante a campanha. #lista-vip é o único
        caminho aberto, e é uma seção real: funciona sem JS e por teclado.
      */}
      <a
        href="#lista-vip"
        className="mx-auto block max-w-[1100px] overflow-hidden rounded-xl bg-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <picture>
          <source
            media="(min-width: 768px)"
            srcSet={`/campanha/${slug}-h-1280.webp 1280w, /campanha/${slug}-h-${larguraHorizontal}.webp ${larguraHorizontal}w`}
            sizes="(min-width: 1100px) 1100px, 100vw"
          />
          <img
            src={`/campanha/${slug}-v-1024.webp`}
            srcSet={`/campanha/${slug}-v-768.webp 768w, /campanha/${slug}-v-1024.webp 1024w`}
            sizes="(min-width: 1100px) 1100px, 100vw"
            alt={alt}
            loading={prioritario ? "eager" : "lazy"}
            decoding="async"
            className={`w-full object-cover ${aspecto}`}
          />
        </picture>
      </a>
    </div>
  )
}
