export type ProcuradoIconName =
  | "furadeira"
  | "escada"
  | "lavadora"
  | "aspirador"
  | "projetor"
  | "som"
  | "mesa-cadeiras"
  | "barraca"
  | "bicicleta"
  | "ferramenta-eletrica"

interface ProcuradoIconProps {
  name: ProcuradoIconName
  size?: number
  className?: string
}

export function ProcuradoIcon({ name, size = 40, className }: ProcuradoIconProps) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  }

  switch (name) {
    case "furadeira":
      return (
        <svg {...shared}>
          <rect x="3" y="12" width="15" height="8" rx="2" />
          <rect x="18" y="14" width="5" height="4" rx="1" />
          <line x1="23" y1="16" x2="30" y2="16" />
          <path d="M9 20 L10 28" />
          <line x1="8" y1="28" x2="13" y2="28" />
          <line x1="7" y1="16" x2="8" y2="20" />
        </svg>
      )

    case "escada":
      return (
        <svg {...shared}>
          <line x1="9" y1="3" x2="9" y2="29" />
          <line x1="23" y1="3" x2="23" y2="29" />
          <line x1="9" y1="9" x2="23" y2="9" />
          <line x1="9" y1="16" x2="23" y2="16" />
          <line x1="9" y1="23" x2="23" y2="23" />
        </svg>
      )

    case "lavadora":
      return (
        <svg {...shared}>
          <rect x="2" y="17" width="11" height="11" rx="2" />
          <path d="M13 22 L24 9" />
          <path d="M24 9 l3-1 l0 3 l-3 0" />
          <line x1="27" y1="7" x2="29" y2="5" />
          <line x1="28" y1="10" x2="30" y2="10" />
          <circle cx="5" cy="29" r="2" />
          <circle cx="9" cy="29" r="2" />
        </svg>
      )

    case "aspirador":
      return (
        <svg {...shared}>
          <rect x="6" y="24" width="18" height="4" rx="2" />
          <rect x="9" y="14" width="10" height="10" rx="2" />
          <line x1="14" y1="14" x2="19" y2="4" />
          <line x1="17" y1="4" x2="23" y2="4" />
        </svg>
      )

    case "projetor":
      return (
        <svg {...shared}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <circle cx="11" cy="16" r="3" />
          <path d="M20 13 L28 8 L28 24 L20 19" />
          <line x1="8" y1="21" x2="8" y2="24" />
          <line x1="12" y1="21" x2="12" y2="24" />
        </svg>
      )

    case "som":
      return (
        <svg {...shared}>
          <rect x="7" y="4" width="18" height="24" rx="2" />
          <circle cx="16" cy="19" r="6" />
          <circle cx="16" cy="19" r="2" />
          <circle cx="16" cy="9" r="2.5" />
        </svg>
      )

    case "mesa-cadeiras":
      return (
        <svg {...shared}>
          <circle cx="16" cy="16" r="8" />
          <rect x="13" y="3" width="6" height="5" rx="1" />
          <rect x="13" y="24" width="6" height="5" rx="1" />
          <rect x="3" y="13" width="5" height="6" rx="1" />
          <rect x="24" y="13" width="5" height="6" rx="1" />
        </svg>
      )

    case "barraca":
      return (
        <svg {...shared}>
          <path d="M2 27 L16 5 L30 27 Z" />
          <line x1="2" y1="27" x2="30" y2="27" />
          <path d="M12 27 Q12 19 16 19 Q20 19 20 27" />
          <line x1="16" y1="5" x2="16" y2="19" />
        </svg>
      )

    case "bicicleta":
      return (
        <svg {...shared}>
          <circle cx="7" cy="22" r="6" />
          <circle cx="25" cy="22" r="6" />
          <path d="M7 22 L14 14 L25 22" />
          <line x1="14" y1="14" x2="14" y2="9" />
          <line x1="12" y1="9" x2="16" y2="9" />
          <line x1="23" y1="15" x2="27" y2="13" />
          <line x1="25" y1="13" x2="29" y2="13" />
          <circle cx="17" cy="22" r="2" />
        </svg>
      )

    case "ferramenta-eletrica":
      return (
        <svg {...shared}>
          <rect x="9" y="10" width="14" height="12" rx="2" />
          <path d="M12 10 Q16 5 20 10" />
          <line x1="13" y1="22" x2="19" y2="22" />
          <line x1="16" y1="22" x2="16" y2="30" />
          <path d="M23 14 Q27 14 27 10" />
        </svg>
      )

    default:
      return null
  }
}
