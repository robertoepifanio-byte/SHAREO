/**
 * Formatadores dos números que aparecem DENTRO do texto legal.
 *
 * Moram aqui porque os documentos são renderizados por dois apps: o marketplace
 * lê os valores do banco, a landing da campanha lê do endpoint público, e os
 * dois precisam imprimi-los com exatamente a mesma grafia. Duas implementações
 * "equivalentes" divergem no primeiro caso de borda — 12,5% contra 12.5%, ou
 * R$ 500 contra R$ 500,00 — e aí os mesmos Termos passam a dizer coisas
 * diferentes dependendo de onde o visitante os abriu.
 *
 * `utils/format.ts` e `lib/platform-config.ts` do marketplace reexportam daqui.
 */

/** Janela de repasse por extenso: 0 → "no mesmo dia", 1 → "1 dia", N → "N dias". */
export function formatPayoutWindow(days: number): string {
  if (days <= 0) return "no mesmo dia"
  return days === 1 ? "1 dia" : `${days} dias`
}

/** Preço curto: omite os centavos quando são zero. 50000 → "R$ 500". */
export function formatPriceShort(centavos: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(centavos / 100)
}

/** Preço por extenso, sempre com centavos. 50000 → "R$ 500,00". */
export function formatPriceLong(centavos: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(centavos / 100)
}

/**
 * Percentual SEM o símbolo: 15 → "15", 12.5 → "12,5".
 *
 * Existe porque a cláusula 6 dos Termos traz o "%" no próprio texto e interpola
 * só o número. Antes cada app derivava isso do seu jeito — um com
 * `toLocaleString`, outro com `.replace("%","")` — duas maneiras de produzir o
 * mesmo valor que só divergiriam numa taxa com muitas casas.
 */
export function formatPercentValue(pct: number): string {
  return String(pct).replace(".", ",")
}

/** Percentual com símbolo: 15 → "15%", 12.5 → "12,5%". */
export function formatPercentLabel(pct: number): string {
  return `${formatPercentValue(pct)}%`
}
