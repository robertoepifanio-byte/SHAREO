"use client"

import { useEffect, useRef, useState } from "react"

const PLACEHOLDERS = [
  "O que você precisa alugar?",
  "O que você tem para alugar?",
]

export function HeroSearch() {
  const [idx, setIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIdx((prev) => (prev + 1) % PLACEHOLDERS.length)
    }, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function handleFocus() {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  return (
    <form
      action="/itens"
      method="GET"
      role="search"
      className="mx-auto flex w-full max-w-[520px] items-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-muted-foreground"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <label htmlFor="hero-search" className="sr-only">
        Buscar item para alugar ou anunciar
      </label>
      <input
        ref={inputRef}
        id="hero-search"
        name="search"
        type="text"
        placeholder={PLACEHOLDERS[idx]}
        autoComplete="off"
        onFocus={handleFocus}
        className="min-h-tap flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        aria-label="Buscar item para alugar ou anunciar"
      />
      <button
        type="submit"
        className="min-h-tap min-w-tap rounded-lg bg-brand px-4 py-2 text-sm font-semibold uppercase text-white hover:bg-brand-hover"
        aria-label="Buscar"
      >
        Buscar
      </button>
    </form>
  )
}
