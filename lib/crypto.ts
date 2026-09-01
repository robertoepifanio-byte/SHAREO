import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

/**
 * Decodifica uma chave hex de 32 bytes. `null` = ausente ou tamanho errado.
 *
 * Fonte única do "32": antes a regra estava escrita em `getKey`, `getHmacKey` e
 * na sondagem de configuração, e as três podiam divergir — a sondagem chegou a
 * tratar "   " como ausente enquanto `getKey` o aceitava como presente e
 * reclamava do tamanho, ou seja, o /api/health respondia pergunta diferente do
 * código que ele existe para instrumentar.
 *
 * `Buffer.from(_, "hex")` trunca em caractere não-hex em vez de lançar, então o
 * teste de tamanho também pega valor mal colado.
 */
function parseHexKey(v: string | undefined): Buffer | null {
  if (!v || v.trim().length === 0) return null
  const buf = Buffer.from(v, "hex")
  return buf.length === 32 ? buf : null
}

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.trim().length === 0) throw new Error("ENCRYPTION_KEY não definida")
  const buf = parseHexKey(key)
  if (!buf) throw new Error("ENCRYPTION_KEY deve ter 32 bytes (64 hex chars)")
  return buf
}

/**
 * Retorna a chave HMAC para indexação de CPF/CNPJ (HMAC-SHA256).
 *
 * PRODUÇÃO (banco NOVO, sem hashes legados): definir HMAC_KEY com valor
 * DISTINTO de ENCRYPTION_KEY — vazamento da chave AES não compromete o índice
 * de unicidade, e vice-versa. Gerar com: openssl rand -hex 32
 *
 * DEV/STAGING (hashes legados no banco): HMAC_KEY pode ser omitida — cai em
 * ENCRYPTION_KEY como fallback para retrocompatibilidade. Migrar hashes antes
 * de definir HMAC_KEY diferente num banco existente (ver ADR-005).
 *
 * Ref.: ressalva LGPD #1 — auditoria de conformidade técnica s40.
 */
function getHmacKey(): Buffer {
  // `||` (não `??`): HMAC_KEY="" (valor documentado no .env.example para dev)
  // deve cair em ENCRYPTION_KEY. Com `??`, string vazia não dispara o fallback
  // e quebraria todo hash de CPF/CNPJ ("ENCRYPTION_KEY não definida").
  const key = process.env.HMAC_KEY || process.env.ENCRYPTION_KEY
  if (!key || key.trim().length === 0) throw new Error("ENCRYPTION_KEY não definida")
  const buf = parseHexKey(key)
  if (!buf) throw new Error("HMAC_KEY/ENCRYPTION_KEY deve ter 32 bytes (64 hex chars)")
  return buf
}

export type KeyStatus = "ok" | "ausente" | "tamanho-invalido" | "igual-a-encryption"

function avaliaChave(v: string | undefined): Exclude<KeyStatus, "igual-a-encryption"> {
  if (!v || v.trim().length === 0) return "ausente"
  return parseHexKey(v) ? "ok" : "tamanho-invalido"
}

/**
 * Diz se as chaves de criptografia chegaram ao RUNTIME, sem revelar valor.
 *
 * Existe pela mesma razão que `isEmailProviderConfigured`: em 31/08/2026 a
 * `AUTH_SECRET` ficou 25 dias ausente da produção e o único sintoma foi um
 * e-mail que não chegava — nenhuma tela respondia "a variável chegou ao
 * runtime?". Aqui o sintoma seria pior e mais tardio: completar cadastro com
 * CPF/CNPJ lança, e isso só aparece quando alguém tenta.
 *
 * `hmac: "igual-a-encryption"` NÃO é erro em dev/staging (o fallback é
 * documentado e intencional), mas em produção com banco novo é a configuração
 * que o .env.example manda evitar — vazar a chave AES comprometeria também o
 * índice de unicidade de documento.
 */
export function cryptoKeyStatus(): { encryption: KeyStatus; hmac: KeyStatus } {
  const enc  = process.env.ENCRYPTION_KEY
  const hmac = process.env.HMAC_KEY
  const encryption = avaliaChave(enc)

  // Vazia cai no fallback de getHmacKey() — só é "igual" se houver o que herdar.
  if (!hmac || hmac.trim().length === 0) {
    return { encryption, hmac: encryption === "ok" ? "igual-a-encryption" : "ausente" }
  }

  const h = avaliaChave(hmac)
  if (h !== "ok") return { encryption, hmac: h }
  return { encryption, hmac: hmac === enc ? "igual-a-encryption" : "ok" }
}

// HMAC-SHA256 determinístico — permite lookup por unicidade no banco.
// bcrypt seria seguro mas não-determinístico, tornando o índice UNIQUE inútil.
export function hashDocument(doc: string): string {
  return crypto
    .createHmac("sha256", getHmacKey())
    .update(doc.replace(/\D/g, ""))
    .digest("hex")
}

export function verifyDocument(doc: string, hash: string): boolean {
  return hashDocument(doc) === hash
}

// SEC-ALTO-07 — hash de token de uso único (verificação de e-mail) para
// armazenamento. O token enviado ao usuário é aleatório de 256 bits
// (crypto.randomBytes(32)), então SHA-256 sem chave já é seguro: o banco guarda
// apenas o hash. Se a tabela vazar (ex.: Data API do Supabase exposta), o token
// em claro não é recuperável — impede confirmar e-mail alheio com o valor lido.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
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

// PII textual genérica (nome de responsável legal etc.) — AES-256-GCM, mesmo
// formato/chave de encryptDocument, mas SEM o `.replace(/\D/g, "")`, que
// destruiria texto não-numérico. Ver ADR-024 / parecer de Segurança.
export function encryptPII(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

// Inverso de encryptPII. Idêntico a decryptDocument (que não filtra dígitos);
// nome distinto para deixar a intenção explícita no call-site.
export function decryptPII(stored: string): string {
  return decryptDocument(stored)
}

export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "")
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "•••.$2.$3-$4")
}

export function maskCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "")
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "••.$2.$3/$4-$5")
}
