# O parecer analisou o Mercado Pago. O PSP é a Stripe.

**Para: Raimundo** · 3 de setembro de 2026

O parecer formal de 30/06 foi construído sobre um desenho que **deixou de existir**. Em 24/08 o Mercado Pago foi descartado e removido do código; o PSP passou a ser a **Stripe** ([ADR-028](../adr/ADR-028-reversao-stripe-connect.md)).

Isso não invalida o parecer, mas **uma parte dele não se transporta** — e é a parte que trata de dados pessoais saindo do Brasil. Este documento separa o que continua valendo do que precisa da sua análise, e lista o que já encontramos fora do lugar.

---

## ⚠️ O ponto mais pesado: o dinheiro **transita pela conta da ShareO**

Este é o item que mudamos de opinião ao verificar o código, e por isso vem primeiro.

O parecer afastou a Lei 12.865/2013 sobre a premissa de que **a ShareO não retém nem custodia** o valor: o pagamento entraria no PSP, que faria o split e repassaria ao locador, sem passar pela plataforma.

**A implementação com a Stripe não funciona assim.** Ela usa *separate charges and transfers*, e está escrito no próprio código (`lib/payments/owner-transfer.ts`):

> *"A cobrança fica na conta da plataforma; o Transfer sai depois, quando o repasse fica elegível (N dias após a devolução)."*

Ou seja: o valor cheio da locação **entra no saldo da ShareO na Stripe** e permanece lá por dias, até o repasse. A taxa de 15% não é cobrada por `application_fee` — transfere-se apenas os 85%, e o restante simplesmente fica.

**Não é acidente:** é o que preserva a retenção do valor enquanto uma disputa pode ser aberta, comportamento que o produto já tinha e que a mediação depende. Mas **é factualmente diferente do desenho que o parecer validou.**

A pergunta, então, não é a mesma que foi respondida em 30/06: *com o valor transitando pela conta da plataforma, ainda se afasta o enquadramento como instituição de pagamento?* O parecer respondeu "sim" para um arranjo em que isso não acontecia.

---

## O que continua valendo

> *"Os fundadores decidiram terceirizar o arranjo de pagamentos, contratando um PSP licenciado, responsável pelo fluxo financeiro."*

A terceirização em si continua: quem opera o arranjo, guarda o dinheiro e faz o KYC é a Stripe — a ShareO não movimenta conta bancária própria nem custodia fora do PSP. O que mudou é **onde**, dentro do PSP, o valor descansa antes do repasse.

Seguem de pé, sem depender do PSP: taxa de 15% explícita na UI e nos Termos, ausência de caução, retenção fiscal de 5 anos, teto de R$ 500 por transação.

---

## O que **não** se transporta

### 1. Transferência internacional (LGPD art. 33)

O Mercado Pago é entidade **brasileira**. A Stripe é **estrangeira**. O parecer não analisou transferência internacional para o fluxo de pagamentos porque, no desenho dele, não havia.

Hoje há, e com os dados mais sensíveis da plataforma: identificação das duas partes, valores, e — no onboarding do locador — **dados bancários e verificação de identidade**, feita dentro da própria Stripe.

**Três gaps concretos que encontramos ao preparar este documento:**

**(a) A Política de Privacidade nomeia a Stripe e não diz que os dados saem do Brasil.** O texto publicado já lista *"Stripe (processamento dos pagamentos, operador de dados financeiros — sujeito à Política de Privacidade da Stripe Inc.)"*. Mas a busca por "internacional", "exterior", "Estados Unidos" ou "art. 33" nas páginas publicadas **não retorna nada**. O titular é informado de *com quem* os dados são compartilhados, não de *para onde vão*.

**(b) O inventário de transferência internacional está desatualizado.** O rascunho [`transferencia-internacional-dados.md`](transferencia-internacional-dados.md) ainda descreve a Stripe como *"código preservado, oculto na UI"*, risco **"Baixa (inativo)"**, e o Mercado Pago como *"em avaliação"*. É o inverso da realidade: a Stripe é o PSP ativo e processa pagamentos reais no staging desde agosto. Dos seis subprocessadores listados, ela passou a ser **o mais sensível**, e está classificada como o menos.

