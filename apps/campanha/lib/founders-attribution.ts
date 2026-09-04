/**
 * Atribuição de canal dos leads da campanha de pré-lançamento.
 *
 * Vive fora do componente por dois motivos: é a lógica que decide de onde veio
 * cada lead — e portanto para onde o orçamento de mídia vai — e era intestável
 * enquanto morava dentro do formulário.
 *
 * Só roda no cliente (lê `window`), mas não importa nada de React: pode ser
 * exercitada em teste puro.
 */

export type SourceValue =
  | "ORGANIC" | "VIP_LANDING" | "REFERRAL"
  | "GOOGLE_ADS" | "META_ADS" | "YOUTUBE_ADS" | "LINKEDIN_ADS"

export type Attribution = {
  source:       SourceValue
  utmSource?:   string
  utmMedium?:   string
  utmCampaign?: string
  utmContent?:  string
  utmTerm?:     string
  referrerUrl?: string
  /** Código de quem indicou (`ref` na URL). */
  ref?:         string
}

/**
 * Chave da atribuição de PRIMEIRO TOQUE, em sessionStorage.
 *
 * Antes, a atribuição era lida só da URL da página onde o formulário está. Quem
 * chegava por anúncio na home e navegava até /pilotos/<cidade> antes de
 * preencher perdia o UTM no caminho, e o lead era gravado como VIP_LANDING — o
 * relatório de canal do painel passaria a mentir exatamente durante a campanha
 * paga, que é quando ele precisa estar certo.
 */
export const ATTRIBUTION_KEY = "shareo:attribution"

/**
 * Deriva o canal (enum SignupSource) a partir dos parâmetros da URL.
 * Indicação (`ref`) tem prioridade; depois `utm_source` conhecido; senão landing VIP.
 */
export function deriveSource(utmSource: string | null, ref: string | null): SourceValue {
  if (ref) return "REFERRAL"
  const s = utmSource?.toLowerCase() ?? ""
  // ⚠️ O canal é lido SÓ do `utm_source` — o `utm_medium` não chega aqui. Os
  // anúncios da campanha precisam ser etiquetados `utm_source=youtube` e
  // `utm_source=linkedin`. Se vierem como `utm_source=google&utm_medium=youtube`,
  // o lead é creditado ao Google Ads e a separação de canal se perde.
  if (s.includes("youtube")  || s === "yt") return "YOUTUBE_ADS"
  if (s.includes("linkedin") || s === "li") return "LINKEDIN_ADS"
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram") || s === "fb" || s === "ig") return "META_ADS"
  if (s.includes("google") || s === "adwords") return "GOOGLE_ADS"
  return "VIP_LANDING"
}

/** Atribuição presente na URL dada, ou `null` se ela não traz nenhuma. */
export function parseAttribution(search: string, referrer = ""): Attribution | null {
  const p = new URLSearchParams(search)
  const utmSource = p.get("utm_source")
  const ref       = p.get("ref")

  const hasAny = ref || utmSource || p.get("utm_medium") || p.get("utm_campaign")
                     || p.get("utm_content") || p.get("utm_term")
  if (!hasAny) return null

  return {
    source:      deriveSource(utmSource, ref),
    utmSource:   utmSource             ?? undefined,
    utmMedium:   p.get("utm_medium")   ?? undefined,
    utmCampaign: p.get("utm_campaign") ?? undefined,
    // utm_content/utm_term identificam o CRIATIVO — sem eles não dá para comparar
    // variações de anúncio no Meta, e acrescentar o campo depois de dezenas de
    // milhares de leads é caro.
    utmContent:  p.get("utm_content")  ?? undefined,
    utmTerm:     p.get("utm_term")     ?? undefined,
    ref:         ref                   ?? undefined,
    referrerUrl: referrer || undefined,
  }
}

/**
 * Atribuição do lead, com persistência de primeiro toque na sessão.
 *
 * A URL vence quando traz UTM — mas só é GRAVADA se ainda não houver nada
 * guardado. É deliberadamente first-touch, não last-touch: a pergunta que a
 * campanha precisa responder é "qual anúncio trouxe esta pessoa", e last-touch
 * responderia "qual foi a última página que ela abriu", creditando o anúncio ao
 * próprio site.
 *
 * `sessionStorage` e não `localStorage`: a atribuição vale para esta visita. Um
 * localStorage manteria o UTM de uma campanha de meses atrás colado na pessoa.
 *
 * Todo acesso ao storage é protegido — Safari em navegação privada lança ao
 * escrever, e derrubar a captação por causa de telemetria seria o pior negócio
 * possível.
 */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return { source: "VIP_LANDING" }

  const fromUrl = parseAttribution(window.location.search, document.referrer)

  if (fromUrl) {
    try {
      if (!window.sessionStorage.getItem(ATTRIBUTION_KEY)) {
        window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fromUrl))
      }
    } catch { /* storage indisponível — segue com o valor da URL */ }
    return fromUrl
  }

  try {
    const saved = window.sessionStorage.getItem(ATTRIBUTION_KEY)
    if (saved) return JSON.parse(saved) as Attribution
  } catch { /* JSON corrompido ou storage bloqueado — cai no default */ }

  return { source: "VIP_LANDING", referrerUrl: document.referrer || undefined }
}
