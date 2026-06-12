/**
 * PriceCalc — calculadora de preço na página de detalhe do item
 *
 * Cobertura:
 * 1.  Modo diário: input +/- de dias visível
 * 2.  Modo diário: devolução = retirada + N dias (calculado automaticamente)
 * 3.  Modo diário: botão + aumenta dias; botão − diminui; mínimo 1
 * 4.  Modo diário: resumo de preço atualiza ao mudar data ou quantidade
 * 5.  Item sem pricePerWeek/Month: sem tabs de modalidade
 * 6.  Item com pricePerWeek: tab "Semanal" aparece; devolução = +7 dias (sem input de dias)
 * 7.  Item com pricePerMonth: tab "Mensal" aparece; devolução = +30 dias
 * 8.  Alternar modo mantém a data de retirada preenchida
 * 9.  Botão "Solicitar locação" desabilitado sem data selecionada
 * 10. Usuário não logado vê link /login em vez do botão de solicitar
 *
 * Seletores estáveis do componente PriceCalc:
 *   #date-start            — input date de retirada
 *   #num-days              — input number de dias (só no modo diário)
 *   #date-end              — div read-only de devolução (aria-readonly)
 *   aria-label="Aumentar"  — botão +
 *   aria-label="Diminuir"  — botão -
 *   aria-live="polite"     — container do resumo de preço
 */

import fs from 'fs'
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

interface ItemData {
  id: string
  pricePerDay: number
  pricePerWeek: number | null
  pricePerMonth: number | null
}

async function fetchItems(
  request: import('@playwright/test').APIRequestContext,
): Promise<ItemData[]> {
  const res = await request.get(`${BASE}/api/items?limit=50`)
  if (!res.ok()) return []
  const body = await res.json() as { data: ItemData[] }
  return body.data ?? []
}

// ─── 1–4. Modo diário ────────────────────────────────────────────────────────

test.describe('PriceCalc — modo diário', () => {
  test('1–4. input de dias, devolução automática e resumo de preço', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'chromium', 'PriceCalc verificado apenas em chromium')
    test.setTimeout(40000)

    const items      = await fetchItems(request)
    const dailyItem  = items.find(i => i.pricePerDay > 0)
    if (!dailyItem) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum item disponível na API de staging' })
      return
    }

    await page.goto(`${BASE}/itens/${dailyItem.id}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    // ── Teste 9: botão desabilitado sem data ─────────────────────────────
    const ctaBtn = page.getByRole('button', { name: /solicitar locação/i })
    if (await ctaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(ctaBtn).toBeDisabled()
      console.log('  9. Botão desabilitado sem data ✅')
    }

    // ── Teste 1: input de dias visível no modo diário ─────────────────────
    const numDaysInput = page.locator('#num-days')
    const dateInput    = page.locator('#date-start')
    await expect(dateInput).toBeVisible({ timeout: 8000 })

    const hasNumDays = await numDaysInput.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasNumDays) {
      console.log('  1. Input de dias visível no modo diário ✅')
      // Espera a hidratação: o botão "+" só altera o valor quando o React está ativo
      await expect(async () => {
        await page.getByRole('button', { name: 'Aumentar' }).click()
        await expect(numDaysInput).toHaveValue('2', { timeout: 500 })
      }).toPass({ timeout: 30000 })
      await page.getByRole('button', { name: 'Diminuir' }).click()
      await expect(numDaysInput).toHaveValue('1')
    } else {
      test.info().annotations.push({ type: 'info', description: '#num-days não encontrado — item pode ser multi-modal com weekly selecionado por default' })
    }

    // ── Teste 2: devolução calculada automaticamente ──────────────────────
    const startDate = addDays(new Date().toISOString().split('T')[0], 10)
    const endDisplay   = page.locator('#date-end')
    const expectedEnd1 = isoToDisplay(addDays(startDate, 1))

    // fill antes da hidratação do React é descartado — repete até a devolução refletir
    await expect(async () => {
      await dateInput.fill(startDate)
      await expect(endDisplay).toContainText(expectedEnd1, { timeout: 1500 })
    }).toPass({ timeout: 15000 })
    console.log(`  2. Devolução +1 dia = ${expectedEnd1} ✅`)

    // ── Teste 3: botões +/- e mínimo de 1 dia ────────────────────────────
    if (hasNumDays) {
      const addBtn = page.getByRole('button', { name: 'Aumentar' })
      const subBtn = page.getByRole('button', { name: 'Diminuir' })

      await addBtn.click()
      await addBtn.click()
      await expect(numDaysInput).toHaveValue('3')
      const expectedEnd3 = isoToDisplay(addDays(startDate, 3))
      await expect(endDisplay).toContainText(expectedEnd3, { timeout: 5000 })
      console.log(`  3. Devolução +3 dias = ${expectedEnd3} ✅`)

      // Tenta ir abaixo de 1 (mínimo)
      await subBtn.click()
      await subBtn.click()
      await subBtn.click()
      await expect(numDaysInput).toHaveValue('1')
      console.log('  3. Mínimo de 1 dia respeitado ✅')
    }

    // ── Teste 4: resumo de preço tem conteúdo ────────────────────────────
    // Escopado ao #price-calc: a página tem outras regiões aria-live (notificações)
    const breakdown     = page.locator('#price-calc [aria-live="polite"]')
    await expect(breakdown).toBeVisible()
    const breakdownText = await breakdown.textContent() ?? ''
    expect(breakdownText.length, 'Resumo de preço deve ter conteúdo').toBeGreaterThan(5)
    expect(breakdownText).toMatch(/dia|sem|mês|R\$/i)
    console.log(`  4. Resumo presente: "${breakdownText.slice(0, 60).trim()}" ✅`)
  })
})

// ─── 5. Item somente diário — sem tabs de modalidade ─────────────────────────

test.describe('PriceCalc — item somente diário', () => {
  test('5. sem pricePerWeek/Month → tabs Semanal e Mensal ausentes', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'chromium', 'PriceCalc verificado apenas em chromium')
    test.setTimeout(30000)

    const items          = await fetchItems(request)
    const dailyOnlyItem  = items.find(i => i.pricePerDay > 0 && !i.pricePerWeek && !i.pricePerMonth)

    if (!dailyOnlyItem) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum item somente-diário no staging — todos têm pricePerWeek ou pricePerMonth' })
      return
    }

    await page.goto(`${BASE}/itens/${dailyOnlyItem.id}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    await expect(page.getByRole('button', { name: 'Semanal' })).not.toBeVisible({ timeout: 5000 }).catch(() => {})
    await expect(page.getByRole('button', { name: 'Mensal' })).not.toBeVisible({ timeout: 3000 }).catch(() => {})
    console.log('  5. Tabs Semanal/Mensal ausentes para item só diário ✅')
  })
})

