// Fonte: app/ajuda/page.tsx (Central de Ajuda do site) — transcrição verificada.
/**
 * Central de Ajuda do app: PAGAMENTO e números da plataforma.
 *
 * Por que este teste existe: em 21/08/2026 uma auditoria encontrou a tela
 * descrevendo o PSP anterior — 22 menções a "Mercado Pago", promessa de Pix, de
 * bandeiras Amex/Elo/Hipercard e de repasse "toda segunda-feira". O site tinha
 * sido corrigido em 20/08 e o app ficou para trás sem que nada acusasse. Uma
 * segunda passada achou mais 8 respostas com prazo e percentual errados (24h em
 * vez de 48h, multa de 1× em vez de 1,5×, "taxa de 30%" em vez das faixas de
 * reembolso).
 *
 * A regra do fundador (apps/mobile/CLAUDE.md) manda os testes RNTL fixarem os
 * rótulos exatos justamente para isso: rótulo defasado quebra a CI em vez de
 * chegar ao usuário.
 *
 * 🪤 As respostas do FAQ vivem em acordeões RECOLHIDOS. A primeira versão deste
 * teste lia só o texto renderizado e por isso passava com o bug de volta — "não
 * promete Pix" dava verde porque a resposta que prometia Pix não estava na tela.
 * As asserções de conteúdo rodam sobre os BUILDERS; o render cobre a tabela de
 * taxas, que é o único conteúdo que não passa por eles.
 */
import React from "react"
import { render, screen, waitFor } from "@testing-library/react-native"
import Ajuda, {
  buildLocatarioSteps,
  buildLocadorSteps,
  buildSections,
  toHelpVars,
  DEFAULT_CONFIG,
  type PublicConfig,
} from "../../app/ajuda"

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

/** TODO o texto da Ajuda, inclusive o que está dentro de acordeão fechado. */
function textoCompleto(cfg: PublicConfig = DEFAULT_CONFIG): string {
  const v = toHelpVars(cfg)
  const passos = [...buildLocatarioSteps(v), ...buildLocadorSteps(v)]
    .flatMap((p) => [p.title, p.desc, p.tip, p.example, p.warning])
  const faqs = buildSections(v).flatMap((s) => [s.title, ...s.faqs.flatMap((f) => [f.q, f.a])])
  return [...passos, ...faqs].filter(Boolean).join(" ")
}

const TEXTO = textoCompleto()

describe("Central de Ajuda — o que a copy NÃO pode dizer", () => {
  it.each([
    ["não cita o PSP anterior",                        /Mercado Pago/i],
    ["não promete boleto (não aceita reembolso)",      /boleto/i],
    ["não promete Amex nem Hipercard",                 /American Express|Amex|Hipercard/i],
    ["não promete a bandeira Elo",                     /\bElo\b/],
    ["não promete repasse em dia fixo da semana",      /segunda-feira|repasse semanal|semanalmente/i],
    // O modelo é "separate charges and transfers": a cobrança cai na conta da
    // ShareO e fica retida. "Custódia do <PSP>" descreve outro desenho.
    ["não afirma custódia do valor por terceiro",      /custódia/i],
    // A versão antiga alegava licença do BACEN e PCI-DSS de um provedor que nem
    // é mais o nosso; o parecer do D4 validou o desenho anterior, não o atual.
    ["não faz afirmação regulatória sobre o provedor", /Banco Central|BACEN|PCI-DSS/i],
    // 🪤 "PIX" sozinho É legítimo: o repasse manual sai numa chave PIX. O
    // proibido é Pix como meio de PAGAMENTO. Uma versão anterior desta regex
    // incluía `Pix,` e reprovava "…na sua chave PIX, se ainda não cadastrou".
    ["não oferece Pix como forma de pagamento",        /além de Pix|aceitamos? Pix|aceita Pix|pagar com Pix|Pix como forma|Pix ou boleto/i],
    // ATOR-03 (24/08/2026): a extensão deixou de valer na aprovação. A copy
    // dizia que o pagamento saía "na hora" — e a Ajuda tinha sido alinhada ao
    // código quatro dias antes, o que mostra que alinhar uma vez não segura.
    ["não promete que a extensão é cobrada na hora", /processado na hora|cobrado na hora/i],
  ])("%s", (_titulo, proibido) => {
    expect(TEXTO).not.toMatch(proibido)
  })

})

// A metade positiva: proibir a frase errada não garante que a certa exista —
// apagar a promessa deixaria só silêncio no lugar.
describe("Central de Ajuda — o que a copy PRECISA dizer", () => {
  it("nomeia a Stripe como provedor de pagamentos", () => {
    expect(TEXTO).toMatch(/Stripe/)
  })

  it("diz que o prazo da extensão só muda depois do pagamento", () => {
    expect(TEXTO).toMatch(/só muda depois que esse pagamento é confirmado/)
  })
})

describe("Central de Ajuda — números vêm da config, não do texto", () => {
  it("acompanha a config quando ela muda", () => {
    // 🪤 Mirar na FRASE derivada, não no número solto: "3 dias" também aparece
    // em "Aluguel de 3 dias = R$ 240,00", que é exemplo ilustrativo fixo e
    // correto. Uma versão anterior deste teste reprovava por causa dele.
    expect(TEXTO).toMatch(/3 dias depois/)
    expect(TEXTO).toMatch(/máximo por locação é R\$ 500/)

    const outro = textoCompleto({
      ...DEFAULT_CONFIG,
      payoutWindowDays: 7,
      checkoutMaxCents: 80_000,
      ownerHours: 12,
      lateFeeMultiplier: 2,
    })
    expect(outro).toMatch(/7 dias depois/)
    expect(outro).toMatch(/máximo por locação é R\$ 800/)
    expect(outro).toMatch(/até 12 horas para confirmar/)
    expect(outro).toMatch(/2× o preço diário|2× a diária/)
    expect(outro).not.toMatch(/3 dias depois|máximo por locação é R\$ 500/)
  })

  it("não sobrou prazo nem percentual cravado no texto", () => {
    // Com uma config sem nenhum valor "redondo" conhecido, qualquer número da
    // copy que ainda estivesse hardcoded aparece aqui.
    const exotico = textoCompleto({
      ...DEFAULT_CONFIG,
      ownerHours: 96,
      lateFeeMultiplier: 3,
    })
    expect(exotico).not.toMatch(/24 horas para confirmar/)
    expect(exotico).not.toMatch(/taxa de 30%/)
    expect(exotico).not.toMatch(/equivalente a 1 diária/)
  })
})

describe("Central de Ajuda — tabela de taxas renderizada", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: DEFAULT_CONFIG }),
    }) as unknown as typeof fetch
  })

  afterEach(() => jest.clearAllMocks())

  it("mostra o repasse pela janela da config, sem PSP antigo", async () => {
    render(<Ajuda />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    // `toJSON()` captura texto aninhado que um map sobre <Text> descartaria.
    const visivel = JSON.stringify(screen.toJSON())

    expect(visivel).toMatch(/Valor líquido da locação/)
    expect(visivel).toMatch(/3 dias após a confirmação da devolução/)
    // Política de cancelamento plana (sem faixas de horas).
    expect(visivel).toMatch(/Reembolso de 100% ao locatário/)
    expect(visivel).toMatch(/Reembolso de 100%, menos a taxa da Stripe/)
    expect(visivel).toMatch(/1,5× o preço diário/)
  })
})
