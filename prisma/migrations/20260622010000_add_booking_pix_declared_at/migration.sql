-- Pagamento PIX manual (fase de validação em staging):
-- locatário declara o pagamento na chave da plataforma; admin confirma o recebimento.
ALTER TABLE "bookings" ADD COLUMN "pixDeclaredAt" TIMESTAMP(3);
