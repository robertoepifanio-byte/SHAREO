# Roteiro — conversa com a advogada sobre a Lei 12.865/2013

**Para: Raimundo** · 3 de setembro de 2026 · ~30 minutos

O objetivo é sair da conversa com **uma resposta que decide**: o desenho atual se sustenta como está, ou precisa mudar. Não é pedir opinião sobre o modelo — é confirmar se um fato novo altera uma conclusão que ela já deu.

---

## Em uma frase

> *"O parecer concluiu que a ShareO não é instituição de pagamento porque não retém nem custodia o dinheiro. Descobrimos que, na implementação com a Stripe, o valor da locação fica na nossa conta na Stripe por alguns dias antes de ir ao proprietário. Isso muda a conclusão?"*

Se ela pedir só isso, está dito. O resto do roteiro é para as perguntas que vierem.

---

## 1. O que mudou desde o parecer (2 minutos)

- O parecer de 30/06 analisou o desenho com o **Mercado Pago**.
- Em 24/08 o Mercado Pago foi descartado. **O PSP é a Stripe.**
- A troca foi de fornecedor, não de modelo de negócio: continua terceirizado, continua sem caução, continua com taxa de 15% explícita.

---

## 2. O fato novo, com precisão (5 minutos)

Vale ler esta parte devagar, porque a diferença é sutil e é ela que motiva a consulta.

**O que o parecer descreveu:** o locatário paga, o PSP divide na hora e repassa a parte do proprietário. A plataforma nunca segura o dinheiro.

**O que a implementação faz:** a cobrança inteira entra na **conta da ShareO dentro da Stripe**. O repasse ao proprietário é uma transferência feita **depois**, quando fica elegível — hoje **3 dias após a devolução** do item, valor configurável.

Enquanto isso, o dinheiro está numa conta da ShareO na Stripe.

**Números para dar concretude:**

| | |
|---|---|
| Taxa da plataforma | 15% |
| Vai ao proprietário | 85% |
| Teto por transação | R$ 500 |
| Tempo de retenção | 3 dias após a devolução (padrão) |

**Três esclarecimentos que evitam mal-entendido:**

1. **A ShareO não movimenta conta bancária com esse dinheiro.** Ele fica dentro da Stripe o tempo todo. Não passa por banco nosso, não é sacado, não é reinvestido.
2. **A taxa de 15% não é cobrada em separado.** Transfere-se apenas os 85%; o restante simplesmente permanece. Não há uma "cobrança de comissão".
3. **A retenção tem finalidade, não é acaso.** É o que garante que, se o proprietário abrir disputa por dano, o dinheiro ainda esteja lá para ser devolvido ou dividido. Sem isso, a mediação decide sobre valor que já saiu.

---

## 3. A pergunta central

> **Com o valor transitando pela conta da ShareO na Stripe por alguns dias antes do repasse, a conclusão de que a ShareO não é instituição de pagamento se mantém?**

Duas subperguntas que ajudam a fechar:

- A conclusão dependia de **não haver custódia nenhuma**, ou de **quem detém a licença** (a Stripe)?
- O fato de o dinheiro nunca sair do ambiente de um PSP licenciado — sem passar por conta bancária da ShareO — é suficiente?

---

## 4. Se a resposta for "isso é um problema"

Não saia da reunião sem isto: **existe alternativa técnica**, e ela precisa ser avaliada por ela, não por nós.

A Stripe oferece um mecanismo diferente, chamado **destination charge**, em que o valor vai **direto para a conta do proprietário** no momento do pagamento, e a comissão da plataforma é retida automaticamente. O dinheiro nunca fica com a ShareO.

**Foi considerado e descartado por razão de produto:** com ele, o valor chega ao proprietário imediatamente, e perderíamos a retenção que protege a disputa. Um dano descoberto na devolução encontraria o dinheiro já pago.

**A pergunta para ela:** se o desenho atual for arriscado, o destination charge resolve juridicamente? Se sim, é decisão de negócio — trocar proteção da mediação por segurança regulatória, e desenhar outra forma de tratar dano.

---

## 5. O que levar

- O documento `ressalva-psp-stripe-2026-09-03.pdf` (4 páginas), que traz este ponto e mais três.
- O parecer original, para ela comparar com o que escreveu.

---

## 6. O que precisamos por escrito

Uma frase, não um parecer novo:

> *"O desenho com a Stripe, em que o valor permanece na conta da plataforma dentro do PSP por até N dias antes do repasse, [mantém / não mantém] a conclusão de que a ShareO não é instituição de pagamento nos termos da Lei 12.865/2013."*

Com isso o item destrava ou vira decisão de produto — e nos dois casos deixa de ser dúvida.

---

## Contexto para você

**Por que isso é o item mais pesado do D4:** é o único em aberto cuja resposta negativa mexeria no **produto**, não no texto. Os outros três pontos (transferência internacional, fiscal e PLD/FT) se resolvem com documento, cláusula ou registro. Este pode exigir mudar como o dinheiro anda.

**Por que não foi visto antes:** a implementação mudou em 19/08, quando o split saiu do desenho original (destination charge) para o atual, por causa da retenção contra disputa. A decisão está registrada na ADR-028; o reflexo jurídico não foi levado adiante.
