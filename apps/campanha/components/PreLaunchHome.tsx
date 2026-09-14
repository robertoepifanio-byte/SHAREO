import { PreLaunchHeader } from "@/components/PreLaunchHeader"
import { Hero } from "@/components/landing/Hero"
import { ItensParados } from "@/components/landing/ItensParados"
import { DoisLados } from "@/components/landing/DoisLados"
import { ComoFunciona } from "@/components/landing/ComoFunciona"
import { QuantoVale } from "@/components/landing/QuantoVale"
import { Confianca } from "@/components/landing/Confianca"
import { Fundadores } from "@/components/landing/Fundadores"
import { Embaixadores } from "@/components/landing/Embaixadores"
import { Faq } from "@/components/landing/Faq"
import { Fechamento } from "@/components/landing/Fechamento"

/**
 * A landing da campanha. Composição e nada mais — cada seção se explica no
 * próprio arquivo.
 *
 * ── A ordem é o produto deste redesenho ─────────────────────────────────────
 *
 * A versão anterior abria com uma arte (todo o texto dentro da imagem) e
 * colocava o formulário LOGO ABAIXO dela, antes de qualquer explicação do que é
 * o ShareO. Pedia a decisão antes de dar a informação que a fundamenta, e o
 * hero ainda dividia a atenção entre três botões de destinos diferentes.
 *
 * A sequência agora é:
 *
 *   Hero            → a proposta em uma frase
 *   ItensParados    → identificação ("eu tenho isso parado"), sem pedir nada
 *   DoisLados       → de que lado do marketplace a pessoa está
 *   ComoFunciona    → a mecânica, nos dois papéis
 *   QuantoVale      → quanto vale, com valores de referência do produto
 *   Confianca       → a objeção principal, enunciada com as palavras dela
 *   Fundadores      → por que entrar AGORA
 *   Embaixadores    → o incentivo a trazer outras pessoas
 *   Faq             → as objeções que sobraram
 *   Fechamento      → a última frase e o formulário
 *
 * ── Um destino de CTA ───────────────────────────────────────────────────────
 *
 * Há seis CTAs ao longo da página e todos apontam para o MESMO formulário
 * (CTA_HREF em lib/landing-content.ts). Repetir o pedido é bom; variar o
 * destino não é.
 *
 * ── Um formulário só ────────────────────────────────────────────────────────
 *
 * `FounderCaptureForm` aparece uma única vez, dentro da `ListaVIP`, no
 * `Fechamento`. Duas instâncias duplicariam os ids (`founder-form`,
 * `founder-email`…), quebrariam a associação `<label for>` e disparariam o
 * evento de funil duas vezes por carregamento.
 */
export function PreLaunchHome() {
  return (
    <>
      <PreLaunchHeader />

      <main id="conteudo">
        <Hero />
        <ItensParados />
        <DoisLados />
        <ComoFunciona />
        <QuantoVale />
        <Confianca />
        <Fundadores />
        <Embaixadores />
        <Faq />
        <Fechamento />
      </main>
    </>
  )
}
