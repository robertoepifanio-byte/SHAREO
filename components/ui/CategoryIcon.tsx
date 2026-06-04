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
 * Os PNGs já têm o círculo embutido — o componente não adiciona borda extra.
 */
const HAS_PNG = new Set<string>([
  "todas",
  "casa-jardim",
  "construcao",
  "eletronicos",
  "esporte",
  "ferramentas",
  "festas",
  "moda",
])

/* ── Mapeamentos ────────────────────────────────────────────────── */

const SLUG_MAP: Record<string, string> = {
  "Todos":         "todas",
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
  "Todos":         Home, // fallback — PNG sempre disponível
}

interface CategoryIconProps {
  name:        string
  size?:       number
  className?:  string
  /**
   * monochrome — quando true, aplica filtro grayscale nas imagens PNG e usa
   * currentColor nos ícones Lucide (cor controlada via Tailwind text-*).
   * Usado nos filtros de busca (/itens) conforme Guia de Identidade Visual.
   * Manter false (padrão) para a seção hero/categorias da homepage.
   */
  monochrome?: boolean
}

/* ── Componente ─────────────────────────────────────────────────── */

export function CategoryIcon({ name, size = 64, className = "", monochrome = false }: CategoryIconProps) {
  const slug      = SLUG_MAP[name]
  const Icon      = LUCIDE_MAP[name]
  const usePng    = slug && HAS_PNG.has(slug)

  if (!slug && !Icon) return null

  const borderWidth = size >= 64 ? 2 : 1.5
  const iconSize    = Math.round(size * 0.46)

  // PNGs já têm o círculo embutido — exibe direto sem container extra
  if (usePng && slug) {
    return (
      <span
        role="img"
        aria-label={name}
        className={`inline-flex flex-shrink-0
          transition-transform duration-200 hover:scale-105 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={`/icons/${slug}.png`}
          alt={name}
          width={size}
          height={size}
          className={`object-contain${monochrome ? " grayscale" : ""}`}
        />
      </span>
    )
  }

  // Fallback Lucide: círculo branco com borda #144D81
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full bg-white
        transition-transform duration-200 hover:scale-105 flex-shrink-0 ${className}`}
      style={{
        width:     size,
        height:    size,
        border:    `${borderWidth}px solid ${monochrome ? "#6B7280" : "#144D81"}`,
        boxShadow: size >= 64 ? "0 2px 8px rgba(0,51,102,0.10)" : undefined,
      }}
    >
      {Icon && (
        <Icon
          width={iconSize}
          height={iconSize}
          stroke={monochrome ? "currentColor" : "#007B3C"}
          strokeWidth={1.75}
          fill="none"
        />
      )}
    </span>
  )
}
