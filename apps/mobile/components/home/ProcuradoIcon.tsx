// Fonte: components/home/icons/ProcuradoIcon.tsx
// Transcrição literal — mesmos paths SVG (sem dependência de PNG).

import React from "react"
import Svg, { Rect, Line, Circle, Path } from "react-native-svg"

export type ProcuradoIconName =
  | "furadeira" | "escada" | "lavadora" | "aspirador" | "projetor"
  | "som" | "mesa-cadeiras" | "barraca" | "bicicleta" | "ferramenta-eletrica"

export function ProcuradoIcon({ name, size = 40, color = "#007B3C" }: { name: ProcuradoIconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" }

  switch (name) {
    case "furadeira":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect {...p} x="3" y="12" width="15" height="8" rx="2" />
          <Rect {...p} x="18" y="14" width="5" height="4" rx="1" />
          <Line {...p} x1="23" y1="16" x2="30" y2="16" />
          <Path {...p} d="M9 20 L10 28" />
          <Line {...p} x1="8" y1="28" x2="13" y2="28" />
          <Line {...p} x1="7" y1="16" x2="8" y2="20" />
        </Svg>
      )
    case "escada":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Line {...p} x1="9" y1="3" x2="9" y2="29" />
          <Line {...p} x1="23" y1="3" x2="23" y2="29" />
          <Line {...p} x1="9" y1="9" x2="23" y2="9" />
          <Line {...p} x1="9" y1="16" x2="23" y2="16" />
          <Line {...p} x1="9" y1="23" x2="23" y2="23" />
        </Svg>
      )
    case "lavadora":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect {...p} x="2" y="17" width="11" height="11" rx="2" />
          <Path {...p} d="M13 22 L24 9" />
          <Path {...p} d="M24 9 l3-1 l0 3 l-3 0" />
          <Line {...p} x1="27" y1="7" x2="29" y2="5" />
          <Line {...p} x1="28" y1="10" x2="30" y2="10" />
          <Circle {...p} cx="5" cy="29" r="2" />
          <Circle {...p} cx="9" cy="29" r="2" />
        </Svg>
      )
    case "aspirador":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect {...p} x="6" y="24" width="18" height="4" rx="2" />
          <Rect {...p} x="9" y="14" width="10" height="10" rx="2" />
          <Line {...p} x1="14" y1="14" x2="19" y2="4" />
          <Line {...p} x1="17" y1="4" x2="23" y2="4" />
        </Svg>
      )
    case "projetor":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect {...p} x="4" y="11" width="16" height="10" rx="2" />
          <Circle {...p} cx="11" cy="16" r="3" />
          <Path {...p} d="M20 13 L28 8 L28 24 L20 19" />
          <Line {...p} x1="8" y1="21" x2="8" y2="24" />
          <Line {...p} x1="12" y1="21" x2="12" y2="24" />
        </Svg>
      )
    case "som":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect {...p} x="7" y="4" width="18" height="24" rx="2" />
          <Circle {...p} cx="16" cy="19" r="6" />
          <Circle {...p} cx="16" cy="19" r="2" />
          <Circle {...p} cx="16" cy="9" r="2.5" />
        </Svg>
      )
    case "mesa-cadeiras":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Circle {...p} cx="16" cy="16" r="8" />
          <Rect {...p} x="13" y="3" width="6" height="5" rx="1" />
          <Rect {...p} x="13" y="24" width="6" height="5" rx="1" />
          <Rect {...p} x="3" y="13" width="5" height="6" rx="1" />
          <Rect {...p} x="24" y="13" width="5" height="6" rx="1" />
        </Svg>
      )
    case "barraca":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path {...p} d="M2 27 L16 5 L30 27 Z" />
          <Line {...p} x1="2" y1="27" x2="30" y2="27" />
          <Path {...p} d="M12 27 Q12 19 16 19 Q20 19 20 27" />
          <Line {...p} x1="16" y1="5" x2="16" y2="19" />
        </Svg>
      )
    case "bicicleta":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Circle {...p} cx="7" cy="22" r="6" />
          <Circle {...p} cx="25" cy="22" r="6" />
          <Path {...p} d="M7 22 L14 14 L25 22" />
          <Line {...p} x1="14" y1="14" x2="14" y2="9" />
          <Line {...p} x1="12" y1="9" x2="16" y2="9" />
          <Line {...p} x1="23" y1="15" x2="27" y2="13" />
          <Line {...p} x1="25" y1="13" x2="29" y2="13" />
          <Circle {...p} cx="17" cy="22" r="2" />
        </Svg>
      )
    case "ferramenta-eletrica":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect {...p} x="9" y="10" width="14" height="12" rx="2" />
          <Path {...p} d="M12 10 Q16 5 20 10" />
          <Line {...p} x1="13" y1="22" x2="19" y2="22" />
          <Line {...p} x1="16" y1="22" x2="16" y2="30" />
          <Path {...p} d="M23 14 Q27 14 27 10" />
        </Svg>
      )
    default:
      return null
  }
}
