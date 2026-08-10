export type FounderWave = "WAVE_1" | "WAVE_2" | "WAVE_3"

export const WAVE_CAPS = { WAVE_1: 500, WAVE_2: 1500 } as const

export function assignWave(queuePosition: number): FounderWave {
  if (queuePosition <= WAVE_CAPS.WAVE_1) return "WAVE_1"
  if (queuePosition <= WAVE_CAPS.WAVE_2) return "WAVE_2"
  return "WAVE_3"
}

/**
 * Alfabeto do código de indicação — sem `0/O/1/I/L`, que o destinatário confunde
 * ao transcrever o link à mão. Maiúsculas só: o código viaja em URL e é comparado
 * como veio.
 */
const REFERRAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const REFERRAL_LENGTH = 8

/**
 * Código de indicação de um lead, para o link que ele compartilha no WhatsApp.
 *
 * Aleatório, não derivado da posição na fila: um código sequencial seria
 * enumerável, e creditar indicação a quem não indicou envenena a única métrica
 * de canal orgânico que teremos.
 *
 * 31^8 ≈ 8,5e11 combinações. A coluna é UNIQUE e quem chama trata a colisão —
 * ver app/api/founders/leads/route.ts.
 */
export function generateReferralCode(): string {
  const bytes = new Uint8Array(REFERRAL_LENGTH)
  crypto.getRandomValues(bytes)
  let out = ""
  for (const b of bytes) out += REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length]
  return out
}

export function getWaveLabel(wave: FounderWave): string {
  const labels: Record<FounderWave, string> = {
    WAVE_1: "Fundador Wave 1",
    WAVE_2: "Fundador Wave 2",
    WAVE_3: "Fundador Wave 3",
  }
  return labels[wave]
}
