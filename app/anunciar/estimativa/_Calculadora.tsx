"use client"

import { useState } from "react"
import Link from "next/link"

const CATEGORIAS = [
  { slug: "ferramentas", label: "Ferramentas",     icon: "🔧", diaria: 35,  exemplos: "furadeira, serra, esmeril" },
  { slug: "eletronicos", label: "Eletrônicos",     icon: "📷", diaria: 100, exemplos: "câmera, projetor, drone" },
  { slug: "esporte",     label: "Esporte",         icon: "🚴", diaria: 60,  exemplos: "bicicleta, barraca, SUP" },
  { slug: "festas",      label: "Festas",          icon: "🎉", diaria: 80,  exemplos: "som, tendas, mesas" },
  { slug: "construcao",  label: "Construção",      icon: "🏗️", diaria: 45,  exemplos: "escada, betoneira, andaime" },
  { slug: "moda",        label: "Moda",            icon: "👗", diaria: 50,  exemplos: "roupa de festa, fantasia" },
  { slug: "casa-jardim", label: "Casa e Cozinha",  icon: "🏠", diaria: 30,  exemplos: "eletrodomésticos, jardim" },
]

const DIAS_MES = [2, 4, 6, 8, 10, 15, 20]

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export function Calculadora() {
  const [catSlug,  setCatSlug]  = useState("ferramentas")
  const [diasMes,  setDiasMes]  = useState(6)
  const [preco,    setPreco]    = useState<number | "">("")

  const cat = CATEGORIAS.find(c => c.slug === catSlug)!

  // Preço da diária: usa valor informado ou sugestão da categoria
  const diaria = typeof preco === "number" && preco > 0 ? preco : cat.diaria

  const ganhoMes     = diaria * diasMes
  const ganhoAno     = ganhoMes * 12
  const taxaPlat     = ganhoMes * 0.10   // 10% plataforma
  const ganhoLiquido = ganhoMes - taxaPlat

  return (
    <div className="space-y-8">

      {/* ── STEP 1: Categoria ── */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">
          1. Qual é a categoria do seu item?
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CATEGORIAS.map(c => (
            <button
              key={c.slug}
              onClick={() => { setCatSlug(c.slug); setPreco("") }}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                catSlug === c.slug
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-border bg-white text-foreground hover:border-brand/40"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="leading-tight text-center">{c.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ex: {cat.exemplos}
        </p>
      </section>

      {/* ── STEP 2: Preço por diária ── */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">
          2. Qual será o preço por diária?
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Sugestão para {cat.label}: <strong className="text-foreground">{fmt(cat.diaria)}/dia</strong>
        </p>
        <div className="flex items-center gap-3 max-w-xs">
          <span className="text-sm font-medium text-muted-foreground">R$</span>
          <input
            type="number"
            min={1}
            max={9999}
            placeholder={String(cat.diaria)}
            value={preco}
            onChange={e => setPreco(e.target.value === "" ? "" : Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">/dia</span>
        </div>
      </section>

      {/* ── STEP 3: Dias por mês ── */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">
          3. Quantos dias por mês pretende alugar?
        </h2>
        <div className="flex flex-wrap gap-2">
          {DIAS_MES.map(d => (
            <button
              key={d}
              onClick={() => setDiasMes(d)}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                diasMes === d
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-white text-foreground hover:border-brand/40"
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </section>

      {/* ── RESULTADO ── */}
      <section className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-6">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Sua estimativa de ganhos
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Por mês */}
          <div className="rounded-xl bg-white border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Por mês</p>
            <p className="text-2xl font-bold text-brand">{fmt(ganhoMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{diasMes} dias × {fmt(diaria)}</p>
          </div>

          {/* Líquido (após taxa) */}
          <div className="rounded-xl bg-brand border border-brand p-4 text-center">
            <p className="text-xs text-white/80 mb-1">Você recebe</p>
            <p className="text-2xl font-bold text-white">{fmt(ganhoLiquido)}</p>
            <p className="text-xs text-white/70 mt-1">após taxa de 10%</p>
          </div>

          {/* Por ano */}
          <div className="rounded-xl bg-white border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Projeção anual</p>
            <p className="text-2xl font-bold text-foreground">{fmt(ganhoAno)}</p>
            <p className="text-xs text-muted-foreground mt-1">se mantiver o ritmo</p>
          </div>
        </div>

        {/* Detalhamento */}
        <div className="rounded-lg bg-white border border-border divide-y divide-border text-sm mb-6">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Diária</span>
            <span className="font-medium">{fmt(diaria)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Dias alugados/mês</span>
            <span className="font-medium">{diasMes}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Receita bruta</span>
            <span className="font-medium">{fmt(ganhoMes)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Taxa da plataforma (10%)</span>
            <span className="font-medium text-destructive">− {fmt(taxaPlat)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 font-semibold">
            <span>Você recebe</span>
            <span className="text-brand">{fmt(ganhoLiquido)}</span>
          </div>
        </div>

        <Link
          href="/itens/novo"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          📦 Cadastrar meu item agora
        </Link>
      </section>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        Estimativa baseada em dados médios do mercado de aluguel colaborativo no Brasil (2026).
        Os ganhos reais dependem da demanda, localização e qualidade do anúncio.
      </p>
    </div>
  )
}
