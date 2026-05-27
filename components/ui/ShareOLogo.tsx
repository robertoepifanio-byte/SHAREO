"use client"

/**
 * ShareOLogo — logotipo ShareO
 * Spec: Documento de Identidade Visual v1.0
 *
 * Variantes:
 *  "institutional" — texto branco + "O" verde (para fundos escuros: header/footer)
 *  "light"         — texto navy + "O" verde (para fundos claros)
 *  "iconic"        — só o símbolo circular (para favicon / ícone de app)
 *
 * O "O" é um ícone RefreshCcw (setas circulares) representando o ciclo de
 * compartilhamento e reutilização — core da identidade ShareO.
 */

import { RefreshCcw } from "lucide-react"

interface ShareOLogoProps {
  variant?: "institutional" | "light" | "iconic"
  /** Altura do texto em px — largura é proporcional */
  height?: number
  className?: string
}

export function ShareOLogo({
  variant   = "institutional",
  height    = 28,
  className = "",
}: ShareOLogoProps) {
  const isOnDark  = variant === "institutional"
  const textColor = isOnDark ? "#FFFFFF" : "#003366"
  const iconColor = "#007B3C"
  const iconSize  = Math.round(height * 0.92)

  if (variant === "iconic") {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full ${className}`}
        style={{
          width:           height * 1.8,
          height:          height * 1.8,
          background:      "#003366",
          border:          `2px solid #007B3C`,
        }}
        aria-label="ShareO"
      >
        <RefreshCcw
          width={height}
          height={height}
          stroke="#59C686"
          strokeWidth={2}
        />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: Math.round(height * 0.08) }}
      aria-label="ShareO"
    >
      {/* "Share" — Montserrat bold via CSS variable */}
      <span
        style={{
          fontFamily:    "var(--font-montserrat, Montserrat, system-ui, sans-serif)",
          fontSize:      height,
          fontWeight:    800,
          letterSpacing: "-0.02em",
          lineHeight:    1,
          color:         textColor,
        }}
      >
        Share
      </span>

      {/* "O" como ícone de ciclo/compartilhamento */}
      <RefreshCcw
        width={iconSize}
        height={iconSize}
        stroke={iconColor}
        strokeWidth={2.5}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      />
    </span>
  )
}
