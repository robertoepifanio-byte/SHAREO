# Mercado Pago — Pendências de Go-live

Lista de itens a remover / resetar ANTES de ligar a flag `mercadoPagoEnabled` em produção.
Todos os itens abaixo existem apenas para suportar validação no sandbox de staging e
NÃO devem ir ao ar em produção.

> Bloqueador absoluto: D4 (parecer jurídico formal). Nada desta lista substitui o D4.

---

## 1. Remover bypass `MP_SANDBOX_SELLER_TOKEN`

**Por que existe:** o OAuth com test users do MP exige verificação de e-mail, inviável no
sandbox automatizado. O bypass injeta o token do vendedor via env, contornando o decrypt
do campo cifrado `mpAccessToken`.

**O que remover:**

- [ ] Env var `MP_SANDBOX_SELLER_TOKEN` no Vercel (Production e Preview)
- [ ] Env var `MP_SANDBOX_SELLER_TOKEN` no GitHub Secrets `*_STAGING`
- [ ] Helper `sandboxSellerTokenOverride()` em `lib/mercadopago.ts`
- [ ] Call sites:
  - `app/api/mp/webhook/route.ts` — busca pelo token do vendedor
  - `app/api/payments/mp/checkout/route.ts` — usa para criar preferência em nome do locador

**Como validar a remoção:** com a flag ON e sem o bypass, o fluxo normal deve usar
`decryptPII(account.mpAccessToken)` — testar com uma conta de locador com OAuth real.

---

## 2. Resetar campos `mp*` das contas de teste semeadas com chave local de sandbox

As contas `teste_pj_01..10@demo.shareo.com.br` têm `mpAccessToken` / `mpRefreshToken`
criptografados com a `ENCRYPTION_KEY` LOCAL de desenvolvimento — incompatível com a
chave de staging/produção (Sensitive, irrecuperável localmente).

**O que fazer antes do go-live:**

- [ ] Em staging: `UPDATE owner_payment_accounts SET "mpAccessToken" = NULL, "mpRefreshToken" = NULL, "mpPublicKey" = NULL, "mpUserId" = NULL, "mpConnectedAt" = NULL WHERE "userId" IN (SELECT id FROM users WHERE email LIKE 'teste_pj_%@demo.shareo.com.br');`
- [ ] Em produção: não terá esses dados (banco vazio, criado do zero via `migrate deploy`).

---

## Referências

- ADR-026: decisão Modelo B / split via OAuth
- `lib/mercadopago.ts`: helper `sandboxSellerTokenOverride()` com comentário `TODO(go-live)`
- `docs/checklist-go-live.md`: checklist geral de produção
- `docs/mercadopago-procedimentos-fundadores.md`: guia de credenciais e app MP
