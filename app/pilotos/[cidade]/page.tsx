import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { PILOT_CITIES, getPilotCity } from "@/lib/pilot-cities"
import { normalizePlace } from "@/lib/geo/normalize-place"
import { FounderCaptureForm } from "@/components/home/FounderCaptureForm"

// ISR: as landings mudam pouco; revalida a cada hora.
export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shareo-rouge.vercel.app"

export function generateStaticParams() {
  return PILOT_CITIES.map((c) => ({ cidade: c.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ cidade: string }> },
): Promise<Metadata> {
  const { cidade } = await params
  const city = getPilotCity(cidade)
  if (!city) return { title: "Cidade não encontrada — Shareo" }

  const title = `Shareo está chegando em ${city.name} (${city.uf}) — entre na lista`
  const description = `Ganhe renda com o que está parado em casa ou alugue o que precisa de quem é perto de você em ${city.name}. Quanto mais gente de ${city.name} entrar, mais cedo o Shareo abre aí.`
  const url = `${BASE}/pilotos/${city.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter:   { card: "summary_large_image", title, description },
  }
}

// Contagem por cidade — social proof local. Cacheada e invalidada pela tag "founders".
//
// Casa por `cityNorm` e não por `city: { equals, mode: "insensitive" }`: o
// insensitive do Postgres ignora CAIXA, mas não ACENTO — "sao paulo" digitado à
// mão não batia com "São Paulo" e a contagem saía menor do que a real. `cityNorm`
// é a chave dobrada gravada em write time (ver lib/geo/normalize-place.ts).
function getCityCount(name: string, uf: string) {
  const key = normalizePlace(name)
  return unstable_cache(
    async () => {
      try {
        return await prisma.founderLead.count({
          where: { deletedAt: null, state: uf, cityNorm: key },
        })
      } catch {
        return 0
      }
    },
    ["founder-count", uf, key ?? ""],
    { revalidate: 300, tags: ["founders"] },
  )()
}

export default async function PilotoCidadePage(
  { params }: { params: Promise<{ cidade: string }> },
) {
  const { cidade } = await params
  const city = getPilotCity(cidade)
  if (!city) notFound()

  const count = await getCityCount(city.name, city.uf)
  const campaign = `piloto-${city.slug}`

  return (
    <main>
      <section
        className="relative overflow-hidden bg-gradient-to-br from-primary to-navy-deep px-6 py-16 text-center"
        aria-labelledby="piloto-title"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-brand/[0.12]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-[680px]">
          <div
            role="note"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/20 px-3.5 py-1.5 text-xs font-semibold text-amber-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Pré-lançamento · {city.name}/{city.uf}
          </div>

          <h1
            id="piloto-title"
            className="mb-3 font-display text-[26px] font-extrabold leading-snug text-white xl:text-[34px]"
          >
            O Shareo está chegando em{" "}
            <span className="text-accent">{city.name}</span>.
          </h1>

          <p className="mx-auto mb-8 max-w-[520px] text-[15px] leading-relaxed text-white/85">
            Transforme o que está parado em casa em renda — ou alugue o que precisa de
            quem é perto de você. Quanto mais gente de {city.name} entrar, mais cedo
            abrimos por aqui.
          </p>

          <FounderCaptureForm
            defaultCity={city.name}
            defaultUf={city.uf}
            campaign={campaign}
            startExpanded
          />

          {count >= 10 ? (
            <p className="mt-4 text-[13px] text-white/55">
              <strong className="text-white/85">{count} pessoas de {city.name}</strong>{" "}
              já estão na lista
            </p>
          ) : (
            <p className="mt-4 text-[13px] text-white/55">
              Seja um dos primeiros fundadores do Shareo em {city.name}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
