/**
 * Utilitários para estatísticas de proprietários.
 * Usado para calcular o badge de responsividade.
 */
import { prisma } from "@/lib/prisma"

export interface ResponseTimeBadge {
  /** Texto do badge, ex.: "Responde em ~2h" */
  label: string
  /** Tempo médio de resposta em horas */
  avgHours: number
}

/**
 * Calcula o tempo médio de resposta do proprietário para reservas PENDING.
 * Retorna null se não há dados suficientes (< 3 respostas).
 */
export async function getOwnerResponseBadge(
  ownerId: string,
): Promise<ResponseTimeBadge | null> {
  // Busca até 30 reservas respondidas nos últimos 90 dias
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const responded = await prisma.booking.findMany({
    where: {
      ownerId,
      respondedAt: { not: null, gte: cutoff },
      deletedAt:   null,
    },
    select: { createdAt: true, respondedAt: true },
    orderBy: { respondedAt: "desc" },
    take: 30,
  })

  if (responded.length < 3) return null

  const totalMs = responded.reduce((sum, b) => {
    return sum + (b.respondedAt!.getTime() - b.createdAt.getTime())
  }, 0)

  const avgMs    = totalMs / responded.length
  const avgHours = avgMs / (60 * 60 * 1000)

  let label: string
  if (avgHours < 1)        label = "Responde em < 1h"
  else if (avgHours < 2)   label = "Responde em ~1h"
  else if (avgHours < 4)   label = "Responde em ~2h"
  else if (avgHours < 8)   label = "Responde em ~4h"
  else if (avgHours < 12)  label = "Responde em ~8h"
  else if (avgHours < 24)  label = "Responde em ~12h"
  else if (avgHours < 48)  label = "Responde em ~1 dia"
  else                      label = "Responde em ~2 dias"

  return { label, avgHours }
}
