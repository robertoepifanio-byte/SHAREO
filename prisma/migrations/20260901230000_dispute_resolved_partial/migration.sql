-- Desfecho PROPORCIONAL de disputa.
--
-- Politicas de Uso 3.3 e a Central de Ajuda prometem que a decisao "podera
-- incluir reembolso parcial". O sistema so tinha tudo-ou-nada: estorno integral
-- ao locatario ou repasse integral ao proprietario. Um dano parcial — item
-- devolvido funcionando mas riscado — nao tinha desfecho proporcional, e a
-- equipe era forcada a um dos extremos. Item 2 da pauta de 01/09/2026;
-- decisao de Roberto: construir, porque aqui o texto esta certo e o codigo e
-- que faltava.
--
-- 🪤 ALTER TYPE ... ADD VALUE sozinho, sem UPDATE na mesma transacao: as duas
-- coisas juntas sao invalidas no Postgres.

ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'RESOLVED_PARTIAL';
