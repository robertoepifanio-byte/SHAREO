# Roteiro — conversa com a Contabilizei sobre o Simples Nacional

**3 de setembro de 2026** · ~30 minutos

O regime foi definido: **Simples Nacional**. Esta conversa é para responder **uma pergunta que decide o imposto e o teto**: o valor que passa pela plataforma e vai ao proprietário entra na receita bruta da ShareO?

---

## Em uma frase

> *"Numa locação de R$ 100, o cliente paga R$ 100, nós ficamos com R$ 15 e repassamos R$ 85 ao proprietário. Mas os R$ 100 entram na nossa conta no meio do caminho. Para o Simples Nacional, a nossa receita bruta é 15 ou 100?"*

É a pergunta inteira. O resto do roteiro é para sustentá-la.

---

## 1. Como o dinheiro anda, de fato

Vale descrever com precisão, porque a resposta depende disso.

1. O locatário paga o valor cheio da locação com cartão.
2. O valor **inteiro** entra numa conta da ShareO dentro da **Stripe** (o provedor de pagamentos).
3. Alguns dias depois — hoje **3 dias após a devolução** do item — a Stripe transfere **85%** ao proprietário.
4. Os **15%** permanecem com a ShareO. É a nossa receita.

**Três pontos que costumam mudar a análise:**

- **O dinheiro não passa por conta bancária da ShareO.** Fica dentro da Stripe do começo ao fim.
- **Não emitimos cobrança dos 15% ao proprietário.** Transferimos 85% e o resto simplesmente fica.
- **A retenção tem finalidade:** segurar o valor enquanto cabe disputa por dano no item.

**Números atuais:** taxa de 15% · teto de R$ 500 por locação · repasse 3 dias após a devolução.

---

## 2. O que já foi decidido juridicamente

A advogada respondeu, em 30/06:

- A **nota fiscal da ShareO incide sobre os 15%** (ISS + PIS/COFINS).
- Os **85% são "valores de terceiros em trânsito"**, não receita nossa.
- O **proprietário emite a própria nota** pela locação.

**A pergunta agora é se essa separação se sustenta contabilmente sob o Simples Nacional**, onde a apuração parte da receita bruta — e não se ela está juridicamente correta, o que já foi respondido.

---

## 3. As perguntas

**3.1 — A base de cálculo**

> Os 85% repassados compõem a receita bruta da ShareO para efeito do Simples Nacional, ou são excluídos como valores de terceiros?

**3.2 — O teto do Simples**

Esta é a que pode doer mais adiante:

> Se os 85% contarem, o limite de enquadramento é atingido com **aproximadamente 1/7 do volume real de negócio**. Numa plataforma que cresce por volume de transações, isso antecipa muito a saída do regime. Como isso deve ser projetado?

**3.3 — O anexo aplicável**

> A atividade é intermediação/marketplace. Qual anexo se aplica, e o Fator R muda alguma coisa no nosso caso?

**3.4 — O que precisa existir para sustentar a separação**

> Que documentação e que forma de registro contábil precisamos manter para que os 85% sejam tratados como trânsito e não como receita? O que precisa estar no nosso sistema, mês a mês, para a escrituração?

Esta é a pergunta mais acionável: a resposta vira requisito de software.

**3.5 — Nota fiscal**

> A NF dos 15% é emitida contra quem — o locatário ou o proprietário? E com que periodicidade: por locação ou consolidada?

**3.6 — O proprietário pessoa física**

> A maioria dos proprietários é PF e não emite nota. Isso cria alguma obrigação acessória para a ShareO — retenção, informe, declaração?

---

## 4. O que levar

- Este roteiro.
- O extrato de uma locação real do ambiente de testes, mostrando as três linhas: valor cobrado, taxa retida, valor transferido.
- A informação de que o CNPJ está ativo desde 11/08 e ainda **não houve faturamento real** — nada precisa ser corrigido retroativamente.

---

## 5. O que precisamos por escrito

1. Se os 85% entram ou não na receita bruta do Simples.
2. Que registro contábil sustenta essa posição.
3. O anexo aplicável.

Os itens 1 e 2 viram requisito de sistema: se houver forma específica de registrar o trânsito, precisamos construir antes do primeiro faturamento — e hoje ainda dá tempo, porque não há nenhum.

---

## Por que agora

Ainda não há faturamento. Toda decisão aqui é **de desenho**, não de correção. Depois da primeira locação real paga, a mesma conversa vira ajuste retroativo.
