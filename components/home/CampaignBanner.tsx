/**
 * Banner da campanha nacional de pré-lançamento.
 *
 * São DUAS artes diferentes, não a mesma imagem reescalada: a horizontal
 * (1983×793) para desktop e a vertical (1024×1536) para mobile, com composições
 * distintas. Isso é art direction, e explica as duas escolhas fora do padrão do
 * repositório documentadas abaixo.
 *
 * ── Por que <picture> e não next/image ──────────────────────────────────────
 * `next/image` não suporta o atributo `media`, então não consegue escolher entre
 * duas artes. A alternativa idiomática no repo seria dois <Image> com
 * `hidden md:block` / `md:hidden` (padrão de app/meus-anuncios/desempenho),
 * mas o navegador BAIXA imagem dentro de `display:none` — todo acesso mobile de
 * uma campanha paga carregaria as duas orientações à toa. Com <picture>, o
 * navegador busca exatamente uma.
 *
 * O que se perde do otimizador do Next é pouco: as artes já são pré-otimizadas
 * em .webp por scripts/generate-campaign-banners.mjs, em duas larguras cada
 * (1× e retina), e o srcset abaixo entrega a escolha ao navegador.
 *
 * ── Por que aspect-ratio em vez de width/height ─────────────────────────────
 * As duas fontes têm proporções diferentes (2,50:1 e 2:3). Um par fixo de
 * atributos reservaria o espaço errado no outro breakpoint e causaria CLS.
 * Declarando a proporção em CSS por breakpoint, o espaço fica correto nos dois —
 * e como a proporção bate com a arte, `object-cover` não corta nada.
 *
 * ⚠️ Os arquivos vivem em public/campanha/, que precisa constar da ALLOW_PREFIX
 * em lib/prelaunch.ts — senão o gate devolve 307 e a imagem quebra em silêncio.
 */

/**
 * Todo o texto da campanha está dentro da imagem, então este alt é o único
 * acesso de quem usa leitor de tela ao conteúdo — por isso é longo e cobre
 * headline, subtítulo, selo, itens retratados e os quatro diferenciais.
 * As duas orientações trazem a mesma mensagem, então um alt serve para ambas.
 */
const ALT =
  "ShareO — Ganhe dinheiro com o que está parado. O marketplace local para " +
  "anunciar e alugar itens com segurança e praticidade. Local, simples, " +
  "confiável e sustentável. Na arte aparecem carro, moto, furadeira, câmera, " +
  "caixa de som, projetor, bicicleta e escada. Diferenciais: gere renda extra " +
  "com itens que você já tem; transações seguras com avaliações e suporte; " +
  "anuncie ou alugue na sua região; e sustentabilidade, compartilhando " +
  "recursos para reduzir desperdícios."

export function CampaignBanner() {
  return (
    <>
      {/*
        bg-navy-deep (não bg-primary): a arte termina em rgb(0,19,58), quase
        idêntico ao navy-deep — assim o espaço reservado não pisca num azul mais
        claro antes da imagem pintar.
      */}
      <div className="bg-navy-deep">
        <picture>
        <source
          media="(min-width: 768px)"
          srcSet="/campanha/banner-h-1280.webp 1280w, /campanha/banner-h-1983.webp 1983w"
          sizes="100vw"
        />
        <img
          src="/campanha/banner-v-1024.webp"
          srcSet="/campanha/banner-v-768.webp 768w, /campanha/banner-v-1024.webp 1024w"
          sizes="100vw"
          alt={ALT}
          // É o elemento de LCP da landing — não pode entrar em lazy.
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="aspect-[1024/1536] w-full object-cover md:aspect-[1983/793]"
          />
        </picture>
      </div>

      {/*
        Faixa de transição. Medido no preview: a arte termina em rgb(0,19,58) e a
        ListaVIP abre o gradiente em rgb(30,77,128) — a emenda direta vira uma
        linha horizontal dura entre navy escuro e azul médio, que lê como falha
        de montagem. Este degradê curto costura os dois usando só tokens, sem
        precisar mexer na ListaVIP (que também serve a home de marketplace).
      */}
      <div aria-hidden="true" className="h-10 bg-gradient-to-b from-navy-deep to-primary" />
    </>
  )
}
