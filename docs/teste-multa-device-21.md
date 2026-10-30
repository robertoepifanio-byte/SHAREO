# #21 — Testar a multa de atraso no app (device)

Objetivo: provar em device que o botão **"Pagar taxa de atraso"** do app aparece para o locatário, abre o Checkout da Stripe e volta ao app pelo deep link `shareo://`. É a única ação do #588 que ficou sem verificar (não havia reserva com `lateFeeAmount` no staging).

> ⚠️ **Tudo no STAGING** (`shareo-rouge.vercel.app` / Supabase `zythygwvmrwrqmnrdufq`). Nunca no prod — notificação real em device já causou reserva real.

## Como o app decide mostrar o botão (verificado no código)

`apps/mobile/app/reservas/[id].tsx:1264` — o botão `LateFeePayButton` aparece quando, para o **locatário**:
- `lateFeeAmount > 0`, e
- `lateFeePaymentIntentId` **IS NULL** (multa não quitada — a API deriva `lateFeePaid` disso), e
- `status ≠ CANCELLED`.

Logo, basta injetar `lateFeeAmount` numa reserva paga do locatário de teste. O cron **não** sobrescreve (ele só calcula quando `lateFeeAmount` está vazio).

## Quem loga no device

Locatário fixture (de `e2e/fixtures/test-credentials.ts`):
- **e-mail:** `locatario.fixture@shareo-test.com`
- **senha:** `Fixture@123456`

## Passo 1 — Semear o estado (SQL no editor do Supabase, projeto **staging** `zythy…`)

Põe R$ 45,00 de multa na reserva paga mais recente desse locatário:

```sql
-- STAGING (zythygwvmrwrqmnrdufq) — semear multa para o teste do app
BEGIN;

WITH alvo AS (
  SELECT b.id
  FROM "Booking" b
  JOIN "User" u ON u.id = b."borrowerId"
  WHERE u.email = 'locatario.fixture@shareo-test.com'
    AND b."paymentStatus" = 'PAID'
    AND b.status <> 'CANCELLED'
    AND b."lateFeePaymentIntentId" IS NULL
  ORDER BY (b.status = 'COMPLETED') DESC, b."createdAt" DESC   -- prefere COMPLETED
  LIMIT 1
)
UPDATE "Booking" b
SET "lateFeeAmount"            = 4500,     -- R$ 45,00 (centavos)
    "lateFeeCalculatedUntil"  = now(),
    "lateFeeSessionId"        = NULL,
    "lateFeeSessionExpiresAt" = NULL
FROM alvo
WHERE b.id = alvo.id
RETURNING b.id, b.status, b."lateFeeAmount";

COMMIT;
```

- **Retornou 1 linha** → anote o `id`; é a reserva que vai mostrar a multa.
- **Retornou 0 linhas** → esse locatário não tem reserva paga no staging. Crie uma antes: no app, reserve um item de outro dono, confirme como o dono (`proprietario.fixture@shareo-test.com` / `Fixture@789012`) e pague com `4242 4242 4242 4242`. Depois rode o SQL de novo.

## Passo 2 — Instalar e abrir o app (STAGING)

- Instale o build **EAS preview** da branch da multa (perfil `preview` aponta para a API do **staging**). **Não** use o APK de prod (`shareo-prod.vercel.app`).
- O APK é 1.1.0/versionCode 2 com **assinatura diferente** do de 27/09 → se a instalação reclamar de conflito, desinstale o anterior primeiro.
- Faça login como o locatário fixture (acima).

## Passo 3 — Verificar (o que tem que acontecer)

1. Abra a reserva semeada (a do `id` do passo 1).
2. Deve aparecer a caixa **"Taxa de atraso aplicada"** com **R$ 45,00** e "atraso calculado até …".
3. Toque em **"Pagar taxa de atraso"** → abre o **Checkout da Stripe** no navegador.
4. Pague com cartão de teste `4242 4242 4242 4242`, validade futura, CVV e CEP quaisquer.
5. 🔴 **Ponto crítico (`shareo://`):** ao concluir, a Stripe deve **redirecionar de volta ao app**. Se travar numa página de erro da Stripe por causa do `success_url`/`cancel_url` com esquema `shareo://`, é o risco conhecido — anote e me avise: a saída é trocar por uma página `https` que redireciona ao app.
6. De volta ao app, a caixa deve virar **"Taxa de atraso paga"** (✅).

## Passo 4 — Reverter o staging

Se **não** chegou a pagar (multa segue não quitada):

```sql
-- STAGING — desfaz a semeadura (só se NÃO pagou)
UPDATE "Booking" b
SET "lateFeeAmount" = NULL,
    "lateFeeCalculatedUntil" = NULL,
    "lateFeeSessionId" = NULL,
    "lateFeeSessionExpiresAt" = NULL
FROM "User" u
WHERE u.id = b."borrowerId"
  AND u.email = 'locatario.fixture@shareo-test.com'
  AND b."lateFeePaymentIntentId" IS NULL
  AND b."lateFeeAmount" = 4500;
```

Se **pagou** no teste (há `lateFeePaymentIntentId` gravado — é um PaymentIntent de **teste** da Stripe, inofensivo), e quer zerar tudo:

```sql
-- STAGING — reset total (apaga também o vínculo do pagamento de teste)
UPDATE "Booking" b
SET "lateFeeAmount" = NULL,
    "lateFeeCalculatedUntil" = NULL,
    "lateFeePaymentIntentId" = NULL,
    "lateFeeSessionId" = NULL,
    "lateFeeSessionExpiresAt" = NULL
FROM "User" u
WHERE u.id = b."borrowerId"
  AND u.email = 'locatario.fixture@shareo-test.com'
  AND b."lateFeeAmount" = 4500;
```

## Resultado a reportar

- Botão apareceu? Checkout abriu? `shareo://` trouxe de volta? Caixa virou "paga"?
- Se o `shareo://` falhar na Stripe, é a correção pendente (página https intermediária). Me manda o print e eu faço.
