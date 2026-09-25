/**
 * scripts/lib/storage-orfaos-core.ts — lógica pura de classificação de arquivos órfãos.
 *
 * Separada do script principal para ser testável sem precisar de Prisma ou Supabase SDK.
 * Importada por scripts/storage-orfaos.ts e pelos testes Jest.
 *
 * ## Padrões de caminho por bucket
 *
 *   item-images
 *     <itemId>/<filename>           → chave: itemId  → owner = item.ownerId
 *     uploads/<userId>/<filename>   → chave: userId  → owner = userId (avatar do perfil)
 *
 *   booking-photos
 *     bookings/<bookingId>/<fase>/<ts>-<userId>.<ext>  → chave: bookingId → owner = booking.ownerId/borrowerId
 *     uploads/<userId>/<filename>                      → chave: userId    → owner = userId
 *
 *   id-docs
 *     id-verification/<userId>/<filename>  → chave: userId  → owner = userId
 *
 * ## Classificação
 *
 *   "orfao"         — caminho mapeado para userId e o usuário não existe ou tem deletedAt
 *   "indeterminado" — caminho não corresponde a nenhum padrão conhecido
 *                     (ou a lookup de item/booking não encontrou registro — dono incerto)
 *
 * Nunca lança: retorna o resultado mesmo que alguns lookups falhem (classificados como
 * "indeterminado" para não deletar sem certeza).
 */

/** Representa um arquivo listado no Storage (pasta vira id: null). */
export type ArquivoStorage = {
  path:   string
  bucket: string
}

export type ClassificacaoArquivo =
  | { status: "orfao";         path: string; bucket: string; motivo: string }
  | { status: "indeterminado"; path: string; bucket: string; motivo: string }
  | { status: "ativo";         path: string; bucket: string }

export type DonoBuscado = {
  /** userId do proprietário do caminho, ou null se não determinável. */
  userId: string | null
  /** true se o usuário existe e não foi excluído logicamente. */
  ativo:  boolean
}

/** Contrato mínimo que a lógica precisa do banco — injetável nos testes. */
export interface LookupDB {
  userExists(userId: string): Promise<boolean>
  ownerOfItem(itemId: string): Promise<string | null>
  ownerOfBooking(bookingId: string): Promise<{ ownerId: string; borrowerId: string } | null>
}

/** Regex de cuid/uuid aceito como segmento de ID. */
export const RE_ID = /^[A-Za-z0-9_-]{4,36}$/

/**
 * Extrai o userId (ou outra chave) do caminho e retorna a categoria do padrão.
 * Retorna null se o caminho não bater em nenhum padrão.
 */
export type PadraoCaminho =
  | { tipo: "userId";    userId: string }
  | { tipo: "itemId";    itemId: string }
  | { tipo: "bookingId"; bookingId: string }
  | { tipo: "desconhecido" }

export function extrairPadrao(bucket: string, path: string): PadraoCaminho {
  const segs = path.split("/")

  if (bucket === "id-docs") {
    // id-verification/<userId>/…
    if (segs[0] === "id-verification" && segs.length >= 2 && RE_ID.test(segs[1])) {
      return { tipo: "userId", userId: segs[1] }
    }
    return { tipo: "desconhecido" }
  }

  if (bucket === "item-images" || bucket === "booking-photos") {
    // uploads/<userId>/…
    if (segs[0] === "uploads" && segs.length >= 2 && RE_ID.test(segs[1])) {
      return { tipo: "userId", userId: segs[1] }
    }
  }

  if (bucket === "item-images") {
    // <itemId>/<filename>
    if (segs.length >= 2 && RE_ID.test(segs[0])) {
      return { tipo: "itemId", itemId: segs[0] }
    }
    return { tipo: "desconhecido" }
  }

  if (bucket === "booking-photos") {
    // bookings/<bookingId>/…
    if (segs[0] === "bookings" && segs.length >= 3 && RE_ID.test(segs[1])) {
      return { tipo: "bookingId", bookingId: segs[1] }
    }
    return { tipo: "desconhecido" }
  }

  return { tipo: "desconhecido" }
}

/**
 * Classifica um arquivo como ativo, órfão ou indeterminado.
 * Nunca lança — erros de DB viram "indeterminado".
 */
