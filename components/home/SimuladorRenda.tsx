"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface SimuladorItem {
  keywords: string[]    // palavras-chave para match (lowercase)
  label: string         // nome exibido no output
  rangeMin: number
  rangeMax: number
  demand: "alta" | "media"
}

// ─── Dados (fora do componente — constante de módulo) ───────────────────────

const DEFAULT_DATA: SimuladorItem[] = [
  { keywords: ["furadeira", "furar", "broca"],                          label: "Furadeira",               rangeMin: 90,  rangeMax: 150, demand: "alta"  },
  { keywords: ["projetor", "projeção"],                                  label: "Projetor",                rangeMin: 200, rangeMax: 350, demand: "alta"  },
  { keywords: ["caixa de som", "som", "jbl"],                           label: "Caixa de Som",            rangeMin: 250, rangeMax: 420, demand: "alta"  },
  { keywords: ["barraca", "camping", "tenda"],                          label: "Barraca de Camping",      rangeMin: 120, rangeMax: 240, demand: "media" },
  { keywords: ["lava estofados", "lavadora de estofados", "extratora"], label: "Lavadora de Estofados",   rangeMin: 350, rangeMax: 550, demand: "alta"  },
  { keywords: ["escada"],                                                label: "Escada",                  rangeMin: 80,  rangeMax: 160, demand: "alta"  },
  { keywords: ["bicicleta", "bike"],                                     label: "Bicicleta",               rangeMin: 150, rangeMax: 300, demand: "alta"  },
]

// Chips de sugestão (subconjunto dos dados para exibição rápida)
const CHIPS = ["Furadeira", "Projetor", "Caixa de Som", "Barraca", "Lava Estofados"]

// Mapa de chip label → keyword principal para preenchimento do input
const CHIP_KEYWORD_MAP: Record<string, string> = {
  "Furadeira":      "furadeira",
  "Projetor":       "projetor",
  "Caixa de Som":   "caixa de som",
  "Barraca":        "barraca",
  "Lava Estofados": "lava estofados",
}

// ─── Lógica de match ────────────────────────────────────────────────────────

function simularRenda(query: string, data: SimuladorItem[]): SimuladorItem | null {
  const q = query.toLowerCase().trim()
  if (!q) return null
  return (
    data.find((item) =>
      item.keywords.some((kw) => q.includes(kw) || kw.includes(q))
    ) ?? null
  )
}

// ─── Tabela de itens estáticos para coluna esquerda ─────────────────────────

const TABLE_ROWS = [
  { emoji: "🔧", name: "Furadeira",             range: "R$ 90 a R$ 150",  highlight: false },
  { emoji: "🔊", name: "Caixa de Som",           range: "R$ 250 a R$ 420", highlight: false },
  { emoji: "⛺", name: "Barraca de Camping",     range: "R$ 120 a R$ 240", highlight: false },
  { emoji: "🧽", name: "Máquina Lava Estofados", range: "R$ 350 a R$ 550", highlight: false },
  { emoji: "📽️", name: "Projetor",               range: "R$ 200 a R$ 350", highlight: true  },
] as const

// ─── Componente ─────────────────────────────────────────────────────────────

