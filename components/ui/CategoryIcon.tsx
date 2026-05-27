"use client"

/**
 * CategoryIcon — ícones circulares de categoria ShareO
 * Spec: Documento de Identidade Visual v1.0
 *
 * Círculo branco com borda #144D81 + ícone Lucide centralizado em #007B3C.
 * Tamanhos recomendados: 32 (lista) | 48 (menu mobile) | 64 (card) | 96 (hero)
 */

import {
  Home,
  Hammer,
  Smartphone,
  Dumbbell,
  Wrench,
  Gift,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react"

interface CategoryIconProps {
  name:       string
  size?:      number
  className?: string
}

const ICON_MAP: Record<string, LucideIcon> = {
  "Casa e Jardim": Home,
  "Construção":    Hammer,
  "Eletrônicos":   Smartphone,
  "Esporte":       Dumbbell,
  "Ferramentas":   Wrench,
  "Festas":        Gift,
  "Moda":          ShoppingBag,
}

export function CategoryIcon({ name, size = 64, className = "" }: CategoryIconProps) {
  const Icon = ICON_MAP[name]
  if (!Icon) return null

  const iconSize    = Math.round(size * 0.46)
  const borderWidth = size >= 64 ? 2 : 1.5

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full bg-white
        transition-transform duration-200 hover:scale-105 flex-shrink-0 ${className}`}
      style={{
        width:       size,
        height:      size,
        border:      `${borderWidth}px solid #144D81`,
        boxShadow:   size >= 64 ? "0 2px 8px rgba(0,51,102,0.10)" : undefined,
      }}
    >
      <Icon
        width={iconSize}
        height={iconSize}
        stroke="#007B3C"
        strokeWidth={1.75}
        fill="none"
      />
    </span>
  )
}
