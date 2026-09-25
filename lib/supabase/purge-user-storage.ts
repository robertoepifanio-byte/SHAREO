/**
 * lib/supabase/purge-user-storage.ts — apaga do Storage os arquivos de um usuário
 * na exclusão de conta (LGPD art. 18).
 *
 * 🪤 Regressão que isto fixa: DELETE /api/users/me listava `id-docs` por `<userId>`,
 * mas o upload grava em `id-verification/<userId>/…`. `list("<userId>")` vinha vazio,
 * `remove` nunca rodava e o documento e a selfie do titular ficavam no bucket para
 * sempre, sem erro nenhum. Os prefixos agora vêm de lib/supabase/user-storage-paths.ts,
 * o MESMO módulo que as rotas de upload usam para gravar; o vínculo é provado em
 * __tests__/integration/api/users/upload-paths-contract.test.ts.
 *
 * O que é apagado (só o que tem o userId no caminho):
 *   id-docs         id-verification/<userId>/…  documento e selfie do KYC (reenvio acumula)
 *   item-images     uploads/<userId>/…          avatar do perfil
 *   booking-photos  uploads/<userId>/…          foto de avaliação e foto do "relatar problema"
 *                                               (a disputa aberta por _BookingActions também
 *                                               sobe por POST /api/upload, então cai aqui)
 *
 * Limpeza ADICIONAL (decisão do fundador 25/09/2026):
 *   item-images     <itemId>/…                  fotos dos anúncios do titular (cada anúncio =
 *                                               um AlvoStorage passado via `alvosExtras`)
 *   booking-photos  bookings/<id>/<fase>/…      somente as fotos de check-in/out que o próprio
 *                                               titular carregou (BookingPhoto.uploadedBy == userId),
 *                                               apagadas via `apagarPathsExplicitos`; as fotos da
 *                                               outra parte são preservadas (proprietário/locatário).
 *
 * Suposições sobre o Storage ainda NÃO confirmadas em staging: `list` marca pasta com
 * `id: null` e `remove` devolve o caminho completo em `name`. Se a segunda estiver
 * errada, cada lote aparece como "não confirmado" no log mesmo com os arquivos apagados
 * (alarme falso, não vazamento).
 *
 * Contrato: NUNCA lança por falha do Storage. Cada bucket é tentado (em paralelo) mesmo
 * que outro falhe, e o retorno diz exatamente o que sobrou (`falhas[].sobraram`). Quem
 * chama decide o que fazer — a exclusão de conta só registra, pois a conta já foi
 * anonimizada e a falha de Storage não pode desfazê-la.
 */
import { idVerificationPrefix, uploadPrefix } from "@/lib/supabase/user-storage-paths"

/** Recorte estrutural do que usamos do supabase-js: evita acoplar o teste ao SDK. */
export type StorageBucketApi = {
  list(
    path: string,
    options?: { limit?: number; offset?: number; sortBy?: { column?: string; order?: string } },
  ): PromiseLike<{
    data:  { name: string; id?: string | null }[] | null
    error: { message: string } | null
  }>
  remove(paths: string[]): PromiseLike<{
    data:  { name: string }[] | null
    error: { message: string } | null
  }>
}
export type StorageClient = { storage: { from(bucket: string): StorageBucketApi } }

export type AlvoStorage = { bucket: string; prefixo: string }

export type FalhaPurge = {
  bucket:  string
  prefixo: string
  etapa:   "list" | "remove"
  erro:    string
  /** Caminhos que ficaram no bucket por causa desta falha. Vazio quando a listagem
   *  falhou: aí não se sabe o que existe — o `prefixo` é o que precisa ser varrido. */
  sobraram: string[]
}

/** Sem falhas = tudo apagado. */
export type ResultadoPurge = {
  apagados: number
  falhas:   FalhaPurge[]
}

/** Página do `list`. O laço só termina quando vem MENOS que isto; 100 é o padrão do
 *  Supabase Storage. Se a API cortasse abaixo do pedido, a listagem pararia cedo. */
export const PAGINA_LISTAGEM = 100
export const LOTE_REMOCAO    = 100
/** Trava contra laço infinito se a API ignorar `offset` (10 mil arquivos por prefixo). */
const MAX_PAGINAS = 100

// cuid/uuid. Vazio ou com "/" viraria `uploads/` inteiro — o diretório de TODOS os usuários.
const USER_ID_VALIDO = /^[A-Za-z0-9_-]+$/

export function alvosDoUsuario(userId: string): AlvoStorage[] {
  if (!USER_ID_VALIDO.test(userId)) {
    throw new Error("userId inválido para limpeza de Storage")
  }
  return [
    { bucket: "id-docs",        prefixo: idVerificationPrefix(userId) },
    { bucket: "item-images",    prefixo: uploadPrefix(userId) },
    { bucket: "booking-photos", prefixo: uploadPrefix(userId) },
  ]
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Lista TUDO sob o prefixo, página a página. Devolve o que achou e por que parou, se parou mal. */
async function listarPrefixo(
  api: StorageBucketApi,
  { bucket, prefixo }: AlvoStorage,
): Promise<{ caminhos: string[]; falhas: FalhaPurge[] }> {
  const caminhos: string[] = []
  const falhas: FalhaPurge[] = []
  const falhou = (erro: string, sobraram: string[] = []) =>
    falhas.push({ bucket, prefixo, etapa: "list", erro, sobraram })

  try {
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const { data, error } = await api.list(prefixo, {
        limit:  PAGINA_LISTAGEM,
        offset: pagina * PAGINA_LISTAGEM,
        sortBy: { column: "name", order: "asc" },
      })
      if (error) { falhou(error.message); return { caminhos, falhas } }

      const itens = data ?? []
      for (const item of itens) {
        // `id: null` é pasta. Os uploads gravam arquivos soltos, então uma subpasta é
        // inesperada — e não varrê-la em silêncio seria repetir o bug original.
        if (item.id === null) {
          falhou(`subpasta inesperada "${item.name}" não foi varrida`, [`${prefixo}/${item.name}/`])
        } else {
          caminhos.push(`${prefixo}/${item.name}`)
        }
      }
      if (itens.length < PAGINA_LISTAGEM) return { caminhos, falhas }
    }
    falhou(`mais de ${MAX_PAGINAS * PAGINA_LISTAGEM} arquivos: listagem interrompida`)
  } catch (e) {
    falhou(msg(e))
  }
  return { caminhos, falhas }
}

