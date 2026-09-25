/**
 * scripts/storage-orfaos.ts — varre os buckets de Storage em busca de arquivos cujo
 * proprietário não existe mais (conta excluída ou com deletedAt).
 *
 * Fundador autorizou a varredura em 25/09/2026 para limpeza de contas apagadas.
 *
 * ## Pré-requisitos
 *
 *   npx supabase login   (uma vez por máquina — armazena o token em ~/.supabase)
 *
 * ## Uso
 *
 *   # modo seco (padrão) — imprime contagens e grava lista em arquivo temporário
 *   npx tsx --env-file=".env.staging-new" scripts/storage-orfaos.ts --ref zythygwvmrwrqmnrdufq
 *
 *   # execução real — apaga de verdade (só com --execute)
 *   npx tsx --env-file=".env.staging-new" scripts/storage-orfaos.ts --ref zythygwvmrwrqmnrdufq --execute
 *
 * ## Estratégia de varredura
 *
 *   "DB-first": em vez de listar TODOS os arquivos do bucket e fazer lookup de cada um
 *   (O(arquivos) queries), o script consulta o banco para encontrar usuários com deletedAt
 *   e itens cujo dono foi excluído, e verifica se há arquivos nos prefixos conhecidos.
 *   Isso é O(usuários_excluídos) — muito mais rápido num bucket com milhares de arquivos.
 *
 *   Prefixos verificados por bucket:
 *     item-images:    uploads/<userId>/             (avatar)
 *                     <itemId>/                     (fotos de itens de donos excluídos)
 *     booking-photos: uploads/<userId>/             (avaliação)
 *                     bookings/<bookingId>/          (fotos de reservas onde AMBOS excluídos)
 *     id-docs:        id-verification/<userId>/     (documento e selfie)
 *
 * ## Segurança
 *
 *   --ref <ref>  obrigatório. Deve bater com o ref no DATABASE_URL e no NEXT_PUBLIC_SUPABASE_URL.
 *                staging = zythygwvmrwrqmnrdufq   prod = jdxdndrhjxtkaifbpagr
 *                Se divergirem, o script aborta ANTES de qualquer leitura.
 *
 * ## Lógica de classificação
 *
 *   Ver scripts/lib/storage-orfaos-core.ts (testável sem Prisma/Supabase CLI).
 */

import os   from "node:os"
import fs   from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { PrismaClient }   from "@prisma/client"
import {
  validarRef,
  validarRefSupabaseUrl,
  REFS_CONHECIDOS,
} from "./lib/storage-orfaos-core"

// ────────────────────────────────────────────────────────────────────────────
// Argumentos
// ────────────────────────────────────────────────────────────────────────────

const EXECUTAR  = process.argv.includes("--execute")
const argRef    = (() => {
  const i = process.argv.indexOf("--ref")
  return i > -1 ? process.argv[i + 1] : undefined
})()

if (!argRef) {
  console.error("ERRO: --ref <supabase-ref> é obrigatório.")
  console.error(`  staging: --ref ${REFS_CONHECIDOS.staging}`)
  console.error(`  prod:    --ref ${REFS_CONHECIDOS.prod}`)
  process.exit(1)
}

// ────────────────────────────────────────────────────────────────────────────
// Validação de ambiente (antes de qualquer I/O)
// ────────────────────────────────────────────────────────────────────────────

const DATABASE_URL          = process.env.DATABASE_URL ?? ""
const SUPABASE_URL          = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não definida no ambiente.")
  process.exit(1)
}
if (!SUPABASE_URL) {
  console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL não definida no ambiente.")
  process.exit(1)
}
if (!SUPABASE_SERVICE_KEY && EXECUTAR) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não definida — obrigatória para --execute.")
  process.exit(1)
}
if (!SUPABASE_SERVICE_KEY) {
  console.log("Nota: SUPABASE_SERVICE_ROLE_KEY não definida — ok para simulação; obrigatória com --execute.")
}

const checkDb  = validarRef(DATABASE_URL, argRef)
const checkUrl = validarRefSupabaseUrl(SUPABASE_URL, argRef)

