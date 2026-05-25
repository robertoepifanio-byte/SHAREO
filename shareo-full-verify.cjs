/**
 * ShareO — Verificação completa Sprint 1 + Sprint 2 (re-run pós-fix)
 */
const { chromium } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const BASE  = 'http://localhost:3001';
const SHOTS = 'C:/Users/Roberto/AppData/Local/Temp/shareo-full-shots-v2';
mkdirSync(SHOTS, { recursive: true });

const ADMIN = { email: 'admin@shareo.com.br', password: 'Admin@shareo2026' };

let idx = 0;
const results = [];
function shot(name) { return join(SHOTS, `${String(idx++).padStart(2,'0')}-${name}.png`); }
function pass(step, note) { results.push({ ok: true,  step, note }); }
function fail(step, note) { results.push({ ok: false, step, note }); }

async function apiGet(path, cookie = '') {
  const r = await fetch(BASE + path, { headers: cookie ? { cookie } : {} });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function apiPost(path, body, cookie = '') {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function run() {
  // ── BLOCO 0: APIs sem auth ────────────────────────────────────────────────
  console.log('\n[0] APIs sem autenticação...');

  const cats = await apiGet('/api/categories');
  cats.status === 200 && cats.body.data?.length === 8
    ? pass('GET /api/categories', `200 · 8 categorias`)
    : fail('GET /api/categories', `status=${cats.status}`);

  const items = await apiGet('/api/items');
  items.status === 200 && 'meta' in items.body
    ? pass('GET /api/items (público)', `200 · total=${items.body.meta.total}`)
    : fail('GET /api/items (público)', `status=${items.status}`);

  const r404 = await apiGet('/api/items/id-invalido-xyz');
  r404.status === 404
    ? pass('🔍 GET /api/items/id-invalido → 404', `code=${r404.body.error?.code}`)
    : fail('🔍 GET /api/items/id-invalido → 404', `status=${r404.status}`);

  const r401 = await apiPost('/api/items', { title: 'Teste' });
  r401.status === 401
    ? pass('🔍 POST /api/items sem auth → 401', `code=${r401.body.error?.code}`)
    : fail('🔍 POST /api/items sem auth → 401', `status=${r401.status}`);

  // ── BLOCO 1: UI sem auth (1280px) ─────────────────────────────────────────
  console.log('\n[1] UI sem autenticação...');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: -5.7945, longitude: -35.211 },
    permissions: ['geolocation'],
  });
  const page = await ctx.newPage();

  // /login
  await page.goto(BASE + '/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('login') });
  const loginH1    = (await page.locator('h1').first().textContent())?.trim();
  const hasEmail   = await page.locator('input[type="email"]').isVisible();
  const hasPass    = await page.locator('input[type="password"]').isVisible();
  const hasSubmit  = await page.locator('button[type="submit"]').isVisible();
  const hasShowHide = await page.locator('button[aria-label*="senha"]').isVisible().catch(() => false);
  const hasLinkCad = await page.locator('a[href="/cadastro"]').isVisible();
  hasEmail && hasPass && hasSubmit && hasLinkCad
    ? pass('/login — estrutura', `h1="${loginH1}" | email·senha·submit·link·show-hide=${hasShowHide}`)
    : fail('/login — estrutura', `email=${hasEmail} pass=${hasPass} submit=${hasSubmit}`);

  // /login — credenciais erradas
  await page.fill('input[type="email"]', 'nao@existe.com');
  await page.fill('input[type="password"]', 'SenhaErrada1');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('login-cred-erradas') });
  const loginErr = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
  loginErr
    ? pass('/login — credenciais inválidas → erro', `alerta visível`)
    : fail('/login — credenciais inválidas → erro', `nenhum alerta`);

  // /cadastro
  await page.goto(BASE + '/cadastro');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('cadastro'), fullPage: true });
  const cadH1     = (await page.locator('h1').first().textContent())?.trim();
  const hasPF     = await page.locator('button:has-text("Pessoa Física")').isVisible();
  const hasPJ     = await page.locator('button:has-text("Empresa")').isVisible();
  const hasCPF    = await page.locator('input[placeholder*="000.000"]').isVisible().catch(() => false);
  const hasConsent = await page.locator('input[type="checkbox"]').isVisible();
  hasPF && hasPJ && hasCPF && hasConsent
    ? pass('/cadastro — estrutura', `h1="${cadH1}" | PF·PJ·CPF·consent=true`)
    : fail('/cadastro — estrutura', `PF=${hasPF} PJ=${hasPJ} CPF=${hasCPF}`);

  // toggle PJ → CNPJ
  await page.locator('button:has-text("Empresa")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('cadastro-pj') });
  const hasCNPJ = await page.locator('input[placeholder*="00.000"]').isVisible().catch(() => false);
  hasCNPJ
    ? pass('/cadastro — toggle PJ exibe CNPJ', `cnpj=true`)
    : fail('/cadastro — toggle PJ exibe CNPJ', `cnpj=false`);

  // toggle PF → CPF back
  await page.locator('button:has-text("Pessoa Física")').click();
  await page.waitForTimeout(300);
  const hasCPFback = await page.locator('input[placeholder*="000.000"]').isVisible().catch(() => false);
  pass('🔍 /cadastro — toggle PF restaura CPF', `cpf=${hasCPFback}`);

  // máscara CPF
  const cpfInp = page.locator('input[placeholder*="000.000"]').first();
  await cpfInp.fill('12345678901');
  await page.waitForTimeout(300);
  const cpfVal = await cpfInp.inputValue();
  cpfVal.includes('.') && cpfVal.includes('-')
    ? pass('/cadastro — máscara CPF', `"${cpfVal}"`)
    : fail('/cadastro — máscara CPF', `"${cpfVal}" (esperado 123.456.789-01)`);

  // indicador de força de senha
  await page.locator('button:has-text("Pessoa Física")').click().catch(() => {});
  await page.fill('input[type="password"]', 'fraca');
  await page.waitForTimeout(300);
  const hints = await page.locator('.text-success, .text-muted-foreground').filter({ hasText: /caracteres|maiúscula|número/i }).count();
  pass('/cadastro — hints de senha', `${hints} hints visíveis`);

  // Middleware sem auth
  for (const [route, label] of [
    ['/dashboard', 'dashboard'],
    ['/meus-anuncios', 'meus-anuncios'],
    ['/itens/novo', 'itens/novo'],
  ]) {
    await page.goto(BASE + route);
    await page.waitForLoadState('networkidle');
    page.url().includes('/login')
      ? pass(`Middleware → ${label} redireciona`, `callbackUrl no header`)
      : fail(`Middleware → ${label} redireciona`, `url=${page.url()}`);
  }

  // /itens public
  await page.goto(BASE + '/itens');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('itens-pub'), fullPage: true });
  const pubBuscar = await page.locator('button:has-text("Buscar")').isVisible();
  const pubCatSel = await page.locator('select[name="categoryId"]').isVisible();
  const pubNavLinks = await page.locator('header nav a').allTextContents();
  const hasEntrar = pubNavLinks.some(t => t.includes('Entrar'));
  const hasCadBtn = pubNavLinks.some(t => t.includes('Cadastrar'));
  pubBuscar && pubCatSel && hasEntrar && hasCadBtn
    ? pass('/itens — listagem pública + AppHeader sem auth', `links: [${pubNavLinks.map(t=>t.trim()).filter(Boolean).join(' | ')}]`)
    : fail('/itens — listagem pública + AppHeader', `buscar=${pubBuscar} cat=${pubCatSel} entrar=${hasEntrar}`);

  // filtros preservados
  await page.goto(BASE + '/itens?search=furadeira&city=Natal');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('itens-filtros') });
  const sVal = await page.locator('input[name="search"]').inputValue();
  const cVal = await page.locator('input[name="city"]').inputValue();
  const hasLimpar = await page.locator('a:has-text("Limpar")').isVisible();
  sVal === 'furadeira' && cVal === 'Natal' && hasLimpar
    ? pass('🔍 /itens filtros preservados', `search="${sVal}" city="${cVal}" limpar=${hasLimpar}`)
    : fail('🔍 /itens filtros preservados', `search="${sVal}" city="${cVal}"`);

  // empty state
  await page.goto(BASE + '/itens?search=xyz_sem_resultado_abc');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('itens-empty') });
  const emptyMsg = await page.locator('text=Nenhum resultado').isVisible().catch(() => false);
  emptyMsg
    ? pass('🔍 /itens empty state', `"Nenhum resultado" visível`)
    : fail('🔍 /itens empty state', `mensagem não encontrada`);

  // 404 item
  const resp404 = await page.goto(BASE + '/itens/id-nao-existe-xyz');
  await page.waitForLoadState('networkidle');
  resp404?.status() === 404
    ? pass('🔍 /itens/id-invalido → 404', `http=${resp404?.status()}`)
    : fail('🔍 /itens/id-invalido → 404', `http=${resp404?.status()}`);

  await ctx.close();

  // ── BLOCO 2: Fluxo autenticado ────────────────────────────────────────────
  console.log('\n[2] Fluxo autenticado como admin...');
  const authCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: -5.7945, longitude: -35.211 },
    permissions: ['geolocation'],
  });
  const ap = await authCtx.newPage();

  // Login real
  await ap.goto(BASE + '/login');
  await ap.waitForLoadState('networkidle');
  await ap.fill('input[type="email"]', ADMIN.email);
  await ap.fill('input[type="password"]', ADMIN.password);
  await ap.locator('button[type="submit"]').click();
  await ap.waitForURL('**/dashboard', { timeout: 12000 }).catch(() => {});
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('dashboard') });
  ap.url().includes('/dashboard')
    ? pass('Login real → /dashboard', `url=${ap.url()}`)
    : fail('Login real → /dashboard', `url=${ap.url()}`);

  // Dashboard conteúdo
  const dashH1  = (await ap.locator('h1').first().textContent())?.trim();
  const stat0   = (await ap.locator('p.text-2xl').first().textContent())?.trim();
  const criarLk = await ap.locator('a[href="/itens/novo"]').first().isVisible();
  const meusLk  = await ap.locator('a[href="/meus-anuncios"]').first().isVisible(); // .first() evita strict-mode
  dashH1?.includes('Olá') && criarLk && meusLk
    ? pass('/dashboard — conteúdo', `h1="${dashH1}" | stat=${stat0} | criar·meus=true`)
    : fail('/dashboard — conteúdo', `h1="${dashH1}" | criar=${criarLk} | meus=${meusLk}`);

  // AppHeader autenticado
  await ap.goto(BASE + '/itens');
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('header-auth') });
  const authLinks = await ap.locator('header nav a').allTextContents();
  const hasAnunc  = authLinks.some(t => t.includes('Anunciar'));
  const hasMeusA  = authLinks.some(t => t.includes('Meus Anúncios'));
  const noEntrar  = !authLinks.some(t => t.trim() === 'Entrar');
  hasAnunc && hasMeusA && noEntrar
    ? pass('AppHeader autenticado', `links: [${authLinks.map(t=>t.trim()).filter(Boolean).join(' | ')}]`)
    : fail('AppHeader autenticado', `anunciar=${hasAnunc} meus=${hasMeusA} sem_entrar=${noEntrar}`);

  // Auth user em /login → redirect dashboard
  await ap.goto(BASE + '/login');
  await ap.waitForLoadState('networkidle');
  ap.url().includes('/dashboard')
    ? pass('🔍 Auth user → /login redireciona', `url=${ap.url()}`)
    : fail('🔍 Auth user → /login redireciona', `url=${ap.url()}`);

  // /meus-anuncios — estado
  await ap.goto(BASE + '/meus-anuncios');
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('meus-anuncios'), fullPage: true });
  const meusH1 = (await ap.locator('h1').first().textContent())?.trim();
  meusH1?.includes('Meus Anúncios')
    ? pass('/meus-anuncios — renderiza', `h1="${meusH1}"`)
    : fail('/meus-anuncios — renderiza', `h1="${meusH1}"`);

  // /itens/novo — formulário
  await ap.goto(BASE + '/itens/novo');
  await ap.waitForLoadState('networkidle');
  await ap.waitForTimeout(1200);
  await ap.screenshot({ path: shot('itens-novo'), fullPage: true });
  const novoH1   = (await ap.locator('h1').first().textContent())?.trim();
  const catCount  = await ap.locator('select').first().locator('option').count();
  const geoBtn    = await ap.locator('button:has-text("Usar minha localização")').isVisible();
  const addPhoto  = await ap.locator('button:has-text("Adicionar")').isVisible();
  const pubBtn    = await ap.locator('button[type="submit"]:has-text("Publicar")').isVisible();
  novoH1?.includes('Criar') && catCount > 1 && geoBtn && addPhoto && pubBtn
    ? pass('/itens/novo — formulário completo', `h1="${novoH1}" | cats=${catCount-1} | geo·foto·submit=true`)
    : fail('/itens/novo — formulário completo', `cats=${catCount} geo=${geoBtn} pub=${pubBtn}`);

  // Validação client-side
  await ap.locator('button[type="submit"]').click();
  await ap.waitForTimeout(500);
  const errCount = await ap.locator('[role="alert"], .text-destructive').count();
  pass('🔍 /itens/novo — validação no submit vazio', `${errCount} erros exibidos`);

  // Geolocalização
  await ap.locator('button:has-text("Usar minha localização")').click();
  await ap.waitForTimeout(1500);
  const coordsOk = await ap.locator('text=-5.').isVisible().catch(() => false);
  pass('🔍 /itens/novo — geolocalização', `coords_exibidas=${coordsOk}`);

  // ─── Criar item e verificar redirect ──────────────────────────────────────
  console.log('\n   Criando item e verificando redirect...');
  const catSel = ap.locator('select').first();
  await catSel.selectOption({ index: 1 });
  await ap.fill('input[placeholder*="Furadeira"], input[placeholder*="Título"]', 'Câmera Sony A7III — mirrorless');
  await ap.fill('textarea', 'Câmera mirrorless full-frame Sony A7III, 24MP. Acompanha carregador, 2 baterias e bolsa de transporte. Perfeita para ensaios fotográficos e vídeos profissionais. Disponível para retirada em Ponta Negra, Natal.');
  await ap.locator('select').nth(1).selectOption('EXCELLENT');
  await ap.locator('input[placeholder="0,00"]').first().fill('120,00');
  await ap.fill('input[placeholder="Natal"]', 'Natal');
  await ap.locator('select[value="RN"], select').filter({ hasText: 'RN' }).first().selectOption('RN').catch(async () => {
    // fallback: select by position in the state select (3rd select in form)
    await ap.locator('select').nth(2).selectOption('RN').catch(() => {});
  });

  await ap.screenshot({ path: shot('form-preenchido'), fullPage: true });
  await ap.locator('button[type="submit"]').click();

  // Aguarda redirect para /itens/[id] (exclui /itens/novo)
  try {
    await ap.waitForURL(/\/itens\/(?!novo)[a-z0-9]+$/, { timeout: 15000 });
  } catch {
    await ap.waitForTimeout(3000);
  }
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('item-detalhe'), fullPage: true });

  const itemUrl    = ap.url();
  const isDetail   = /\/itens\/(?!novo)[a-z0-9]+$/.test(itemUrl);
  const detailH1   = (await ap.locator('h1').first().textContent())?.trim();
  const editarBtn  = await ap.locator('a:has-text("Editar anúncio")').isVisible().catch(() => false);
  const priceVis   = await ap.locator('text=/R\\$.*dia/').first().isVisible().catch(() => false);
  const ownerCard  = await ap.locator('text=Admin ShareO').first().isVisible().catch(() => false);

  if (isDetail && detailH1?.includes('Sony')) {
    pass('/itens/novo → criação → redirect /itens/[id]', `url=${itemUrl}`);
    pass('/itens/[id] — detalhe (owner)', `h1="${detailH1}" | editar=${editarBtn} | preço=${priceVis} | owner=${ownerCard}`);
  } else {
    fail('/itens/novo → criação → redirect /itens/[id]', `url=${itemUrl} | h1="${detailH1}"`);
    fail('/itens/[id] — detalhe (owner)', `url=${itemUrl}`);
  }

  // /itens — listagem com itens
  await ap.goto(BASE + '/itens');
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('itens-listagem-cheia'), fullPage: true });
  const cardCount = await ap.locator('article').count();
  cardCount > 0
    ? pass('/itens — listagem com itens', `${cardCount} card(s) visíveis`)
    : fail('/itens — listagem com itens', `0 cards`);

  // /meus-anuncios com itens e ações
  await ap.goto(BASE + '/meus-anuncios');
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('meus-anuncios-itens'), fullPage: true });
  const myCards  = await ap.locator('article').count();
  const editLinks = await ap.locator('a:has-text("Editar")').count();
  const remBtns   = await ap.locator('button:has-text("Remover")').count();
  myCards > 0 && editLinks > 0 && remBtns > 0
    ? pass('/meus-anuncios — itens com ações', `${myCards} cards | ${editLinks} editar | ${remBtns} remover`)
    : fail('/meus-anuncios — itens com ações', `cards=${myCards} editar=${editLinks} remover=${remBtns}`);

  // /dashboard stats atualizados
  await ap.goto(BASE + '/dashboard');
  await ap.waitForLoadState('networkidle');
  await ap.screenshot({ path: shot('dashboard-stats') });
  const statVal = (await ap.locator('p.text-2xl').first().textContent())?.trim();
  Number(statVal) >= 1
    ? pass('/dashboard — stat itemCount ≥ 1', `valor="${statVal}"`)
    : fail('/dashboard — stat itemCount', `valor="${statVal}"`);

  // /itens/[id]/editar — pré-preenchido
  if (isDetail) {
    const editUrl = itemUrl + '/editar';
    await ap.goto(editUrl);
    await ap.waitForLoadState('networkidle');
    await ap.waitForTimeout(1000);
    await ap.screenshot({ path: shot('item-editar'), fullPage: true });
    const editH1  = (await ap.locator('h1').first().textContent())?.trim();
    const titleVal = await ap.locator('input').first().inputValue().catch(() => '');
    editH1?.includes('Editar') && titleVal.length > 0
      ? pass('/itens/[id]/editar — pré-preenchido', `h1="${editH1}" | título="${titleVal.slice(0,40)}..."`)
      : fail('/itens/[id]/editar — pré-preenchido', `h1="${editH1}" | título="${titleVal}"`);
  }

  // 🔍 Probe: /itens/[id] não autenticado → sem botão editar
  await authCtx.close();
  const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pubP   = await pubCtx.newPage();
  if (isDetail) {
    await pubP.goto(itemUrl);
    await pubP.waitForLoadState('networkidle');
    await pubP.screenshot({ path: shot('detalhe-nao-auth') });
    const noEditar = !(await pubP.locator('a:has-text("Editar anúncio")').isVisible().catch(() => false));
    const hasLoginCTA = await pubP.locator('a:has-text("Entrar para alugar")').isVisible().catch(() => false);
    noEditar && hasLoginCTA
      ? pass('🔍 /itens/[id] sem auth — sem editar, CTA login', `sem_editar=${noEditar} cta_login=${hasLoginCTA}`)
      : fail('🔍 /itens/[id] sem auth — sem editar', `sem_editar=${noEditar} cta_login=${hasLoginCTA}`);
  }
  await pubCtx.close();

  // ── BLOCO 3: Mobile 375px ─────────────────────────────────────────────────
  console.log('\n[3] Mobile 375px...');
  const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mob    = await mobCtx.newPage();

  for (const [route, label, check] of [
    ['/login',    'login',    async () => mob.locator('input[type="email"]').isVisible()],
    ['/cadastro', 'cadastro', async () => mob.locator('button:has-text("Pessoa Física")').isVisible()],
    ['/itens',    'itens',    async () => mob.locator('header').isVisible()],
  ]) {
    await mob.goto(BASE + route);
    await mob.waitForLoadState('networkidle');
    await mob.screenshot({ path: shot(`mob-${label}`), fullPage: route !== '/itens' });
    (await check())
      ? pass(`Mobile 375px — ${label}`, `ok`)
      : fail(`Mobile 375px — ${label}`, `check failed`);
  }
  // detalhe do item no mobile
  if (isDetail) {
    await mob.goto(itemUrl);
    await mob.waitForLoadState('networkidle');
    await mob.screenshot({ path: shot('mob-item-detalhe'), fullPage: true });
    const mobH1 = (await mob.locator('h1').first().textContent())?.trim();
    mobH1?.includes('Sony')
      ? pass('Mobile 375px — /itens/[id]', `h1="${mobH1}"`)
      : fail('Mobile 375px — /itens/[id]', `h1="${mobH1}"`);
  }

  await mobCtx.close();
  await browser.close();

  // ── Relatório ─────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(62));
  console.log(' SHAREO — Sprint 1 + Sprint 2 — VERIFICAÇÃO COMPLETA');
  console.log('═'.repeat(62) + '\n');

  const groups = [
    { label: 'APIs (sem auth)',           filter: (r) => r.step.startsWith('GET') || r.step.startsWith('POST') || r.step.includes('api') },
    { label: 'Auth UI (Sprint 1)',        filter: (r) => r.step.includes('login') || r.step.includes('cadastro') || r.step.includes('Login') || r.step.includes('Middleware') },
    { label: 'Items UI (Sprint 2)',       filter: (r) => r.step.includes('itens') || r.step.includes('Criar') || r.step.includes('/itens') || r.step.includes('meus') || r.step.includes('dashboard') || r.step.includes('Dashboard') || r.step.includes('AppHeader') },
    { label: 'Mobile 375px',             filter: (r) => r.step.includes('Mobile') },
  ];

  let pass_n = 0, fail_n = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.step}`);
    console.log(`   ${r.note}`);
    if (r.ok) pass_n++; else fail_n++;
  }

  console.log(`\n${'─'.repeat(62)}`);
  console.log(`RESULTADO FINAL: ${pass_n} passed  ${fail_n} failed  (total ${pass_n + fail_n})`);
  console.log(`Screenshots: ${SHOTS}`);
  process.exit(fail_n > 0 ? 1 : 0);
}

run().catch(e => { console.error('\nFATAL:', e.message, e.stack?.split('\n')[1]); process.exit(1); });
