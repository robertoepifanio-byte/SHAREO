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
import { hasPickupAddress, formatPickupAddress, redactOwnerAddress } from "@/lib/ownerAddress"

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

/**
 * Vazamento encontrado em 22/08/2026 pelo painel de dois atores: bastava criar
 * uma reserva — que o dono nem precisa aceitar — e ler `GET /api/bookings/[id]`
 * para obter o endereço residencial de qualquer anunciante. As telas escondiam
 * até o pagamento; a API não.
 */
describe("redactOwnerAddress", () => {
  const DONO = {
    id: "u1", name: "Dono",
    cep: "59082095", street: "Av. Roberto Freire, 1234",
    neighborhood: "Capim Macio", city: "Natal", state: "RN",
  }

  it("esconde do locatário enquanto a reserva não foi paga — o vazamento", () => {
    const r = redactOwnerAddress(DONO, { isOwner: false, isPaid: false })
    expect(r.street).toBeNull()
    expect(r.cep).toBeNull()
    expect(r.neighborhood).toBeNull()
  })

  it("mantém cidade e estado — já são públicos no anúncio", () => {
    const r = redactOwnerAddress(DONO, { isOwner: false, isPaid: false })
    expect(r.city).toBe("Natal")
    expect(r.state).toBe("RN")
  })

  it("libera para o locatário depois do pagamento — ele precisa ir até lá", () => {
    expect(redactOwnerAddress(DONO, { isOwner: false, isPaid: true }).street)
      .toBe("Av. Roberto Freire, 1234")
  })

  it("o proprietário sempre vê o próprio endereço, pago ou não", () => {
    expect(redactOwnerAddress(DONO, { isOwner: true, isPaid: false }).street)
      .toBe("Av. Roberto Freire, 1234")
  })

  it("não muda o objeto recebido", () => {
    redactOwnerAddress(DONO, { isOwner: false, isPaid: false })
    expect(DONO.street).toBe("Av. Roberto Freire, 1234")
  })
})
