import type { Metadata } from "next"
import Link from "next/link"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { PILOT_CITIES } from "@/lib/pilot-cities"
import { normalizePlace } from "@/lib/geo/normalize-place"
import { jsonLdScript } from "@/lib/jsonLd"

// Mesmo ISR da landing de cidade: o conteúdo muda pouco e a contagem tem cache
// próprio, invalidado pela tag "founders".
export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://shareo-rouge.vercel.app"

const TITLE = "Onde o Shareo vai abrir primeiro — entre na lista da sua cidade"
const DESCRIPTION =
  "Estas são as cidades candidatas a receber o Shareo primeiro. Quanto mais gente " +
  "de uma cidade entra na lista, mais cedo abrimos por lá. Veja se a sua está aqui."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/pilotos` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${BASE}/pilotos`, type: "website" },
  twitter:   { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
}

/**
 * Contagem de leads das 14 cidades em UMA query.
 *
 * A landing de cidade usa `count()` por cidade, o que ali custa uma query. Aqui
 * seriam 14 — por isso o `groupBy`, que o índice `[state, cityNorm]` já cobre.
 *
 * Agrupa por `cityNorm` e não por `city`: o `mode: "insensitive"` do Postgres
 * ignora caixa mas NÃO acento, então "sao paulo" digitado à mão não bateria com
 * "São Paulo" e a contagem sairia menor que a real.
 */
const getCityCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    try {
      const rows = await prisma.founderLead.groupBy({
        by: ["state", "cityNorm"],
        where: { deletedAt: null },
        _count: { _all: true },
      })

      const out: Record<string, number> = {}
      for (const city of PILOT_CITIES) {
        const key = normalizePlace(city.name)
        const row = rows.find((r) => r.state === city.uf && r.cityNorm === key)
        out[city.slug] = row?._count._all ?? 0
      }
      return out
    } catch {
      // Banco fora do ar não pode derrubar a página que a campanha divulga —
      // sem número ela ainda cumpre o papel de levar para a landing da cidade.
      return {}
    }
  },
  ["pilot-city-counts"],
  { revalidate: 300, tags: ["founders"] },
)

/**
 * Limiar de exibição da contagem, o mesmo de ListaVIP e da landing de cidade.
 * "1 pessoa já está na lista" é prova social negativa — melhor não dizer nada.
 */
const MIN_COUNT_TO_SHOW = 10

export default async function PilotosPage() {
  const counts = await getCityCounts()

  // Ordena por volume e desempata pelo nome, para a ordem ser estável entre
  // renders quando ninguém tem lead ainda (que é o estado inicial da campanha).
  const cities = [...PILOT_CITIES].sort((a, b) => {
    const diff = (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0)
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "pt-BR")
  })

  // ItemList das landings de cidade — ajuda o Google a entender que esta página
  // é o índice delas, e não 14 páginas soltas.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    itemListElement: cities.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${c.name} (${c.uf})`,
      url: `${BASE}/pilotos/${c.slug}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <main>
        <section
          className="relative overflow-hidden bg-gradient-to-br from-primary to-navy-deep px-6 py-16"
          aria-labelledby="pilotos-title"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-brand/[0.12]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-[860px]">
            <div className="text-center">
              <div
                role="note"
                className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/20 px-3.5 py-1.5 text-xs font-semibold text-amber-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Pré-lançamento · Brasil
              </div>

              <h1
                id="pilotos-title"
                className="mb-3 font-display text-[26px] font-extrabold leading-snug text-white xl:text-[34px]"
              >
                Onde o Shareo vai abrir{" "}
                <span className="text-accent">primeiro</span>?
              </h1>

              <p className="mx-auto mb-10 max-w-[560px] text-[15px] leading-relaxed text-white/85">
                Quem decide são vocês. Quanto mais gente de uma cidade entra na lista,
                mais cedo abrimos por lá. Encontre a sua e garanta seu lugar.
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cities.map((city) => {
                const count = counts[city.slug] ?? 0
                return (
                  <li key={city.slug}>
                    <Link
                      href={`/pilotos/${city.slug}`}
                      className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/[0.12] bg-white/[0.07] px-4 py-3.5 transition-colors hover:border-white/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    >
                      <span>
                        <span className="block text-sm font-bold text-white">{city.name}</span>
                        <span className="block text-xs text-white/50">{city.uf}</span>
                      </span>

                      {count >= MIN_COUNT_TO_SHOW ? (
                        <span className="shrink-0 rounded-full bg-brand/30 px-2.5 py-1 text-xs font-semibold text-accent">
                          {count} na lista
                        </span>
                      ) : (
                        <svg
                          width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="shrink-0 text-white/40" aria-hidden="true"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/*
              Saída para quem não mora em nenhuma das 14. A landing principal
              aceita qualquer cidade via CEP — sem este link a pessoa concluiria
              que o Shareo não é para ela, e o lançamento é NACIONAL.
            */}
            <p className="mt-10 text-center text-sm text-white/60">
              Sua cidade não está na lista?{" "}
              <Link href="/" className="font-semibold text-accent underline decoration-accent/40 hover:decoration-accent">
                Entre na lista mesmo assim
              </Link>{" "}
              — é o CEP que nos diz onde abrir.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
