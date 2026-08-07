-- Captura de telefone na lista de interessados do pré-lançamento (pedido do fundador).
--
-- Serve ao contato por WhatsApp na ativação da(s) cidade(s)-piloto. Guardado em
-- E.164 (+5584999999999), mesmo formato de "users".phone, para não criar um
-- segundo padrão de telefone no banco.
--
-- NULLABLE de propósito: o campo é OPCIONAL no formulário. Telefone é o dado de
-- maior atrito numa captação, e exigi-lo custaria inscrições numa campanha paga —
-- e-mail + CEP já bastam para decidir a cidade-piloto.
--
-- ⚠️ LGPD: só disparar por telefone para leads com consent_version >= 'marketing-v1.0'.
-- Os leads criados antes desta migração aceitaram um texto que mencionava apenas
-- e-mail (gravados com a versão global dos documentos, 'v1.1'), então NÃO
-- consentiram contato por WhatsApp. Ver lib/legal-config.ts.
--
-- ADITIVA: nenhuma coluna existente é alterada.

ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
