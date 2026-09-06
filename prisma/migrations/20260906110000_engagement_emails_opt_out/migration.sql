-- Descadastro dos e-mails de reengajamento.
--
-- Motivo: os e-mails de reengajamento (digest de favoritos, lembrete de
-- avaliacao, sugestao de similares) sao comunicacao opcional, nao execucao do
-- contrato. Sem opt-out havia dois problemas somados:
--
--   (a) LGPD art. 18 — a revogacao do consentimento tem que ser tao facil
--       quanto concede-lo; "responda este e-mail" nao sustenta isso;
--   (b) regras de bulk sender do Gmail/Yahoo — sem List-Unsubscribe o provedor
--       tende a classificar como spam, e o remetente e o MESMO do e-mail
--       transacional (noreply@shareo.com.br). Queimar a reputacao do dominio
--       com o digest derruba junto a confirmacao de reserva e o reset de senha.
--
-- Default false: quem ja esta na base continua recebendo. O teto de 1 e-mail
-- por 7 dias e o dedupe da tabela engagement_emails ja limitam o volume.

ALTER TABLE "users"
  ADD COLUMN "engagementEmailsOptOut" BOOLEAN NOT NULL DEFAULT false;
