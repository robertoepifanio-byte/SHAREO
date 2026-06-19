// Cidades candidatas a piloto — destino dos anúncios geo-segmentados e iscas de SEO local.
// A escolha final do(s) piloto(s) é por dados (densidade + equilíbrio) no /admin/fundadores;
// esta lista define apenas quais landings /pilotos/[cidade] existem (ISR + sitemap).
// Lançamento nacional — sem default de cidade na UI geral (ver CLAUDE.md).

export type PilotCity = {
  slug:  string // usado na URL: /pilotos/<slug>
  name:  string // nome exibido e gravado no lead
  uf:    string // 2 letras
}

export const PILOT_CITIES: readonly PilotCity[] = [
  { slug: "sao-paulo",      name: "São Paulo",      uf: "SP" },
  { slug: "rio-de-janeiro", name: "Rio de Janeiro", uf: "RJ" },
  { slug: "belo-horizonte", name: "Belo Horizonte", uf: "MG" },
  { slug: "curitiba",       name: "Curitiba",       uf: "PR" },
  { slug: "porto-alegre",   name: "Porto Alegre",   uf: "RS" },
  { slug: "florianopolis",  name: "Florianópolis",  uf: "SC" },
  { slug: "brasilia",       name: "Brasília",       uf: "DF" },
  { slug: "goiania",        name: "Goiânia",        uf: "GO" },
  { slug: "salvador",       name: "Salvador",       uf: "BA" },
  { slug: "recife",         name: "Recife",         uf: "PE" },
  { slug: "fortaleza",      name: "Fortaleza",      uf: "CE" },
  { slug: "natal",          name: "Natal",          uf: "RN" },
  { slug: "campinas",       name: "Campinas",       uf: "SP" },
  { slug: "manaus",         name: "Manaus",         uf: "AM" },
] as const

export function getPilotCity(slug: string): PilotCity | undefined {
  return PILOT_CITIES.find((c) => c.slug === slug.toLowerCase())
}
