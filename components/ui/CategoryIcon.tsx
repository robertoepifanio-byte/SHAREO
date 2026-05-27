"use client"

/**
 * CategoryIcon — ícones de categoria ShareO
 * Spec: Documento de Identidade Visual v1.0
 *
 * Usa imagens PNG em /public/icons/[slug].png quando disponíveis.
 * Fallback automático para ícones Lucide se o PNG não existir.
 *
 * Para ativar um PNG, adicione o slug ao conjunto HAS_PNG abaixo
 * após colocar o arquivo em public/icons/.
 *
 * Nomenclatura esperada:
 *   public/icons/casa-jardim.png  | public/icons/construcao.png
 *   public/icons/eletronicos.png  | public/icons/esporte.png
 *   public/icons/ferramentas.png  | public/icons/festas.png
 *   public/icons/moda.png
 *
 * Tamanho recomendado: 256×256px, fundo transparente.
 * Tamanhos de exibição: 32 (lista) | 48 (menu) | 64 (card) | 96 (hero)
 */

import Image from "next/image"
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

/**
 * ✏️  Adicione o slug aqui quando colocar o PNG em /public/icons/.
 * Exemplo: new Set(["casa-jardim", "construcao"])
 */
const HAS_PNG = new Set<string>([
  // "casa-jardim",
  // "construcao",
  // "eletronicos",
  // "esporte",
  // "ferramentas",
  // "festas",
  // "moda",
])

/* ── Mapeamentos ────────────────────────────────────────────────── */

const SLUG_MAP: Record<string, string> = {
  "Casa e Jardim": "casa-jardim",
  "Construção":    "construcao",
  "Eletrônicos":   "eletronicos",
  "Esporte":       "esporte",
  "Ferramentas":   "ferramentas",
  "Festas":        "festas",
  "Moda":          "moda",
}

const LUCIDE_MAP: Record<string, LucideIcon> = {
  "Casa e Jardim": Home,
  "Construção":    Hammer,
  "Eletrônicos":   Smartphone,
  "Esporte":       Dumbbell,
  "Ferramentas":   Wrench,
  "Festas":        Gift,
  "Moda":          ShoppingBag,
}

interface CategoryIconProps {
  name:       string
  size?:      number
  className?: string
}

/* ── Componente ─────────────────────────────────────────────────── */

export function CategoryIcon({ name, size = 64, className = "" }: CategoryIconProps) {
  const slug      = SLUG_MAP[name]
  const Icon      = LUCIDE_MAP[name]
  const usePng    = slug && HAS_PNG.has(slug)

  if (!slug && !Icon) return null

  const borderWidth = size >= 64 ? 2 : 1.5
  const iconSize    = Math.round(size * 0.46)
  const imgPad      = Math.round(size * 0.12)

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full bg-white
        transition-transform duration-200 hover:scale-105 flex-shrink-0 ${className}`}
      style={{
        width:     size,
        height:    size,
        border:    `${borderWidth}px solid #144D81`,
        boxShadow: size >= 64 ? "0 2px 8px rgba(0,51,102,0.10)" : undefined,
      }}
    >
      {usePng && slug ? (
        <Image
          src={`/icons/${slug}.png`}
          alt={name}
          width={size - imgPad * 2}
          height={size - imgPad * 2}
          className="object-contain"
        />
      ) : Icon ? (
        <Icon
          width={iconSize}
          height={iconSize}
          stroke="#007B3C"
          strokeWidth={1.75}
          fill="none"
        />
      ) : null}
    </span>
  )
}
