import crypto from "crypto"
import { timingSafeStringEqual } from "./timingSafe"

/**
 * TOTP (RFC 6238) sobre HMAC-SHA1, 6 dígitos, passo de 30 s — o perfil que
 * Google Authenticator, Authy, 1Password e Microsoft Authenticator implementam.
 * Sem dependência externa; o RFC traz vetores de teste (usados em totp.test.ts).
 */

const STEP_SECONDS = 30
const DIGITS       = 6
const ALPHABET     = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" // base32, RFC 4648

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20)) // 160 bits, o tamanho do bloco do SHA-1
}

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ""
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str: string): Buffer {
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of str.replace(/=+$/, "").toUpperCase()) {
    const idx = ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error("Caractere inválido em base32")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Contador do passo de 30 s que contém `atMs`. */
export function totpStep(atMs: number): number {
  return Math.floor(atMs / 1000 / STEP_SECONDS)
}

/** Código do passo `step`. `digits` só varia nos vetores de teste do RFC (8 dígitos). */
export function totpAtStep(secret: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac   = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin    = hmac.readUInt32BE(offset) & 0x7fffffff
  return String(bin % 10 ** digits).padStart(digits, "0")
}

/**
 * Confere `code` contra o passo atual e os vizinhos (±1: relógio do celular
 * levemente fora, ou código digitado no fim da janela). Devolve o PASSO que
 * casou — o chamador grava esse número para que o mesmo código não valha duas
 * vezes (replay) — ou `null`.
 *
 * Passo ≤ `lastUsedStep` é recusado: um código já consumido, ou mais velho que
 * o último consumido, não volta a valer.
 */
export function verifyTotp(
  secret: string,
  code: string,
  opts: { lastUsedStep?: number | null; nowMs?: number } = {},
): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const now = totpStep(opts.nowMs ?? Date.now())
  let matched: number | null = null
  for (const step of [now - 1, now, now + 1]) {
    if (opts.lastUsedStep != null && step <= opts.lastUsedStep) continue
    // Sem `break`: o tempo não revela em qual dos três passos casou.
    if (timingSafeStringEqual(totpAtStep(secret, step), code)) matched = step
  }
  return matched
}

/** URI `otpauth://` que o QR code carrega e os apps autenticadores leem. */
export function totpUri(secret: string, accountEmail: string, issuer = "ShareO"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}`
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits:    String(DIGITS),
    period:    String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}
