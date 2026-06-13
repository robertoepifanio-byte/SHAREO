"use client"

import { useState, useCallback, useId } from "react"
import Link from "next/link"

/* ── Tipos ─────────────────────────────────────────────────────────── */

export interface FaqEntry {
  q: string
  a: string
}

export interface HelpSection {
  id: string
  title: string
  icon: string
  color: string
  iconBg: string
  faqs: FaqEntry[]
}

interface HelpSearchProps {
  sections: HelpSection[]
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
}

function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text
  const normalTerm = normalize(term)
  const normalText = normalize(text)
  const idx = normalText.indexOf(normalTerm)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand/20 text-primary rounded-sm px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  )
}

/* ── Sub-componentes internos ──────────────────────────────────────── */

function FaqItem({
  q,
  a,
  open,
  term,
}: {
  q: string
  a: string
  open: boolean
  term: string
}) {
  return (
    <details
      className="group border-b border-border last:border-0"
      open={open || undefined}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-4 py-4 text-sm font-semibold text-primary hover:text-brand transition-colors">
        <span>{term ? highlight(q, term) : q}</span>
        <svg
          className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="pb-4 pr-8 text-sm leading-relaxed text-muted-foreground">
        {term ? highlight(a, term) : a}
      </div>
    </details>
  )
}

function SectionBlock({
  section,
  matchedFaqs,
  term,
}: {
  section: HelpSection
  matchedFaqs: FaqEntry[]
  term: string
}) {
  return (
    <section
      id={section.id}
      className={`rounded-2xl border p-6 scroll-mt-24 ${section.color}`}
    >
      <h2 className="mb-6 font-display flex items-center gap-3 text-xl font-bold text-primary">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${section.iconBg}`}
        >
          {section.icon}
        </span>
        {section.title}
      </h2>
      <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
        {matchedFaqs.map((faq) => (
          <FaqItem
            key={faq.q}
            q={faq.q}
            a={faq.a}
            open={!!term}
            term={term}
          />
        ))}
      </div>
    </section>
  )
}

/* ── Componente principal ──────────────────────────────────────────── */

export function HelpSearch({ sections }: HelpSearchProps) {
  const [query, setQuery] = useState("")
  const inputId = useId()

  const trimmed = query.trim()

  // Filtra seções e FAQs — memo inline é suficiente para 21 itens
  type FilteredSection = { section: HelpSection; faqs: FaqEntry[] }

  const filtered: FilteredSection[] = trimmed
    ? sections
        .map((section) => ({
          section,
          faqs: section.faqs.filter((faq) => {
            const n = normalize(trimmed)
            return normalize(faq.q).includes(n) || normalize(faq.a).includes(n)
          }),
        }))
        .filter(({ faqs }) => faqs.length > 0)
    : sections.map((section) => ({ section, faqs: section.faqs }))

  const totalMatches = filtered.reduce((acc, { faqs }) => acc + faqs.length, 0)
  const hasResults = filtered.length > 0

  const handleClear = useCallback(() => {
    setQuery("")
  }, [])

  return (
    <>
      {/* ── Campo de busca — faixa sobre fundo branco abaixo do hero ── */}
      <div className="border-b border-border bg-surface px-4 py-5 shadow-sm">
        <div className="relative mx-auto w-full max-w-lg">
          <label htmlFor={inputId} className="sr-only">
            Pesquisar na Central de Ajuda
          </label>

          {/* Ícone de lupa */}
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar na ajuda... Ex: cancelar, pagamento, caução"
            autoComplete="off"
            spellCheck={false}
            aria-label="Pesquisar perguntas frequentes"
            aria-controls="faq-results"
            className={[
              "h-12 w-full rounded-xl border border-input bg-background",
              "pl-12 pr-12 text-sm text-foreground placeholder:text-muted-foreground",
              "outline-none transition-colors duration-fast",
              "focus:border-ring focus:ring-2 focus:ring-ring/20",
              // Remove o ícone nativo de limpar do input[type=search] em WebKit
              "[&::-webkit-search-cancel-button]:hidden",
            ].join(" ")}
          />

          {/* Botão de limpar — só aparece quando há texto */}
          {trimmed && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar busca"
              className={[
                "absolute right-3 top-1/2 -translate-y-1/2",
                "flex h-7 w-7 items-center justify-center rounded-full",
                "bg-border text-muted-foreground hover:bg-input hover:text-foreground transition-colors",
                "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none",
              ].join(" ")}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Contagem de resultados — accessível por aria-live */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {trimmed && hasResults
            ? `${totalMatches} pergunta${totalMatches !== 1 ? "s" : ""} encontrada${totalMatches !== 1 ? "s" : ""} para "${trimmed}"`
            : trimmed && !hasResults
            ? `Nenhuma pergunta encontrada para "${trimmed}"`
            : "Mostrando todas as perguntas frequentes"}
        </div>
      </div>

      {/* ── FAQs filtradas ── */}
      <div
        id="faq-results"
        className="container mx-auto max-w-3xl px-4 py-12 space-y-10"
      >
        {hasResults ? (
          <>
            {/* Indicador visual de resultado quando há busca ativa */}
            {trimmed && (
              <p
                className="text-sm text-muted-foreground"
                aria-hidden="true"
              >
                <span className="font-semibold text-primary">{totalMatches}</span>{" "}
                pergunta{totalMatches !== 1 ? "s" : ""} encontrada{totalMatches !== 1 ? "s" : ""} para{" "}
                <span className="font-semibold text-primary">&ldquo;{trimmed}&rdquo;</span>
              </p>
            )}

            {filtered.map(({ section, faqs }) => (
              <SectionBlock
                key={section.id}
                section={section}
                matchedFaqs={faqs}
                term={trimmed}
              />
            ))}
          </>
        ) : (
          /* Estado vazio */
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <div className="mb-4 text-5xl" aria-hidden="true">
              🔍
            </div>
            <p className="mb-1 text-base font-semibold text-primary">
              Nenhuma pergunta encontrada para{" "}
              <span className="text-brand">&ldquo;{trimmed}&rdquo;</span>
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Tente palavras diferentes ou veja todas as perguntas.
            </p>
            <button
              type="button"
              onClick={handleClear}
              className={[
                "inline-flex h-11 items-center gap-2 rounded-lg",
                "bg-brand px-6 text-sm font-bold text-white",
                "hover:bg-brand-hover transition-colors",
                "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none",
              ].join(" ")}
            >
              Ver todas as perguntas
            </button>
          </div>
        )}

        {/* Seção de contato — sempre visível */}
        <section
          id="contato"
          className="rounded-2xl bg-primary p-8 text-center text-white"
        >
          <div className="mb-3 text-4xl" aria-hidden="true">
            💬
          </div>
          <h2 className="mb-2 font-display text-xl font-bold">
            Ainda precisa de ajuda?
          </h2>
          <p className="mb-6 text-sm text-white/75">
            Nossa equipe está disponível 7 dias por semana para te ajudar.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:suporte@shareo.com.br"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-6 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              ✉️ suporte@shareo.com.br
            </a>
            <Link
              href="/reservas"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              📋 Ver minhas reservas
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/80">
            Para problemas com uma reserva ativa, use a opção &ldquo;Abrir
            disputa&rdquo; na página da reserva — é mais rápido.
          </p>
        </section>
      </div>
    </>
  )
}
