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

## 3. Restringir métodos de pagamento do Checkout Pro (excluir boleto)

**Situação atual (verificado 2026-06-30):** a preferência de Checkout Pro criada em
`app/api/payments/mp/checkout/route.ts` (linhas ~102–125) **não define `payment_methods`** —
não há `excluded_payment_types` nem `excluded_payment_methods`. Logo, o checkout oferece
**todos os métodos habilitados na conta do locador**: cartão de crédito/débito, **Pix** e
também **boleto**.

**Problema:** o **boleto** leva 1–3 dias úteis para compensar — incompatível com o fluxo de
locação, em que o locador confirma em até 24h e o item é retirado logo em seguida. Um pagamento
por boleto deixaria a reserva pendente por dias.

**Decisão (recomendada — opção 1):** **excluir boleto** da preferência, deixando o checkout
apenas com **cartão + Pix** (que é exatamente o que a FAQ da Central de Ajuda descreve):

```ts
// dentro de body da preferência, em app/api/payments/mp/checkout/route.ts
payment_methods: {
  excluded_payment_types: [{ id: "ticket" }], // "ticket" = boleto no MP
},
```

**O que fazer antes do go-live:**

- [ ] Adicionar `excluded_payment_types: [{ id: "ticket" }]` ao corpo da preferência.
- [ ] Validar no sandbox que o checkout passa a exibir só cartão + Pix.
- [ ] (Se um dia quiserem ACEITAR boleto) em vez de excluir: acrescentar "boleto" à FAQ
  "Quais formas de pagamento são aceitas?" (`app/ajuda/page.tsx`) **e** ajustar o fluxo para
  aguardar a compensação antes de liberar a reserva.

> Não é bloqueante para o merge da migração MP (flag OFF), mas deve ser fechado antes de ligar
> `mercadoPagoEnabled` em produção, para a FAQ não prometer/omitir métodos divergentes do checkout
> real (CDC art. 30/37).

---

## Referências

- ADR-026: decisão Modelo B / split via OAuth
- `lib/mercadopago.ts`: helper `sandboxSellerTokenOverride()` com comentário `TODO(go-live)`
- `docs/checklist-go-live.md`: checklist geral de produção
- `docs/mercadopago-procedimentos-fundadores.md`: guia de credenciais e app MP
