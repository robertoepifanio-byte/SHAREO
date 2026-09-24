/**
 * Parte de linha de comando da recifragem da ENCRYPTION_KEY: leitura das chaves
 * do ambiente, argumentos, identificação do banco e texto do relatório. O núcleo
 * (que o teste exercita contra um fake) está em `lib/crypto-rotation.ts`.
 * Procedimento: docs/runbook-rotacao-encryption-key.md.
 */
import { createHash } from "crypto"
import { parseArgs } from "node:util"
import { parseHexKey } from "../../lib/crypto"
import type { RotationReport } from "../../lib/crypto-rotation"

export const ENV_KEY_OLD = "ENCRYPTION_KEY_OLD"
export const ENV_KEY_NEW = "ENCRYPTION_KEY_NEW"

/** Chave aleatória de 32 bytes tem ~31 valores distintos; menos de 16 é valor de teste/colado errado. */
const MIN_DISTINCT_KEY_BYTES = 16

// ─── Chaves ───────────────────────────────────────────────────────────────────

export type RotationKeysResult = { ok: true; oldKey: Buffer; newKey: Buffer } | { ok: false; errors: string[] }

/**
 * Lê ENCRYPTION_KEY_OLD / ENCRYPTION_KEY_NEW e recusa o que não presta. Usa o
 * mesmo `parseHexKey` do runtime (32 bytes em hex), então "válida aqui" e
 * "válida para a aplicação" são a mesma pergunta. Nunca inclui valor de chave
 * nas mensagens. `ENCRYPTION_KEY` (a do runtime) é ignorada de propósito: o
 * script só opera com as duas explícitas.
 */
export function resolveRotationKeys(env: Record<string, string | undefined>): RotationKeysResult {
  const errors: string[] = []
  const read = (name: string): Buffer | null => {
    const raw = env[name]
    if (!raw || raw.trim().length === 0) {
      errors.push(`${name} ausente.`)
      return null
    }
    const key = parseHexKey(raw)
    if (!key) errors.push(`${name} inválida: precisa ter 64 caracteres hexadecimais (32 bytes). Gerar com: openssl rand -hex 32`)
    return key
  }

  const oldKey = read(ENV_KEY_OLD)
  const newKey = read(ENV_KEY_NEW)
  if (oldKey && newKey) {
    if (oldKey.equals(newKey)) errors.push(`${ENV_KEY_OLD} e ${ENV_KEY_NEW} são iguais: não há o que rotacionar.`)
    if (new Set(newKey).size < MIN_DISTINCT_KEY_BYTES) {
      errors.push(`${ENV_KEY_NEW} tem baixa entropia (menos de ${MIN_DISTINCT_KEY_BYTES} bytes distintos): parece valor de teste ou colado errado.`)
    }
  }
  if (errors.length > 0 || !oldKey || !newKey) return { ok: false, errors }
  return { ok: true, oldKey, newKey }
}

/**
 * Impressão curta (8 hex do SHA-256) para o operador distinguir OLD de NEW entre
 * uma rodada e outra sem imprimir a chave. Trocar as duas recifraria no sentido errado.
 */
export function fingerprintKey(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8)
}

// ─── Argumentos ───────────────────────────────────────────────────────────────

export interface RotationArgs {
  apply: boolean
  confirmarBanco: string | null
  hmacFixada: boolean
}

/**
 * `parseArgs` estrito: flag desconhecida, posicional ou valor onde não cabe é
 * erro. Um erro de digitação (`--aply`) nunca vira `--apply` silencioso nem
 * dry-run enganoso.
 */
export function parseRotationArgs(argv: string[]): { ok: true; args: RotationArgs } | { ok: false; error: string } {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        apply: { type: "boolean" },
        "hmac-fixada": { type: "boolean" },
        "confirmar-banco": { type: "string" },
      },
      strict: true,
      allowPositionals: false,
    })
    return {
      ok: true,
      args: {
        apply: values.apply === true,
        hmacFixada: values["hmac-fixada"] === true,
        confirmarBanco: values["confirmar-banco"]?.trim() || null,
      },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ─── Banco ────────────────────────────────────────────────────────────────────

export interface DatabaseIdentity {
  host: string
  /** Ref do projeto Supabase (`postgres.<ref>` no pooler, `db.<ref>.supabase.co` na conexão direta); null se não identificável. */
  ref: string | null
}

/** Identifica o banco SEM expor senha: só host e ref saem daqui. */
export function describeDatabase(databaseUrl: string | undefined): DatabaseIdentity | null {
  if (!databaseUrl) return null
  try {
    const u = new URL(databaseUrl)
    if (!u.hostname) return null
    const fromUser = decodeURIComponent(u.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1]
    const fromHost = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1]
    return { host: u.hostname, ref: fromUser ?? fromHost ?? null }
  } catch {
    return null
  }
}

