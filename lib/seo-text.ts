/**
 * Textos de <title> e <meta description> dentro do que o Google exibe inteiro:
 * ~60 caracteres no título (já com o sufixo do template do layout) e ~160 na descrição.
 * Acima disso o resultado de busca vem cortado no meio.
 */
export const TITLE_SUFFIX = " | ShareO"
const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

/** Colapsa espaços e corta em `max` caracteres, preferindo o fim de uma palavra. */
export function clip(text: string, max: number): string {
  const limpo = text.replace(/\s+/g, " ").trim()
  // Array.from conta pontos de código: um emoji do título não é partido ao meio.
  const chars = Array.from(limpo)
  if (chars.length <= max) return limpo
  const corte = chars.slice(0, max - 1).join("")
  const ultimoEspaco = corte.lastIndexOf(" ")
  // Só recua até o espaço se sobrar texto suficiente; senão o corte ficaria curto demais.
  return `${ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : corte}…`
}

const clipTitle = (title: string) => clip(title, TITLE_MAX - TITLE_SUFFIX.length)

export function itemSeoText(item: { title: string; description: string; city?: string | null; state?: string | null }) {
  const local = [item.city, item.state].filter(Boolean).join(", ")
  const sufixo = local ? ` — ${local}` : ""
  return {
    title:       clipTitle(item.title),
    description: `${clip(item.description, DESCRIPTION_MAX - sufixo.length)}${sufixo}`,
  }
}

export function storeSeoText(user: { name: string; bio?: string | null }) {
  return {
    title:         clipTitle(`${user.name} — Vitrine`),
    ogTitle:       clipTitle(`${user.name} — Vitrine ShareO`),
    description:   clip(user.bio ?? `Confira os itens disponíveis para aluguel de ${user.name} no ShareO.`, DESCRIPTION_MAX),
    ogDescription: clip(user.bio ?? `Alugue itens de ${user.name} no ShareO.`, DESCRIPTION_MAX),
  }
}

export function pilotSeoText(city: { name: string; uf: string }) {
  return {
    title:       `Shareo chega em ${city.name} (${city.uf}): entre na lista`,
    description: `Ganhe renda com o que está parado em casa ou alugue de quem é perto de você em ${city.name}. Quanto mais gente entrar, mais cedo o Shareo abre aí.`,
  }
}
