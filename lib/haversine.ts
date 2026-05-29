/**
 * haversine.ts — cálculo de distância entre duas coordenadas geográficas.
 *
 * Usado em:
 *  - app/itens/page.tsx (filtro de distância server-side)
 *  - componentes client de mapa (filtro de pins por raio)
 *
 * @returns distância em quilômetros
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R    = 6371 // raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
