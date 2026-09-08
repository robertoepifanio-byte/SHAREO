import { test, expect, type Page } from "@playwright/test"

/**
 * A posição na fila NÃO aparece para o interessado (decisão do fundador, 08/09/2026).
 *
 * O número sugere uma ordem de atendimento que não existe: a abertura é por
 * CIDADE, então um #2 nacional pode ser convidado depois de um #300 da
 * cidade-piloto.
 *
 * 🪤 Por que E2E, se já há teste unitário dos três formulários:
 * as duas telas que exibiam o número (sucesso e e-mail duplicado) só existem
 * DEPOIS de um envio. Em 08/09 a única forma de conferir em produção foi o
 * fundador abrir o site e mandar o próprio e-mail — verificação que não
 * sobrevive à próxima mudança de copy.
 *
 * A resposta da API é interceptada, e isso é deliberado:
 *   - não cria FounderLead (registro é permanente e dispara e-mail via Resend);
 *   - o 409 e o 201 ficam determinísticos, sem depender do estado do banco;
 *   - permite o caso que MAIS importa (ver `queuePosition` abaixo): um deploy
 *     antigo da API ainda devolvendo o campo. A tela não pode imprimi-lo nem
 *     assim — é a garantia de que o corte foi na UI, não só no payload.
 *
 * Fonte da UI: components/home/FounderCaptureForm.tsx (estados success e
 * error-duplicate).
 */

const ROTA_LEADS = "**/api/founders/leads"

/** Deixa o formulário pronto para envio: intenção + e-mail + consentimento LGPD. */
async function preencherFormulario(page: Page) {
  await page.goto("/#lista-vip")

  // O formulário nasce recolhido; o CTA o expande.
  const abrir = page.getByRole("button", { name: /quero ser avisado no lançamento/i })
  await abrir.click()

  const form = page.getByRole("form", { name: /formulário de entrada na lista/i })
  await expect(form).toBeVisible()

  // Sem intenção o botão fica desabilitado — não há opção pré-marcada.
  await form.getByRole("checkbox", { name: /quero anunciar/i }).click()
  await form.getByPlaceholder(/seu melhor e-mail/i).fill("e2e.sem.posicao@shareo-test.com")

  // Cidade + UF sao o portao de envio. Informa no modo manual de proposito: o
  // atalho por CEP depende do ViaCEP, e um teste de copy nao pode ficar
  // vermelho porque um servico de terceiro saiu do ar.
  await form.getByRole("button", { name: /prefiro informar cidade e estado/i }).click()
  await form.getByPlaceholder(/sua cidade/i).fill("Recife")
  await form.getByPlaceholder(/^UF$/i).fill("PE")
  // O consentimento de marketing e o unico <input type=checkbox> do formulario:
  // as duas intencoes sao <button role="checkbox">, que este seletor nao pega.
  await form.locator('input[type="checkbox"]').check()

  return form
}

test.describe("captação de fundadores — a posição na fila não é exibida", () => {
  test("e-mail duplicado (409): avisa sem citar posição", async ({ page }) => {
    await page.route(ROTA_LEADS, (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "LEAD_ALREADY_EXISTS", message: "Este e-mail já está na lista." },
        }),
      }),
    )

    const form = await preencherFormulario(page)
    await form.getByRole("button", { name: /garantir minha vaga/i }).click()

    // Escopado na secao: `role="alert"` sozinho tambem casa com o anunciador de
    // rota do Next (#__next-route-announcer__), que existe em toda pagina.
    const aviso = page.locator("#lista-vip").getByRole("alert")
    await expect(aviso).toContainText("Este e-mail já estava na lista.")
    await expect(aviso).toContainText("Não criamos um cadastro novo.")
    // A promessa tem de ser a mesma do e-mail e da landing.
    await expect(aviso).toContainText("antes da abertura dos cadastros na sua cidade")
    // Nenhum número: pega "#42", "Nº 42" e qualquer redação futura com dígito.
    await expect(aviso).not.toHaveText(/\d/)
  })

  test("sucesso (201): confirma sem citar posição", async ({ page }) => {
    await page.route(ROTA_LEADS, (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: { leadId: "e2e-lead", referralCode: "E2ECODE1" } }),
      }),
    )

    const form = await preencherFormulario(page)
    await form.getByRole("button", { name: /garantir minha vaga/i }).click()

    // A promessa aparece 3x na secao (subtitulo da landing e cards); a asercao
    // tem de ser sobre o bloco de sucesso, nao sobre a pagina.
    const sucesso = page.locator("#lista-vip").getByText("Você está na lista!").locator("xpath=..")
    await expect(sucesso).toBeVisible()
    await expect(sucesso).toContainText("antes da abertura dos cadastros na sua cidade")

    // O convite continua carregando o referralCode — é o que atribui a indicação.
    const convite = page.getByRole("link", { name: /convidar amigos/i })
    await expect(convite).toHaveAttribute("href", /E2ECODE1/)
  })

  test("API antiga ainda devolvendo queuePosition: a tela não imprime o número", async ({ page }) => {
    // Este é o caso que o teste unitário do payload não cobre. Se alguém voltar
    // a ler o campo na UI, só um envio real revelaria — que é o que este
    // arquivo existe para dispensar.
    await page.route(ROTA_LEADS, (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: { leadId: "e2e-lead", queuePosition: 4242, wave: "WAVE_1", referralCode: "E2ECODE1" },
        }),
      }),
    )

    const form = await preencherFormulario(page)
    await form.getByRole("button", { name: /garantir minha vaga/i }).click()

    await expect(page.getByText("Você está na lista!")).toBeVisible()
    await expect(page.locator("body")).not.toContainText("4242")
    await expect(page.locator("body")).not.toContainText("WAVE_1")
  })
})
