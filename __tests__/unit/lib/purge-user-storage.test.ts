/** @jest-environment node */
/**
 * Limpeza do Storage na exclusão de conta (LGPD art. 18).
 *
 * Regressão: `list(<userId>)` vinha vazio porque o upload grava em `id-verification/<userId>/…`.
 * Por isso o Storage aqui é um FAKE EM MEMÓRIA com a semântica real do `list` (só os filhos
 * diretos da pasta, paginado): um teste que só conferisse "chamou list" passaria com o
 * prefixo errado. Que os prefixos são os que as rotas gravam: upload-paths-contract.test.ts.
 */
import {
  apagarArquivosDoUsuario,
  LOTE_REMOCAO,
  PAGINA_LISTAGEM,
  type StorageClient,
} from "@/lib/supabase/purge-user-storage"

type Falhas = {
  listErro?:   (bucket: string, path: string, offset: number) => string | undefined
  listThrow?:  (bucket: string, path: string) => boolean
  removeErro?: (bucket: string, paths: string[], chamada: number) => string | undefined
  removeThrow?: (bucket: string, chamada: number) => boolean
  /** Simula um remove que "funciona" mas não apaga tudo (sem error). */
  removeSemApagar?: (bucket: string, path: string) => boolean
  /** `storage.from(bucket)` lança (cliente malformado). */
  fromThrow?: (bucket: string) => boolean
}

function fakeStorage(inicial: Record<string, string[]>, falhas: Falhas = {}) {
  const buckets = new Map<string, Set<string>>(
    Object.entries(inicial).map(([b, paths]) => [b, new Set(paths)]),
  )
  const listCalls:   { bucket: string; path: string; limit?: number; offset?: number }[] = []
  const removeCalls: { bucket: string; paths: string[] }[] = []
  /** Ordem global das chamadas — os arrays acima perdem a intercalação list/remove. */
  const eventos: string[] = []

  const client: StorageClient = {
    storage: {
      from(bucket: string) {
        if (falhas.fromThrow?.(bucket)) throw new Error("cliente quebrou")
        const objetos = buckets.get(bucket) ?? new Set<string>()
        return {
          async list(path: string, opts) {
            const off = opts?.offset ?? 0
            listCalls.push({ bucket, path, limit: opts?.limit, offset: opts?.offset })
            eventos.push(`list:${bucket}`)
            if (falhas.listThrow?.(bucket, path)) throw new Error("rede caiu")
            const erro = falhas.listErro?.(bucket, path, off)
            if (erro) return { data: null, error: { message: erro } }
            // Semântica do Storage: só os filhos DIRETOS da pasta; subpasta vira `id: null`.
            const pasta = `${path}/`
            const filhos = new Map<string, boolean>() // nome → é pasta?
            for (const p of objetos) {
              if (!p.startsWith(pasta)) continue
              const resto = p.slice(pasta.length)
              const [nome, ...mais] = resto.split("/")
              filhos.set(nome, mais.length > 0)
            }
            const nomes = [...filhos.keys()].sort()
            const lim = opts?.limit ?? 100
            return {
              data: nomes.slice(off, off + lim).map((name) => ({
                name,
                id: filhos.get(name) ? null : `id-${name}`,
              })),
              error: null,
            }
          },
          async remove(paths: string[]) {
            removeCalls.push({ bucket, paths })
            eventos.push(`remove:${bucket}`)
            const chamada = removeCalls.filter((c) => c.bucket === bucket).length
            if (falhas.removeThrow?.(bucket, chamada)) throw new Error("conexão resetada")
            const erro = falhas.removeErro?.(bucket, paths, chamada)
            if (erro) return { data: null, error: { message: erro } }
            const apagados: { name: string }[] = []
            for (const p of paths) {
              if (falhas.removeSemApagar?.(bucket, p)) continue
              if (objetos.delete(p)) apagados.push({ name: p })
            }
            return { data: apagados, error: null }
          },
        }
      },
    },
  }

  return { client, buckets, listCalls, removeCalls, eventos, restantes: (b: string) => [...(buckets.get(b) ?? [])].sort() }
}

const USER  = "cuser1"
const OUTRO = "cuser2"

const muitos = (n: number) =>
  Array.from({ length: n }, (_, i) => `uploads/${USER}/${String(i).padStart(4, "0")}.jpg`)

