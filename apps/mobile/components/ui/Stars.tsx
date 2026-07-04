// Fonte: components/ui/RatingStars.tsx (site) — versão simplificada (★/☆ texto,
// sem showValue/count embutido, cada tela compõe o texto de valor separadamente).
// Extraído de app/itens/[id].tsx pra reuso em (tabs)/perfil.tsx (regra DRY do projeto).
import { Text } from "react-native"
import { useTheme } from "@/lib/theme"

export function Stars({ rating, total = 5, size = 14 }: { rating: number; total?: number; size?: number }) {
  const { tokens } = useTheme()
  const full  = Math.round(rating)
  const empty = total - full
  return (
    <Text style={{ color: tokens.warning, fontSize: size }}>
      {"★".repeat(full)}{"☆".repeat(empty)}
    </Text>
  )
}
