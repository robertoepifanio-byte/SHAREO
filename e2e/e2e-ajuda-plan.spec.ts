/**
 * Plano de Teste E2E — ShareO Staging (Central de Ajuda)
 *
 * Valida que a página /ajuda é autoexplicativa para dois perfis de usuário novo:
 *   Cenário 1 · Locatário — do cadastro à devolução sem suporte externo
 *   Cenário 2 · Locador   — do cadastro a 2 locações concluídas sem suporte externo
 *
 * Step 1 · Estrutura e carregamento da página   — critical / ABORTAR
 * Step 2 · Cenário 1: fluxo do locatário        — critical / ABORTAR
 * Step 3 · Cenário 2: fluxo do locador          — high     / CONTINUAR
 * Step 4 · Taxas, disputas e suporte            — high     / CONTINUAR
 * Step 5 · Busca interativa e âncoras           — medium   / CONTINUAR
 *
 * Restrições:
 *  - Somente staging (shareo-rouge.vercel.app) — sem produção
 *  - Apenas leitura — sem mutação de dados
 *  - Logs armazenados localmente (e2e-ajuda-report.json)
 *  - Abortar se qualquer passo crítico falhar
 */

import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

const BASE_URL    = process.env.STAGING_URL ?? 'https://shareo-rouge.vercel.app'
const REPORT_PATH = path.resolve('e2e-ajuda-report.json')
const AJUDA_URL   = `${BASE_URL}/ajuda`

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Priority   = 'critical' | 'high' | 'medium' | 'low'
type StepStatus = 'passed' | 'failed' | 'skipped'

interface StepResult {
  step:       number
  name:       string
  priority:   Priority
  onFail:     'ABORTAR' | 'CONTINUAR'
  status:     StepStatus
  durationMs: number
  error?:     string
  findings?:  string
}

class SkipStep extends Error {
  constructor(r: string) { super(r); this.name = 'SkipStep' }
}

const STEPS = [
  { num: 1, name: '1. Estrutura e carregamento da página', priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 2, name: '2. Cenário 1 — fluxo do locatário',    priority: 'critical' as Priority, onFail: 'ABORTAR'   as const },
  { num: 3, name: '3. Cenário 2 — fluxo do locador',      priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 4, name: '4. Taxas, disputas e suporte',         priority: 'high'     as Priority, onFail: 'CONTINUAR' as const },
  { num: 5, name: '5. Busca interativa e âncoras',        priority: 'medium'   as Priority, onFail: 'CONTINUAR' as const },
] as const

// ---------------------------------------------------------------------------
// Conteúdo obrigatório — Cenário 1 (Locatário)
// 8 etapas do fluxo × frases-âncora que provam cobertura completa
// ---------------------------------------------------------------------------

const LOCATARIO_REQUIRED = [
  { step: 'Criar conta',             phrase: /criar conta|create account/i },
  { step: 'Verificar identidade',    phrase: /verificar identidade|CPF|selfie/i },
  { step: 'Buscar equipamento',      phrase: /busca|explorar|encontre/i },
  { step: 'Solicitar reserva',       phrase: /solicitar|reserva|calculadora/i },
  { step: 'Pagamento',               phrase: /pagar|pagamento|cartão|stripe/i },
  { step: 'Retirada do item',        phrase: /retirada|check.in|entregar/i },
  { step: 'Devolução e multa',       phrase: /devolver|devolução|multa|atraso/i },
  { step: 'Disputa',                 phrase: /disputa|problema|suporte/i },
]

// ---------------------------------------------------------------------------
// Conteúdo obrigatório — Cenário 2 (Locador)
// 6 etapas + prova de cobertura de 2 locações
// ---------------------------------------------------------------------------

