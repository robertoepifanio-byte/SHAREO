export type FounderWave = "WAVE_1" | "WAVE_2" | "WAVE_3"

export const WAVE_CAPS = { WAVE_1: 500, WAVE_2: 1500 } as const

export function assignWave(queuePosition: number): FounderWave {
  if (queuePosition <= WAVE_CAPS.WAVE_1) return "WAVE_1"
  if (queuePosition <= WAVE_CAPS.WAVE_2) return "WAVE_2"
  return "WAVE_3"
}

export function getWaveLabel(wave: FounderWave): string {
  const labels: Record<FounderWave, string> = {
    WAVE_1: "Fundador Wave 1",
    WAVE_2: "Fundador Wave 2",
    WAVE_3: "Fundador Wave 3",
  }
  return labels[wave]
}