const decodificaOuMantem = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/**
 * O que ajuda a achar o defeito de uma DATABASE_URL, SEM a senha: usuário, porta, parâmetros e
 * se a senha veio presente e limpa (aspas ou espaço nas pontas são o erro clássico de colagem).
 */
export function connectionSummary(databaseUrl: string): string | null {
  try {
    const u = new URL(databaseUrl)
    const senha = decodificaOuMantem(u.password)
    const suja = /^["'\s]|["'\s]$/.test(senha)
    const params = [...u.searchParams.keys()].join(",") || "(nenhum)"
    return (
      `usuário=${decodificaOuMantem(u.username)} porta=${u.port || "(padrão)"} ` +
      `senha=${senha ? "presente" : "AUSENTE"}${suja ? " (com aspas ou espaço nas pontas!)" : ""} parâmetros=${params}`
    )
  } catch {
    return null
  }
}

/**
 * Motivo de uma falha de CONEXÃO em texto FIXO por categoria. Nunca repassa a mensagem do
 * Prisma: ela cita host, usuário e argumentos, e a regra deste módulo é não registrá-la.
 */
export function connectionFailureHint(e: unknown): string | null {
  if (!(e instanceof Error) || e.name !== "PrismaClientInitializationError") return null
  const m = e.message
  if (/scheme is not recognized|database string is invalid/i.test(m)) {
    return "URL malformada: veio junto o prefixo `DATABASE_URL=`, aspas ou espaço?"
  }
  if (/Can't reach database server/i.test(m)) {
    return "servidor inalcançável: use o pooler (`…pooler.supabase.com`), não `db.<ref>.supabase.co` (só IPv6)"
  }
  if (/tenant\/user .* not found/i.test(m)) {
    return "usuário ou projeto não encontrado: no pooler o usuário é `postgres.<ref>`, com o ref de um projeto que exista"
  }
  if (/Authentication failed|password authentication failed/i.test(m)) {
    return "credencial recusada: a senha da URL não é a que o Supabase guardou"
  }
  return "conexão falhou (motivo fora da lista)"
}

/** `--apply` só vale se o operador digitou o ref (ou, sem ref identificável, o host) do banco em que está mirando. */
export function checkDatabaseConfirmation(db: DatabaseIdentity, confirm: string | null): boolean {
  if (!confirm) return false
  return confirm === (db.ref ?? db.host)
}

// ─── Relatório ────────────────────────────────────────────────────────────────

export function formatReport(report: RotationReport): string[] {
  const dry = report.modo === "dry-run"
  const verbo = dry ? "a-recifrar" : "recifrados"
  const out: string[] = [dry ? "Modo: DRY-RUN (nada foi gravado)." : "Modo: APPLY."]

  for (const c of report.colunas) {
    out.push(`users.${c.coluna}: lidos=${c.lidos} já-na-chave-nova=${c.jaNaChaveNova} ${verbo}=${c.recifrados} conflitos=${c.conflitos} falhos=${c.falhos}`)
    for (const f of c.ids.falhas) out.push(`  falha: id=${f.id} motivo=${f.motivo}`)
    for (const id of c.ids.conflitos) out.push(`  conflito: id=${id} (mudou durante a rodada; rodar de novo)`)
  }
  const t = report.totais
  out.push(`TOTAL: lidos=${t.lidos} já-na-chave-nova=${t.jaNaChaveNova} ${verbo}=${t.recifrados} conflitos=${t.conflitos} falhos=${t.falhos}`)
  if (report.abortado === "limite-de-falhas") out.push("A rodada PAROU ao atingir o limite de falhas. Nada foi gravado depois disso.")
  if (report.abortado === "erro-de-leitura") out.push("A rodada PAROU por erro de leitura no banco.")
  out.push(report.ok ? "RESULTADO: OK." : "RESULTADO: ATENÇÃO — há falhas, conflitos ou a rodada parou (ver acima). Exit code diferente de 0.")
  return out
}
