# Mercado Pago — Procedimentos e Decisões (para os fundadores)

**Contexto:** o ShareO vai operar os pagamentos das locações pelo **Mercado Pago (MP)** — PSP **licenciado pelo Banco Central**, nativo do Brasil (PIX, cartão, boleto). Substitui o Stripe (oculto) e o **PIX manual temporário em chave pessoal** que está no staging hoje. Este documento tem **o que os fundadores precisam fazer/decidir**; o resumo técnico está no fim.

> ✅ **DECIDIDO (2026-06-28):** pagamentos via **Mercado Pago**, **Modelo B (split/marketplace)**, conta de recebimento na **PJ da ShareO**, repasse semanal. Decisão recomendada pelo parecer **preliminar** do D4 (PSP licenciado + split afasta o enquadramento da Lei 12.865).
>
> ⚠️ **Nada vai para produção antes do D4 (parecer FORMAL).** A integração é construída e testada **no staging com o sandbox do MP**, atrás de uma chave de ativação (flag), **sem mover dinheiro real**.

---

## Parte 1 — Decisões dos fundadores (já tomadas)

| Decisão | Definição |
|---|---|
| **Modelo de recebimento** | **B — Marketplace/split.** Cada dono de item (inclusive PF) conecta a própria conta MP (via OAuth); o MP repassa automático e retém nossa **taxa de 15%** como *marketplace fee*. |
| **Conta da plataforma** | **PJ da ShareO (CNPJ)** — nunca conta pessoal. Substitui a chave PIX pessoal temporária do staging. |
| **Levar ao jurídico (D4)** | Já incluído: "o split do MP (PSP licenciado) muda nosso enquadramento na Lei 12.865 e no PLD?" — vira **mitigante** do bloqueador. Aguardando parecer FORMAL. |

> Por que o B (e não o A/gateway simples): alinha com o parecer (o PSP licenciado assume o arranjo de pagamento), automatiza o repasse e elimina a confirmação manual de PIX pelo admin. O custo é um onboarding novo (cada locador conecta a conta MP).

---

## Parte 2 — Passo a passo para os fundadores (gera as credenciais)

> Quem faz: **fundadores** (conta + aplicação + credenciais). Quem usa: **time técnico** (integra).

### 1. Conta Mercado Pago da empresa
- Conta **PJ** com o **CNPJ da ShareO** em https://www.mercadopago.com.br
- Completar a **verificação de identidade da empresa** (responsável legal + documentos).
- Cadastrar a **conta bancária da ShareO** para saque do saldo.

### 2. Criar a aplicação de desenvolvedor
Em https://www.mercadopago.com.br/developers → **"Suas integrações" (Your Integrations)** → **Criar aplicação**, com estas escolhas **para o nosso caso**:

| Campo | Escolher |
|---|---|
| **Nome** (≤ 50 caracteres) | ex.: `ShareO Marketplace` |
| **Tipo de solução** | **Pagamentos online (Online Payments)** |
| "Usa plataforma de e-commerce?" | **Não** (integração própria em Next.js) |
| **Produto** | **Checkout Pro** (redirecionamento; PIX/cartão/boleto nativos; não exige mudar a CSP). O split do Modelo B é construído por cima dele. |
| **Modelo de integração** (opcional) | marcar **Marketplace**, se a opção aparecer |

> ⚠️ **Importante (do próprio painel):** criar a aplicação pode **exigir reautenticar/verificar a identidade** da conta. Tenham os documentos do responsável legal à mão — se a verificação não estiver completa, o MP redireciona para o envio de documentos **antes** de liberar a app.

### 3. Copiar as credenciais (e repassar ao time com segurança)
Dentro de **Detalhes da aplicação**:
- **Credenciais → Credenciais de teste:** `Public Key (TEST-…)` + `Access Token (TEST-…)`.
- **OAuth / Client:** `Client ID` + `Client Secret` (ligam o onboarding dos locadores no Modelo B).
- 🔐 **Repassar por canal seguro** (gerenciador de senhas / variável de ambiente), **nunca por e-mail ou chat aberto** — essas chaves dão acesso ao recebimento.
- As **credenciais de produção** (`APP_USR-…`) só serão usadas **após o D4**.

### 4. Configurar as notificações (webhook)
- Cadastrar a **URL de notificação** que o time fornece (ex.: `https://staging.shareo.com.br/api/mp/webhook`).
- Guardar a **assinatura secreta** do webhook (o time usa para validar que a notificação é legítima).

### 5. OAuth / Marketplace (Modelo B)
- Confirmar que a aplicação está habilitada para **pagamentos de marketplace** (split/`marketplace_fee`). Se necessário, **solicitar a ativação** do marketplace ao MP.
- Cadastrar o **Redirect URI** do OAuth que o time fornece (ex.: `https://staging.shareo.com.br/api/mp/oauth/callback`).
- O time implementa o fluxo em que **cada dono conecta a conta MP** dele.

