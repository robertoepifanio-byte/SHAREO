/**
 * Recifragem da ENCRYPTION_KEY — núcleo puro, sem `process.env` e sem banco (o
 * acesso ao banco entra por `RotationStore`, então dá para testar com um fake em
 * memória). Linha de comando: `scripts/rotate-encryption-key.ts` +
 * `scripts/lib/rotation-cli.ts`. Procedimento e mapa "quem grava / quem lê":
 * `docs/runbook-rotacao-encryption-key.md`.
 *
 * IMPLEMENTADO E TESTADO COM FAKE. NUNCA EXECUTADO CONTRA BANCO REAL.
 *
 * Colunas cifradas com a ENCRYPTION_KEY (todas no model `User`). O teste
 * `crypto-rotation.test.ts` confere esta lista contra `schema.prisma` e contra
 * os arquivos que chamam `encryptDocument`/`encryptPII`: coluna ou escritor novo
 * sem revisão da rotação reprova a CI.
 *
 * NÃO são recifradas (não usam a chave AES): `cpfHash`/`cnpjHash` (HMAC-SHA256
 * com HMAC_KEY, que CAI em ENCRYPTION_KEY se HMAC_KEY estiver vazia),
 * `totpRecoveryHashes`, `emailVerifyToken`, `PasswordResetToken.token` e
 * `idSelfieConsentTextHash` (SHA-256 sem chave).
 */
import type { Prisma, PrismaClient } from "@prisma/client"
import { decryptWithKey, encryptWithKey, isWellFormedCiphertext } from "./crypto"

export const ENCRYPTED_COLUMNS = [
  "cpfEncrypted",
  "cnpjEncrypted",
  "cnpjResponsavelLegalEncrypted",
  "totpSecretEnc",
] as const
export type EncryptedColumn = (typeof ENCRYPTED_COLUMNS)[number]

const BATCH_SIZE = 100
/** Orçamento GLOBAL de falhas: com a chave antiga errada, todas as linhas falham — parar cedo evita varrer a tabela à toa. */
const MAX_FAILURES = 20

// ─── Valor ────────────────────────────────────────────────────────────────────

export type Encrypt = (key: Buffer, plaintext: string) => string

function tryDecrypt(key: Buffer, stored: string): string | null {
  try {
    return decryptWithKey(key, stored)
  } catch {
    return null
  }
}

export type FailureReason = "formato-invalido" | "nenhuma-chave-decifra" | "ida-e-volta-divergente"

export type ValueOutcome =
  | { kind: "ja-na-chave-nova" }
  | { kind: "recifrar"; next: string }
  | { kind: "falha"; reason: FailureReason }

/**
 * Decide o que fazer com UM valor guardado. Não toca em banco e não devolve o
 * texto claro: só o novo ciphertext (já conferido) ou o motivo da falha.
 *
 * Ordem: chave NOVA primeiro — se decifra, o valor já foi recifrado (rodada
 * anterior, ou escrito pela aplicação já com a chave nova) e nada se faz. Isso
 * torna a rotina idempotente e retomável sem guardar estado. Depois a ANTIGA.
 * O GCM autentica: um valor não decifra sob duas chaves (chance ~2^-128).
 *
 * Antes de devolver `recifrar`, decifra o resultado com a chave nova (a real,
 * sempre) e compara com o claro. Só o que passa nessa ida-e-volta chega a ser
 * gravado. `encrypt` é parâmetro só para o teste poder injetar uma cifra
 * corrompida.
 */
export function rotateValue(stored: string, oldKey: Buffer, newKey: Buffer, encrypt: Encrypt = encryptWithKey): ValueOutcome {
  if (!isWellFormedCiphertext(stored)) return { kind: "falha", reason: "formato-invalido" }
  if (tryDecrypt(newKey, stored) !== null) return { kind: "ja-na-chave-nova" }

  const plaintext = tryDecrypt(oldKey, stored)
  if (plaintext === null) return { kind: "falha", reason: "nenhuma-chave-decifra" }

  try {
    const next = encrypt(newKey, plaintext)
    if (decryptWithKey(newKey, next) !== plaintext) return { kind: "falha", reason: "ida-e-volta-divergente" }
    return { kind: "recifrar", next }
  } catch {
    return { kind: "falha", reason: "ida-e-volta-divergente" }
  }
}

// ─── Execução ─────────────────────────────────────────────────────────────────

export interface RotationRow {
  id: string
  value: string
}

export interface RotationUpdate {
  id: string
  /** Valor lido. A gravação só vale se a linha AINDA tiver este valor (compare-and-swap). */
  expected: string
  next: string
}

