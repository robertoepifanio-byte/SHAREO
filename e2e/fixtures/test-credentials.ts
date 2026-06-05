/**
 * Credenciais dos usuários fixture para smoke tests autenticados.
 * Estes usuários são criados por scripts/create-staging-fixtures.ts e
 * persistem no staging DB (não são limpos entre runs).
 */

export const FIXTURE_LOCATARIO = {
  name:           'Joana Fixture Locataria',
  email:          'locatario.fixture@shareo-test.com',
  password:       'Fixture@123456',
  cpf:            '111.444.777-35',
  phone:          '+5584999990001',
  city:           'Natal',
  state:          'RN',
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
  consentVersion: 'v1.0',
}

export const FIXTURE_FINANCEIRO = {
  email:    'financeiro@shareo.com.br',
  password: 'REDACTED_USE_ENV_VAR',
}

export const FIXTURE_OPERACIONAL = {
  email:    'operacional@shareo.com.br',
  password: 'REDACTED_USE_ENV_VAR',
}

export const SESSION_PATHS = {
  locatario:    'e2e/fixtures/session-locatario.json',
  proprietario: 'e2e/fixtures/session-proprietario.json',
  admin:        'e2e/fixtures/session-admin.json',
  financeiro:   'e2e/fixtures/session-financeiro.json',
  operacional:  'e2e/fixtures/session-operacional.json',
}
