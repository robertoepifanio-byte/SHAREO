// Fonte: components/home/landing/icons/UiIcon.tsx (site)
import React from "react"
import Svg, { Circle, Path, Polyline, Line } from "react-native-svg"

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
  color = "#FFFFFF",
}: {
  name: UiIconName
  size?: number
  color?: string
}) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" }

  switch (name) {
    case "moeda":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx="12" cy="12" r="9" />
          <Path {...p} d="M12 6.5v11" />
          <Path {...p} d="M14.6 9.3a2.4 2.4 0 0 0-2.2-1.3h-.8a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-.9a2.4 2.4 0 0 1-2.2-1.3" />
        </Svg>
      )
    case "local":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <Circle {...p} cx="12" cy="10" r="3" />
        </Svg>
      )
    case "escudo":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 2 20 5v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3Z" />
          <Polyline {...p} points="9 12 11 14 15 10" />
        </Svg>
      )
    case "estrela":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      )
    case "perfil":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...p} cx="12" cy="8" r="4" />
          <Path {...p} d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </Svg>
      )
    case "suporte":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <Path {...p} d="M4 14h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4Z" />
          <Path {...p} d="M20 14h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2Z" />
          <Path {...p} d="M20 19a3 3 0 0 1-3 3h-3" />
        </Svg>
      )
    case "documento":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
          <Polyline {...p} points="14 2 14 7 19 7" />
          <Line {...p} x1="9" y1="13" x2="15" y2="13" />
          <Line {...p} x1="9" y1="17" x2="13" y2="17" />
        </Svg>
      )
    case "check":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline {...p} points="20 6 9 17 4 12" />
        </Svg>
      )
    case "foguete":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...p} d="M12 2c3.5 2.5 5.5 6.3 5.5 10.5L12 17l-5.5-4.5C6.5 8.3 8.5 4.5 12 2Z" />
          <Circle {...p} cx="12" cy="10" r="2" />
          <Path {...p} d="M9 17l-2.5 5 4-1.5M15 17l2.5 5-4-1.5" />
        </Svg>
      )
    case "mais":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line {...p} x1="12" y1="5" x2="12" y2="19" />
          <Line {...p} x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      )
    case "seta-direita":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line {...p} x1="5" y1="12" x2="19" y2="12" />
          <Polyline {...p} points="12 5 19 12 12 19" />
        </Svg>
      )
    default:
      return null
  }
}