export function SimuladorRenda({ data = DEFAULT_DATA }: { data?: SimuladorItem[] }) {
  const [query, setQuery]           = useState("")
  const [activeChip, setActiveChip] = useState<string | null>(null)

  const result = useMemo(() => simularRenda(query, data), [query, data])

  return (
    <section
      id="simulador-renda"
      className="bg-white px-4 py-8 xl:px-6 xl:py-12"
      aria-labelledby="simulador-section-title"
    >
      <div className="mx-auto max-w-[800px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2
            id="simulador-section-title"
            className="mb-2 font-display text-[22px] font-bold text-primary xl:text-[28px]"
          >
            Quanto seus itens podem render?
          </h2>
          <p className="text-[15px] text-muted-foreground">
            Descubra o potencial de renda de itens que você já tem em casa.
          </p>
        </div>

        {/* Layout 2 colunas */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start xl:gap-8">

          {/* ── Coluna esquerda: tabela ── */}
          <div role="region" aria-labelledby="tabela-renda-title">
            <h3
              id="tabela-renda-title"
              className="mb-4 font-display text-base font-bold text-primary"
            >
              Estimativa por item
            </h3>
            <table
              className="w-full border-collapse text-sm"
              aria-label="Tabela de renda mensal estimada por item"
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="border-b-2 border-border pb-2.5 text-left text-[11px] font-bold uppercase tracking-[0.5px] text-muted-foreground"
                  >
                    Item
                  </th>
                  <th
                    scope="col"
                    className="border-b-2 border-border pb-2.5 text-right text-[11px] font-bold uppercase tracking-[0.5px] text-muted-foreground"
                  >
                    Renda Mensal Estimada
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr
                    key={row.name}
                    className={`border-b border-border hover:bg-surface-muted ${row.highlight ? "bg-[#F0FBF5]" : ""}`}
                  >
                    <td className="px-1 py-3 font-medium text-foreground">
                      <span aria-hidden="true">{row.emoji}</span> {row.name}
                    </td>
                    <td className="px-1 py-3 text-right text-sm font-extrabold text-brand">
                      {row.range}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p
              className="mt-3 text-[11px] leading-relaxed text-muted-foreground"
              role="note"
            >
              * Estimativa baseada em média de 3–4 locações/mês. Resultados variam conforme demanda local.
            </p>
          </div>

          {/* ── Coluna direita: simulador interativo ── */}
          <div role="region" aria-labelledby="simulador-title">
            <h3
              id="simulador-title"
              className="mb-4 font-display text-base font-bold text-primary"
            >
              Descubra quanto você pode ganhar
            </h3>

            {/* Input */}
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveChip(null)
                }}
                placeholder="Ex: Furadeira, Projetor, Caixa de Som..."
                autoComplete="off"
                className="w-full rounded-lg border-[1.5px] border-border py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                aria-label="Digite o nome do item que você quer anunciar"
              />
            </div>

            {/* Chips */}
            <div
              role="group"
              aria-label="Sugestões de itens"
              className="mt-3 flex flex-wrap gap-2"
            >
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setActiveChip(chip)
                    setQuery(CHIP_KEYWORD_MAP[chip] ?? chip.toLowerCase())
                  }}
                  className={`min-h-tap min-w-tap rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-medium transition-all ${
                    activeChip === chip
                      ? "border-brand bg-[#F0FBF5] text-brand"
                      : "border-border bg-white text-foreground hover:border-brand hover:bg-[#F0FBF5] hover:text-brand"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Output — aria-live para screen readers */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-4"
            >
              {result ? (
                <div className="rounded-xl border-[1.5px] border-sim-border bg-gradient-to-br from-[#F0FBF5] to-[#E8F5EE] p-5 text-center">
                  <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
                    Potencial de renda:
                  </p>
                  <p className="mb-1.5 font-display text-[28px] font-extrabold text-brand">
                    R$ {result.rangeMin} a R$ {result.rangeMax}
                    <span className="text-[14px]">/mês</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {result.label} · Demanda{" "}
                    <span
                      className={
                        result.demand === "alta"
                          ? "font-semibold text-brand"
                          : "font-semibold text-[#92400E]"
                      }
                    >
                      {result.demand === "alta" ? "alta" : "moderada"}
                    </span>{" "}
                    na região
                  </p>
                </div>
              ) : query.trim() && !result ? (
                <div className="rounded-xl border border-border bg-surface-muted p-5 text-center text-[13px] text-muted-foreground">
                  Não temos dados para esse item ainda — mas você pode anunciá-lo!
                </div>
              ) : (
                <div className="py-6 text-center text-[13px] text-muted-foreground">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-2.5 text-border"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3" />
                  </svg>
                  Selecione um item acima ou digite o nome
                </div>
              )}
            </div>

            {/* CTA */}
            <Link
              href="/itens/novo"
              className="mt-5 inline-flex min-h-tap w-full items-center justify-center rounded-lg bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.4px] text-white transition-colors hover:bg-brand-hover"
              aria-label="Cadastrar item para anunciar"
            >
              Cadastrar meu item agora
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