describe("apagarArquivosDoUsuario — userId", () => {
  it.each(["", "a/b", "../cuser2", "a b", "uploads/"])(
    "🪤 userId inválido (%p) é recusado ANTES de tocar o Storage — vazio listaria `uploads/` de TODO mundo",
    async (ruim) => {
      const fs = fakeStorage({ "item-images": [`uploads/${OUTRO}/x.jpg`] })
      await expect(apagarArquivosDoUsuario(fs.client, ruim)).rejects.toThrow(/userId inválido/)
      expect(fs.listCalls).toHaveLength(0)
      expect(fs.removeCalls).toHaveLength(0)
      expect(fs.restantes("item-images")).toEqual([`uploads/${OUTRO}/x.jpg`])
    },
  )
})

describe("apagarArquivosDoUsuario — o que é apagado", () => {
  it("🪤 apaga documento e selfie em id-verification/<userId> (o defeito: listava <userId>)", async () => {
    const fs = fakeStorage({
      "id-docs": [
        `id-verification/${USER}/document-1.jpg`,
        `id-verification/${USER}/selfie-1.jpg`,
        `id-verification/${USER}/document-2.jpg`, // reenvio após rejeição acumula
      ],
    })
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(fs.restantes("id-docs")).toEqual([])
    expect(r).toEqual({ apagados: 3, falhas: [] })
    // O prefixo consultado é o do upload, NÃO o `<userId>` solto.
    const listId = fs.listCalls.filter((c) => c.bucket === "id-docs")
    expect(listId.map((c) => c.path)).toEqual([`id-verification/${USER}`])
    expect(listId.some((c) => c.path === USER)).toBe(false)
  })

  it("apaga os uploads do usuário nos DOIS buckets públicos que os recebem", async () => {
    const fs = fakeStorage({
      "item-images":    [`uploads/${USER}/1.jpg`, `uploads/${USER}/2.png`],
      "booking-photos": [`uploads/${USER}/3.webp`],
    })
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(fs.restantes("item-images")).toEqual([])
    expect(fs.restantes("booking-photos")).toEqual([])
    expect(r).toEqual({ apagados: 3, falhas: [] })
  })

  it("não encosta em arquivo de outro usuário nem nos caminhos chaveados por anúncio/reserva", async () => {
    const dosOutros = {
      "id-docs":        [`id-verification/${OUTRO}/document-1.jpg`],
      "item-images":    [`uploads/${OUTRO}/1.jpg`, "item-abc/1.jpg"],
      "booking-photos": [`uploads/${OUTRO}/1.jpg`, `bookings/b1/checkin/1-${USER}.jpg`],
    }
    const fs = fakeStorage({
      ...dosOutros,
      "id-docs": [...dosOutros["id-docs"], `id-verification/${USER}/selfie-1.jpg`],
    })
    await apagarArquivosDoUsuario(fs.client, USER)

    expect(fs.restantes("id-docs")).toEqual(dosOutros["id-docs"])
    expect(fs.restantes("item-images")).toEqual([...dosOutros["item-images"]].sort())
    expect(fs.restantes("booking-photos")).toEqual([...dosOutros["booking-photos"]].sort())
  })

  it("id de usuário que é prefixo textual de outro não vaza (lista a PASTA, não `startsWith`)", async () => {
    const fs = fakeStorage({ "item-images": ["uploads/cuser10/1.jpg", `uploads/${USER}/1.jpg`] })
    await apagarArquivosDoUsuario(fs.client, USER)
    expect(fs.restantes("item-images")).toEqual(["uploads/cuser10/1.jpg"])
  })
})

