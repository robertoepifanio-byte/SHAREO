-- Migration: add_cep_street_to_user
-- Adiciona campos CEP (8 dígitos) e logradouro ao perfil do usuário.
-- Preenchimento automático via ViaCEP no frontend.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cep"    CHAR(8),
  ADD COLUMN IF NOT EXISTS "street" TEXT;
