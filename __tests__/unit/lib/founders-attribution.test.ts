/**
 * @jest-environment jsdom
 */
import {
  deriveSource,
  parseAttribution,
  readAttribution,
  ATTRIBUTION_KEY,
} from "@/lib/founders-attribution"

describe("deriveSource", () => {
  it("indicação vence qualquer utm_source", () => {
    // Um link de indicação compartilhado dentro de um anúncio ainda é indicação:
    // quem trouxe a pessoa foi o amigo, não o criativo.
    expect(deriveSource("google", "ABC12345")).toBe("REFERRAL")
  })

  it.each([
    ["meta", "META_ADS"],
    ["facebook", "META_ADS"],
    ["instagram", "META_ADS"],
    ["fb", "META_ADS"],
    ["ig", "META_ADS"],
    ["Facebook_Ads", "META_ADS"],
    ["google", "GOOGLE_ADS"],
    ["adwords", "GOOGLE_ADS"],
    ["GOOGLE", "GOOGLE_ADS"],
  ])("utm_source=%s → %s", (src, expected) => {
    expect(deriveSource(src, null)).toBe(expected)
  })

  it("sem utm nem ref cai em VIP_LANDING", () => {
    expect(deriveSource(null, null)).toBe("VIP_LANDING")
  })
})

describe("parseAttribution", () => {
  it("devolve null quando a URL não traz atribuição alguma", () => {
    // É o que permite ao readAttribution recorrer ao valor salvo em vez de
    // sobrescrever a atribuição real com um objeto vazio.
    expect(parseAttribution("?foo=bar")).toBeNull()
    expect(parseAttribution("")).toBeNull()
  })

  it("captura os cinco parâmetros de UTM, o ref e o referrer", () => {
    const a = parseAttribution(
      "?utm_source=meta&utm_medium=cpc&utm_campaign=piloto&utm_content=criativo-a&utm_term=furadeira&ref=ABC12345",
      "https://instagram.com/",
    )
    expect(a).toEqual({
      source:      "REFERRAL",
      utmSource:   "meta",
      utmMedium:   "cpc",
      utmCampaign: "piloto",
      utmContent:  "criativo-a",
      utmTerm:     "furadeira",
      ref:         "ABC12345",
      referrerUrl: "https://instagram.com/",
    })
  })

  it("utm_content sozinho já conta como atribuição", () => {
    // É o parâmetro que identifica o criativo no teste A/B do Meta — descartá-lo
    // por não vir acompanhado de utm_source inutilizaria a comparação.
    expect(parseAttribution("?utm_content=variante-b")).not.toBeNull()
  })
})

describe("readAttribution — primeiro toque", () => {
  function visit(search: string, referrer = "") {
    window.history.replaceState({}, "", `/${search}`)
    Object.defineProperty(document, "referrer", { value: referrer, configurable: true })
    return readAttribution()
  }

  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it("grava a atribuição da URL na primeira visita", () => {
    const a = visit("?utm_source=meta&utm_campaign=lanc")
    expect(a.source).toBe("META_ADS")
    expect(JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY)!)).toMatchObject({
      utmSource: "meta", utmCampaign: "lanc",
    })
  })

  it("recupera a atribuição salva quando a URL não tem UTM", () => {
    // Este é o caso real: a pessoa chega por anúncio na home e navega até
    // /pilotos/<cidade> antes de preencher. Sem isto o lead vira VIP_LANDING.
    visit("?utm_source=meta&utm_campaign=lanc")
    const depois = visit("")
    expect(depois.source).toBe("META_ADS")
    expect(depois.utmCampaign).toBe("lanc")
  })

  it("NÃO sobrescreve o primeiro toque quando chega outro UTM depois", () => {
    // first-touch, não last-touch: a pergunta é "qual anúncio trouxe esta
    // pessoa". Last-touch acabaria creditando a conversão ao próprio site.
    visit("?utm_source=meta&utm_campaign=primeira")
    visit("?utm_source=google&utm_campaign=segunda")
    const salvo = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY)!)
    expect(salvo.utmCampaign).toBe("primeira")
    expect(salvo.source).toBe("META_ADS")
  })

  it("a URL atual ainda vence o retorno imediato, mesmo sem gravar", () => {
    visit("?utm_source=meta&utm_campaign=primeira")
    const segunda = visit("?utm_source=google&utm_campaign=segunda")
    expect(segunda.source).toBe("GOOGLE_ADS")
  })

  it("sem URL e sem nada salvo, cai em VIP_LANDING com o referrer", () => {
    const a = visit("", "https://news.example/")
    expect(a.source).toBe("VIP_LANDING")
    expect(a.referrerUrl).toBe("https://news.example/")
  })

  it("não quebra quando o sessionStorage lança (Safari privado)", () => {
    // Derrubar a captação por causa de telemetria seria o pior negócio possível.
    const original = window.sessionStorage.getItem
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })

    expect(() => visit("?utm_source=meta")).not.toThrow()
    expect(visit("?utm_source=meta").source).toBe("META_ADS")
    expect(() => visit("")).not.toThrow()

    jest.restoreAllMocks()
    expect(original).toBeDefined()
  })

  it("ignora JSON corrompido no storage", () => {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, "{isso não é json")
    expect(visit("").source).toBe("VIP_LANDING")
  })
})