### 6. Usuários de teste (sandbox)
- **O time cria** os usuários de teste (1 vendedor + 1 comprador) via API com o Access Token de teste — os fundadores **não precisam** fazer isso. Cartões de teste são públicos.

### 7. Saque do saldo (produção, futuro)
- O saldo do MP é transferido para a conta bancária da ShareO. Conferir em **"Custos de receber"** o modo de liberação (padrão = mais barato; antecipada = mais caro).

---

## Parte 3 — ✅ Checklist de credenciais para entregar ao time (Fase 1, sandbox)

> 🔒 **Não cole os valores secretos no chat.** O time prepara as variáveis e indica **onde colar** (Vercel env / GitHub Secrets). Os fundadores só inserem os valores.

| Credencial | Variável | Onde | Fase |
|---|---|---|---|
| Client ID | `MP_CLIENT_ID` | Vercel env (projeto) | **1** |
| Client Secret 🔐 | `MP_CLIENT_SECRET` | Vercel env (projeto) | **1** |
| Access Token de TESTE 🔐 | `MP_ACCESS_TOKEN` | Vercel env (projeto) | **1** |
| Confirmação do modelo Marketplace/OAuth | — | (config no painel) | **1** |
| Public Key de TESTE | `NEXT_PUBLIC_MP_PUBLIC_KEY` | GitHub Secret `*_STAGING` (inlinada no build) | 2 |
| Webhook secret 🔐 | `MP_WEBHOOK_SECRET` | Vercel env (projeto) | 2 |

**Mínimo para destravar a Fase 1 (fundação atrás de flag, server-side):** **Client ID + Client Secret + Access Token de TESTE** + confirmação do modelo marketplace. O resto entra na Fase 2 (tela de checkout + webhook).

---

## Parte 4 — Custos e prazos (confirmar na fonte oficial)

> ⚠️ Tarifas e prazos **mudam com o tempo e o volume** — confirmar em **Mercado Pago → "Custos" / "Tarifas"** dentro da conta da empresa. Abaixo, só a **estrutura**:

- **PIX:** costuma ser o **mais barato** e com liberação **rápida**.
- **Cartão de crédito:** tarifa por transação **+ prazo de liberação configurável** (na hora = mais caro; D+14/D+30 = mais barato).
- **Boleto:** tarifa fixa por boleto pago.
- **Antecipação de recebíveis:** opcional, com custo.
- Essas tarifas do MP são **separadas** da taxa de 15% que a ShareO cobra (uma é custo de adquirência; a outra é a receita da plataforma). No Modelo B, a taxa de 15% sai como **marketplace fee** automaticamente.

---

## Parte 5 — O que muda para o usuário

- Hoje o staging usa um **checkout PIX manual** (locatário declara "já paguei" → admin confirma no extrato). Era **temporário**.
- Com o MP, o **PIX vira nativo**: o sistema gera o QR/copia-e-cola e o **MP confirma automaticamente** — **acaba a confirmação manual do admin**.
- O cliente pode pagar por **PIX, cartão ou boleto**.
- **Novo no Modelo B:** cada **dono de item** faz um **onboarding único** conectando a conta MP dele (OAuth) para receber os repasses automáticos.

---

## Parte 6 — Resumo técnico (para acompanhar a conversa com o time)

- **OAuth (onboarding do locador):** a plataforma redireciona o dono para autorizar (com `MP_CLIENT_ID` + redirect URI); recebe um `code`; troca por `access_token` + `refresh_token` do vendedor (usando `MP_CLIENT_SECRET`).
- **Pagamento com split:** a plataforma cria o pagamento/preference em nome do vendedor com **`marketplace_fee` = 15%** (nossa receita), o restante cai na conta MP do dono.
- **Webhook do MP** avisa o ID do pagamento; o sistema consulta o status `aprovado` e libera a reserva.
- **Faseamento (atrás de flag, sem produção):** Fase 1 fundação + OAuth → Fase 2 checkout split + webhook → validar no **sandbox** → **só então** remover o PIX-manual e o Stripe. Detalhe arquivo-a-arquivo em `docs/backlog-atividades-priorizadas.md`. Decisão registrada em `docs/adr/ADR-026-pagamentos-mercado-pago-modelo-b.md` (supersede ADR-012).
- **Stripe** segue preservado no código atrás de chave de configuração durante a transição.

---

## Parte 7 — Próximos passos

1. ✅ Fundadores decidiram **Modelo B** + **conta PJ**.
2. **Fundadores criam a conta MP da empresa + a aplicação** (Parte 2) e repassam as **credenciais de teste** (Parte 3) ao time — **bloqueador atual da Fase 1**.
3. Time implementa a **Fase 1 (fundação + OAuth) no staging/sandbox**, atrás de flag.
4. Parecer **FORMAL** do D4 confirma o enquadramento (split do MP) — ver `docs/juridico/d4-cobranca-juridico.md`.
5. Go-live só **após o D4**, com credenciais de produção e conta PJ oficial.