async function apagarPrefixo(
  client: StorageClient,
  alvo: AlvoStorage,
): Promise<{ apagados: number; falhas: FalhaPurge[] }> {
  const { bucket, prefixo } = alvo
  const falhas: FalhaPurge[] = []
  let apagados = 0

  // `from()` também pode lançar (cliente malformado): dentro do try, para um bucket
  // quebrado não derrubar o Promise.all dos outros nem violar o "nunca lança".
  try {
    const api = client.storage.from(bucket)

    // 1) Lista TUDO antes de apagar. Apagar enquanto pagina deslocaria o offset e
    //    pularia arquivos; e um lote que falha reapareceria na página seguinte.
    const listagem = await listarPrefixo(api, alvo)
    falhas.push(...listagem.falhas)

    // 2) Remove em lotes; um lote que falha não impede os seguintes.
    for (let i = 0; i < listagem.caminhos.length; i += LOTE_REMOCAO) {
      const lote = listagem.caminhos.slice(i, i + LOTE_REMOCAO)
      try {
        const { data, error } = await api.remove(lote)
        // O Supabase devolve só os objetos que de fato apagou: ausência de erro com menos
        // itens que o pedido é arquivo que ficou. Com `error`, `data` vem null → lote inteiro.
        const confirmados = new Set((data ?? []).map((o) => o.name))
        const restantes   = lote.filter((p) => !confirmados.has(p))
        apagados += lote.length - restantes.length
        if (restantes.length > 0) {
          falhas.push({
            bucket, prefixo, etapa: "remove",
            erro: error?.message ?? `remove confirmou ${lote.length - restantes.length} de ${lote.length}`,
            sobraram: restantes,
          })
        }
      } catch (e) {
        falhas.push({ bucket, prefixo, etapa: "remove", erro: msg(e), sobraram: lote })
      }
    }
  } catch (e) {
    falhas.push({ bucket, prefixo, etapa: "list", erro: msg(e), sobraram: [] })
  }

  return { apagados, falhas }
}

export async function apagarArquivosDoUsuario(
  client: StorageClient,
  userId: string,
  /** Alvos extras além dos prefixos chaveados por userId (ex: pastas de anúncios). */
  alvosExtras: AlvoStorage[] = [],
): Promise<ResultadoPurge> {
  // Buckets independentes: em paralelo. `partes` mantém a ordem dos alvos, então o
  // relatório de falhas sai sempre na mesma ordem.
  const alvos = [...alvosDoUsuario(userId), ...alvosExtras]
  const partes = await Promise.all(alvos.map((alvo) => apagarPrefixo(client, alvo)))
  return {
    apagados: partes.reduce((n, p) => n + p.apagados, 0),
    falhas:   partes.flatMap((p) => p.falhas),
  }
}

/**
 * Apaga caminhos explícitos num bucket — sem listagem, para caminhos já conhecidos
 * (ex: `BookingPhoto.url` → path extraído via `storagePathFromUrl`).
 * Segue o mesmo contrato de `apagarArquivosDoUsuario`: nunca lança, devolve falhas detalhadas.
 */
export async function apagarPathsExplicitos(
  client: StorageClient,
  bucket: string,
  paths: string[],
): Promise<{ apagados: number; falhas: FalhaPurge[] }> {
  if (paths.length === 0) return { apagados: 0, falhas: [] }

  const prefixo = `${bucket}:(${paths.length} caminhos explícitos)`
  let apagados = 0
  const falhas: FalhaPurge[] = []

  try {
    const api = client.storage.from(bucket)
    for (let i = 0; i < paths.length; i += LOTE_REMOCAO) {
      const lote = paths.slice(i, i + LOTE_REMOCAO)
      try {
        const { data, error } = await api.remove(lote)
        const confirmados = new Set((data ?? []).map((o) => o.name))
        const restantes   = lote.filter((p) => !confirmados.has(p))
        apagados += lote.length - restantes.length
        if (restantes.length > 0) {
          falhas.push({
            bucket, prefixo, etapa: "remove",
            erro: error?.message ?? `remove confirmou ${lote.length - restantes.length} de ${lote.length}`,
            sobraram: restantes,
          })
        }
      } catch (e) {
        falhas.push({ bucket, prefixo, etapa: "remove", erro: msg(e), sobraram: lote })
      }
    }
  } catch (e) {
    falhas.push({ bucket, prefixo, etapa: "remove", erro: msg(e), sobraram: paths })
  }

  return { apagados, falhas }
}