export async function classificarArquivo(
  bucket: string,
  path:   string,
  db:     LookupDB,
): Promise<ClassificacaoArquivo> {
  const padrao = extrairPadrao(bucket, path)

  if (padrao.tipo === "desconhecido") {
    return { status: "indeterminado", bucket, path, motivo: "caminho não reconhecido" }
  }

  try {
    if (padrao.tipo === "userId") {
      const ativo = await db.userExists(padrao.userId)
      if (!ativo) {
        return { status: "orfao", bucket, path, motivo: `usuário ${padrao.userId} não existe ou tem deletedAt` }
      }
      return { status: "ativo", bucket, path }
    }

    if (padrao.tipo === "itemId") {
      const ownerId = await db.ownerOfItem(padrao.itemId)
      if (ownerId === null) {
        // item não encontrado → não temos dono → indeterminado (não deletar sem certeza)
        return { status: "indeterminado", bucket, path, motivo: `item ${padrao.itemId} não encontrado no banco` }
      }
      const ativo = await db.userExists(ownerId)
      if (!ativo) {
        return { status: "orfao", bucket, path, motivo: `item ${padrao.itemId} → dono ${ownerId} não existe ou tem deletedAt` }
      }
      return { status: "ativo", bucket, path }
    }

    if (padrao.tipo === "bookingId") {
      const booking = await db.ownerOfBooking(padrao.bookingId)
      if (booking === null) {
        return { status: "indeterminado", bucket, path, motivo: `reserva ${padrao.bookingId} não encontrada no banco` }
      }
      // Órfão somente se AMBOS os participantes não existem. Se ainda há um ativo,
      // o arquivo pode ser importante para auditoria/disputa.
      const [ownerAtivo, borrowerAtivo] = await Promise.all([
        db.userExists(booking.ownerId),
        db.userExists(booking.borrowerId),
      ])
      if (!ownerAtivo && !borrowerAtivo) {
        return {
          status: "orfao", bucket, path,
          motivo: `reserva ${padrao.bookingId} → proprietário ${booking.ownerId} e locatário ${booking.borrowerId} ambos sem conta ativa`,
        }
      }
      return { status: "ativo", bucket, path }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { status: "indeterminado", bucket, path, motivo: `erro de lookup: ${msg}` }
  }

  return { status: "indeterminado", bucket, path, motivo: "tipo de padrão não tratado" }
}

/**
 * Valida que o ref do banco bate com o ref esperado pela flag --ref.
 * Comparação por IGUALDADE ESTRITA — prefixos parciais não são aceitos.
 * Se quiser usar um atalho curto, resolva-o para o ref completo antes de chamar.
 */
export function validarRef(databaseUrl: string, refEsperado: string): { ok: boolean; refEncontrado: string } {
  // DATABASE_URL padrão Supabase: postgres://...@db.<ref>.supabase.co:5432/...
  // ou pooler: postgres://...@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?...pgbouncer=true
  // No pooler o ref vem como user: postgres.zythygwvmrwrqmnrdufq
  const viaHost = databaseUrl.match(/db\.([a-z0-9]+)\.supabase\.co/)
  const viaUser = databaseUrl.match(/postgres\.([a-z0-9]+)/)
  const refEncontrado = viaHost?.[1] ?? viaUser?.[1] ?? "desconhecido"
  return { ok: refEncontrado === refEsperado, refEncontrado }
}

/**
 * Valida que o ref extraído da NEXT_PUBLIC_SUPABASE_URL bate com o esperado.
 * Comparação por IGUALDADE ESTRITA — prefixos parciais não são aceitos.
 */
export function validarRefSupabaseUrl(supabaseUrl: string, refEsperado: string): { ok: boolean; refEncontrado: string } {
  // https://<ref>.supabase.co
  const m = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)
  const refEncontrado = m?.[1] ?? "desconhecido"
  return { ok: refEncontrado === refEsperado, refEncontrado }
}

/** Refs conhecidos (imutáveis — não colocar valores em memória de desenvolvimento). */
export const REFS_CONHECIDOS = {
  staging: "zythygwvmrwrqmnrdufq",
  prod:    "jdxdndrhjxtkaifbpagr",
} as const
