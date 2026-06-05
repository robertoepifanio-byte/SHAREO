# apply-financial-migrations-staging.ps1
# Aplica as migrations financeiras no banco de STAGING (fflpuoluiqmhpvcxubqi)
#
# Pré-requisitos:
#   - .env.staging-migrate com DIRECT_URL preenchida
#   - pnpm instalado
#
# Uso:
#   .\scripts\apply-financial-migrations-staging.ps1

$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent $PSScriptRoot

# Carrega DIRECT_URL do arquivo de env do staging
$envFile = Join-Path $ROOT ".env.staging-migrate"
if (-not (Test-Path $envFile)) {
    Write-Error "Arquivo $envFile não encontrado. Crie-o com DIRECT_URL apontando para fflpuoluiqmhpvcxubqi."
    exit 1
}

$envContent = Get-Content $envFile
$directUrl = ($envContent | Where-Object { $_ -match "^DIRECT_URL=" }) -replace "^DIRECT_URL=", ""

if (-not $directUrl) {
    Write-Error "DIRECT_URL não encontrada em $envFile"
    exit 1
}

Write-Host ""
Write-Host "=== ShareO — Migrations Financeiras (Staging) ===" -ForegroundColor Cyan
Write-Host "Banco: fflpuoluiqmhpvcxubqi (staging)" -ForegroundColor Yellow
Write-Host ""

# ─── PASSO 1: Gerar Prisma Client com schema atualizado ───────────────────────
Write-Host "[1/4] Gerando Prisma Client..." -ForegroundColor Green
Set-Location $ROOT
& pnpm prisma generate
if ($LASTEXITCODE -ne 0) { Write-Error "prisma generate falhou"; exit 1 }

# ─── PASSO 2: Registrar migration 000000 como aplicada (baseline) ─────────────
# Usamos migrate resolve para marcar as migrations como applied sem executar o SQL
# (o SQL já foi executado manualmente ou será executado nos passos 3 e 4)
#
# Se preferir executar via prisma migrate deploy (recomendado):
Write-Host ""
Write-Host "[2/4] Aplicando migrations via prisma migrate deploy..." -ForegroundColor Green
Write-Host "      (usa DIRECT_URL para evitar PgBouncer em migrations)" -ForegroundColor Gray
Write-Host ""

$env:DATABASE_URL = $directUrl
$env:DIRECT_URL   = $directUrl

& pnpm prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "prisma migrate deploy falhou." -ForegroundColor Red
    Write-Host "Alternativa: execute os SQLs manualmente no Supabase SQL Editor." -ForegroundColor Yellow
    Write-Host "  1. Cole o conteúdo de: prisma/migrations/20260605000000_add_admin_roles/migration.sql" -ForegroundColor White
    Write-Host "  2. Cole o conteúdo de: prisma/migrations/20260605000001_financial_schema/migration.sql" -ForegroundColor White
    Write-Host "     ATENÇÃO: execute o Bloco 1 (enums) separado do Bloco 2 (tabelas)" -ForegroundColor Yellow
    exit 1
}

# ─── PASSO 3: Inserir PlatformConfig padrão (taxa 15%) ────────────────────────
Write-Host ""
Write-Host "[3/4] Inserindo PlatformConfig padrão (taxa 15%)..." -ForegroundColor Green

$seedSql = @"
INSERT INTO platform_configs (id, key, value, description, "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'platformFeeRate',
  '1500',
  'Taxa da plataforma ShareO em basis points (1500 = 15%)',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
"@

# Executa via psql se disponível, senão instrui o usuário
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    $seedSql | & psql $directUrl
} else {
    Write-Host "  psql não encontrado — execute manualmente no Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host $seedSql -ForegroundColor Gray
}

# ─── PASSO 4: Re-rodar seed de staging para atualizar adminRole ───────────────
Write-Host ""
Write-Host "[4/4] Atualizando seed de staging (admin ADMIN_SUPERADMIN)..." -ForegroundColor Green
Write-Host "      Isso atualiza admin@shareo.com.br com adminRole=ADMIN_SUPERADMIN" -ForegroundColor Gray
Write-Host ""

$env:DATABASE_URL = $directUrl

& pnpm db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Seed falhou — verifique erros acima." -ForegroundColor Red
    Write-Host "Alternativa: execute manualmente:" -ForegroundColor Yellow
    Write-Host '  UPDATE users SET "adminRole" = '"'"'ADMIN_SUPERADMIN'"'"' WHERE email = '"'"'admin@shareo.com.br'"'"';' -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=== Migrations aplicadas com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Verificar no Supabase Table Editor que as tabelas foram criadas:" -ForegroundColor White
Write-Host "     owner_payment_accounts, platform_transactions, payouts, platform_configs, stripe_event_queue" -ForegroundColor Gray
Write-Host "  2. Verificar que bookings tem os novos campos (platformFeeRate, depositStatus...)" -ForegroundColor Gray
Write-Host "  3. Fazer deploy no Vercel (pnpm build deve passar sem erros de tipo)" -ForegroundColor White
Write-Host "  4. Testar login como admin@shareo.com.br e confirmar adminRole na session" -ForegroundColor White
Write-Host ""
