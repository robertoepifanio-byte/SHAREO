"use client"

import { useState } from "react"
import Link from "next/link"

// Valor estimado médio por categoria (R$)
const CATEGORY_DATA: Record<string, { name: string; avgRetailPrice: number; dailyRate: number }> = {
  ferramentas:  { name: "Ferramentas",       avgRetailPrice: 700,   dailyRate: 35  },
  eletronicos:  { name: "Eletrônicos",        avgRetailPrice: 2000,  dailyRate: 100 },
  "casa-jardim":{ name: "Casa & Cozinha",      avgRetailPrice: 600,   dailyRate: 30  },
  construcao:   { name: "Construção",         avgRetailPrice: 900,   dailyRate: 45  },
  esporte:      { name: "Esporte & Lazer",    avgRetailPrice: 1200,  dailyRate: 60  },
  moda:         { name: "Moda & Acessórios",  avgRetailPrice: 1000,  dailyRate: 50  },
  festas:       { name: "Festas & Eventos",   avgRetailPrice: 1600,  dailyRate: 80  },
  veiculos:     { name: "Veículos & Motos",   avgRetailPrice: 8000,  dailyRate: 150 },
  bebes:        { name: "Bebês & Crianças",   avgRetailPrice: 800,   dailyRate: 40  },
}

const DAYS_OPTIONS = [
  { label: "1 dia/sem",  value: 1 },
  { label: "2 dias/sem", value: 2 },
  { label: "3 dias/sem", value: 3 },
  { label: "5 dias/sem", value: 5 },
  { label: "7 dias/sem", value: 7 },
]

function fmt(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function EarningsCalc() {
  const [categorySlug, setCategorySlug] = useState("ferramentas")
  const [daysPerWeek, setDaysPerWeek]   = useState(2)
  const [customPrice, setCustomPrice]   = useState("")

  const cat       = CATEGORY_DATA[categorySlug]
  const dailyCents = customPrice
    ? Math.round(parseFloat(customPrice.replace(",", ".")) * 100)
    : cat.dailyRate * 100

  const weekly  = dailyCents * daysPerWeek
  const monthly = weekly * 4
  const yearly  = monthly * 12

  const returnVsRetail = cat.avgRetailPrice > 0
    ? Math.round((monthly / 100 / cat.avgRetailPrice) * 100)
    : 0

  return (
    <div className="space-y-6">

      {/* ── Inputs ── */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <h2 className="font-semibold text-primary">Personalize a simulação</h2>

        {/* Categoria */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="calc-category" className="text-sm font-medium text-foreground">
            Categoria do item
          </label>
          <select
            id="calc-category"
            value={categorySlug}
            onChange={(e) => { setCategorySlug(e.target.value); setCustomPrice("") }}
            className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
          >
            {Object.entries(CATEGORY_DATA).map(([slug, { name }]) => (
              <option key={slug} value={slug}>{name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Valor de mercado estimado: ~R$ {cat.avgRetailPrice.toLocaleString("pt-BR")} · Diária sugerida: R$ {cat.dailyRate.toFixed(2).replace(".", ",")}
          </p>
        </div>

        {/* Diária personalizada */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="calc-price" className="text-sm font-medium text-foreground">
            Diária que você quer cobrar
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground select-none">R$</span>
            <input
              id="calc-price"
              type="text"
              inputMode="decimal"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9,]/g, ""))}
              placeholder={cat.dailyRate.toFixed(2).replace(".", ",")}
              className="h-11 w-full rounded-md border border-input bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
        </div>

        {/* Dias por semana */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Disponibilidade estimada</span>
          <div className="flex flex-wrap gap-2">
            {DAYS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDaysPerWeek(opt.value)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  daysPerWeek === opt.value
                    ? "border-brand bg-brand text-white"
                    : "border-border text-muted-foreground hover:border-brand hover:text-brand",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resultado ── */}
      <div className="rounded-xl border border-brand/30 bg-brand/5 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand">Sua estimativa de ganhos</p>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-foreground">{fmt(weekly)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">por semana</p>
          </div>
          <div className="rounded-xl border border-brand/20 bg-brand/10 py-2">
            <p className="text-2xl font-extrabold text-brand">{fmt(monthly)}</p>
            <p className="mt-0.5 text-xs font-semibold text-brand">por mês</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-foreground">{fmt(yearly)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">por ano</p>
          </div>
        </div>

        {returnVsRetail > 0 && (
          <div className="mt-4 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-success">
              🎯 Em {Math.ceil(100 / returnVsRetail)} meses você recupera o valor do item!
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Retorno de ~{returnVsRetail}% do valor de compra por mês
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          * Estimativa baseada em {daysPerWeek} dia{daysPerWeek > 1 ? "s" : ""}/semana a {fmt(dailyCents)}/dia.
          Ganhos reais variam conforme demanda e disponibilidade.
        </p>
      </div>

      {/* ── CTA ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/itens/novo"
          className="flex-1 rounded-xl bg-brand py-3.5 text-center text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          Anunciar meu item
        </Link>
        <Link
          href="/itens"
          className="flex-1 rounded-xl border border-border py-3.5 text-center text-sm font-semibold text-foreground hover:bg-surface transition-colors"
        >
          Ver itens disponíveis
        </Link>
      </div>

      {/* ── Comparativo ── */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Compare: seu item parado vs. no ShareO</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-background p-3 text-center">
            <p className="text-2xl">😴</p>
            <p className="mt-1 font-semibold text-muted-foreground">Parado em casa</p>
            <p className="mt-0.5 text-xs text-muted-foreground">R$ 0,00/mês</p>
          </div>
          <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-center">
            <p className="text-2xl">🚀</p>
            <p className="mt-1 font-bold text-brand">No ShareO</p>
            <p className="mt-0.5 text-xs font-semibold text-brand">{fmt(monthly)}/mês</p>
          </div>
        </div>
      </div>

    </div>
  )
}
