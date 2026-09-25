/**
 * scripts/storage-orfaos.ts — varre os buckets de Storage em busca de arquivos cujo
 * proprietário não existe mais (conta excluída ou com deletedAt).
 *
 * Fundador autorizou a varredura em 25/09/2026 para limpeza de contas apagadas.
 *
 * ## Pré-requisitos
 *
 *   SUPABASE_SERVICE_ROLE_KEY=<jwt>  obrigatório em TODOS os modos (leitura + escrita).
 *
 *   ⚠️  A chave deve ser no formato JWT antigo (`eyJh…`), NÃO o formato `sb_secret_*`.
 *   O endpoint `/storage/v1/object/list` do Supabase rejeita `sb_secret_*` com
 *   "Invalid Compact JWS". Use a chave JWT que aparece em:
 *     Supabase Dashboard → Project Settings → API → service_role (legacy).
 *
 * ## Uso
 *
 *   # modo seco (padrão) — imprime contagens e grava lista em arquivo temporário
 *   npx tsx --env-file=".env.staging-migrate" scripts/storage-orfaos.ts --ref zythygwvmrwrqmnrdufq
 *
 *   # execução real — apaga de verdade (só com --execute)
 *   npx tsx --env-file=".env.staging-migrate" scripts/storage-orfaos.ts --ref zythygwvmrwrqmnrdufq --execute
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
import { PrismaClient }       from "@prisma/client"
import { createAdminClient }  from "../lib/supabase/admin"
import { storagePathFromUrl } from "../lib/supabase/user-storage-paths"
import {
  validarRef,
  validarRefSupabaseUrl,
  REFS_CONHECIDOS,
  extrairUserIdDoNomeArquivo,
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
if (!SUPABASE_SERVICE_KEY) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não definida.")
  console.error("A chave é obrigatória para TODOS os modos — listagem de Storage exige autenticação.")
  console.error("⚠️  Use a chave JWT legada (eyJh…) do Supabase Dashboard → Project Settings → API → service_role.")
  console.error("    Chaves no formato sb_secret_* são INCOMPATÍVEIS com o endpoint /storage/v1/object/list.")
  process.exit(1)
}

// Detectar chaves no novo formato sb_* que o Storage v1 rejeita com "Invalid Compact JWS"
if (/^sb_(secret|publishable)_/.test(SUPABASE_SERVICE_KEY)) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY está no novo formato sb_*.")
  console.error("O endpoint Storage v1 rejeita esse formato com 'Invalid Compact JWS'.")
  console.error("Gere a chave JWT legada em: Supabase Dashboard → Project Settings → API → service_role (JWT).")
  console.error("A chave JWT começa com 'eyJh…'.")
  process.exit(1)
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
// Cliente Supabase (service role) — para listagem e deleção
// ────────────────────────────────────────────────────────────────────────────

const supabase = createAdminClient()

// Contador de erros de listagem: qualquer falha durante a varredura marca o
// resultado como incompleto — nunca reportar "0 órfãos" quando uma lista falhou.
let errosListagem = 0

// ────────────────────────────────────────────────────────────────────────────
// apiListar — lista um prefixo não-recursivo via Supabase Storage SDK.
//
// Retorna caminhos completos relativos ao bucket: "<prefixo><nome-arquivo>".
// Subdiretórios (entries onde metadata é null) são ignorados — a varredura
// é profunda o suficiente para os padrões conhecidos do Shareo.
// ────────────────────────────────────────────────────────────────────────────

async function apiListar(bucket: string, prefixo: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefixo, {
    limit: 1000,
    offset: 0,
  })

  if (error) {
    // Nunca engolir erros silenciosamente: incrementar contador para que o
    // script encerre com exit 1 e reporte "resultado incompleto".
    errosListagem++
    console.error(`  [ERRO LISTAGEM] apiListar(${bucket}, "${prefixo}") → ${error.message}`)
    return []
  }

  const base = prefixo === "" || prefixo.endsWith("/") ? prefixo : `${prefixo}/`
  return (data ?? [])
    .filter((item) => item.id !== null && item.name !== ".emptyFolderPlaceholder")
    .map((item) => `${base}${item.name}`)
}

// ────────────────────────────────────────────────────────────────────────────
// autoTesteListagem — verifica que a listagem realmente retorna arquivos.
//
// Consulta o banco para encontrar um item ativo com fotos e lista esse prefixo.
// Se retornar 0 arquivos (sem erro de API), a listagem está quebrada.
// ────────────────────────────────────────────────────────────────────────────

async function autoTesteListagem(prismaClient: PrismaClient): Promise<void> {
  console.log("Teste de sanidade: verificando que a listagem de Storage funciona...")

  // Tenta os 5 itens ativos com fotos mais recentes — usa o primeiro cujo prefixo
  // retorna > 0 arquivos no Storage.  Se nenhum retornar arquivos, a listagem está
  // quebrada e abortamos (throw, capturado no main).
  const candidatos = await prismaClient.item.findMany({
    where:   { deletedAt: null, images: { some: {} } },
    select:  { id: true },
    orderBy: { createdAt: "desc" },
    take:    5,
  })

  if (candidatos.length === 0) {
    console.log("  Sem itens ativos com fotos no banco — teste de sanidade pulado.")
    return
  }

  // Resets any erros counted during the self-test so they don't pollute the main scan
  const errosAntes = errosListagem

  for (const item of candidatos) {
    const prefixo  = `${item.id}/`
    const arquivos = await apiListar("item-images", prefixo)
    if (arquivos.length > 0) {
      console.log(`  OK — item "${item.id}" → ${arquivos.length} arquivo(s) listado(s). Listagem funcional.\n`)
      // Descarta erros de listagem do próprio self-test (podem ser prefixos vazios)
      errosListagem = errosAntes
      return
    }
  }

  // Nenhum dos 5 itens retornou arquivos
  throw new Error(
    `Teste de sanidade FALHOU — nenhum dos ${candidatos.length} item(ns) ativos com fotos ` +
    `retornou arquivos em item-images. ` +
    `Causas prováveis: (1) SUPABASE_SERVICE_ROLE_KEY sem permissão de leitura, ` +
    `(2) chave JWT expirada, (3) Storage inacessível. ` +
    `A listagem está quebrada — nada foi lido nem apagado.`,
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Remoção via Supabase Storage SDK
// ────────────────────────────────────────────────────────────────────────────

async function removerArquivos(bucket: string, paths: string[]): Promise<{ apagados: number; erro?: string }> {
  const { data, error } = await supabase.storage.from(bucket).remove(paths)
  if (error) {
    return { apagados: 0, erro: error.message }
  }
  return { apagados: (data ?? []).length }
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

  // ── Teste de sanidade: confirma que a listagem funciona antes de prosseguir ──
  await autoTesteListagem(prisma)

  const orfaos:          ArquivoOrfao[]          = []
  const indeterminados:  ArquivoIndeterminado[]  = []

  const contagemPorBucket: Record<string, { verificados: number; orfaos: number }> = {
    "item-images":    { verificados: 0, orfaos: 0 },
    "booking-photos": { verificados: 0, orfaos: 0 },
    "id-docs":        { verificados: 0, orfaos: 0 },
  }

  // ── Queries ao banco ─────────────────────────────────────────────────────
  // Passo 1: usuários excluídos — base para as queries dependentes.

  console.log("Consultando banco (usuários, itens e reservas excluídos)...")
  const usuariosExcluidos = await prisma.user.findMany({
    where:  { deletedAt: { not: null } },
    select: { id: true, deletedAt: true },
  })
  const deletedUserIds    = usuariosExcluidos.map(u => u.id)
  const deletedUserIdSet  = new Set(deletedUserIds)

  // Passo 2: queries que dependem dos IDs acima, executadas em paralelo.
  const [itensDeDonos, reservasDuplas, fotosDeExcluidos, reservasComUmExcluido] = await Promise.all([
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
    // Fotos enviadas por usuário excluído (independente de quem é o outro participante).
    deletedUserIds.length === 0
      ? Promise.resolve([] as Array<{ url: string; uploadedBy: string; bookingId: string }>)
      : prisma.bookingPhoto.findMany({
          where:  { uploadedBy: { in: deletedUserIds } },
          select: { url: true, uploadedBy: true, bookingId: true },
        }),
    // Reservas em que APENAS UM participante foi excluído (as com ambos excluídos já estão
    // em reservasDuplas e são tratadas separadamente para evitar duplicação).
    deletedUserIds.length === 0
      ? Promise.resolve([] as Array<{ id: string }>)
      : prisma.booking.findMany({
          where: {
            OR: [
              { ownerId: { in: deletedUserIds } },
              { borrowerId: { in: deletedUserIds } },
            ],
            NOT: {
              AND: [
                { ownerId: { in: deletedUserIds } },
                { borrowerId: { in: deletedUserIds } },
              ],
            },
          },
          select: { id: true },
        }),
  ])

  console.log(`  ${usuariosExcluidos.length} usuário(s) com deletedAt`)
  console.log(`  ${itensDeDonos.length} item(ns) com dono excluído`)
  console.log(`  ${reservasDuplas.length} reserva(s) com ambos os participantes excluídos`)
  console.log(`  ${fotosDeExcluidos.length} foto(s) de reserva enviada(s) por usuário excluído`)
  console.log(`  ${reservasComUmExcluido.length} reserva(s) com exatamente um participante excluído`)
  console.log()

  // ── 1. Usuários com deletedAt (soft-deleted) ──────────────────────────────
  // Os 3 buckets por usuário são independentes — listar em paralelo com Promise.all.

  for (const u of usuariosExcluidos) {
    const uid = u.id
    const [arquivosImg, arquivosPhoto, arquivosId] = await Promise.all([
      apiListar("item-images",    `uploads/${uid}/`),
      apiListar("booking-photos", `uploads/${uid}/`),
      apiListar("id-docs",        `id-verification/${uid}/`),
    ])

    contagemPorBucket["item-images"].verificados += arquivosImg.length
    for (const arq of arquivosImg) {
      orfaos.push({ bucket: "item-images", path: arq, motivo: `usuário ${uid} tem deletedAt` })
      contagemPorBucket["item-images"].orfaos++
    }

    contagemPorBucket["booking-photos"].verificados += arquivosPhoto.length
    for (const arq of arquivosPhoto) {
      orfaos.push({ bucket: "booking-photos", path: arq, motivo: `usuário ${uid} tem deletedAt` })
      contagemPorBucket["booking-photos"].orfaos++
    }

    contagemPorBucket["id-docs"].verificados += arquivosId.length
    for (const arq of arquivosId) {
      orfaos.push({ bucket: "id-docs", path: arq, motivo: `usuário ${uid} tem deletedAt` })
      contagemPorBucket["id-docs"].orfaos++
    }
  }

  // ── 2. Itens cujo dono tem deletedAt — fotos do item em item-images/<itemId>/ ──

  for (const item of itensDeDonos) {
    const arquivos = await apiListar("item-images", `${item.id}/`)
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
    const arquivos = await apiListar("booking-photos", `bookings/${b.id}/`)
    contagemPorBucket["booking-photos"].verificados += arquivos.length
    for (const arq of arquivos) {
      orfaos.push({
        bucket: "booking-photos", path: arq,
        motivo: `reserva ${b.id} → proprietário ${b.ownerId} e locatário ${b.borrowerId} ambos com deletedAt`,
      })
      contagemPorBucket["booking-photos"].orfaos++
    }
  }

  // ── 4. Fotos de reservas enviadas por usuário excluído (DB-first via BookingPhoto) ──
  //
  // Cobre o caso em que o outro participante ainda é ativo — sem esta seção, essas fotos
  // só seriam limpas quando o segundo participante também fosse excluído.
  // As fotos cujo bookingId está em reservasDuplas já foram capturadas na seção 3
  // (todos os arquivos do prefixo bookings/<id>/ são marcados); filtramos para não duplicar.
  //
  // O caminho no Storage é extraído da URL pública gravada no banco:
  //   https://<ref>.supabase.co/storage/v1/object/public/booking-photos/<path>

  const reservasDuplasIds = new Set(reservasDuplas.map(b => b.id))
  // Rastreia "bucket::path" entre seções 3/4/5 para segurança contra reordenações futuras.
  // As seções são mutuamente exclusivas por design (guards explícitos), mas o Set
  // garante idempotência caso a ordem mude.
  const orfaosAdicionados = new Set<string>(
    orfaos.map(o => `${o.bucket}::${o.path}`),
  )

  // Helper: registra um arquivo como órfão em booking-photos, sem duplicar.
  function adicionarOrfaoBp(storagePath: string, motivo: string): void {
    const chave = `booking-photos::${storagePath}`
    if (orfaosAdicionados.has(chave)) return
    orfaosAdicionados.add(chave)
    orfaos.push({ bucket: "booking-photos", path: storagePath, motivo })
    contagemPorBucket["booking-photos"].orfaos++
  }

  for (const foto of fotosDeExcluidos) {
    // Reservas com ambos excluídos já foram tratadas na seção 3 (todos os arquivos do prefixo).
    if (reservasDuplasIds.has(foto.bookingId)) continue

    // Extrai o path do Storage a partir da URL pública usando storagePathFromUrl (lib).
    const storagePath = storagePathFromUrl(foto.url, "booking-photos")
    if (!storagePath) {
      console.warn(`  [AVISO] Não foi possível extrair path de Storage da URL: ${foto.url}`)
      continue
    }
    adicionarOrfaoBp(
      storagePath,
      `foto enviada por ${foto.uploadedBy} (conta excluída) em reserva ${foto.bookingId}`,
    )
  }

  // ── 5. Arquivos sem linha BookingPhoto — verificação pelo sufixo -<userId> ──
  //
  // Para reservas em que exatamente um participante foi excluído, lista os arquivos do
  // Storage e verifica se cada um possui linha na tabela BookingPhoto.
  // Arquivos sem linha são classificados pelo userId embutido no sufixo do nome de arquivo:
  //   <timestamp>-<userId>.<ext>
  // Se esse userId pertencer a um usuário excluído → órfão; caso contrário → mantém.
  //
  // Pré-carga dos paths de BookingPhoto para as reservas em questão (evita N queries).

  let pathsFotosExistentes = new Set<string>()
  if (reservasComUmExcluido.length > 0) {
    const fotosExistentes = await prisma.bookingPhoto.findMany({
      where:  { bookingId: { in: reservasComUmExcluido.map(b => b.id) } },
      select: { url: true },
    })
    // Extrai o path do Storage de cada URL com a mesma lib da seção 4.
    pathsFotosExistentes = new Set(
      fotosExistentes
        .map(f => storagePathFromUrl(f.url, "booking-photos"))
        .filter((p): p is string => p !== null),
    )
  }

  // Listas independentes: paralelize todas as chamadas de Storage de uma vez.
  const listagensFases = reservasComUmExcluido.flatMap(reserva =>
    (["checkin", "checkout"] as const).map(fase => ({
      reservaId: reserva.id,
      prefixo:   `bookings/${reserva.id}/${fase}/`,
    })),
  )
  const resultadosListagens = await Promise.all(
    listagensFases.map(({ prefixo }) => apiListar("booking-photos", prefixo)),
  )
  for (let i = 0; i < listagensFases.length; i++) {
    const { reservaId } = listagensFases[i]
    const arquivos      = resultadosListagens[i]
    contagemPorBucket["booking-photos"].verificados += arquivos.length

    for (const arq of arquivos) {
      // Arquivo já tem linha no BookingPhoto: tratado na seção 4 se uploadedBy excluído.
      if (pathsFotosExistentes.has(arq)) continue

      // Sem linha: classificar pelo sufixo -<userId> do nome de arquivo.
      const segmentos   = arq.split("/")
      const nomeArquivo = segmentos[segmentos.length - 1] ?? ""
      const uploaderIdNoNome = extrairUserIdDoNomeArquivo(nomeArquivo)

      if (uploaderIdNoNome !== null && deletedUserIdSet.has(uploaderIdNoNome)) {
        adicionarOrfaoBp(
          arq,
          `arquivo sem linha BookingPhoto, uploader ${uploaderIdNoNome} excluído, reserva ${reservaId}`,
        )
      }
      // Uploader ativo ou userId não identificável → mantém o arquivo.
    }
  }

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

  // ────────────────────────────────────────────────────────────────────────
  // Verificação de integridade: qualquer erro de listagem invalida o resultado.
  // Nunca reportar "0 órfãos" se a listagem falhou para algum prefixo.
  // ────────────────────────────────────────────────────────────────────────

  if (errosListagem > 0) {
    console.error(
      `\nRESULTADO INCOMPLETO — ${errosListagem} erro(s) de listagem ocorreram durante a varredura.`,
    )
    console.error(
      "Alguns prefixos podem não ter sido verificados. Corrija os erros e rode novamente.",
    )
    process.exit(1)
  }

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

  // errosListagem já verificado acima — se chegou aqui, está zerado.

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
    const restantes = await apiListar(bucket, prefixo)
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
