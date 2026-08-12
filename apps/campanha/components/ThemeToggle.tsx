"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Monitor, Moon } from "lucide-react"

const OPTIONS = [
  { value: "light",  label: "Tema claro",    Icon: Sun },
  { value: "system", label: "Tema do sistema", Icon: Monitor },
  { value: "dark",   label: "Tema escuro",   Icon: Moon },
] as const

interface ThemeToggleProps {
  variant?: "header" | "menu"
}

export function ThemeToggle({ variant = "header" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes só é confiável após montar no cliente — evita mismatch de hidratação
  useEffect(() => { setMounted(true) }, [])

  if (variant === "header") {
    return (
      <div
        role="group"
        aria-label="Selecionar tema"
        className="hidden md:flex items-center rounded-lg border border-white/30 overflow-hidden"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const isActive = mounted && theme === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-label={label}
              aria-pressed={isActive}
              className={[
                "flex h-11 w-11 items-center justify-center transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white/90",
              ].join(" ")}
            >
              <Icon size={15} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    )
  }

  // variant === "menu"
  return (
    <div
      role="group"
      aria-label="Selecionar tema"
      className="flex w-full items-center rounded-lg border border-white/20 overflow-hidden"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={isActive}
            className={[
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[44px] transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset",
              isActive
                ? "bg-white/15 text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white/90",
            ].join(" ")}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none">
              {value === "light" ? "Claro" : value === "system" ? "Sistema" : "Escuro"}
            </span>
          </button>
        )
      })}
    </div>
  )
}