describe("apagarArquivosDoUsuario — paginação e lotes", () => {
  it("🪤 mais de uma página: o offset avança, TODOS são apagados, em lotes de LOTE_REMOCAO", async () => {
    const fs = fakeStorage({ "item-images": muitos(250) })
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    const lists = fs.listCalls.filter((c) => c.bucket === "item-images")
    expect(lists.map((c) => c.offset)).toEqual([0, PAGINA_LISTAGEM, 2 * PAGINA_LISTAGEM])
    // Uma chamada gigante estoura o limite da API.
    const lotes = fs.removeCalls.filter((c) => c.bucket === "item-images").map((c) => c.paths.length)
    expect(lotes).toEqual([LOTE_REMOCAO, LOTE_REMOCAO, 50])
    expect(fs.restantes("item-images")).toEqual([])
    expect(r).toEqual({ apagados: 250, falhas: [] })
  })

  it("🪤 página exatamente cheia: pede a próxima (vazia) em vez de assumir que acabou", async () => {
    // Com `<=` no lugar de `<` a listagem pararia aqui sem prova de que acabou;
    // com `>` deixaria arquivos para trás quando a página seguinte tem sobra.
    const fs = fakeStorage({ "item-images": muitos(PAGINA_LISTAGEM) })
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    const lists = fs.listCalls.filter((c) => c.bucket === "item-images")
    expect(lists).toHaveLength(2)
    expect(r.apagados).toBe(PAGINA_LISTAGEM)
    expect(fs.restantes("item-images")).toEqual([])
  })

  it("lista TUDO antes de apagar (apagar durante a paginação deslocaria o offset e pularia arquivos)", async () => {
    const fs = fakeStorage({ "item-images": muitos(150) })
    await apagarArquivosDoUsuario(fs.client, USER)

    const ev = fs.eventos.filter((e) => e.endsWith(":item-images"))
    expect(ev.filter((e) => e.startsWith("list"))).toHaveLength(2)
    // Nenhum `list` depois do primeiro `remove`.
    expect(ev.slice(ev.indexOf("remove:item-images")).some((e) => e.startsWith("list"))).toBe(false)
  })

  it("trava contra laço infinito quando a API ignora o offset — e diz que parou", async () => {
    // Servidor que sempre devolve a mesma página cheia: sem o teto, o laço não termina.
    const sempreCheia: StorageClient = {
      storage: {
        from: () => ({
          list:   async () => ({ data: Array.from({ length: PAGINA_LISTAGEM }, (_, i) => ({ name: `f${i}`, id: `i${i}` })), error: null }),
          remove: async (paths: string[]) => ({ data: paths.map((name) => ({ name })), error: null }),
        }),
      },
    }
    const r = await apagarArquivosDoUsuario(sempreCheia, USER)
    expect(r.falhas.some((f) => f.etapa === "list" && /interrompida/.test(f.erro))).toBe(true)
  })
})

describe("apagarArquivosDoUsuario — bucket vazio", () => {
  it("nada a apagar: sem chamar remove e sem falha", async () => {
    const fs = fakeStorage({ "id-docs": [], "item-images": [], "booking-photos": [] })
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(fs.removeCalls).toHaveLength(0)
    expect(r).toEqual({ apagados: 0, falhas: [] })
  })

  it("bucket que devolve `data: null` sem erro também é tratado como vazio", async () => {
    const nulo: StorageClient = {
      storage: { from: () => ({ list: async () => ({ data: null, error: null }), remove: jest.fn() }) },
    }
    const r = await apagarArquivosDoUsuario(nulo, USER)
    expect(r).toEqual({ apagados: 0, falhas: [] })
  })
})

