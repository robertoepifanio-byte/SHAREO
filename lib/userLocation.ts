/**
 * userLocation.ts — resolve as coordenadas do usuário logado para centrar o mapa.
 *
 * Prioridade:
 * 1. latitude/longitude do perfil (preenchido via geocoding ao cadastrar item)
 * 2. city do perfil → lookup de capitais/cidades brasileiras (normalizado)
 * 3. Natal, RN como default (mercado principal do ShareO)
 */

import { prisma } from "@/lib/prisma"

/** Coords de capitais e cidades relevantes como fallback */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "natal":             { lat: -5.7945,  lng: -35.2110 },
  "fortaleza":         { lat: -3.7172,  lng: -38.5433 },
  "recife":            { lat: -8.0476,  lng: -34.8770 },
  "sao paulo":         { lat: -23.5505, lng: -46.6333 },
  "rio de janeiro":    { lat: -22.9068, lng: -43.1729 },
  "belo horizonte":    { lat: -19.9167, lng: -43.9345 },
  "brasilia":          { lat: -15.7801, lng: -47.9292 },
  "manaus":            { lat: -3.1190,  lng: -60.0217 },
  "salvador":          { lat: -12.9714, lng: -38.5014 },
  "curitiba":          { lat: -25.4297, lng: -49.2711 },
  "porto alegre":      { lat: -30.0346, lng: -51.2177 },
  "belem":             { lat: -1.4558,  lng: -48.5044 },
  "goiania":           { lat: -16.6869, lng: -49.2648 },
  "maceio":            { lat: -9.6658,  lng: -35.7350 },
  "joao pessoa":       { lat: -7.1195,  lng: -34.8450 },
  "teresina":          { lat: -5.0892,  lng: -42.8019 },
  "campo grande":      { lat: -20.4697, lng: -54.6201 },
  "macapa":            { lat: 0.0349,   lng: -51.0694 },
  "porto velho":       { lat: -8.7612,  lng: -63.9004 },
  "rio branco":        { lat: -9.9748,  lng: -67.8100 },
  "boa vista":         { lat: 2.8235,   lng: -60.6758 },
  "palmas":            { lat: -10.2491, lng: -48.3243 },
  "florianopolis":     { lat: -27.5954, lng: -48.5480 },
  "vitoria":           { lat: -20.3155, lng: -40.3128 },
  "aracaju":           { lat: -10.9472, lng: -37.0731 },
  "sao luis":          { lat: -2.5297,  lng: -44.3028 },
  "cuiaba":            { lat: -15.5989, lng: -56.0949 },
  "natal/rn":          { lat: -5.7945,  lng: -35.2110 },
}

const DEFAULT = { lat: -5.7945, lng: -35.2110, zoom: 12 }

/** Remove acentos e normaliza string para lookup */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // remove diacríticos
    .replace(/[^a-z0-9\s/]/g, "")     // remove pontuação
    .trim()
}

/**
 * Tenta extrair cidade de strings compostas como:
 * - "Vila Sônia, São Paulo" → "são paulo"
 * - "Natal/RN"             → "natal/rn" ou "natal"
 * - "Natal"                → "natal"
 */
function extractCityKeys(city: string): string[] {
  const norm = normalize(city)
  const candidates: string[] = [norm]

  // "bairro, cidade" → tenta a parte após a vírgula
  if (norm.includes(",")) {
    const afterComma = norm.split(",").pop()?.trim()
    if (afterComma) candidates.push(afterComma)
  }

  // "cidade/uf" → tenta só a parte antes da barra
  if (norm.includes("/")) {
    const beforeSlash = norm.split("/")[0]?.trim()
    if (beforeSlash) candidates.push(beforeSlash)
  }

  return candidates
}

export interface UserMapLocation {
  lat:  number
  lng:  number
  zoom: number
}

/**
 * Retorna as coordenadas do usuário logado para inicializar o mapa.
 * @param userId - ID do usuário autenticado (ou null/undefined se não logado)
 */
export async function getUserMapLocation(userId?: string | null): Promise<UserMapLocation> {
  if (!userId) return DEFAULT

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { latitude: true, longitude: true, city: true },
  }).catch(() => null)

  if (!user) return DEFAULT

  // 1. Coords salvas no perfil
  if (user.latitude && user.longitude) {
    return { lat: user.latitude, lng: user.longitude, zoom: 15 }
  }

  // 2. Lookup pela cidade com normalização e matching parcial
  if (user.city) {
    const candidates = extractCityKeys(user.city)
    for (const key of candidates) {
      // match exato normalizado
      if (CITY_COORDS[key]) {
        return { ...CITY_COORDS[key], zoom: 12 }
      }
      // match parcial: chave da tabela contida na string do usuário
      const match = Object.entries(CITY_COORDS).find(([k]) => key.includes(k) || k.includes(key))
      if (match) {
        return { ...match[1], zoom: 12 }
      }
    }
  }

  return DEFAULT
}
