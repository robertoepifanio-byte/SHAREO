> ⚫ **DOCUMENTO HISTÓRICO — 2026-08-24.** O fundador decidiu que o **Mercado Pago não será utilizado**; o PSP é a Stripe ([`ADR-028`](../adr/ADR-028-reversao-stripe-connect.md)). Nada aqui é procedimento vigente. Preservado como registro do desenho avaliado.

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

## 3. Restringir métodos de pagamento do Checkout Pro (excluir boleto) ✅ DECIDIDO+IMPLEMENTADO

**Decisão dos fundadores (2026-06-30):** **excluir boleto** — checkout fica **cartão + Pix**
(bate com a FAQ da Central de Ajuda). ✅ **Implementado** em `app/api/payments/mp/checkout/route.ts`:
`payment_methods: { excluded_payment_types: [{ id: "ticket" }] }` no corpo da preferência.

**Contexto:** sem essa restrição, o Checkout Pro ofereceria **todos os métodos habilitados na
conta do locador** — cartão, Pix **e boleto**. O **boleto** compensa em 1–3 dias úteis,
incompatível com o fluxo de locação (locador confirma em 24h, item retirado em seguida) —
deixaria a reserva pendente por dias.

**Ainda a fazer:**

- [x] Adicionar `excluded_payment_types: [{ id: "ticket" }]` ao corpo da preferência. ✅
- [ ] Validar no sandbox que o checkout passa a exibir só cartão + Pix (quando o MP for exercitado).
- Alternativa **descartada** (aceitar boleto): exigiria acrescentar "boleto" à FAQ e ajustar o
  fluxo para aguardar a compensação antes de liberar a reserva. Não adotada.

> A mudança está atrás da flag `mercadoPagoEnabled` (OFF) — sem efeito em produção até o go-live.
> Mantém a FAQ da Central de Ajuda (cartão + Pix) coerente com o checkout real.

---

## 4. Remover o fluxo de PIX manual (cutover para o Mercado Pago)

**O que é:** o pagamento ativo hoje no staging é o **PIX manual** — o locatário paga numa
**chave PIX pessoal de sócio** (`platformPix*` em `lib/platform-config.ts`) e um **admin
confirma na mão** (`confirm-pix`). É scaffolding **temporário** para ter um caminho de pagamento
funcional enquanto o MP está atrás de flag (OFF).

**Por que NÃO remover agora:** com o MP desligado, este é o **único** caminho de pagamento que
funciona. Removê-lo antes do MP estar ligado e validado em produção deixaria o staging sem
pagamento. Sequência (ADR-026, passo 5): **MP ON + validado em produção → ENTÃO** remover.

> ⚠️ **Pré-condição:** este item só é executado **depois** de a flag `mercadoPagoEnabled` estar
> ligada e o ciclo de pagamento MP validado em produção. É tarefa de **cutover**, não de antes.

**O que remover/migrar no cutover:**

- [ ] `app/reservas/[id]/_PixPaymentPanel.tsx` — painel do locatário "pagar via PIX" + "Já paguei"
- [ ] `app/api/bookings/[id]/declare-pix/route.ts` — declaração de pagamento manual
- [ ] `app/admin/reservas/[id]/_ConfirmPixButton.tsx` + `app/api/admin/bookings/[id]/confirm-pix/route.ts` — confirmação manual pelo admin
- [ ] `app/admin/financeiro/contas-pix/*` + `app/api/admin/pix-accounts/[id]/route.ts` — gestão de chaves PIX no admin
- [ ] `app/perfil/recebimentos/_PixAccountForm.tsx` — formulário de chave PIX do locador → **substituir** pelo "Conectar Mercado Pago" (OAuth)
- [ ] `platformPix*` em `lib/platform-config.ts` — chave/dados do PIX da plataforma
- [ ] Integração **Stripe Checkout** legada (`lib/stripe.ts`, checkout/webhook Stripe + refs em ambassador/referral/cron/admin) — ver ADR-026, nota de implementação

**Como validar a remoção:** com o MP ligado, criar uma reserva e pagar pelo checkout do MP
(cartão e Pix), confirmar split + repasse automáticos, sem nenhuma etapa manual de admin.

---

## Referências

- ADR-026: decisão Modelo B / split via OAuth
- `lib/mercadopago.ts`: helper `sandboxSellerTokenOverride()` com comentário `TODO(go-live)`
- `docs/checklist-go-live.md`: checklist geral de produção
- `docs/juridico/mercadopago-procedimentos-fundadores.md`: guia de credenciais e app MP
