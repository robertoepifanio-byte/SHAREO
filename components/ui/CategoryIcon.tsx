// ARQ-Mi-01: Server Component — sem hooks/estado/eventos; "use client" removido.
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
  Refrigerator,
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

/** slug → ícone Lucide (fallback quando não há PNG). Resolução primária por slug. */
const LUCIDE_BY_SLUG: Record<string, LucideIcon> = {
  "todas":       Home,
  "casa-jardim": Refrigerator,
  "construcao":  Hammer,
  "eletronicos": Smartphone,
  "esporte":     Dumbbell,
  "ferramentas": Wrench,
  "festas":      Gift,
  "moda":        ShoppingBag,
}

/**
 * Compatibilidade para chamadas que só têm o nome de exibição (ex.: "Todos").
 * Prefira passar `slug`: assim renomear o rótulo da categoria nunca quebra o ícone.
 */
const SLUG_BY_NAME: Record<string, string> = {
  "Todos":            "todas",
  "Todas":            "todas",
  "Eletrodomésticos": "casa-jardim",
  "Construção":       "construcao",
  "Eletrônicos":      "eletronicos",
  "Esporte":          "esporte",
  "Ferramentas":      "ferramentas",
  "Festas":           "festas",
  "Moda":             "moda",
}

interface CategoryIconProps {
  name:        string
  /**
   * slug da categoria (ex.: "casa-jardim"). Quando presente, resolve o ícone
   * por slug — independente do rótulo exibido. Renomear o `name` não quebra o ícone.
   */
  slug?:       string
  size?:       number
  className?:  string
  /**
   * monochrome — quando true, aplica filtro grayscale nas imagens PNG e usa
   * currentColor nos ícones Lucide (cor controlada via Tailwind text-*).
   * Usado nos filtros de busca (/itens) conforme Guia de Identidade Visual.
   * Manter false (padrão) para a seção hero/categorias da homepage.
   */
  monochrome?: boolean
  /**
   * decorative — quando true, o ícone é puramente decorativo (aria-hidden, sem
   * role="img"/aria-label). Use quando o rótulo da categoria já aparece como
   * texto adjacente, evitando rótulo duplicado (WCAG 2.5.3 label-content).
   */
  decorative?: boolean
}

/* ── Componente ─────────────────────────────────────────────────── */

export function CategoryIcon({ name, slug: slugProp, size = 64, className = "", monochrome = false, decorative = false }: CategoryIconProps) {
  const slug      = slugProp ?? SLUG_BY_NAME[name]
  const Icon      = slug ? LUCIDE_BY_SLUG[slug] : undefined
  const usePng    = !!slug && HAS_PNG.has(slug)

  if (!slug && !Icon) return null

  const borderWidth = size >= 64 ? 2 : 1.5
  const iconSize    = Math.round(size * 0.46)

  // a11y: rotulado (role="img" + aria-label) por padrão; decorativo (aria-hidden)
  // quando o nome já aparece como texto adjacente.
  const a11yProps = decorative
    ? { "aria-hidden": true as const }
    : { role: "img", "aria-label": name }

  // PNGs já têm o círculo embutido — exibe direto sem container extra
  if (usePng && slug) {
    return (
      <span
        {...a11yProps}
        className={`inline-flex flex-shrink-0
          transition-transform duration-200 hover:scale-105 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={`/icons/${slug}.png`}
          alt=""
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
      {...a11yProps}
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
