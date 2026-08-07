import { normalizePlace } from "@/lib/geo/normalize-place"

describe("normalizePlace", () => {
  it("dobra acentuação para a mesma chave", () => {
    // O caso que motivou a função: o ranking de cidades-piloto fragmentava
    // "São Paulo" em várias linhas conforme a grafia digitada.
    const key = "sao paulo"
    expect(normalizePlace("São Paulo")).toBe(key)
    expect(normalizePlace("sao paulo")).toBe(key)
    expect(normalizePlace("SAO PAULO")).toBe(key)
    expect(normalizePlace("São paulo")).toBe(key)
  })

  it("colapsa espaço repetido e apara as bordas", () => {
    expect(normalizePlace("  SAO  PAULO ")).toBe("sao paulo")
    expect(normalizePlace("Rio   de   Janeiro")).toBe("rio de janeiro")
  })

  it("trata hífen e ponto como separador de palavra", () => {
    expect(normalizePlace("Mogi-Mirim")).toBe(normalizePlace("Mogi Mirim"))
    expect(normalizePlace("Santa Bárbara d'Oeste")).toBe("santa barbara d oeste")
  })

  it("normaliza acentos de outras cidades brasileiras comuns", () => {
    expect(normalizePlace("Brasília")).toBe("brasilia")
    expect(normalizePlace("Florianópolis")).toBe("florianopolis")
    expect(normalizePlace("Goiânia")).toBe("goiania")
    expect(normalizePlace("Belém")).toBe("belem")
    expect(normalizePlace("Maceió")).toBe("maceio")
    expect(normalizePlace("Vitória")).toBe("vitoria")
  })

  it("funciona para bairro, não só cidade", () => {
    expect(normalizePlace("Boa Viagem")).toBe("boa viagem")
    expect(normalizePlace("Jardim América")).toBe("jardim america")
    expect(normalizePlace("Cidade Baixa")).toBe("cidade baixa")
  })

  it("devolve null para entrada vazia/ausente (coluna é nullable)", () => {
    expect(normalizePlace(null)).toBeNull()
    expect(normalizePlace(undefined)).toBeNull()
    expect(normalizePlace("")).toBeNull()
    expect(normalizePlace("   ")).toBeNull()
    // Só pontuação também colapsa para vazio — não queremos gravar " " como chave.
    expect(normalizePlace("---")).toBeNull()
  })

  it("é idempotente (aplicar duas vezes não muda o resultado)", () => {
    // Importa porque o backfill da migração e a escrita da API precisam convergir
    // para o mesmo valor mesmo que um dado já normalizado passe pela função de novo.
    for (const v of ["São Paulo", "Mogi-Mirim", "  Belém  "]) {
      const once = normalizePlace(v)
      expect(normalizePlace(once)).toBe(once)
    }
  })

  it("NÃO tenta resolver abreviação (limite documentado)", () => {
    // Quem resolve "S. Paulo" é a captura por CEP, que devolve o nome canônico
    // do município — não a normalização de string.
    expect(normalizePlace("S. Paulo")).not.toBe(normalizePlace("São Paulo"))
  })
})