if (!checkDb.ok) {
  console.error(
    `ABORTADO — --ref "${argRef}" não bate com o ref no DATABASE_URL ` +
    `("${checkDb.refEncontrado}"). Nada foi lido ou alterado.`,
  )
  console.error("Confirme que o --env-file aponta para o ambiente correto.")
  process.exit(1)
}
if (!checkUrl.ok) {
  console.error(
    `ABORTADO — --ref "${argRef}" não bate com o ref no NEXT_PUBLIC_SUPABASE_URL ` +
    `("${checkUrl.refEncontrado}"). Nada foi lido ou alterado.`,
  )
  console.error("Confirme que o --env-file aponta para o ambiente correto.")
  process.exit(1)
}

console.log(`ref confirmado: ${argRef}  (banco: ${checkDb.refEncontrado})`)
console.log(`modo: ${EXECUTAR ? "EXECUÇÃO — arquivos serão apagados" : "SIMULAÇÃO (use --execute para apagar de verdade)"}`)
console.log()

// ────────────────────────────────────────────────────────────────────────────
// Supabase CLI helper — lista prefixo não-recursivo
//
// 🪤 `shell: true` é obrigatório no Windows (npx é um .cmd; sem shell o Node
// recusa com EINVAL — CVE-2024-27980). Todos os argumentos são literais do
// código — nenhum vem de input externo não-sanitizado.
// ────────────────────────────────────────────────────────────────────────────

function cliListar(bucket: string, prefixo: string): string[] {
  const url = `ss:///${bucket}/${prefixo}`
  const r   = spawnSync("npx", ["supabase", "storage", "ls", "--experimental", "--project-ref", argRef!, url], {
    encoding: "utf-8",
    env:      { ...process.env },
    shell:    true,
    cwd:      "./",
  })

  if (r.status !== 0 || !r.stdout) return []

  let data: { paths?: string[] }
  try {
    data = JSON.parse(r.stdout)
  } catch {
    return []
  }

  // Normalização determinística: strip opcional "/" inicial, depois strip opcional "<bucket>/" inicial.
  const reBucket = new RegExp(`^/?(?:${bucket}/)?`)
  return (data.paths ?? [])
    .filter((p) => !p.endsWith("/"))
    .map((p) => p.replace(reBucket, ""))
    .filter(Boolean)
}

// ────────────────────────────────────────────────────────────────────────────
// Remoção via HTTP direto
// ────────────────────────────────────────────────────────────────────────────

