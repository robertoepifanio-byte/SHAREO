# Teste do "Reportar problema" — guia para quem vai testar

**Onde testar:** `https://staging.shareo.com.br`

Este é o ambiente de testes do ShareO. Tudo aqui é de mentira: as reservas, os pagamentos e os itens. Pode clicar em qualquer coisa sem medo — nada cobra dinheiro de verdade e nada estraga.

---

## O que estamos testando

Quando alguém tem um problema numa locação — o item não funciona, veio faltando peça, voltou riscado — a pessoa clica em **"Reportar problema"** e a equipe do ShareO entra para ajudar a resolver. Isso se chama **disputa**.

Antes, quando alguém reportava um problema, a locação **travava por completo**: sumiam todos os botões da tela e quem tinha alugado ficava sem conseguir nem devolver o item.

Agora a locação continua funcionando normalmente enquanto o problema é analisado. **É isso que você vai conferir.**

---

## Do que você precisa antes de começar

**Duas pessoas** (ou duas contas suas, abertas em navegadores diferentes):

- **Quem empresta** — a pessoa dona do item, que anuncia e recebe.
- **Quem aluga** — a pessoa que reserva o item.

> Não dá para fazer o teste sozinho com uma conta só. Boa parte do que estamos testando é justamente o que **cada pessoa vê** na tela dela, e uma coisa aparece para uma e não para a outra.

**Vá anotando:** tire um print sempre que a tela mostrar algo importante. Está marcado ao longo do roteiro onde o print interessa. Se algo sair diferente do descrito, o print é o que permite entender o que houve.

---

## Preparação — chegar até uma locação em andamento

Antes de testar o problema em si, é preciso ter uma locação **acontecendo**. Siga na ordem:

| | Quem faz | O que fazer |
|---|---|---|
| 1 | Quem empresta | Ter um item publicado no site |
| 2 | Quem aluga | Encontrar esse item e fazer uma reserva |
| 3 | Quem empresta | Aceitar a reserva |
| 4 | Quem aluga | Pagar (é um pagamento de teste, não sai dinheiro) |
| 5 | Quem empresta | Clicar em **"Marcar como ativo"** e digitar o código de 6 números que aparece na tela de quem alugou |

Ao fim disso a locação está **"Em andamento"**. É daqui que o teste começa.

---

## ⚠️ Leia isto antes de continuar — a ordem importa

**Reporte o problema ANTES de devolver o item.**

Quem alugou só pode reportar um problema **enquanto está com o item**. Depois de devolver, essa opção deixa de existir para essa pessoa — e passa a valer para quem emprestou, que tem 48 horas para reportar algo depois de receber o item de volta.

Isso é como o sistema foi desenhado, não é defeito. Mas se você devolver primeiro e tentar reportar depois, vai ver uma mensagem de recusa e pode achar que quebrou. Siga a ordem do roteiro.

---

## Parte 1 — Conversar antes de reclamar

**Quem faz:** quem alugou. **Onde:** na tela da sua reserva, em "Minhas Reservas".

| | O que fazer | O que deve acontecer |
|---|---|---|
| 1.1 | Clicar em **"Reportar problema"** | **Não** abre o formulário de reclamação direto. Aparece um aviso sugerindo conversar antes com a outra pessoa. 📷 |
| 1.2 | Ler o aviso | Tem um botão para **falar com o proprietário** e outro escrito **"Continuar"** |
| 1.3 | Clicar em "Falar com o proprietário" | Abre a conversa (chat) daquela locação |
| 1.4 | Voltar e clicar em **"Continuar"** | Agora sim abre o formulário: tipo do problema, descrição e foto |

**Por que isso existe:** a maior parte dos problemas se resolve conversando. Acionar a equipe do ShareO demora mais. O aviso convida à conversa, mas **não obriga** — quem quiser seguir com a reclamação clica em "Continuar" e segue.

---

## Parte 2 — A locação continua viva ⭐

**Esta é a parte mais importante do teste.**