const LOCADOR_REQUIRED = [
  { step: 'Criar conta como locador',  phrase: /criar conta|create account|cadastro/i },
  { step: 'Anunciar item',             phrase: /anunciar|anúncio|publicar/i },
  { step: 'Caução',                    phrase: /caução/i },
  { step: 'Gerenciar solicitações',    phrase: /solicitação|confirmar|24 hora/i },
  { step: 'Check-in fotográfico',      phrase: /check.in|foto|registrar/i },
  { step: 'Receber pagamento',         phrase: /pagamento|recebi|libera/i },
  { step: '2 locações concluídas',     phrase: /2ª locação|segunda locação|repita|mesmo fluxo/i },
]

// ---------------------------------------------------------------------------
// Taxas obrigatórias na tabela de transparência
// ---------------------------------------------------------------------------

const REQUIRED_FEES = [
  '10%',
  'Gratuito',
  'atraso',
  'caução',
  'cancelamento',
]

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Plano E2E Central de Ajuda — ShareO', () => {
  test.setTimeout(120_000)

  test('Estrutura · Locatário · Locador · Taxas · Busca', async ({ page }) => {
    const results: StepResult[] = []
    let abortError: Error | undefined
    let stepFindings: string | undefined

    async function runStep(
      meta: typeof STEPS[number],
      fn: () => Promise<void>,
    ) {
      stepFindings = undefined
      const t0   = Date.now()
      const base = { step: meta.num, name: meta.name, priority: meta.priority, onFail: meta.onFail }

      if (abortError) {
        results.push({ ...base, status: 'skipped', durationMs: 0, error: 'Suíte abortada — passo crítico anterior falhou' })
        return
      }

      try {
        await fn()
        results.push({ ...base, status: 'passed', durationMs: Date.now() - t0, ...(stepFindings && { findings: stepFindings }) })
      } catch (err) {
        const isSkip = err instanceof SkipStep
        const msg    = err instanceof Error ? err.message : String(err)
        results.push({ ...base, status: isSkip ? 'skipped' : 'failed', durationMs: Date.now() - t0, error: msg, ...(stepFindings && { findings: stepFindings }) })
        if (!isSkip && meta.onFail === 'ABORTAR') abortError = err as Error
      }
    }

    try {
      // ── Step 1: Estrutura e carregamento ───────────────────────────────────
      await test.step(STEPS[0].name, () =>
        runStep(STEPS[0], async () => {
          await page.goto(AJUDA_URL, { waitUntil: 'networkidle' })

          // H1 presente
          const h1 = page.getByRole('heading', { level: 1 })
          await expect(h1, 'H1 deve estar presente').toBeVisible({ timeout: 15_000 })
          const h1Text = (await h1.textContent() ?? '').trim()
          expect(h1Text.length, 'H1 deve ter conteúdo').toBeGreaterThan(0)

          // Seção "Primeiros Passos" presente
          const primeirosPassos = page.locator('#primeiros-passos')
          await expect(primeirosPassos, '"Primeiros Passos" deve existir').toBeVisible()

          // Tabela de taxas presente
          const tabelaTaxas = page.locator('#taxas-secao')
          await expect(tabelaTaxas, 'Tabela de taxas deve existir').toBeVisible()

          // Campo de busca FAQ presente
          const searchInput = page.getByRole('searchbox').or(page.locator('input[type="search"]'))
          await expect(searchInput, 'Campo de busca FAQ deve existir').toBeVisible()

          // Navegação rápida (âncoras) no hero
          const heroAnchors = page.locator('section').first().getByRole('link')
          const anchorCount = await heroAnchors.count()
          expect(anchorCount, 'Hero deve ter links de âncora').toBeGreaterThanOrEqual(4)

          stepFindings = `H1: "${h1Text.slice(0, 60)}" | Primeiros Passos ✓ | Tabela taxas ✓ | Busca FAQ ✓ | ${anchorCount} âncoras no hero`
          test.info().annotations.push({ type: 'estrutura', description: stepFindings })
        })
      )
      if (abortError) throw abortError

      // ── Step 2: Cenário 1 — Locatário ──────────────────────────────────────
      await test.step(STEPS[1].name, () =>
        runStep(STEPS[1], async () => {
          await page.goto(AJUDA_URL, { waitUntil: 'networkidle' })

          // textContent inclui texto de <details> fechados (ao contrário de innerText)
          const bodyText = await page.locator('body').textContent() ?? ''

          // Verifica presença de cada etapa do fluxo de locatário
          const missing: string[] = []
          for (const req of LOCATARIO_REQUIRED) {
            if (!req.phrase.test(bodyText)) {
              missing.push(req.step)
            }
          }

          if (missing.length > 0) {
            throw new Error(
              `Cenário 1 incompleto — etapas sem cobertura na página: ${missing.join(', ')}`
            )
          }

          // Verifica que exemplo prático com valor numérico existe para multa
          const temExemploMulta = /R\$\s*\d+.*atraso|atraso.*R\$\s*\d+/i.test(bodyText)
          expect(temExemploMulta, 'Deve existir exemplo prático com valor monetário para multa').toBe(true)

          // Verifica que taxa de serviço (10%) está mencionada
          const temTaxaServico = /10%/.test(bodyText)
          expect(temTaxaServico, 'Taxa de serviço de 10% deve estar mencionada').toBe(true)

          // Verifica que caução com prazo de devolução está explicada
          const temCaucaoPrazo = /7 dias/.test(bodyText)
          expect(temCaucaoPrazo, 'Prazo de devolução da caução (7 dias úteis) deve estar mencionado').toBe(true)

          // Verifica que o processo de disputa está coberto
          const temDisputa = /disputa/i.test(bodyText)
          expect(temDisputa, 'Processo de disputa deve estar coberto').toBe(true)

          // Verifica que informações de check-in estão no conteúdo de locatário
          const secaoLocatario = page.locator('#locatario')
          if (await secaoLocatario.count() > 0) {
            const locatarioText = await secaoLocatario.textContent() ?? ''
            expect(/check.in|foto/i.test(locatarioText), 'Seção locatário deve mencionar check-in fotográfico').toBe(true)
          }

          const covered = LOCATARIO_REQUIRED.map(r => r.step).join(', ')
          stepFindings = `Todas as etapas cobertas: ${covered} | Exemplo multa ✓ | Taxa 10% ✓ | Caução 7 dias ✓ | Disputa ✓`
          test.info().annotations.push({ type: 'cenario-1-locatario', description: stepFindings })
        })
      )
      if (abortError) throw abortError

      // ── Step 3: Cenário 2 — Locador ────────────────────────────────────────
      await test.step(STEPS[2].name, () =>
        runStep(STEPS[2], async () => {
          await page.goto(AJUDA_URL, { waitUntil: 'networkidle' })

          // textContent inclui texto de <details> fechados (ao contrário de innerText)
          const bodyText = await page.locator('body').textContent() ?? ''

          // Verifica presença de cada etapa do fluxo de locador
          const missing: string[] = []
          for (const req of LOCADOR_REQUIRED) {
            if (!req.phrase.test(bodyText)) {
              missing.push(req.step)
            }
          }

          if (missing.length > 0) {
            throw new Error(
              `Cenário 2 incompleto — etapas sem cobertura na página: ${missing.join(', ')}`
            )
          }

          // Verifica que check-in fotográfico está enfatizado como obrigatório
          const temCheckInObrigatorio = /obrigatório|obrigatoriamente|nunca pule/i.test(bodyText)
          expect(temCheckInObrigatorio, 'Check-in fotográfico deve ser marcado como obrigatório').toBe(true)

          // Verifica que prazo de 24h para confirmar solicitação está presente
          const temPrazo24h = /24 hora/i.test(bodyText)
          expect(temPrazo24h, 'Prazo de 24h para confirmar solicitação deve estar presente').toBe(true)

          // Verifica que anúncio gratuito está explicitado para locador
          const temAnuncioGratuito = /gratuito|grátis/i.test(bodyText)
          expect(temAnuncioGratuito, 'Deve constar que anunciar é gratuito').toBe(true)

          // Verifica seção FAQ de locador com conteúdo
          const secaoLocador = page.locator('#locador')
          if (await secaoLocador.count() > 0) {
            const locadorText = await secaoLocador.textContent() ?? ''
            expect(locadorText.length, 'Seção FAQ locador deve ter conteúdo').toBeGreaterThan(200)
          }

          // Verifica que exemplo de anúncio com valores reais está presente
          const temExemploAnuncio = /R\$\s*\d+\/dia|R\$\s*\d+.*semana/i.test(bodyText)
          expect(temExemploAnuncio, 'Deve existir exemplo prático de anúncio com preço').toBe(true)

          const covered = LOCADOR_REQUIRED.map(r => r.step).join(', ')
          stepFindings = `Todas as etapas cobertas: ${covered} | Check-in obrigatório ✓ | 24h prazo ✓ | Gratuito ✓ | Exemplo preço ✓`
          test.info().annotations.push({ type: 'cenario-2-locador', description: stepFindings })
        })
      )

      // ── Step 4: Taxas, disputas e suporte ──────────────────────────────────
      await test.step(STEPS[3].name, () =>
        runStep(STEPS[3], async () => {
          await page.goto(AJUDA_URL, { waitUntil: 'networkidle' })

          // ── Tabela de taxas ─────────────────────────────────────────────────
          const tabelaTaxas = page.locator('#taxas-secao table')
          await expect(tabelaTaxas, 'Tabela de taxas deve estar visível').toBeVisible()

          const tabelaText = await tabelaTaxas.innerText()
          const feesMissing: string[] = []
          for (const fee of REQUIRED_FEES) {
            if (!tabelaText.includes(fee)) feesMissing.push(fee)
          }
          if (feesMissing.length > 0) {
            throw new Error(`Taxas ausentes na tabela: ${feesMissing.join(', ')}`)
          }

          // Linhas da tabela (além do header)
          const rows = tabelaTaxas.locator('tbody tr')
          const rowCount = await rows.count()
          expect(rowCount, 'Tabela deve ter ao menos 4 linhas de taxas').toBeGreaterThanOrEqual(4)

          // ── Seção de disputas no FAQ ────────────────────────────────────────
          const secaoDisputas = page.locator('#disputas')
          await expect(secaoDisputas, 'Seção de Disputas deve existir no FAQ').toBeVisible()

          const disputasText = await secaoDisputas.innerText()
          // Prazo para abertura de disputa (48 horas)
          expect(/48 hora/i.test(disputasText), 'Prazo de 48h para disputa deve estar mencionado').toBe(true)
          // Prazo de resposta da equipe (3 dias úteis)
          expect(/3 dia/i.test(disputasText), 'Prazo de resposta de 3 dias deve estar mencionado').toBe(true)

          // ── Seção de suporte no FAQ ─────────────────────────────────────────
          const secaoSuporte = page.locator('#suporte')
          await expect(secaoSuporte, 'Seção de Suporte deve existir no FAQ').toBeVisible()

          const suporteText = await secaoSuporte.innerText()
          // Email de suporte
          expect(/suporte@shareo\.com\.br/i.test(suporteText), 'Email de suporte deve estar visível').toBe(true)
          // Prazo de resposta por email
          expect(/4 hora/i.test(suporteText), 'Prazo de resposta por email (4h) deve estar mencionado').toBe(true)

          // ── Seção de contato sempre visível ────────────────────────────────
          const contatoSection = page.locator('#contato')
          await expect(contatoSection, 'Seção de contato deve estar sempre visível').toBeVisible()

          const contatoEmail = contatoSection.getByRole('link', { name: /suporte@shareo/i })
          await expect(contatoEmail, 'Link de email de suporte deve estar no contato').toBeVisible()

          stepFindings = `Tabela: ${rowCount} linhas, ${REQUIRED_FEES.join('/')} ✓ | Disputas: 48h + 3 dias ✓ | Suporte: email + 4h ✓ | Contato visível ✓`
          test.info().annotations.push({ type: 'taxas-disputas-suporte', description: stepFindings })
        })
      )

      // ── Step 5: Busca interativa e âncoras ────────────────────────────────
      await test.step(STEPS[4].name, () =>
        runStep(STEPS[4], async () => {
          await page.goto(AJUDA_URL, { waitUntil: 'networkidle' })

          const searchInput = page.getByRole('searchbox').or(page.locator('input[type="search"]'))
          await expect(searchInput, 'Campo de busca deve estar visível').toBeVisible()

          // ── Busca por "caução" deve filtrar e mostrar resultados ────────────
          await searchInput.fill('caução')
          await page.waitForTimeout(300) // debounce

          // Deve aparecer ao menos 1 item que mencione caução
          const causaoResults = page.locator('details summary').filter({ hasText: /caução/i })
          const causaoCount = await causaoResults.count()
          expect(causaoCount, 'Busca por "caução" deve retornar ao menos 1 FAQ').toBeGreaterThan(0)

          // ── Busca por "disputa" ─────────────────────────────────────────────
          await searchInput.fill('disputa')
          await page.waitForTimeout(300)

          const disputaResults = page.locator('details summary').filter({ hasText: /disputa/i })
          const disputaCount = await disputaResults.count()
          expect(disputaCount, 'Busca por "disputa" deve retornar ao menos 1 FAQ').toBeGreaterThan(0)

          // ── Busca inválida → estado vazio ───────────────────────────────────
          await searchInput.fill('zzzzinexistentezzz')
          await page.waitForTimeout(300)

          // O estado vazio deve mostrar CTA para limpar
          const emptyState = page.getByRole('button', { name: /ver todas|limpar/i })
          await expect(emptyState, 'Estado vazio deve ter botão de limpar').toBeVisible({ timeout: 5_000 })

          // ── Limpar busca restaura todos os FAQs ────────────────────────────
          await emptyState.click()
          await page.waitForTimeout(300)

          const inputValue = await searchInput.inputValue()
          expect(inputValue, 'Campo deve estar vazio após limpar').toBe('')

          // ── Âncoras do hero navegam para as seções corretas ─────────────────
          const anchorsToCheck = [
            { href: '#primeiros-passos', sectionId: 'primeiros-passos' },
            { href: '#locatario',        sectionId: 'locatario' },
            { href: '#taxas-secao',      sectionId: 'taxas-secao' },
            { href: '#disputas',         sectionId: 'disputas' },
          ]

          const heroSection = page.locator('section').first()
          let anchorsOk = 0

          for (const anchor of anchorsToCheck) {
            const link = heroSection.locator(`a[href="${anchor.href}"]`)
            if (await link.count() > 0) {
              const target = page.locator(`#${anchor.sectionId}`)
              if (await target.count() > 0) anchorsOk++
            }
          }

          expect(anchorsOk, 'Pelo menos 3 âncoras do hero devem resolver para seções existentes').toBeGreaterThanOrEqual(3)

          stepFindings = `Busca "caução": ${causaoCount} resultado(s) | "disputa": ${disputaCount} | Estado vazio ✓ | Limpar ✓ | ${anchorsOk}/${anchorsToCheck.length} âncoras válidas`
          test.info().annotations.push({ type: 'busca-ancoras', description: stepFindings })
        })
      )

    } finally {
      const passed  = results.filter((r) => r.status === 'passed').length
      const failed  = results.filter((r) => r.status === 'failed').length
      const skipped = results.filter((r) => r.status === 'skipped').length
      const verdict = abortError ? 'ABORTADO' : failed > 0 ? 'PARCIAL' : 'OK'

      const report = {
        meta: {
          name:        'Teste E2E ShareO — Central de Ajuda',
          environment: 'staging',
          url:         AJUDA_URL,
          runAt:       new Date().toISOString(),
          verdict,
          criterios: {
            cenario1: 'Locatário conclui ciclo completo (cadastro→reserva→devolução) sem suporte externo',
            cenario2: 'Locador conclui cadastro + 2 locações sem suporte externo',
          },
        },
        summary: { passed, failed, skipped, total: results.length, verdict },
        steps:   results,
      }

      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
      if (abortError) throw abortError
    }
  })
})
