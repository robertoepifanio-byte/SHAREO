export function formatPrice(centavos: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(centavos / 100)
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", opts).format(new Date(date))
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

/** "14:30" — apenas hora e minuto. */
export function formatTime(date: Date | string): string {
  return formatDate(date, { hour: "2-digit", minute: "2-digit" })
}

/** "23 de jun. de 2026, 14:30" — data curta + hora. */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/** "junho de 2026" — mês por extenso + ano (ex.: "Membro desde…"). */
export function formatMonthYear(date: Date | string): string {
  return formatDate(date, { month: "long", year: "numeric" })
}
