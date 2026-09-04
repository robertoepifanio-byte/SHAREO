-- Migration: signup_source_youtube_linkedin
--
-- Acrescenta YOUTUBE_ADS e LINKEDIN_ADS ao enum SignupSource.
--
-- Motivo: os canais previstos para a campanha são Instagram, YouTube e LinkedIn,
-- e o enum só tinha GOOGLE_ADS e META_ADS. Um lead vindo do YouTube ou do
-- LinkedIn caía no default VIP_LANDING — o relatório de canal creditava ao
-- próprio site o cadastro que veio do anúncio, que é o oposto do que ele existe
-- para responder.
--
-- Só ADD VALUE, sem UPDATE: PostgreSQL recusa ALTER TYPE ... ADD VALUE na mesma
-- transação em que o valor novo é usado.

ALTER TYPE "SignupSource" ADD VALUE IF NOT EXISTS 'YOUTUBE_ADS';
ALTER TYPE "SignupSource" ADD VALUE IF NOT EXISTS 'LINKEDIN_ADS';
