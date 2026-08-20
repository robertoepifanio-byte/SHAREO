export function formatPrice(centavos: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(centavos / 100)
}

/** Como formatPrice, mas omite os centavos quando são zero: 50000 → "R$ 500". */
export function formatPriceShort(centavos: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(centavos / 100)
}

/**
 * Rótulo de percentual sem casas decimais quando o valor é inteiro: 15 → "15%",
 * 12.5 → "12,5%". Fonte única do formato usado em taxa da plataforma, multa de
 * atraso e afins — evita reescrever o ternário `% 1 === 0` em cada tela.
 */
export function formatPercentLabel(pct: number): string {
  return `${String(pct).replace(".", ",")}%`
}

/** Multiplicador em pt-BR: 1.5 → "1,5×", 1 → "1×". */
export function formatMultiplier(mult: number): string {
  return `${String(mult).replace(".", ",")}×`
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", opts).format(new Date(date))
}

// ── Presets de data (pt-BR) ────────────────────────────────────────────────
// Evitam reescrever as `options` do Intl.DateTimeFormat em cada arquivo.
// Para um formato fora destes, use formatDate(date, { ...opts }).

/** "23 de jun. de 2026" — dia + mês abreviado + ano. */
export function formatDateShort(date: Date | string): string {
  return formatDate(date, { day: "2-digit", month: "short", year: "numeric" })
}

/** "23/06/2026" — numérico. */
export function formatDateNumeric(date: Date | string): string {
  return formatDate(date, { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** "23 de jun." — dia + mês abreviado, sem ano. */
export function formatDateMonthDay(date: Date | string): string {
  return formatDate(date, { day: "2-digit", month: "short" })
}

/** "23 de junho de 2026" — dia + mês por extenso + ano. */
export function formatDateLong(date: Date | string): string {
  return formatDate(date, { day: "2-digit", month: "long", year: "numeric" })
}

/** "junho de 2026" — mês por extenso + ano (ex.: "Membro desde…"). */
export function formatMonthYear(date: Date | string): string {
  return formatDate(date, { month: "long", year: "numeric" })
}

/** "14:30" — apenas hora e minuto. */
export function formatTime(date: Date | string): string {
  return formatDate(date, { hour: "2-digit", minute: "2-digit" })
}

/** "23/06/2026 14:30" — data numérica + hora. */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/** "1.234" — número inteiro com separador de milhar pt-BR. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n)
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

export function formatRelativeTime(date: Date | string): string {
  const diff = (new Date(date).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })
  if (abs < 60) return rtf.format(Math.round(diff), "second")
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour")
  return rtf.format(Math.round(diff / 86400), "day")
}
