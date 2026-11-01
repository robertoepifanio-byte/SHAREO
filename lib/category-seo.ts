/**
 * Texto próprio de cada vitrine de categoria (`/alugar/<slug>`).
 *
 * Cada categoria cita os itens que as pessoas de fato procuram; a mesma frase com o nome trocado
 * seria, para o buscador, a mesma página. Chaveado por `slug` (estável), nunca por nome: o slug
 * `casa-jardim` exibe o nome "Eletrodomésticos".
 */
import { clip } from "@/lib/seo-text"

const DESCRIPTION_MAX = 160

type CategorySeo = {
  /** Meta description (até 160 caracteres). */
  description: string
  /** Parágrafo visível no topo da vitrine. */
  intro: string
}

const POR_SLUG: Record<string, CategorySeo> = {
  ferramentas: {
    description: "Alugue ferramentas como furadeira, parafusadeira, serra e lixadeira de quem mora perto de você. Compare preços por dia e reserve no ShareO.",
    intro:       "Precisa de furadeira, parafusadeira, serra ou lixadeira só para um serviço? Alugue de pessoas da sua região em vez de comprar: compare os preços e reserve pelo ShareO.",
  },
  eletronicos: {
    description: "Alugue eletrônicos como câmera, caixa de som e projetor de quem mora perto de você. Compare preços por dia e reserve no ShareO.",
    intro:       "Câmeras, caixas de som, projetores e outros eletrônicos para o dia em que você realmente precisa deles. Alugue de pessoas da sua região, compare os preços e reserve pelo ShareO.",
  },
  "casa-jardim": {
    description: "Alugue eletrodomésticos como aspirador e lavadora de alta pressão de quem mora perto de você. Compare preços por dia e reserve no ShareO.",
    intro:       "Aspirador, lavadora de alta pressão e outros eletrodomésticos para uma faxina pesada ou uma mudança. Alugue de pessoas da sua região, compare os preços e reserve pelo ShareO.",
  },
  construcao: {
    description: "Alugue equipamentos de obra como betoneira, martelete, andaime e escada de quem mora perto de você. Compare preços por dia e reserve no ShareO.",
    intro:       "Betoneira, martelete, andaime, escada e outros equipamentos para a sua obra ou reforma, sem o custo de comprar. Alugue de pessoas da sua região, compare os preços e reserve pelo ShareO.",
  },
  esporte: {
    description: "Alugue itens de esporte e lazer como bicicleta e equipamentos de camping de quem mora perto de você. Compare preços por dia e reserve no ShareO.",
    intro:       "Bicicleta, equipamentos de camping e de esporte e lazer para o fim de semana ou para testar antes de comprar. Alugue de pessoas da sua região, compare os preços e reserve pelo ShareO.",
  },
  festas: {
    description: "Alugue itens para festa como caixa de som, mesas, cadeiras e tenda de quem mora perto de você. Compare preços por dia e reserve no ShareO.",
    intro:       "Caixa de som, mesas, cadeiras, tenda e decoração para a sua festa, sem comprar o que você usa uma vez. Alugue de pessoas da sua região, compare os preços e reserve pelo ShareO.",
  },
}

/** Texto da categoria: o próprio, quando existe; senão o genérico com o nome trocado. */
export function categorySeoText(category: { slug: string; name: string }): CategorySeo {
  const proprio = POR_SLUG[category.slug]
  if (proprio) return proprio
  return {
    description: clip(`Encontre ${category.name} para alugar perto de você no ShareO. Compare preços e reserve direto com quem já tem.`, DESCRIPTION_MAX),
    intro:       `Encontre ${category.name} para alugar de pessoas da sua região. Compare preços e reserve direto pelo ShareO.`,
  }
}
