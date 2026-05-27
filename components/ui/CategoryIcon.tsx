/**
 * CategoryIcon — ícones circulares de categoria ShareO
 * Spec: Documento de Identidade Visual v1.0
 *
 * Forma circular, borda #144D81, paleta oficial (#003366 / #007B3C / #59C686).
 * Usa CSS custom-props (--icon-bg, --icon-color, --icon-accent, --icon-border)
 * para compatibilidade futura com dark-mode.
 * Hover: scale(1.05) via classe Tailwind `transition-transform`.
 */

interface CategoryIconProps {
  name:       string
  /** px — recomendados: 32 (lista) | 48 (menu mobile) | 64 (card) | 96 (hero) */
  size?:      number
  className?: string
}

/** Círculo de fundo + borda padrão de todos os ícones */
function IconBase({ children, size }: { children: React.ReactNode; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-transform duration-200 hover:scale-105 flex-shrink-0"
    >
      {/* Círculo de fundo */}
      <circle
        cx="32" cy="32" r="30"
        fill="var(--icon-bg, #FFFFFF)"
        stroke="var(--icon-border, #144D81)"
        strokeWidth="2"
      />
      {children}
    </svg>
  )
}

/* ── Ícones por categoria ─────────────────────────────────────── */

function IconCasaJardim({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Casa */}
      <path d="M20 40 L20 28 L32 20 L44 28 L44 40 Z"
        fill="var(--icon-color, #007B3C)" />
      {/* Porta */}
      <rect x="26" y="32" width="12" height="8"
        fill="var(--icon-accent, #59C686)" />
      {/* Planta */}
      <path d="M48 36 C50 32 54 32 56 36 C54 40 50 40 48 36 Z"
        fill="var(--icon-color, #007B3C)" />
    </IconBase>
  )
}

function IconConstrucao({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Triângulo do capacete */}
      <path d="M20 40 L44 40 L32 20 Z"
        fill="var(--icon-color, #007B3C)" />
      {/* Aba do capacete */}
      <rect x="24" y="28" width="16" height="12"
        fill="var(--icon-accent, #59C686)" />
    </IconBase>
  )
}

function IconEletronicos({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Smartphone */}
      <rect x="22" y="20" width="20" height="28" rx="2"
        fill="var(--icon-color, #007B3C)" />
      {/* Botão home */}
      <circle cx="32" cy="46" r="2"
        fill="var(--icon-accent, #59C686)" />
    </IconBase>
  )
}

function IconEsporte({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Bola esquerda */}
      <circle cx="26" cy="32" r="8"
        fill="var(--icon-color, #007B3C)" />
      {/* Bola direita */}
      <circle cx="40" cy="32" r="8"
        fill="var(--icon-accent, #59C686)" />
    </IconBase>
  )
}

function IconFerramentas({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Ferramenta diagonal 1 */}
      <line x1="20" y1="20" x2="44" y2="44"
        stroke="var(--icon-color, #007B3C)" strokeWidth="4" strokeLinecap="round" />
      {/* Ferramenta diagonal 2 */}
      <line x1="44" y1="20" x2="20" y2="44"
        stroke="var(--icon-accent, #59C686)" strokeWidth="4" strokeLinecap="round" />
    </IconBase>
  )
}

function IconFestas({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Caixa de presente */}
      <rect x="24" y="28" width="16" height="12"
        fill="var(--icon-color, #007B3C)" />
      {/* Laço */}
      <polygon points="32,20 28,28 36,28"
        fill="var(--icon-accent, #59C686)" />
    </IconBase>
  )
}

function IconModa({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {/* Vestido — triângulo */}
      <path d="M32 20 L28 40 L36 40 Z"
        fill="var(--icon-color, #007B3C)" />
      {/* Saia */}
      <rect x="28" y="40" width="8" height="8"
        fill="var(--icon-accent, #59C686)" />
    </IconBase>
  )
}

/* ── Mapa de nomes → componente ────────────────────────────────── */

const ICON_MAP: Record<string, React.FC<{ size: number }>> = {
  "Casa e Jardim": IconCasaJardim,
  "Construção":    IconConstrucao,
  "Eletrônicos":   IconEletronicos,
  "Esporte":       IconEsporte,
  "Ferramentas":   IconFerramentas,
  "Festas":        IconFestas,
  "Moda":          IconModa,
}

/* ── Componente público ─────────────────────────────────────────── */

export function CategoryIcon({ name, size = 64, className = "" }: CategoryIconProps) {
  const Icon = ICON_MAP[name]
  if (!Icon) return null

  return (
    <span
      role="img"
      aria-label={name}
      className={className}
      style={{ display: "inline-flex", width: size, height: size, flexShrink: 0 }}
    >
      <Icon size={size} />
    </span>
  )
}
