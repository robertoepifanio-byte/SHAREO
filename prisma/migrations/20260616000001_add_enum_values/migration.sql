-- Reconciliação de drift — novos valores de enum (sincronizados ao staging via db push).
-- ALTER TYPE ... ADD VALUE fica em migration PRÓPRIA (lição do projeto: não combinar com
-- outras alterações na mesma transação — ver migration do ItemStatus DELETED, PR #18).
-- IF NOT EXISTS torna idempotente: clean DB (CI/prod) adiciona; staging (já existe) no-op.

ALTER TYPE "IdVerificationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_AUTO_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_CREDIT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTRACT_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKIN_DONE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKOUT_DONE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LATE_FEE_APPLIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ID_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ID_REJECTED';