**(c) O DPA da Stripe consta como pendente** no mesmo rascunho, com prioridade baixa pela mesma razão desatualizada.

### 2. Fiscal (questão #2) — agora com o regime definido

Duas coisas mudaram desde o parecer:

- **O regime tributário foi definido em 03/09: Simples Nacional**, com apoio dos tributaristas da Contabilizei. Isso fecha o item B3 do checklist.
- O PSP mudou, e com ele o registro do fluxo financeiro.

A resposta **B2** estabeleceu que a NF da ShareO incide sobre os **15%**, e que os **85% são não-receita** (valores de terceiros em trânsito), com o locador emitindo a própria nota.

**A pergunta que trago:** essa separação se sustenta igual sob o **Simples Nacional**, onde a apuração parte da *receita bruta*? Se o valor cheio da locação transitar pelo registro da plataforma, há risco de os 85% serem lidos como receita — o que afetaria tanto o imposto devido quanto o limite de enquadramento.

Não é pergunta retórica nem sugestão de resposta: é o ponto em que o regime novo e a decisão B2 se encontram, e nós não temos como avaliar.

### 3. PLD/FT (questão #5, resposta B4)

A resposta foi que a ShareO **não é sujeito obrigado**, porque *"o PSP assume KYC/KYB/monitoramento"*.

Na prática isso continua: a Stripe faz a verificação de identidade dos locadores no onboarding do Connect. **Vale confirmar** se a conclusão depende de o PSP ser instituição autorizada pelo BACEN — condição que o Mercado Pago cumpria de forma direta.

---

## O que já está resolvido, para você não gastar tempo

- **Nenhum texto publicado menciona o Mercado Pago.** Verificamos site e aplicativo: as únicas ocorrências restantes são comentários dentro do código-fonte, invisíveis ao usuário.
- **As páginas já descrevem a Stripe** como provedora de pagamentos, incluindo o comportamento real de reembolso e da taxa.
- **A identificação da PJ** (razão social, CNPJ, endereço) está publicada desde 24/08.
- **Os rascunhos de cláusulas** ([`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md)) ainda nomeiam o Mercado Pago — mas são rascunhos, não estão publicados. A reescrita deve sair **junto** com a sua análise de transferência internacional, não antes.

---

## O que peço

1. **Lei 12.865 / custódia** — com o valor transitando pelo saldo da ShareO na Stripe por alguns dias antes do repasse, a conclusão de 30/06 se mantém? **É o ponto mais pesado**, e o único em que uma resposta negativa mexeria no produto, não só no texto.
2. **Transferência internacional** — qual mecanismo do art. 33 se aplica ao fluxo de pagamentos com a Stripe, e o que a Política precisa dizer ao titular.
3. **Fiscal** — a separação 15% receita / 85% em trânsito se mantém sob o Simples Nacional? A pergunta ganha peso porque o valor cheio agora passa pela conta da plataforma.
4. **PLD/FT** — a conclusão de que a ShareO não é sujeito obrigado depende de o PSP ser autorizado pelo BACEN?
5. **Confirmação geral** — o restante do parecer se aplica ao desenho com a Stripe, ou algum outro ponto precisa ser revisitado?

> **Nota de honestidade sobre este documento.** A primeira versão afirmava que *"o pagamento não passa por conta da plataforma"*, repetindo a premissa do parecer sem conferir a implementação. Ao verificar o código antes de enviar, encontramos o oposto — e o item 1 acima nasceu dessa correção. O registro fica aqui porque a diferença entre os dois desenhos é justamente o que precisa da sua análise.

---

## Contexto

Nada foi publicado nem alterado em texto contratual por causa desta troca. O parecer já carrega esta ressalva no topo desde 24/08 — este documento é para levá-la a você formalmente, com o que apuramos desde então.

Referências: [ADR-028](../adr/ADR-028-reversao-stripe-connect.md) (a decisão), [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md) (o parecer, com a ressalva no topo), [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) (condições de go-live).
