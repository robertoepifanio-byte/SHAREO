import crypto from "crypto"
import bcrypt from "bcryptjs"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error("ENCRYPTION_KEY não definida")
  const buf = Buffer.from(key, "hex")
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY deve ter 32 bytes (64 hex chars)")
  return buf
}

export function hashDocument(doc: string): string {
  return bcrypt.hashSync(doc.replace(/\D/g, ""), 10)
}

export function verifyDocument(doc: string, hash: string): boolean {
  return bcrypt.compareSync(doc.replace(/\D/g, ""), hash)
}

export function encryptDocument(doc: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(doc.replace(/\D/g, ""), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptDocument(stored: string): string {
  const parts = stored.split(":")
  if (parts.length !== 3) throw new Error("Formato de dado criptografado inválido")
  const [ivHex, tagHex, cipherHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const ciphertext = Buffer.from(cipherHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8")
}

export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "")
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "•••.$2.$3-$4")
}

export function maskCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "")
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "••.$2.$3/$4-$5")
}