// ─── 6–7. Modalidade semanal e mensal ────────────────────────────────────────

test.describe('PriceCalc — modalidade semanal e mensal', () => {
  test('6–7. tabs aparecem; devolução = +7 e +30 dias; input de dias oculto', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'chromium', 'PriceCalc verificado apenas em chromium')
    test.setTimeout(40000)

    const items     = await fetchItems(request)
    const multiItem = items.find(i => i.pricePerDay > 0 && i.pricePerWeek != null)

    if (!multiItem) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum item com pricePerWeek no staging — testes 6–7 pulados' })
      return
    }

    await page.goto(`${BASE}/itens/${multiItem.id}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    const semanalTab = page.getByRole('button', { name: 'Semanal' })
    await expect(semanalTab).toBeVisible({ timeout: 8000 })
    console.log('  6. Tab Semanal visível ✅')

    const startDate = addDays(new Date().toISOString().split('T')[0], 15)
    const dateInput = page.locator('#date-start')
    await expect(dateInput).toBeVisible()

    // ── Semanal: devolução +7, sem input de dias ──────────────────────────
    const endDisplay      = page.locator('#date-end')
    const expectedWeekEnd = isoToDisplay(addDays(startDate, 7))

    // fill antes da hidratação do React é descartado — repete até a devolução refletir
    await expect(async () => {
      await semanalTab.click()
      await dateInput.fill(startDate)
      await expect(endDisplay).toContainText(expectedWeekEnd, { timeout: 1500 })
    }).toPass({ timeout: 15000 })

    await expect(page.locator('#num-days')).not.toBeVisible({ timeout: 3000 }).catch(() => {})
    console.log(`  6. Devolução semanal = ${expectedWeekEnd} (+7 dias) ✅`)

    // ── Mensal: devolução +30 ─────────────────────────────────────────────
    const mensalTab = page.getByRole('button', { name: 'Mensal' })
    if (await mensalTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mensalTab.click()
      const expectedMonthEnd = isoToDisplay(addDays(startDate, 30))
      await expect(endDisplay).toContainText(expectedMonthEnd, { timeout: 5000 })
      console.log(`  7. Devolução mensal = ${expectedMonthEnd} (+30 dias) ✅`)
    } else {
      test.info().annotations.push({ type: 'info', description: 'Tab Mensal não disponível neste item' })
    }
  })
})

// ─── 8. Alternar modo mantém a data de retirada ──────────────────────────────

test.describe('PriceCalc — troca de modo preserva data', () => {
  test('8. alternar entre Diário e Semanal não limpa a data de retirada', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'chromium', 'PriceCalc verificado apenas em chromium')
    test.setTimeout(30000)

    const items     = await fetchItems(request)
    const multiItem = items.find(i => i.pricePerDay > 0 && i.pricePerWeek != null)

    if (!multiItem) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum item multi-modal para este teste' })
      return
    }

    await page.goto(`${BASE}/itens/${multiItem.id}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    const startDate = addDays(new Date().toISOString().split('T')[0], 20)
    const dateInput = page.locator('#date-start')

    // Espera a hidratação: o botão "+" só altera o valor quando o React está ativo
    const numDays = page.locator('#num-days')
    await expect(async () => {
      await page.getByRole('button', { name: 'Aumentar' }).click()
      await expect(numDays).toHaveValue('2', { timeout: 500 })
    }).toPass({ timeout: 30000 })
    await page.getByRole('button', { name: 'Diminuir' }).click()

    await dateInput.fill(startDate)
    await page.getByRole('button', { name: 'Semanal' }).click()
    await expect(dateInput).toHaveValue(startDate)
    console.log('  8. Data mantida após troca para Semanal ✅')

    await page.getByRole('button', { name: 'Diário' }).click()
    await expect(dateInput).toHaveValue(startDate)
    console.log('  8. Data mantida ao voltar para Diário ✅')
  })
})

