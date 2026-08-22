/**
 * Credenciais dos usuários fixture para smoke tests autenticados.
 * Estes usuários são criados por scripts/create-staging-fixtures.ts e
 * persistem no staging DB (não são limpos entre runs).
 *
 * 🪤 `street`/`cep`/`neighborhood` NÃO são enfeite para o proprietário: desde
 * 22/08/2026, `PATCH /api/bookings/[id]` com `action: "confirm"` exige endereço
 * completo — o locatário precisa saber onde retirar o item. Sem isso, TODO E2E
 * que confirma reserva quebra com 422 `OWNER_ADDRESS_REQUIRED`; foi o que
 * derrubou `return-flow.spec.ts` no deploy do #340. Ver lib/ownerAddress.ts.
 */

export const FIXTURE_LOCATARIO = {
  name:           'Joana Fixture Locataria',
  email:          'locatario.fixture@shareo-test.com',
  password:       'Fixture@123456',
  cpf:            '111.444.777-35',
  phone:          '+5584999990001',
  city:           'Natal',
  state:          'RN',
  cep:            '59082095',
  street:         'Av. Engenheiro Roberto Freire, 1234',
  neighborhood:   'Capim Macio',
  consentVersion: 'v1.0',
}

export const FIXTURE_PROPRIETARIO = {
  name:           'Carlos Fixture Proprietario',
  email:          'proprietario.fixture@shareo-test.com',
  password:       'Fixture@789012',
  cpf:            '749.160.580-03',
  phone:          '+5584999990002',
  city:           'Natal',
  state:          'RN',
  cep:            '59082095',
  street:         'Av. Engenheiro Roberto Freire, 1234',
  neighborhood:   'Capim Macio',
  consentVersion: 'v1.0',
}

export const FIXTURE_ADMIN = {
  name:           'Admin Fixture ShareO',
  email:          'admin.fixture@shareo-test.com',
  password:       'Fixture@Admin99',
  cpf:            '429.487.290-09',
  phone:          '+5584999990003',
  city:           'Natal',
  state:          'RN',
  cep:            '59082095',
  street:         'Av. Engenheiro Roberto Freire, 1234',
  neighborhood:   'Capim Macio',
  consentVersion: 'v1.0',
}

export const FIXTURE_FINANCEIRO = {
  email:    'financeiro@shareo.com.br',
  password: process.env.FIXTURE_FINANCEIRO_PASSWORD ?? '',
}

export const FIXTURE_OPERACIONAL = {
  email:    'operacional@shareo.com.br',
  password: process.env.FIXTURE_OPERACIONAL_PASSWORD ?? '',
}

export const SESSION_PATHS = {
  locatario:    'e2e/fixtures/session-locatario.json',
  proprietario: 'e2e/fixtures/session-proprietario.json',
  admin:        'e2e/fixtures/session-admin.json',
  financeiro:   'e2e/fixtures/session-financeiro.json',
  operacional:  'e2e/fixtures/session-operacional.json',
}
