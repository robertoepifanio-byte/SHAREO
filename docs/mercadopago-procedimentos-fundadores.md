# Mercado Pago — Procedimentos e Decisões (para os fundadores)

**Contexto:** avaliação de substituir o **Stripe** pelo **Mercado Pago (MP)** como meio de pagamento das locações. O MP é nativo do Brasil, faz **PIX, cartão e boleto** e é uma **instituição de pagamento licenciada** — o que pode, inclusive, ajudar nas questões do D4 (jurídico). Este documento tem **o que os fundadores precisam fazer/decidir**; o resumo técnico está no fim.

> ⚠️ **Nada disso vai para produção antes do D4.** A integração pode ser construída e testada no *staging* (ambiente de homologação) usando o **sandbox do MP**, sem mover dinheiro real.

---

## Parte 1 — Decisões que dependem dos fundadores

Estas 3 decisões definem o tamanho do trabalho e o impacto jurídico:

### Decisão 1 — Modelo de recebimento (a mais importante)

| | **A) MP como gateway simples** | **B) MP Marketplace (split automático)** |
|---|---|---|
| Quem recebe | **1 conta MP da ShareO** recebe tudo | cada **dono do item** conecta a própria conta MP |
| Repasse ao dono | manual (como hoje) | **automático** pelo MP; a taxa de 15% sai como "marketplace fee" |
| Esforço técnico | menor (~3–5 dias) | maior (~2–3 semanas) |
| Efeito no jurídico (D4) | mantém a ShareO como "recebedora de terceiros" | **ameniza**: o MP (licenciado pelo BC) passa a ser o arranjo de pagamento |
| Recomendação | **começar por aqui** | trilha para depois do D4 (alinha com o plano de longo prazo) |

➡️ **Recomendação:** começar pelo **A** (resolve o PIX nativo já) e **levar o B ao jurídico**, porque pode reduzir o escopo regulatório.

### Decisão 2 — Conta PJ da ShareO
A conta do MP deve ser **empresa (CNPJ da ShareO)**, não conta pessoal. Isso **substitui a chave PIX pessoal temporária do Raimundo** que está no staging hoje, e é exatamente o ponto que o jurídico precisa endereçar (receber pagamento de terceiros).

### Decisão 3 — Levar ao jurídico junto do D4
Incluir na consulta: "se usarmos o **split do Mercado Pago** (PSP licenciado), isso muda nosso enquadramento na Lei 12.865/2013 e no PLD (Lei 9.613)?" — pode transformar parte do bloqueador em mitigante.

---

## Parte 2 — Procedimentos operacionais (passo a passo)

> Quem faz: **fundadores** (conta/credenciais). Quem usa: **time técnico** (integra com as credenciais).

### 1. Criar/usar a conta Mercado Pago da empresa
- Conta **PJ** com o CNPJ da ShareO em https://www.mercadopago.com.br
- Completar o cadastro e a **verificação de identidade da empresa** (responsável legal, documentos).
- Cadastrar a **conta bancária da ShareO** para saque do saldo.

### 2. Criar a aplicação de desenvolvedor (gera as credenciais)
- Acessar https://www.mercadopago.com.br/developers → **"Suas integrações"** → **criar aplicação**.
- Definir o produto: **Checkout Pro** (pagamento online com redirecionamento) — é o que o time vai usar.
- Cada aplicação tem dois conjuntos de credenciais:
  - **Teste (sandbox):** `Public Key` + `Access Token` de teste.
  - **Produção:** `Public Key` + `Access Token` de produção (usar **só após o D4**).
- 🔐 Repassar as credenciais ao time **por canal seguro** (não por e-mail/chat aberto) — elas dão acesso ao recebimento.

### 3. Criar usuários de teste (sandbox)
- No painel do desenvolvedor, criar **usuários de teste** (um "comprador" e, se for o modelo B, um "vendedor").
- O time usa **cartões de teste** do MP + esses usuários para validar o fluxo sem dinheiro real.

### 4. Configurar as notificações (webhook)
- Na aplicação, configurar a **URL de notificação** (o time fornece, ex.: `.../api/webhooks/mercadopago`).
- Guardar a **assinatura secreta** do webhook (o MP usa para o time validar que a notificação é legítima).

### 5. (Somente modelo B) Ativar Marketplace
- Solicitar/ativar o modo **Marketplace** na conta.
- O time implementa a autorização (**OAuth**) para cada dono conectar a conta MP dele.

### 6. Saque do saldo
- O dinheiro recebido fica no **saldo do MP**; transferir para a conta bancária da ShareO (PIX/TED).
- Conferir em **"Custos de receber"** se está no modo de liberação padrão (mais barato) ou antecipada (mais caro).

---

## Parte 3 — Custos e prazos (confirmar na fonte oficial)

> ⚠️ As tarifas e prazos **mudam com o tempo e com o volume negociado** — confirmar os números atuais em **Mercado Pago → "Custos" / "Tarifas"** dentro da conta da empresa. Abaixo, só a **estrutura** para os fundadores saberem o que perguntar:

- **PIX:** costuma ser o meio **mais barato** e com liberação **rápida** (importante: o MVP é PIX).
- **Cartão de crédito:** tarifa por transação **+ prazo de liberação configurável** — receber **na hora** custa mais; receber em **D+14/D+30** custa menos.
- **Boleto:** tarifa fixa por boleto pago.
- **Antecipação de recebíveis:** opcional, com custo — decidir se interessa.
- Essas tarifas do MP são **separadas** da taxa de 15% que a ShareO cobra do negócio (uma é custo de adquirência; a outra é a receita da plataforma).

---

## Parte 4 — O que muda para o usuário (e um ganho imediato)

- Hoje o staging usa um **checkout PIX manual** (o locatário declara "já paguei" e um admin confirma olhando o extrato). Isso era **temporário**.
- Com o MP, o **PIX vira nativo**: o sistema gera o QR/copia-e-cola e o **MP confirma o pagamento automaticamente** — **acaba a confirmação manual do admin**.
- O cliente passa a poder pagar por **PIX, cartão ou boleto** numa tela do próprio Mercado Pago.

---

## Parte 5 — Resumo técnico (para acompanhar a conversa com o time)

- Substituição é quase **1:1** no modelo A: troca-se a criação do checkout Stripe pela **Preference** do MP (redirecionamento), e o webhook do Stripe pelo **webhook do MP** (que avisa o ID do pagamento; o sistema consulta o status `aprovado`).
- O **frontend não muda muito** (continua um redirecionamento) e a política de segurança do site (CSP) **não precisa mudar** se usarmos o redirecionamento.
- O **Stripe fica preservado no código** atrás de uma chave de configuração durante a transição (mesmo padrão já usado).
- Esforço: **modelo A ~3–5 dias** de desenvolvimento + testes no sandbox; **modelo B ~2–3 semanas**.
- Detalhe arquivo-a-arquivo no backlog técnico (`docs/backlog-atividades-priorizadas.md`).

---

## Parte 6 — Próximos passos sugeridos

1. Fundadores decidem **modelo A × B** e confirmam **conta PJ**.
2. Fundadores criam a **conta MP da empresa** + **aplicação** e repassam as **credenciais de teste** ao time.
3. Time implementa o **modelo A no staging** (sandbox) e valida o PIX nativo.
4. Incluir a pergunta do **split do MP** no parecer do **D4**.
5. Go-live só **após o D4** (com as credenciais de produção e a conta PJ oficial).