export interface RotationStore {
  /** Próximas linhas com a coluna não-nula, `id` estritamente maior que `afterId`, ordenadas por `id`. */
  fetchBatch(column: EncryptedColumn, afterId: string | null, limit: number): Promise<RotationRow[]>
  /**
   * Grava o lote numa ÚNICA transação. Cada item só é gravado se a linha ainda
   * tiver `expected`; devolve, na ordem, se cada um foi gravado (false = a linha
   * mudou no meio — um cadastro concorrente, por exemplo — e ficou como estava).
   * Se lançar, NADA do lote foi gravado.
   */
  applyBatch(column: EncryptedColumn, updates: RotationUpdate[]): Promise<boolean[]>
}

export interface RotationOptions {
  oldKey: Buffer
  newKey: Buffer
  apply: boolean
  /** Só contagens e nomes de coluna — nunca valor. */
  log?: (message: string) => void
  columns?: readonly EncryptedColumn[]
  /** Padrões: 100 e 20. Existem para o teste exercitar vários lotes e o limite de falhas. */
  batchSize?: number
  maxFailures?: number
  /** Só para teste (cifra corrompida). */
  encrypt?: Encrypt
}

export type ColumnFailureReason = FailureReason | "erro-de-banco"

export interface ColumnReport {
  coluna: EncryptedColumn
  lidos: number
  jaNaChaveNova: number
  /** apply: quantos foram GRAVADOS · dry-run: quantos SERIAM recifrados (nada é gravado). */
  recifrados: number
  /** Linha mudou entre a leitura e a gravação: não foi sobrescrita; uma nova rodada resolve. */
  conflitos: number
  falhos: number
  porMotivo: Partial<Record<ColumnFailureReason, number>>
  /** Todos os ids (não são PII). O total é limitado pelo teto de falhas mais um lote. */
  ids: { falhas: { id: string; motivo: ColumnFailureReason }[]; conflitos: string[] }
}

export interface RotationReport {
  modo: "dry-run" | "apply"
  colunas: ColumnReport[]
  totais: { lidos: number; jaNaChaveNova: number; recifrados: number; conflitos: number; falhos: number }
  abortado: null | "limite-de-falhas" | "erro-de-leitura"
  /** true = nenhuma falha, nenhum conflito e a rodada não parou no meio. */
  ok: boolean
}

/**
 * Só o NOME e o código do erro. A mensagem de um erro do Prisma pode trazer os
 * argumentos da consulta — aqui, o ciphertext lido e o novo — e por isso nunca
 * é registrada.
 *
 * O código vem de `code` (erros de requisição, ex. P2022) ou de `errorCode`
 * (erros de inicialização: P1000 credencial recusada, P1001 host inalcançável,
 * P1013 URL malformada). Sem o segundo, "falhou ao conectar" não diz por quê.
 */
export function safeErrorLabel(e: unknown): string {
  if (!(e instanceof Error)) return "erro-desconhecido"
  const { code, errorCode } = e as { code?: unknown; errorCode?: unknown }
  const codigo = typeof code === "string" ? code : typeof errorCode === "string" ? errorCode : null
  return codigo ? `${e.name}:${codigo}` : e.name
}

function noteFailure(rep: ColumnReport, id: string, motivo: ColumnFailureReason): void {
  rep.falhos++
  rep.porMotivo[motivo] = (rep.porMotivo[motivo] ?? 0) + 1
  rep.ids.falhas.push({ id, motivo })
}

/** Classifica o lote lido; em dry-run só conta, em apply devolve o que gravar. */
function classifyRows(rows: RotationRow[], rep: ColumnReport, opts: RotationOptions): RotationUpdate[] {
  const updates: RotationUpdate[] = []
  for (const row of rows) {
    rep.lidos++
    const outcome = rotateValue(row.value, opts.oldKey, opts.newKey, opts.encrypt)
    if (outcome.kind === "ja-na-chave-nova") rep.jaNaChaveNova++
    else if (outcome.kind === "falha") noteFailure(rep, row.id, outcome.reason)
    else if (!opts.apply) rep.recifrados++
    else updates.push({ id: row.id, expected: row.value, next: outcome.next })
  }
  return updates
}

async function applyUpdates(
  store: RotationStore,
  coluna: EncryptedColumn,
  updates: RotationUpdate[],
  rep: ColumnReport,
  log: (message: string) => void,
): Promise<void> {
  try {
    const applied = await store.applyBatch(coluna, updates)
    updates.forEach((u, i) => {
      if (applied[i] === true) rep.recifrados++
      else {
        rep.conflitos++
        rep.ids.conflitos.push(u.id)
      }
    })
  } catch (e) {
    log(`[${coluna}] lote NÃO gravado (${safeErrorLabel(e)}); nenhuma linha dele foi alterada.`)
    for (const u of updates) noteFailure(rep, u.id, "erro-de-banco")
  }
}

