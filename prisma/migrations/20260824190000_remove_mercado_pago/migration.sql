-- Remoção do Mercado Pago (decisão do fundador, 2026-08-24).
--
-- Contexto: o MP foi descartado como PSP e o código já saiu (rotas, SDK, flag,
-- UI). Restavam só estas colunas e a tabela de fila, descrevendo um PSP que o
-- código não conhece mais. Ver docs/adr/ADR-028-reversao-stripe-connect.md,
-- seção "Atualização — 2026-08-24".
--
-- ⚠️ DESTRUTIVA — apaga dados. Autorizada com escopo explícito pelo fundador
-- após conferência no staging (24/08): 1 reserva com preference/payment, 1 conta
-- com tokens OAuth criptografados e 12 linhas na fila de eventos. Tudo dado de
-- teste do sandbox do MP; nenhuma transação real jamais passou por aqui.
--
-- Os 3 índices UNIQUE (bookings_mpPreferenceId_key, owner_payment_accounts_mpUserId_key,
-- mercado_pago_event_queue_mpEventId_key) caem junto com a coluna/tabela — o
-- PostgreSQL derruba índice dependente automaticamente, sem DROP INDEX explícito.
--
-- `IF EXISTS` em tudo: a migração precisa ser reexecutável sem erro num banco
-- que já a aplicou (ex.: ambiente recriado a partir de backup mais novo).

-- Pagamento por reserva
ALTER TABLE "bookings"
  DROP COLUMN IF EXISTS "mpPreferenceId",
  DROP COLUMN IF EXISTS "mpPaymentId";

-- Conexão OAuth do proprietário (Modelo B / split do ADR-026).
-- mpAccessToken/mpRefreshToken guardavam credencial criptografada de terceiro:
-- apagá-las é também higiene de segurança, não só limpeza de schema.
ALTER TABLE "owner_payment_accounts"
  DROP COLUMN IF EXISTS "mpUserId",
  DROP COLUMN IF EXISTS "mpAccessToken",
  DROP COLUMN IF EXISTS "mpRefreshToken",
  DROP COLUMN IF EXISTS "mpPublicKey",
  DROP COLUMN IF EXISTS "mpTokenExpiresAt",
  DROP COLUMN IF EXISTS "mpConnectedAt",
  DROP COLUMN IF EXISTS "mpLiveMode";

-- Fila idempotente de notificações do MP (espelhava StripeEventQueue).
DROP TABLE IF EXISTS "mercado_pago_event_queue";

-- Flag de feature que ligava o MP — a chave some junto com o código que a lia.
--
-- 🪤 O nome da tabela é "platform_configs" (plural): o model se chama
-- PlatformConfig e o @@map pluraliza. Escrever no singular faz a migração
-- abortar com 'relation does not exist' — e, pior, o migrate deploy marca a
-- migração como FALHADA, travando TODOS os deploys seguintes até alguém mexer
-- na _prisma_migrations à mão.
--
-- Divergência deliberada do precedente: a migração 20260819120100 deixou as
-- linhas de config para "limpeza manual". Aqui o DELETE vai junto, porque passo
-- manual em migração destrutiva é passo que ninguém executa, e a chave é
-- comprovadamente morta (nenhum código a lê depois deste PR).
DELETE FROM "platform_configs" WHERE "key" = 'mercadoPagoEnabled';
