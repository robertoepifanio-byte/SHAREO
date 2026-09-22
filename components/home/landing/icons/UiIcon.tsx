// Fonte: apps/campanha/components/landing/icons/UiIcon.tsx
export type UiIconName =
  | "moeda"
  | "local"
  | "escudo"
  | "estrela"
  | "perfil"
  | "suporte"
  | "documento"
  | "check"
  | "foguete"
  | "seta-direita"
  | "mais"

export function UiIcon({
  name,
  size = 22,
  className,
}: {
  name: UiIconName
  size?: number
  className?: string
}) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    className,
  }

  switch (name) {
    case "moeda":
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6.5v11" />
          <path d="M14.6 9.3a2.4 2.4 0 0 0-2.2-1.3h-.8a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-.9a2.4 2.4 0 0 1-2.2-1.3" />
        </svg>
      )

    case "local":
      return (
        <svg {...shared}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )

    case "escudo":
      return (
        <svg {...shared}>
          <path d="M12 2 20 5v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3Z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )

    case "estrela":
      return (
        <svg {...shared}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )

    case "perfil":
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      )

    case "suporte":
      return (
        <svg {...shared}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 14h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4Z" />
          <path d="M20 14h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2Z" />
          <path d="M20 19a3 3 0 0 1-3 3h-3" />
        </svg>
      )

    case "documento":
      return (
        <svg {...shared}>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
          <polyline points="14 2 14 7 19 7" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      )

    case "check":
      return (
        <svg {...shared}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )

    case "foguete":
      return (
        <svg {...shared}>
          <path d="M12 2c3.5 2.5 5.5 6.3 5.5 10.5L12 17l-5.5-4.5C6.5 8.3 8.5 4.5 12 2Z" />
          <circle cx="12" cy="10" r="2" />
          <path d="M9 17l-2.5 5 4-1.5M15 17l2.5 5-4-1.5" />
        </svg>
      )

    case "mais":
      return (
        <svg {...shared}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )

    case "seta-direita":
      return (
        <svg {...shared}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )

    default:
      return null
  }
}
