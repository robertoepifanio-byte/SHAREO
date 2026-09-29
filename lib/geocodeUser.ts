import { prisma } from "@/lib/prisma"
import { geocodeBR } from "@/lib/geocodeBR"

/**
 * Geocodifica o endereço do usuário (Mapbox) e salva lat/lng no perfil.
 * Fire-and-forget: usar dentro de `after()` para não bloquear a resposta (S14-M-19).
 * Tenta CEP → endereço → bairro → cidade (ver lib/geocodeBR.ts).
 */
export async function geocodeUserLocation(userId: string, opts: {
  cep?:          string | null
  street?:       string | null
  neighborhood?: string | null
  city:          string
  state:         string
}) {
  try {
    const coords = await geocodeBR(opts)
    if (!coords) return
    await prisma.user.update({
      where: { id: userId },
      data:  { latitude: coords.lat, longitude: coords.lng },
    })
  } catch (e) {
    console.error("[geocodeUserLocation]", userId, e instanceof Error ? e.message : e)
  }
}
