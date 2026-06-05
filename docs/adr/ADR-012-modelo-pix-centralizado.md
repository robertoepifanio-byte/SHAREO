# ADR-012 — Modelo PIX Centralizado (Merchant of Record)

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro

---

## Contexto

ShareO precisa processar pagamentos entre locatário e proprietário. As alternativas avaliadas foram:

- **Stripe Connect (Express/Custom):** suporte ao Brasil ainda limitado; exige KYC por conta conectada; complexidade de onboarding incompatível com o MVP.
- **Split nativo (Pagar.me / EFI Bank):** APIs maduras no Brasil, porém integração requer tempo de homologação e contratos adicionais.
- **Modelo centralizado:** ShareO recebe 100% do pagamento e repassa ao proprietário externamente, agindo como merchant of record.

O PIX é o meio de pagamento dominante no Brasil (Banco Central, 2024: >40 bi transações/ano). Stripe já suporta PIX como método de pagamento para cobrança, sem necessidade de Connect.

A Lei 12.865/2013 regula arranjos de pagamento; a atuação como merchant of record pode exigir enquadramento regulatório. Consulta jurídica está em andamento (D4).

## Decisão

ShareO opera como merchant of record no MVP:

1. Locatário paga via **PIX através do Stripe** (PaymentIntent + `payment_method_types: ['pix']`).
2. ShareO recebe 100% do valor na conta Stripe.
3. Repasse ao proprietário ocorre **manualmente via PIX/TED** no MVP, registrado em `Payout`.
4. Automação do repasse (EFI Bank ou Pagar.me) é planejada para V1+.
5. Código Stripe Connect de testes permanece no repositório, invisível na UI, preservando o investimento de desenvolvimento.

## Consequências

### Positivas
- Integração MVP reduzida a um único PaymentIntent por locação.
- PIX tem adoção massiva — sem atrito de cadastro de cartão para o locatário.
- Retenção total do fluxo financeiro permite controle de fraude centralizado.

### Negativas / Trade-offs
- Responsabilidade fiscal aumenta: ShareO precisa emitir documentação para cada repasse.
- Repasse manual no MVP cria gargalo operacional para volume acima de ~50 locações/mês.
- Nenhum go-live antes do retorno da consulta jurídica (D4).

## Decisões relacionadas

- [[ADR-005-criptografia-documentos]] — CPF/CNPJ dos proprietários encriptados antes do repasse
- [[ADR-013-webhook-queue]] — processamento idempotente dos eventos de pagamento PIX
- [[ADR-017-retencao-dados-financeiros]] — retenção obrigatória de registros de repasse
