/**
 * ShareOLogo — logotipo ShareO em SVG inline
 * Spec: Documento de Identidade Visual v1.0
 *
 * Variantes:
 *  "institutional" — fundo azul marinho (#003366), texto branco, "O" verde escuro
 *  "light"         — fundo branco (#FFFFFF), texto azul marinho, "O" verde escuro
 *  "iconic"        — ícone circular com casa + setas, texto abaixo
 *
 * O "O" é um círculo verde com setas representando o ciclo de compartilhamento.
 * Tamanho mínimo recomendado: 120px de largura (spec).
 */

interface ShareOLogoProps {
  /** Contexto de exibição — determina cores */
  variant?: "institutional" | "light" | "iconic"
  /** Altura em px (largura proporcional automática) */
  height?: number
  className?: string
}

/**
 * O "O" circular com setas de ciclo — representa compartilhamento e reutilização.
 * Design: dois semicírculos com setas opostas, formando a letra O.
 */
function CircularO({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      {/* Arco superior — da esquerda para a direita (sentido horário pelo topo) */}
      <path
        d="M 5 20 A 15 15 0 0 1 35 20"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Seta superior (ponta na direita) */}
      <polygon points="33,13 40,20 33,20" fill={color} />

      {/* Arco inferior — da direita para a esquerda (sentido horário pelo fundo) */}
      <path
        d="M 35 20 A 15 15 0 0 1 5 20"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Seta inferior (ponta na esquerda) */}
      <polygon points="7,27 0,20 7,20" fill={color} />
    </svg>
  )
}

/* ── Logo Institucional & Leve ─────────────────────────────────── */

function LogoWordmark({
  textColor,
  circleColor,
  height,
}: {
  textColor: string
  circleColor: string
  height: number
}) {
  const fontSize   = height
  const circleSize = Math.round(height * 0.95)

  return (
    <span
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            Math.round(height * 0.04),
        fontFamily:     "var(--font-montserrat, Montserrat, system-ui, sans-serif)",
        fontSize:       fontSize,
        fontWeight:     800,
        letterSpacing:  "-0.02em",
        lineHeight:     1,
        color:          textColor,
        userSelect:     "none",
      }}
    >
      Share
      <CircularO color={circleColor} size={circleSize} />
    </span>
  )
}

/* ── Logo Icônico (ícone circular com casa + nome abaixo) ─────── */

function LogoIconic({ height }: { height: number }) {
  const iconSize = height * 2   // ícone circular é maior que o height do texto
  const textSize = Math.round(height * 0.55)

  return (
    <span
      style={{
        display:       "inline-flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           Math.round(height * 0.2),
      }}
    >
      {/* Ícone circular com casa e setas */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        {/* Círculo externo com setas verdes */}
        <circle cx="100" cy="100" r="90" stroke="#007B3C" strokeWidth="6" fill="none" />
        {/* Casa */}
        <path d="M60 140 L60 100 L100 70 L140 100 L140 140 Z" fill="#003366" />
        {/* Janela/porta */}
        <rect x="90" y="110" width="20" height="20" fill="#59C686" />
        {/* Setas de ciclo no topo */}
        <path d="M60 30 A50 50 0 0 1 140 30"
          stroke="#007B3C" strokeWidth="5" strokeLinecap="round" fill="none" />
        <polygon points="138,20 148,32 130,32" fill="#007B3C" />
        <path d="M140 170 A50 50 0 0 1 60 170"
          stroke="#007B3C" strokeWidth="5" strokeLinecap="round" fill="none" />
        <polygon points="62,180 52,168 70,168" fill="#007B3C" />
      </svg>

      {/* Nome abaixo do ícone */}
      <span
        style={{
          fontFamily:  "var(--font-montserrat, Montserrat, system-ui, sans-serif)",
          fontSize:    textSize,
          fontWeight:  800,
          color:       "#003366",
          letterSpacing: "-0.02em",
        }}
      >
        Share
        <span style={{ color: "#007B3C" }}>O</span>
      </span>
    </span>
  )
}

/* ── Componente público ─────────────────────────────────────────── */

export function ShareOLogo({
  variant  = "institutional",
  height   = 32,
  className = "",
}: ShareOLogoProps) {
  if (variant === "iconic") {
    return (
      <span className={className} aria-label="ShareO">
        <LogoIconic height={height} />
      </span>
    )
  }

  const isInstitutional = variant === "institutional"
  const textColor  = isInstitutional ? "#FFFFFF" : "#003366"
  const circleColor = "#007B3C"   // verde escuro — WCAG 5.1:1 em fundo branco ✅

  return (
    <span className={className} aria-label="ShareO">
      <LogoWordmark
        textColor={textColor}
        circleColor={circleColor}
        height={height}
      />
    </span>
  )
}
