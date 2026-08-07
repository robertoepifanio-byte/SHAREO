/**
 * Normalização de nomes de lugar (cidade / bairro) para uso como CHAVE DE AGRUPAMENTO.
 *
 * Problema que resolve: `FounderLead.city` sempre foi texto livre. "São Paulo",
 * "sao paulo" e "SAO  PAULO" viravam linhas distintas no ranking de
 * /admin/fundadores — justamente a decisão (escolher a cidade-piloto) que a
 * campanha de pré-lançamento existe para tomar.
 *
 * O valor normalizado é gravado em colunas próprias (`cityNorm`/`neighborhoodNorm`)
 * em WRITE TIME. É isso que permite o painel agrupar no banco (`groupBy`) em vez de
 * carregar todos os leads em memória. O texto original é preservado para exibição.
 *
 * ⚠️ A semântica desta função está espelhada em SQL no backfill da migração
 * 20260807000000_founder_leads_bairro_cep. Alterar uma exige alterar a outra.
 *
 * Limite conhecido: abreviações NÃO convergem ("S. Paulo" ≠ "sao paulo"). Isso é
 * intencional — quem resolve abreviação é a captura por CEP (o ViaCEP devolve o
 * nome canônico do município), não a normalização de string.
 */

/**
 * "São Paulo" | "sao paulo" | "  SAO  PAULO " | "Mogi-Mirim" → chave dobrada.
 * Retorna `null` para entrada vazia/só espaços (mantém a coluna nullable coerente).
 */
export function normalizePlace(v?: string | null): string | null {
  if (!v) return null
  const s = v
    // NFD separa a letra base do diacrítico: "São" → "S" + "a" + ˜ + "o"
    .normalize("NFD")
    // Descarta tudo fora do ASCII — os diacríticos decompostos caem aqui, SEM
    // deixar separador no lugar (senão "São" viraria "sa o").
    // Evita depender de um range de combining marks literal no fonte, que se
    // corrompe com facilidade em editores e pipelines.
    // Mantém caracteres de controle deliberadamente: eles são tratados como
    // separador no passo seguinte, igual ao que o SQL do backfill faz.
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    // Pontuação, hífen e espaço repetido viram um único espaço:
    // "Mogi-Mirim" ≡ "Mogi Mirim" ≡ "mogi  mirim"
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
  return s || null
}
