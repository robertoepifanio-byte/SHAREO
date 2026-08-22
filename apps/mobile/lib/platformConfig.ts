// Fonte: app/api/platform-config/public/route.ts — mesmos campos, mesmos defaults
// de lib/platform-config.ts (web).
// ⚠️ Ao mudar defaults ou rótulos aqui, atualizar lib/platform-config.ts junto.
/**
 * Números publicados da plataforma, para o app.
 *
 * Por que existe: o mesmo `fetch` de `/api/platform-config/public` estava
 * copiado em 4 telas (`ajuda`, `termos`, `ganhar`, `anunciar/estimativa`), em
 * três dialetos diferentes e com quatro políticas de fallback distintas
 * (`null`, `"15%"`, `1500`, objeto próprio). Nenhuma compartilhava cache: quatro
 * requisições idênticas, e quatro conjuntos de defaults para manter em sincronia
 * com o servidor.
 *
 * 🪤 NUNCA cravar prazo, teto ou percentual na copy do app. Foi assim que a
 * Central de Ajuda ficou dizendo "toda segunda-feira" e "R$ 500" enquanto o site
 * já lia a config — e depois nem o provedor de pagamentos batia mais.
 */
import { useQuery } from "@tanstack/react-query"
import { API_URL } from "@/lib/api"

export interface PublicConfig {
  feeRateBps:        number
  payoutWindowDays:  number
  checkoutMaxCents:  number
  ownerHours:        number
  lateFeeMultiplier: number
  cancel: {
    fullRefundHours:    number
    partialRefundHours: number
    partialPercent:     number
    latePercent:        number
  }
}

/** Espelha os defaults de lib/platform-config.ts — valem só até o fetch voltar. */
export const DEFAULT_CONFIG: PublicConfig = {
  feeRateBps:        1500,
  payoutWindowDays:  3,
  checkoutMaxCents:  50_000,
  ownerHours:        48,
  lateFeeMultiplier: 1.5,
  cancel: { fullRefundHours: 24, partialRefundHours: 6, partialPercent: 70, latePercent: 50 },
}

/**
 * Busca a config pública. Nunca lança e nunca devolve `undefined`: sem rede, a
 * tela abre com os defaults em vez de ficar em branco ou mostrar "undefined" no
 * meio de uma frase.
 *
 * 🪤 O merge com os defaults não é decorativo — o app instalado no celular pode
 * ser mais velho ou mais novo que a API (ciclo de loja ≠ ciclo de deploy), e
 * campo ausente cai no default em vez de virar `undefined` no texto. `cancel` é
 * mesclado à parte porque o spread raso o trocaria inteiro.
 */
export function usePlatformConfig(): PublicConfig {
  const { data } = useQuery({
    queryKey: ["platform-config-public"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PublicConfig> => {
      const res  = await fetch(`${API_URL}/api/platform-config/public`)
      const json = (await res.json()) as { data?: Partial<PublicConfig> }
      const d    = json?.data
      return { ...DEFAULT_CONFIG, ...d, cancel: { ...DEFAULT_CONFIG.cancel, ...d?.cancel } }
    },
  })
  return data ?? DEFAULT_CONFIG
}

/* Rótulos derivados — espelham o `HelpVars` de app/ajuda/page.tsx (web). */

/**
 * "1 dia" / "N dias" — e "no mesmo dia" quando a janela é zero.
 *
 * 🪤 `payoutWindowDays` aceita 0 no servidor, e as cópias anteriores não
 * tratavam: sairia "fica retido por 0 dias".
 */
export function formatPayoutWindow(days: number): string {
  if (days <= 0) return "no mesmo dia"
  return days === 1 ? "1 dia" : `${days} dias`
}

/** "15%" — sem casa decimal quando é inteiro. */
export function formatFeeLabel(feeRateBps: number): string {
  const pct = feeRateBps / 100
  return `${pct % 1 === 0 ? pct.toFixed(0) : String(pct)}%`
}

/** "R$ 500" — mesmo formato do `formatPriceShort` do site. */
export function formatMaxLabel(cents: number): string {
  return `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`
}