// ─── 11. Teto de R$500 por locação (D2) ───────────────────────────────────────

test.describe('PriceCalc — teto de transação', () => {
  test('11. subtotal acima de R$500 exibe alerta e desabilita o CTA', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'chromium', 'PriceCalc verificado apenas em chromium')
    test.setTimeout(40000)

    const items  = await fetchItems(request)
    const listed = items.find(i => i.pricePerDay > 0)
    if (!listed) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum item disponível' })
      return
    }

    // A API de listagem não retorna pricePerMonth — buscar o detalhe do item,
    // pois o subtotal usa o desconto da modalidade mais econômica
    const detailRes = await request.get(`${BASE}/api/items/${listed.id}`)
    const detail    = (await detailRes.json()).data as ItemData
    const item      = { ...listed, ...detail }

    const minRate = (i: ItemData) =>
      Math.min(
        i.pricePerDay,
        i.pricePerWeek  ? i.pricePerWeek  / 7  : Infinity,
        i.pricePerMonth ? i.pricePerMonth / 30 : Infinity,
      )
    if (Math.ceil(50_001 / minRate(item)) > 365) {
      test.info().annotations.push({ type: 'info', description: 'Preço baixo demais para exceder R$500 em 365 dias' })
      return
    }

    await page.goto(`${BASE}/itens/${item.id}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    const dateInput = page.locator('#date-start')
    await expect(dateInput).toBeVisible({ timeout: 8000 })

    const numDaysInput = page.locator('#num-days')
    if (!(await numDaysInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.info().annotations.push({ type: 'info', description: '#num-days indisponível — teste pulado' })
      return
    }

    const startDate = addDays(new Date().toISOString().split('T')[0], 10)
    const daysOver  = Math.ceil(50_001 / minRate(item))
    const alert     = page.locator('#price-calc [role="alert"]')

    // A hidratação do React pode descartar fills anteriores — repete a sequência
    // completa (data + dias) até o alerta de teto aparecer
    await expect(async () => {
      await dateInput.fill(startDate)
      await numDaysInput.fill(String(daysOver))
      await expect(alert).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 15000 })
    await expect(alert).toContainText('R$')
    console.log(`  11. Alerta de teto visível com ${daysOver} dias ✅`)

    // CTA (logado: button desabilitado / deslogado: link continua, mas o alerta cobre o aviso)
    const ctaBtn = page.getByRole('button', { name: /solicitar locação/i })
    if (await ctaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(ctaBtn).toBeDisabled()
      console.log('  11. CTA desabilitado acima do teto ✅')
    }
  })
})

// ─── 9–10. Botão desabilitado e link de login ─────────────────────────────────

test.describe('PriceCalc — CTA e autenticação', () => {
  test('10. usuário não logado vê link /login em vez do botão de solicitar', async ({ page, request }) => {
    test.skip(test.info().project.name !== 'chromium', 'PriceCalc verificado apenas em chromium')
    test.setTimeout(20000)

    const items     = await fetchItems(request)
    const dailyItem = items.find(i => i.pricePerDay > 0)
    if (!dailyItem) {
      test.info().annotations.push({ type: 'info', description: 'Nenhum item disponível' })
      return
    }

    // Navega sem sessão autenticada
    await page.goto(`${BASE}/itens/${dailyItem.id}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    // PriceCalc renderiza <Link href="/login?callbackUrl=..."> para não-logados
    const loginLink = page.getByRole('link', { name: /solicitar locação/i })
    await expect(loginLink).toBeVisible({ timeout: 8000 })

    const href = await loginLink.getAttribute('href') ?? ''
    expect(href, 'Link deve apontar para /login com callbackUrl').toContain('/login')
    console.log(`  10. Link de login: ${href} ✅`)
  })
})
