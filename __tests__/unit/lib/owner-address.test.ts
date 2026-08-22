/** @jest-environment node */
/**
 * Endereço de retirada — arquivo fonte: lib/ownerAddress.ts (o porquê do defeito
 * está lá).
 *
 * A regra que estes testes fixam: **sem rua, não há endereço de retirada**. A
 * função devolve `null` para que a tela mostre "combine pelo chat" em vez de
 * mandar o locatário a uma cidade inteira com a advertência de não aceitar
 * outro local.
 */
import { hasPickupAddress, formatPickupAddress } from "@/lib/ownerAddress"

const COMPLETO = {
  street:       "Av. Engenheiro Roberto Freire, 1234",
  neighborhood: "Capim Macio",
  city:         "Natal",
  state:        "RN",
  cep:          "59082095",
}

describe("hasPickupAddress", () => {
  it("cidade e estado NÃO bastam — foi exatamente o bug", () => {
    expect(hasPickupAddress({ city: "Natal", state: "RN" })).toBe(false)
  })

  it("a rua é o mínimo que basta", () => {
    expect(hasPickupAddress({ street: "Rua das Flores, 10" })).toBe(true)
  })

  it("rua só com espaços não conta", () => {
    expect(hasPickupAddress({ street: "   " })).toBe(false)
  })

  it("tolera null e undefined", () => {
    expect(hasPickupAddress(null)).toBe(false)
    expect(hasPickupAddress(undefined)).toBe(false)
    expect(hasPickupAddress({})).toBe(false)
  })
})

describe("formatPickupAddress", () => {
  it("devolve null sem rua — é o null que faz a tela dizer 'combine pelo chat'", () => {
    expect(formatPickupAddress({ city: "Natal", state: "RN" })).toBeNull()
  })

  it("monta a linha completa na ordem de quem vai até lá", () => {
    expect(formatPickupAddress(COMPLETO)).toBe(
      "Av. Engenheiro Roberto Freire, 1234, Capim Macio, Natal — RN, CEP 59082-095",
    )
  })

  it("omite as partes ausentes sem deixar vírgula solta", () => {
    expect(formatPickupAddress({ street: "Rua das Flores, 10", city: "Natal", state: "RN" }))
      .toBe("Rua das Flores, 10, Natal — RN")
    expect(formatPickupAddress({ street: "Rua das Flores, 10" })).toBe("Rua das Flores, 10")
  })

  it("cidade sem estado aparece sozinha", () => {
    expect(formatPickupAddress({ street: "Rua A", city: "Natal" })).toBe("Rua A, Natal")
  })
})
