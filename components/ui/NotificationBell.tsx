"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

type Notif = {
  id:        string
  type:      string
  title:     string
  body:      string
  data:      Record<string, string> | null
  readAt:    string | null
  createdAt: string
}

function getLink(n: Notif): string {
  const d = n.data
  if (n.type === "NEW_MESSAGE"  && d?.conversationId) return `/mensagens/${d.conversationId}`
  if (n.type === "NEW_REVIEW")                        return "/perfil"
  if (n.type === "ITEM_APPROVED" || n.type === "ITEM_REJECTED") return "/meus-anuncios"
  if (d?.bookingId)                                   return `/reservas/${d.bookingId}`
  return "/dashboard"
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return "agora"
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

export function NotificationBell() {
  const [notifs,      setNotifs]      = useState<Notif[]>([])
  const [open,        setOpen]        = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const [mounted,     setMounted]     = useState(false)

  const buttonRef   = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unread = notifs.filter((n) => !n.readAt).length

  const fetch_ = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      setNotifs(json.data ?? [])
    } catch {}
  }

  useEffect(() => {
    setMounted(true)
    fetch_()
    const id = setInterval(fetch_, 30_000)
    return () => clearInterval(id)
  }, [])

  // Fecha ao clicar fora (botão OU dropdown portal)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inButton   = buttonRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inButton && !inDropdown) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function toggleOpen() {
    const next = !open
    if (next && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(next)
    if (next) fetch_()
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" })
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  const dropdown = (
    <div
      ref={dropdownRef}
      className="fixed w-80 rounded-xl border border-border bg-surface shadow-xl z-[9999]"
      style={{ top: dropdownPos.top, right: dropdownPos.right }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Notificações</span>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-brand hover:underline outline-none focus-visible:underline"
          >
            Marcar tudo como lido
          </button>
        )}
      </div>

      <ul className="max-h-80 overflow-y-auto divide-y divide-border">
        {notifs.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Sem notificações
          </li>
        ) : (
          notifs.map((n) => (
            <li key={n.id}>
              <Link
                href={getLink(n)}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!n.readAt ? "bg-brand/5" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.readAt ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-label="Notificações"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {/* Bell icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Portal: renderiza fora do stacking context do header */}
      {open && mounted && createPortal(dropdown, document.body)}
    </div>
  )
}
