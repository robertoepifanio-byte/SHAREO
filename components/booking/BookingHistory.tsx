"use client"

/**
 * BookingHistory — histórico cronológico dos eventos de uma locação.
 *
 * Renderizado como Client Component para suportar o toggle expand/collapse
 * sem recarregar a página. Recebe os eventos já derivados via prop
 * (o Server Component pai busca no banco e passa aqui).
 *
 * UX: estilo rastreamento de pedido — lista vertical com linha conectora,
 * mais recente primeiro. O evento mais recente fica destacado (text-brand).
 * Botão "Ver histórico ⌄ / Ocultar histórico ⌃" com aria-expanded.
 */

import { useState } from "react"
import type { BookingHistoryEvent } from "@/lib/bookingHistory"

interface Props {
  events: SerializedBookingHistoryEvent[]
}

/** Versão serializada (datas como string ISO) — necessária para passar de Server → Client Component */
export interface SerializedBookingHistoryEvent {
  key:       string
  at:        string  // ISO string — serializado no Server Component antes de passar aqui
  label:     string
  actor:     string | null
  actorRole: BookingHistoryEvent["actorRole"]
}

const ACTOR_ROLE_ICON: Record<BookingHistoryEvent["actorRole"], string> = {
  borrower: "👤",
  owner:    "🏠",
  system:   "⚙️",
}

function fmtEventDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day:      "2-digit",
    month:    "long",
    year:     "numeric",
    hour:     "2-digit",
    minute:   "2-digit",
    timeZone: "America/Fortaleza",
  }).format(new Date(iso))
}

export function BookingHistory({ events }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (events.length === 0) return null

  // Mais recente primeiro
  const sorted = [...events].reverse()
  const latest  = sorted[0]

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface">
      {/* Botão de toggle — mínimo 44px de altura para tap target mobile */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="booking-history-list"
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <div className="flex items-center gap-2">
          {/* Ícone de timeline */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-brand"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-sm font-semibold text-foreground">
            Histórico da locação
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            ({events.length} evento{events.length !== 1 ? "s" : ""})
          </span>
        </div>
        {/* Chevron animado */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Preview do evento mais recente — visível mesmo com o painel recolhido */}
      {!expanded && latest && (
        <div className="border-t border-border px-4 pb-3 pt-2">
          <p className="text-xs text-muted-foreground">Último evento</p>
          <p className="mt-0.5 text-sm font-medium text-brand">{latest.label}</p>
          <p className="text-xs text-muted-foreground">{fmtEventDateTime(latest.at)}</p>
        </div>
      )}

      {/* Lista expandida */}
      {expanded && (
        <div
          id="booking-history-list"
          role="list"
          aria-label="Histórico de eventos da locação"
          aria-live="polite"
          className="border-t border-border px-4 pb-4 pt-3"
        >
          <ol className="relative space-y-0">
            {sorted.map((event, idx) => {
              const isFirst = idx === 0
              const isLast  = idx === sorted.length - 1

              return (
                <li
                  key={event.key}
                  role="listitem"
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  {/* Linha conectora vertical — não renderiza no último item */}
                  {!isLast && (
                    <div
                      className="absolute left-[11px] top-6 bottom-0 w-px bg-border"
                      aria-hidden="true"
                    />
                  )}

                  {/* Dot indicador */}
                  <div
                    className={[
                      "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                      isFirst
                        ? "bg-brand text-white shadow-sm ring-2 ring-brand/20"
                        : "bg-surface border border-border text-muted-foreground",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {isFirst ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-border" />
                    )}
                  </div>

                  {/* Conteúdo do evento */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p
                      className={[
                        "text-sm font-semibold leading-tight",
                        isFirst ? "text-brand" : "text-foreground",
                      ].join(" ")}
                    >
                      {event.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtEventDateTime(event.at)}
                    </p>
                    {event.actor && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span aria-hidden="true">{ACTOR_ROLE_ICON[event.actorRole]}</span>
                        <span>{event.actor}</span>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
