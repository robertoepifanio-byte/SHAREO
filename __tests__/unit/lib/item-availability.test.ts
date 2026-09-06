/** @jest-environment node */
/**
 * A regra que separa "está disponível" de "VOLTOU a ficar disponível".
 *
 * O e-mail original anunciava `status === "AVAILABLE"` como se fosse novidade —
 * e isso é sempre verdade para qualquer item listado, então nunca era notícia.
 * `availableSince` só tem valor se for carimbado na ENTRADA em AVAILABLE; se
 * qualquer update de item o reiniciasse, editar o título de um anúncio já no ar
 * dispararia "voltou ao catálogo" para todo mundo que o favoritou.
 */
import { availabilityPatch } from "@/lib/item-availability"

describe("availabilityPatch", () => {
  it("carimba quando o item volta de pausado", () => {
    expect(availabilityPatch("PAUSED", "AVAILABLE").availableSince).toBeInstanceOf(Date)
  })

  it("carimba na primeira publicação, saindo de rascunho", () => {
    expect(availabilityPatch("DRAFT", "AVAILABLE").availableSince).toBeInstanceOf(Date)
  })

  it("NÃO recarimba item que já estava disponível", () => {
    // Este é o caso que estraga tudo: editar preço ou título de um anúncio no
    // ar mandaria "voltou ao catálogo" para quem o favoritou.
    expect(availabilityPatch("AVAILABLE", "AVAILABLE")).toEqual({})
  })

  it("não mexe em transição que não termina em disponível", () => {
    expect(availabilityPatch("AVAILABLE", "PAUSED")).toEqual({})
    expect(availabilityPatch("AVAILABLE", "DELETED")).toEqual({})
  })

  it("ignora update que não toca no status", () => {
    // Os chamadores espalham o retorno num `data` que pode não trazer status.
    expect(availabilityPatch("AVAILABLE", undefined)).toEqual({})
    expect(availabilityPatch("PAUSED", undefined)).toEqual({})
  })
})