async function rotateColumn(
  store: RotationStore,
  coluna: EncryptedColumn,
  opts: RotationOptions,
  falhasAnteriores: number,
): Promise<{ rep: ColumnReport; abortado: RotationReport["abortado"] }> {
  const log = opts.log ?? (() => {})
  const batchSize = opts.batchSize ?? BATCH_SIZE
  const maxFailures = opts.maxFailures ?? MAX_FAILURES
  const rep: ColumnReport = {
    coluna, lidos: 0, jaNaChaveNova: 0, recifrados: 0, conflitos: 0, falhos: 0, porMotivo: {}, ids: { falhas: [], conflitos: [] },
  }
  let cursor: string | null = null

  for (let lote = 1; ; lote++) {
    let rows: RotationRow[]
    try {
      rows = await store.fetchBatch(coluna, cursor, batchSize)
    } catch (e) {
      log(`[${coluna}] erro ao ler o lote ${lote}: ${safeErrorLabel(e)}`)
      return { rep, abortado: "erro-de-leitura" }
    }
    if (rows.length === 0) return { rep, abortado: null }

    const updates = classifyRows(rows, rep, opts)
    if (updates.length > 0) await applyUpdates(store, coluna, updates, rep, log)
    log(`[${coluna}] lote ${lote}: lidos=${rep.lidos} recifrados=${rep.recifrados} já-na-nova=${rep.jaNaChaveNova} conflitos=${rep.conflitos} falhos=${rep.falhos}`)

    const last = rows[rows.length - 1].id
    if (last === cursor) return { rep, abortado: null } // o store não avançou o cursor: evita laço infinito
    cursor = last
    if (falhasAnteriores + rep.falhos >= maxFailures) return { rep, abortado: "limite-de-falhas" }
  }
}

function buildReport(apply: boolean, colunas: ColumnReport[], abortado: RotationReport["abortado"]): RotationReport {
  const totais = colunas.reduce(
    (t, r) => ({
      lidos: t.lidos + r.lidos,
      jaNaChaveNova: t.jaNaChaveNova + r.jaNaChaveNova,
      recifrados: t.recifrados + r.recifrados,
      conflitos: t.conflitos + r.conflitos,
      falhos: t.falhos + r.falhos,
    }),
    { lidos: 0, jaNaChaveNova: 0, recifrados: 0, conflitos: 0, falhos: 0 },
  )
  return {
    modo: apply ? "apply" : "dry-run",
    colunas,
    totais,
    abortado,
    ok: totais.falhos === 0 && totais.conflitos === 0 && abortado === null,
  }
}

/**
 * Percorre as colunas em lotes. Dry-run (`apply: false`) lê e confere tudo, mas
 * NÃO chama `applyBatch`. Cada lote é uma transação; um lote que falha não
 * grava nada e a rodada segue até o teto GLOBAL de falhas. Retomar = rodar de
 * novo: o que já está na chave nova é pulado. Confirmar o resultado = rodar o
 * dry-run de novo (`recifrados` = 0).
 */
export async function runRotation(store: RotationStore, opts: RotationOptions): Promise<RotationReport> {
  const reports: ColumnReport[] = []
  for (const coluna of opts.columns ?? ENCRYPTED_COLUMNS) {
    const falhasAnteriores = reports.reduce((n, r) => n + r.falhos, 0)
    const { rep, abortado } = await rotateColumn(store, coluna, opts, falhasAnteriores)
    reports.push(rep)
    if (abortado) return buildReport(opts.apply, reports, abortado)
  }
  return buildReport(opts.apply, reports, null)
}

// ─── Adaptador Prisma ─────────────────────────────────────────────────────────

/**
 * Único trecho que fala com o banco. Fino de propósito e coberto por teste de
 * FORMA das consultas (o teste usa um cliente falso) — nunca rodou contra um
 * banco real.
 */
export function createPrismaStore(prisma: PrismaClient): RotationStore {
  return {
    async fetchBatch(column, afterId, limit) {
      const rows = (await prisma.user.findMany({
        where: { [column]: { not: null }, ...(afterId ? { id: { gt: afterId } } : {}) } as Prisma.UserWhereInput,
        orderBy: { id: "asc" },
        take: limit,
        select: { id: true, [column]: true } as Prisma.UserSelect,
      })) as unknown as Array<Record<string, unknown>>
      return rows.flatMap((r) => (typeof r[column] === "string" ? [{ id: String(r.id), value: r[column] as string }] : []))
    },

    async applyBatch(column, updates) {
      const results = await prisma.$transaction(
        updates.map((u) =>
          prisma.user.updateMany({
            where: { id: u.id, [column]: u.expected } as Prisma.UserWhereInput,
            data: { [column]: u.next } as Prisma.UserUpdateManyMutationInput,
          }),
        ),
      )
      return results.map((r) => r.count === 1)
    },
  }
}