| | O que fazer | O que deve acontecer |
|---|---|---|
| 2.1 | Preencher o formulário e enviar a reclamação | Mensagem confirmando que o problema foi registrado 📷 |
| 2.2 | **Olhar o topo da tela** | Aparecem **DUAS** etiquetas lado a lado: **"Em andamento"** e **"Em disputa"** 📷 |
| 2.3 | Olhar a área dos botões | Uma faixa laranja avisa **"Disputa em análise"** — e os botões **continuam ali** 📷 |
| 2.4 | Procurar o botão **"Devolver"** | Ele está lá e funciona normalmente 📷 |
| 2.5 | Tentar reportar um segundo problema na mesma locação | O sistema recusa: já existe uma reclamação aberta 📷 |
| 2.6 | Devolver o item de verdade (é preciso anexar uma foto) | A devolução acontece normalmente, e a etiqueta "Em disputa" **continua** ali |

### 🔴 O que seria um erro

- A locação virar **só** "Em disputa", perdendo o "Em andamento".
- A tela ficar **sem nenhum botão**.
- O botão "Devolver" sumir.

Se acontecer qualquer um desses três, tire print e avise — era exatamente o defeito que foi corrigido.

> Sobre 2.6: a devolução pede uma foto do estado do item. Se aparecer um aviso pedindo a foto, **não é problema da reclamação** — é uma regra da devolução, que vale sempre.

---

## Parte 3 — Desistir da reclamação

Às vezes a pessoa reclama e o assunto se resolve na conversa. Ela pode desistir.

| | Quem faz | O que fazer | O que deve acontecer |
|---|---|---|---|
| 3.1 | Quem alugou (foi quem reclamou) | Olhar os botões da reserva | Existe **"Cancelar disputa"** 📷 |
| 3.2 | **Quem emprestou** | Abrir a mesma reserva | **NÃO** existe "Cancelar disputa" para essa pessoa 📷 |
| 3.3 | Quem alugou | Clicar em "Cancelar disputa" | A etiqueta "Em disputa" some. A locação **continua exatamente como estava** 📷 |
| 3.4 | Quem emprestou | Olhar as notificações | Chegou um aviso: a disputa foi cancelada e a locação segue normalmente 📷 |

**Ponto do passo 3.2:** só quem abriu a reclamação pode desistir dela. A outra pessoa não pode cancelar uma reclamação que não é dela. Se o botão aparecer para os dois, é erro — tire print.

---

## Parte 4 — Reclamação feita por quem emprestou

Até aqui quem reclamou foi quem alugou. Agora o outro lado. **Use uma locação nova**, seguindo a Preparação de novo e indo até a devolução.

| | Quem faz | O que fazer | O que deve acontecer |
|---|---|---|---|
| 4.1 | Quem aluga | Devolver o item | A locação fica aguardando a confirmação de quem emprestou |
| 4.2 | Quem emprestou | Clicar em **"Reportar problema"** | Aparece o mesmo aviso da Parte 1, mas escrito **"Falar com o locatário"** 📷 |
| 4.3 | Quem emprestou | Continuar e enviar a reclamação | Mesma coisa da Parte 2: duas etiquetas, faixa laranja, botões no lugar 📷 |
| 4.4 | Quem emprestou | Olhar os botões | Agora é essa pessoa quem tem o **"Cancelar disputa"** — foi ela que abriu |

---

## E depois que a reclamação é enviada?

A equipe do ShareO analisa e dá um desfecho. São três possíveis, e todos chegam como notificação para as duas pessoas:

- **Concluir a locação** — quando a razão está com quem emprestou.
- **Cancelar e devolver o dinheiro** — quando a razão está com quem alugou.
- **Encerrar a análise** — quando não há o que decidir (as pessoas se entenderam, por exemplo). **A locação continua normalmente**, ninguém perde dinheiro e nada é cancelado.

Essa parte é feita pela equipe, não pelo site de quem aluga ou empresta — então não entra neste roteiro.

---

## Anotação do resultado

| Parte | O que testa | Passou? | Observações |
|---|---|---|---|
| 1 | Aviso para conversar antes | ⬜ | |
| 2 | Locação continua viva com reclamação aberta ⭐ | ⬜ | |
| 3 | Desistir da própria reclamação | ⬜ | |
| 4 | Reclamação feita por quem emprestou | ⬜ | |

**Se algo não bater com o roteiro:** anote o número do passo, tire o print e guarde o **endereço da página** (aquele texto no alto do navegador, que começa com `staging.shareo.com.br/reservas/...`). Com essas três coisas dá para investigar; sem elas, quase nunca.

---

*O aplicativo de celular ainda não tem essas telas novas — este roteiro é para o site, no navegador.*