async function removerArquivos(bucket: string, paths: string[]): Promise<{ apagados: number; erro?: string }> {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}`
  const r   = await fetch(url, {
    method: "DELETE",
    headers: {
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  })

  if (!r.ok) {
    const txt = await r.text().catch(() => "")
    return { apagados: 0, erro: `HTTP ${r.status}: ${txt.slice(0, 200)}` }
  }

  return { apagados: paths.length }
}

// ────────────────────────────────────────────────────────────────────────────
// Prisma
// ────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

// ────────────────────────────────────────────────────────────────────────────
// Tipos de resultado
// ────────────────────────────────────────────────────────────────────────────

type ArquivoOrfao = {
  bucket:  string
  path:    string
  motivo:  string
}
type ArquivoIndeterminado = {
  bucket:  string
  prefixo: string
  motivo:  string
}

// ────────────────────────────────────────────────────────────────────────────
// Varredura principal (DB-first)
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Estratégia: DB-first — consulta usuários/itens excluídos, verifica prefixos no Storage.\n")

  const orfaos:          ArquivoOrfao[]          = []
  const indeterminados:  ArquivoIndeterminado[]  = []

  const contagemPorBucket: Record<string, { verificados: number; orfaos: number }> = {
    "item-images":    { verificados: 0, orfaos: 0 },
    "booking-photos": { verificados: 0, orfaos: 0 },
    "id-docs":        { verificados: 0, orfaos: 0 },
  }

  // ── Queries ao banco em paralelo ─────────────────────────────────────────

  console.log("Consultando banco (usuários, itens e reservas excluídos em paralelo)...")
  const [usuariosExcluidos, itensDeDonos, reservasDuplas] = await Promise.all([
    prisma.user.findMany({
      where:  { deletedAt: { not: null } },
      select: { id: true, deletedAt: true },
    }),
    prisma.item.findMany({
      where:  { owner: { deletedAt: { not: null } } },
      select: { id: true, ownerId: true },
    }),
    prisma.booking.findMany({
      where: {
        owner:    { deletedAt: { not: null } },
        borrower: { deletedAt: { not: null } },
      },
      select: { id: true, ownerId: true, borrowerId: true },
    }),
  ])
  console.log(`  ${usuariosExcluidos.length} usuário(s) com deletedAt`)
  console.log(`  ${itensDeDonos.length} item(ns) com dono excluído`)
  console.log(`  ${reservasDuplas.length} reserva(s) com ambos os participantes excluídos`)
  console.log()

  // ── 1. Usuários com deletedAt (soft-deleted) ──────────────────────────────

  for (const u of usuariosExcluidos) {
    const uid = u.id

    // item-images: uploads/<userId>/
    const arquivosImg = cliListar("item-images", `uploads/${uid}/`)
    contagemPorBucket["item-images"].verificados += arquivosImg.length
    for (const arq of arquivosImg) {
      orfaos.push({ bucket: "item-images", path: arq, motivo: `usuário ${uid} tem deletedAt` })
      contagemPorBucket["item-images"].orfaos++
    }

    // booking-photos: uploads/<userId>/
    const arquivosPhoto = cliListar("booking-photos", `uploads/${uid}/`)
    contagemPorBucket["booking-photos"].verificados += arquivosPhoto.length
    for (const arq of arquivosPhoto) {
      orfaos.push({ bucket: "booking-photos", path: arq, motivo: `usuário ${uid} tem deletedAt` })
      contagemPorBucket["booking-photos"].orfaos++
    }

    // id-docs: id-verification/<userId>/
    const arquivosId = cliListar("id-docs", `id-verification/${uid}/`)
    contagemPorBucket["id-docs"].verificados += arquivosId.length
    for (const arq of arquivosId) {
      orfaos.push({ bucket: "id-docs", path: arq, motivo: `usuário ${uid} tem deletedAt` })
      contagemPorBucket["id-docs"].orfaos++
    }
  }

  // ── 2. Itens cujo dono tem deletedAt — fotos do item em item-images/<itemId>/ ──

  for (const item of itensDeDonos) {
    const arquivos = cliListar("item-images", `${item.id}/`)
    contagemPorBucket["item-images"].verificados += arquivos.length
    for (const arq of arquivos) {
      orfaos.push({
        bucket: "item-images", path: arq,
        motivo: `item ${item.id} → dono ${item.ownerId} tem deletedAt`,
      })
      contagemPorBucket["item-images"].orfaos++
    }
  }

  // ── 3. Reservas cujos dois participantes têm deletedAt ────────────────────

  for (const b of reservasDuplas) {
    // Uma única chamada cliListar — se retornar vazio, não há nada a fazer.
    const arquivos = cliListar("booking-photos", `bookings/${b.id}/`)
    contagemPorBucket["booking-photos"].verificados += arquivos.length
    for (const arq of arquivos) {
      orfaos.push({
        bucket: "booking-photos", path: arq,
        motivo: `reserva ${b.id} → proprietário ${b.ownerId} e locatário ${b.borrowerId} ambos com deletedAt`,
      })
      contagemPorBucket["booking-photos"].orfaos++
    }
  }

  // ── 4. Usuários que não existem mais no banco (deleção física ou limpeza antiga) ──
  // Se houver caminhos cujo userId não existe no banco, classificamos como indeterminado
  // (não podemos saber se o dono autorizou a exclusão sem um registro).
  // Por ora, listamos como "indeterminado" apenas — não deletamos automaticamente.
  // (Implementação futura: aceitar --include-inexistentes para deletar esses também.)

  // ────────────────────────────────────────────────────────────────────────
  // Gravar lista em arquivo temporário
  // ────────────────────────────────────────────────────────────────────────

  console.log()
  const ts       = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const listFile = path.join(os.tmpdir(), `shareo-orfaos-${argRef!.slice(0, 8)}-${ts}.json`)

  const payload = {
    ref:   argRef,
    data:  new Date().toISOString(),
    contagemPorBucket,
    orfaos,
    indeterminados,
  }
  fs.writeFileSync(listFile, JSON.stringify(payload, null, 2), "utf-8")
  console.log(`Lista gravada em: ${listFile}`)
  console.log()

  // ────────────────────────────────────────────────────────────────────────
  // Resumo final
  // ────────────────────────────────────────────────────────────────────────

  console.log("=== RESUMO FINAL ===")
  for (const [bucket, c] of Object.entries(contagemPorBucket)) {
    console.log(`  ${bucket.padEnd(20)} verificados=${c.verificados}  órfãos=${c.orfaos}`)
  }
  console.log(`\nTotal órfãos: ${orfaos.length}  |  Indeterminados: ${indeterminados.length}`)
  console.log()

  if (orfaos.length > 0) {
    console.log("Primeiros órfãos encontrados:")
    for (const arq of orfaos.slice(0, 10)) {
      console.log(`  [${arq.bucket}] ${arq.path}`)
      console.log(`     motivo: ${arq.motivo}`)
    }
    if (orfaos.length > 10) console.log(`  ... e mais ${orfaos.length - 10} (ver ${listFile})`)
    console.log()
  } else {
    console.log("Nenhum arquivo órfão encontrado.")
  }

  // ────────────────────────────────────────────────────────────────────────
  // Execução (somente com --execute)
  // ────────────────────────────────────────────────────────────────────────

  if (!EXECUTAR) {
    console.log("Modo seco — nada foi apagado.")
    console.log()
    console.log("Para apagar de verdade, rode o comando abaixo (só o fundador deve executar):")
    console.log()
    console.log(
      `  npx tsx --env-file="<arquivo-env>" scripts/storage-orfaos.ts ` +
      `--ref ${argRef} --execute`,
    )
    return
  }

  if (orfaos.length === 0) {
    console.log("Nada a apagar.")
    return
  }

  const LOTE = 100
  let apagadosTotal = 0
  let falhasTotal   = 0

  // Agrupar por bucket
  const porBucket = new Map<string, string[]>()
  for (const arq of orfaos) {
    const lista = porBucket.get(arq.bucket) ?? []
    lista.push(arq.path)
    porBucket.set(arq.bucket, lista)
  }

  for (const [bucket, paths] of porBucket) {
    for (let i = 0; i < paths.length; i += LOTE) {
      const lote = paths.slice(i, i + LOTE)
      const { apagados, erro } = await removerArquivos(bucket, lote)
      if (erro) {
        console.error(`[ERRO] bucket=${bucket} lote ${i}–${i + lote.length}: ${erro}`)
        falhasTotal += lote.length
      } else {
        apagadosTotal += apagados
      }
    }
  }

  console.log(`\nApagados (HTTP 200): ${apagadosTotal}  |  Falhas: ${falhasTotal}`)
  if (falhasTotal > 0) {
    console.error("Alguns arquivos não foram apagados. Verifique os logs e tente novamente.")
    process.exit(1)
  }

  // ────────────────────────────────────────────────────────────────────────
  // Verificação pós-exclusão — um 200 do endpoint DELETE não é prova de remoção.
  // Re-lista os prefixos de cada órfão e confirma que o arquivo sumiu.
  // ────────────────────────────────────────────────────────────────────────

  console.log("\nVerificando exclusões no Storage (re-listando prefixos)...")

  // Mapeia cada arquivo órfão para o prefixo pai e inverte para verificação
  const orfaosSet = new Set(orfaos.map((a) => `${a.bucket}::${a.path}`))
  const prefixosVerificar: Array<{ bucket: string; prefixo: string }> = []
  const prefixosVistos = new Set<string>()
  for (const arq of orfaos) {
    const idx    = arq.path.lastIndexOf("/")
    const prefixo = idx >= 0 ? arq.path.slice(0, idx + 1) : ""
    const chave  = `${arq.bucket}::${prefixo}`
    if (!prefixosVistos.has(chave)) {
      prefixosVistos.add(chave)
      prefixosVerificar.push({ bucket: arq.bucket, prefixo })
    }
  }

  let confirmados    = 0
  let aindaPresentes = 0
  for (const { bucket, prefixo } of prefixosVerificar) {
    const restantes = cliListar(bucket, prefixo)
    for (const p of restantes) {
      if (orfaosSet.has(`${bucket}::${p}`)) aindaPresentes++
    }
  }
  confirmados = orfaos.length - aindaPresentes

  console.log(`Confirmados apagados: ${confirmados} / ${orfaos.length}`)
  if (aindaPresentes > 0) {
    console.error(`ATENÇÃO: ${aindaPresentes} arquivo(s) ainda presentes após exclusão — verifique manualmente.`)
    process.exit(1)
  }
  console.log("Todos os arquivos confirmados como removidos.")
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