describe("apagarArquivosDoUsuario — falha parcial nunca fica escondida", () => {
  it("🪤 lote que falha: os outros lotes seguem, e os caminhos que sobraram são reportados", async () => {
    const todos = muitos(250)
    const fs = fakeStorage(
      { "item-images": todos },
      { removeErro: (b, _p, chamada) => (b === "item-images" && chamada === 2 ? "timeout no lote 2" : undefined) },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.apagados).toBe(150)
    expect(r.falhas).toHaveLength(1)
    expect(r.falhas[0]).toMatchObject({
      bucket: "item-images", prefixo: `uploads/${USER}`, etapa: "remove", erro: "timeout no lote 2",
    })
    // O relatório do que sobrou bate EXATAMENTE com o que ficou no bucket.
    expect(r.falhas[0].sobraram).toEqual(todos.slice(100, 200))
    expect(fs.restantes("item-images")).toEqual(todos.slice(100, 200))
  })

  it("falha em um bucket não impede a limpeza dos outros (id-docs falha, o resto é apagado)", async () => {
    const fs = fakeStorage(
      {
        "id-docs":        [`id-verification/${USER}/document-1.jpg`, `id-verification/${USER}/selfie-1.jpg`],
        "item-images":    [`uploads/${USER}/1.jpg`],
        "booking-photos": [`uploads/${USER}/2.jpg`],
      },
      { removeErro: (b) => (b === "id-docs" ? "storage indisponível" : undefined) },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(fs.restantes("item-images")).toEqual([])
    expect(fs.restantes("booking-photos")).toEqual([])
    expect(fs.restantes("id-docs")).toHaveLength(2)
    expect(r.falhas).toEqual([
      {
        bucket: "id-docs", prefixo: `id-verification/${USER}`, etapa: "remove", erro: "storage indisponível",
        sobraram: [`id-verification/${USER}/document-1.jpg`, `id-verification/${USER}/selfie-1.jpg`],
      },
    ])
  })

  it("🪤 `storage.from()` que lança num bucket vira falha registrada — a função não lança e os outros buckets são limpos", async () => {
    const fs = fakeStorage(
      { "id-docs": [`id-verification/${USER}/selfie-1.jpg`], "item-images": [`uploads/${USER}/1.jpg`] },
      { fromThrow: (b) => b === "id-docs" },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.falhas).toEqual([
      { bucket: "id-docs", prefixo: `id-verification/${USER}`, etapa: "list", erro: "cliente quebrou", sobraram: [] },
    ])
    expect(fs.restantes("item-images")).toEqual([])
  })

  it("erro na LISTAGEM é falha (não 'bucket vazio'): nada é dado como limpo", async () => {
    const fs = fakeStorage(
      { "id-docs": [`id-verification/${USER}/selfie-1.jpg`] },
      { listErro: (b) => (b === "id-docs" ? "Bucket not found" : undefined) },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.falhas[0]).toMatchObject({
      bucket: "id-docs", prefixo: `id-verification/${USER}`, etapa: "list", erro: "Bucket not found", sobraram: [],
    })
    expect(fs.restantes("id-docs")).toHaveLength(1)
  })

  it("erro na 2ª página: apaga o que já listou e reporta a listagem incompleta", async () => {
    const todos = muitos(150)
    const fs = fakeStorage(
      { "item-images": todos },
      { listErro: (b, _p, off) => (b === "item-images" && off >= PAGINA_LISTAGEM ? "502 na página 2" : undefined) },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.apagados).toBe(100)
    expect(r.falhas.some((f) => f.etapa === "list" && f.erro === "502 na página 2")).toBe(true)
    expect(fs.restantes("item-images")).toEqual(todos.slice(100))
  })

  it("exceção de rede em list/remove vira falha registrada — a função não lança", async () => {
    const fs = fakeStorage(
      { "id-docs": [`id-verification/${USER}/selfie-1.jpg`], "item-images": [`uploads/${USER}/1.jpg`] },
      { listThrow: (b) => b === "id-docs" },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.falhas).toEqual([
      { bucket: "id-docs", prefixo: `id-verification/${USER}`, etapa: "list", erro: "rede caiu", sobraram: [] },
    ])
    expect(fs.restantes("item-images")).toEqual([])
  })

  it("🪤 exceção de rede no REMOVE: o lote vira falha com os caminhos, e os lotes/buckets seguintes continuam", async () => {
    const todos = muitos(150)
    const fs = fakeStorage(
      { "item-images": todos, "booking-photos": [`uploads/${USER}/9.jpg`] },
      { removeThrow: (b, chamada) => b === "item-images" && chamada === 1 },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.falhas).toEqual([
      { bucket: "item-images", prefixo: `uploads/${USER}`, etapa: "remove", erro: "conexão resetada", sobraram: todos.slice(0, 100) },
    ])
    expect(fs.restantes("item-images")).toEqual(todos.slice(0, 100)) // 2º lote foi apagado
    expect(fs.restantes("booking-photos")).toEqual([])
  })

  it("🪤 remove sem erro mas sem apagar tudo: o que faltou é reportado (não some em silêncio)", async () => {
    const fs = fakeStorage(
      { "item-images": [`uploads/${USER}/1.jpg`, `uploads/${USER}/2.jpg`] },
      { removeSemApagar: (_b, p) => p.endsWith("2.jpg") },
    )
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.apagados).toBe(1)
    expect(r.falhas[0]).toMatchObject({
      etapa: "remove", sobraram: [`uploads/${USER}/2.jpg`], erro: "remove confirmou 1 de 2",
    })
  })

  it("🪤 remove sem erro e SEM `data`: nada foi confirmado, então não conta como apagado", async () => {
    const semResposta: StorageClient = {
      storage: {
        from: () => ({
          list:   async () => ({ data: [{ name: "1.jpg", id: "i1" }], error: null }),
          remove: async () => ({ data: null, error: null }),
        }),
      },
    }
    const r = await apagarArquivosDoUsuario(semResposta, USER)

    expect(r.apagados).toBe(0)
    // Um lote por bucket (3 buckets, 1 arquivo cada), todos reportados.
    expect(r.falhas).toHaveLength(3)
    expect(r.falhas[0]).toMatchObject({
      etapa: "remove", erro: "remove confirmou 0 de 1", sobraram: [`id-verification/${USER}/1.jpg`],
    })
  })

  it("subpasta inesperada não é varrida em silêncio", async () => {
    const fs = fakeStorage({ "item-images": [`uploads/${USER}/1.jpg`, `uploads/${USER}/antigo/2.jpg`] })
    const r = await apagarArquivosDoUsuario(fs.client, USER)

    expect(r.falhas[0]).toMatchObject({ etapa: "list", sobraram: [`uploads/${USER}/antigo/`] })
    expect(fs.restantes("item-images")).toEqual([`uploads/${USER}/antigo/2.jpg`])
  })
})
