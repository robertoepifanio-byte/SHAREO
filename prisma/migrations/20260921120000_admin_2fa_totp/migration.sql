-- 2FA por TOTP para administradores.
--
-- Motivo: o painel /admin dava acesso a documentos de identidade, dados
-- financeiros e decisão de disputas protegido só por senha, e o RLS está
-- desabilitado (a segurança é guard de rota). Um segundo fator é a barreira
-- que faltava. Ver docs/juridico/pauta-d4-reuniao-2026-09-21.md, frente C.
--
-- Só ADICIONA colunas anuláveis (ou com default vazio) — não reescreve a
-- tabela nem exige backfill. `IF NOT EXISTS` deixa a migração reexecutável.
--
-- `totpSecretEnc`      segredo base32 cifrado com AES-256-GCM (encryptPII)
-- `totpEnabledAt`      nulo = cadastro iniciado e não confirmado
-- `totpLastStep`       passo de 30 s do último código aceito (anti-replay)
-- `totpRecoveryHashes` SHA-256 dos códigos de recuperação ainda não usados

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpSecretEnc"      TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpEnabledAt"      TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpLastStep"       INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpRecoveryHashes" TEXT[];
