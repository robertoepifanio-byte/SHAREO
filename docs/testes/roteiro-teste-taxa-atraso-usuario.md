# Teste da taxa de atraso — guia para quem vai testar

**Onde testar:** `https://staging.shareo.com.br`

Ambiente de testes. As reservas, os itens e os pagamentos são de mentira — o cartão que você vai usar é um cartão de teste e **nenhum dinheiro real sai de lugar nenhum**.

---

## O que estamos testando

Quando o locatário não devolve o item na data combinada, o ShareO cobra dele uma **taxa de atraso**: 1,5× o valor da diária, por dia de atraso. A cobrança chega por e-mail, com um link de pagamento.

Você vai conferir quatro coisas:

1. A taxa é cobrada quando o prazo passa.
2. O valor **aumenta a cada dia** que o item continua fora.
3. Se ninguém pagar em 24 horas, chega **uma cobrança nova** — antes, o link morria e não vinha outro.
4. Quando o item é devolvido, a taxa **para de crescer**.

---

## ⚠️ Antes de começar: você não faz esse teste sozinho

A cobrança da taxa é gerada por uma **rotina automática que roda uma vez por dia, às 8h da manhã**. Não existe botão de "gerar taxa agora" na tela.

Isso muda o jeito de testar:

- Você prepara a locação num dia e **confere no dia seguinte**, ou
- Pede ao Roberto para **disparar a rotina manualmente** — ele consegue fazer isso na hora, e aí você confere em seguida.

Combine isso antes de começar, senão você vai esperar por algo que não vai acontecer.

---

## Do que você precisa

**Duas contas** (ou duas suas, em navegadores diferentes):

- **Quem empresta** — a pessoa dona do item.
- **Quem aluga** — a pessoa que reserva e que vai receber a cobrança.

**Um cartão de teste**, para os pagamentos:

| Campo | O que digitar |
|---|---|
| Número | `4242 4242 4242 4242` |
| Validade | qualquer data futura (ex.: `12/30`) |
| CVC | qualquer 3 dígitos (ex.: `123`) |
| Nome / CEP | qualquer coisa |

**Anote o valor da diária do item** que você escolher. É dele que sai a conta: taxa de 1 dia = diária × 1,5. Item de R$ 20/dia → R$ 30 de taxa no primeiro dia.

---

## Parte 1 — Criar uma locação que vai atrasar

| | Quem faz | O que fazer |
|---|---|---|
| 1.1 | Quem empresta | Ter um item publicado. Anote a diária. |
| 1.2 | Quem aluga | Reservar esse item **por 1 dia**, com devolução para **hoje** |
| 1.3 | Quem empresta | Aceitar a reserva |
| 1.4 | Quem aluga | Pagar com o cartão de teste |
| 1.5 | Quem empresta | "Marcar como ativo" e digitar o código de 6 números da tela de quem alugou |
| 1.6 | — | **Não devolver o item.** É o atraso que estamos testando. |

Ao fim disso a locação está "Em andamento" e o prazo vence hoje.

---

## Parte 2 — A cobrança chega

Só depois da rotina diária (8h da manhã, ou disparada pelo Roberto).

| | Onde olhar | O que deve acontecer |
|---|---|---|
| 2.1 | E-mail de **quem alugou** | Chega "🚨 Taxa de atraso — pagamento necessário" 📷 |
| 2.2 | Ler o e-mail | Mostra o valor, diz **"atraso calculado até"** com uma data, e avisa que o link vale 24 horas 📷 |
| 2.3 | Conferir a conta | O valor é **a diária × 1,5**. Item de R$ 20/dia → R$ 30 📷 |
| 2.4 | Tela da reserva, nos **dois** lados | Aparece a faixa vermelha "Taxa de atraso aplicada", com o valor e a data 📷 |
| 2.5 | Tela de **quem empresta** | Diz também quanto **ele** recebe dessa taxa, já sem a comissão da plataforma 📷 |

> O passo 2.5 é novo. Antes a taxa era cobrada e o proprietário não recebia nada dela — nem ficava sabendo.

---

## Parte 3 — Pagar a taxa

| | O que fazer | O que deve acontecer |
|---|---|---|
| 3.1 | No e-mail, clicar no botão de pagar | Abre a tela de pagamento com o valor da taxa 📷 |
| 3.2 | Pagar com o cartão de teste | Confirma e volta para a reserva |
| 3.3 | Notificação de **quem alugou** | "Taxa de atraso paga" |
| 3.4 | Notificação de **quem empresta** | "Taxa de atraso recebida", **dizendo o valor que ele recebe** 📷 |

Depois de paga, a taxa não é cobrada de novo — nem no dia seguinte, nem nunca. Se chegar uma segunda cobrança da mesma taxa já paga, é erro: tire print.

---

## Parte 4 — O valor cresce a cada dia (teste de 2 dias)

Este exige **não pagar** e esperar mais um dia. Use uma locação nova, ou a mesma se ainda não pagou.

| | O que fazer | O que deve acontecer |
|---|---|---|
| 4.1 | Deixar passar mais um dia sem devolver e sem pagar | — |
| 4.2 | Depois da rotina do dia seguinte, olhar o e-mail | Chega **uma cobrança nova**, com valor **maior** 📷 |
| 4.3 | Conferir a conta | 2 dias de atraso = diária × 1,5 × 2. Item de R$ 20/dia → R$ 60 |
| 4.4 | Conferir a data | O "atraso calculado até" avançou um dia 📷 |
| 4.5 | Tentar abrir o **link antigo**, do primeiro e-mail | Não funciona mais — foi cancelado 📷 |

### 🔴 O que seria um erro grave aqui

Se o link antigo **ainda funcionar** e permitir pagar o valor menor, tire print e avise imediatamente. Isso deixaria o locatário escolher quanto pagar.

---

## Parte 5 — Devolver faz a taxa parar de crescer

| | O que fazer | O que deve acontecer |
|---|---|---|
| 5.1 | Quem aluga devolve o item (com foto) | A devolução acontece normalmente |
| 5.2 | Esperar a rotina do dia seguinte | A taxa **não aumenta mais** — o valor e a data ficam parados no dia da devolução 📷 |
| 5.3 | Se a taxa ainda não foi paga | Continua chegando cobrança, mas **sempre pelo mesmo valor** |

O item voltou, então o atraso terminou. Se o valor continuar subindo depois da devolução, é erro.

---

## O que NÃO precisa testar

- **Atraso de mais de 30 dias.** A partir daí o valor congela e o caso vira "extravio", tratado pela equipe. Não dá para testar isso em tempo hábil.
- **Recalcular a taxa manualmente.** Existe, mas é um botão do painel interno da equipe, não do site de quem aluga ou empresta.

---

## Anotação do resultado

| Parte | O que testa | Passou? | Observações |
|---|---|---|---|
| 2 | A cobrança chega, com valor e data corretos | ⬜ | |
| 3 | Pagar funciona e avisa os dois lados | ⬜ | |
| 4 | Valor cresce e o link antigo é cancelado ⭐ | ⬜ | |
| 5 | Devolver congela o valor | ⬜ | |

**Se algo não bater:** anote o número do passo, tire print (do e-mail **e** da tela) e guarde o endereço da página, aquele texto no alto do navegador que começa com `staging.shareo.com.br/reservas/...`.

**Guarde os e-mails.** Nesse teste boa parte da evidência está neles: a ordem em que chegaram, os valores e as datas.

---

*O aplicativo de celular mostra a taxa e a data, mas o pagamento é feito pelo link do e-mail, no navegador.*
