# Pauta para decisão — Roberto e Raimundo

**22 de agosto de 2026**

Uma auditoria do projeto encontrou promessas publicadas ao usuário que o sistema não cumpre. A maior parte já foi corrigida. Sobraram **quatro pontos que dependem de decisão de vocês** — não de programação.

Este documento não pede aprovação técnica. Cada item apresenta o que está publicado hoje, o que o sistema realmente faz, e as opções com seus custos.

**Nada aqui bloqueia o trabalho em andamento.** Mas os itens 1 e 2 precisam estar resolvidos antes do go-live: os dois estão em documentos contratuais, e no Código de Defesa do Consumidor o que está escrito vincula (art. 30).

---

## 1. O reembolso não sai sozinho

### O que acontece hoje

Quando um locatário cancela uma reserva paga, o sistema calcula quanto ele tem direito a receber de volta e registra esse valor. **E para aí.**

O dinheiro só volta para o cartão quando **uma pessoa da equipe entra no painel da Stripe e emite o estorno manualmente**. Não há aviso automático, não há fila, não há prazo.

### Por que isso importa agora

As Políticas prometiam devolução em *"5 a 10 dias úteis"*. Esse prazo é real — mas é o prazo do **banco**, e ele só começa a correr depois que alguém clica. Como ninguém controla quando esse clique acontece, o prazo total era uma promessa sem dono.

O texto já foi corrigido para não prometer prazo. Mas isso resolve a exposição jurídica, **não o problema operacional**.

### O que precisa ser decidido

**Opção A — automatizar.** O cancelamento passa a emitir o estorno sozinho.
- Esforço: pequeno. A parte difícil (devolver o dinheiro que já foi repassado ao locador) já está construída e funcionando.
- Efeito: o dinheiro sai sem ninguém precisar lembrar.

**Opção B — manter manual, com processo.** Definir quem executa, com que frequência e em quanto tempo, e publicar esse compromisso.
- Esforço: zero de programação, mas cria rotina diária para alguém.
- Risco: em dia de volume, atrasar é questão de tempo. Cliente que não recebe abre disputa no cartão — e disputa em excesso pode fazer a Stripe restringir a conta.

**Recomendação: Opção A.** É a única que não depende de disciplina humana todo dia.

### ✅ Decisão (Raimundo, 25/08/2026): Opção A — automatizar

Implementado: `PATCH /api/bookings/:id` (action=cancel) agora chama `stripe.refunds.create` automaticamente quando há valor a devolver, em vez de só gravar o número para alguém emitir à mão no Dashboard. A reversão do repasse ao proprietário (quando já tinha saído) continua acontecendo sozinha, via webhook `charge.refunded` — isso já existia e agora é disparado por este próprio estorno. Ver `lib/payments/refund.ts`.

---

## 2. Quando o locador cancela, quanto o locatário recebe?

### O que está publicado

As Políticas, seção 4.2:

> O cancelamento pelo Locador após a confirmação da reserva resulta em reembolso integral ao Locatário.

### O que o sistema faz

O sistema **não olha quem cancelou**. Ele olha só a antecedência:

| Cancelou com | Locatário recebe |
|---|---|
| mais de 24h antes | 100% |
| entre 24h e 6h | 70% |
| menos de 6h | 50% |

**Na prática:** se o locador desistir 3 horas antes da retirada, o locatário — que não deu causa a nada — perde metade do que pagou. A política promete que ele recebe tudo.

### O que precisa ser decidido

Duas perguntas, e a segunda é a que exige vocês dois:

**(a) A promessa vale?** Se sim, o sistema passa a devolver 100% quando quem cancela é o locador. É mudança pequena.

**(b) Quem paga a taxa de serviço nesse caso?** Hoje ninguém paga, porque a promessa não é cumprida. Se passar a ser:

- **A ShareO absorve** — o locatário recebe tudo, a plataforma perde a receita daquela transação.
- **O locador paga** — quem desistiu arca com o custo. Mais justo, mas cria atrito com o proprietário logo no começo da plataforma.
- **Ninguém paga** — devolve-se apenas o valor do aluguel, e a taxa fica retida. Legalmente frágil: o locatário pagou por um serviço que não aconteceu.

**Recomendação:** cumprir a promessa (a). Sobre (b), não tenho opinião de negócio — é decisão de vocês, e muda a conta de cada cancelamento.

### ✅ Decisão (Raimundo, 25/08/2026)

(a) Sim, a promessa vale — locatário sempre recebe 100% quando é o locador quem cancela.

(b) Híbrido, por quem causou o cancelamento:
- **Locador cancela:** locatário recebe 100%. A ShareO abre mão da comissão (15%); o locador não recebe repasse nenhum — cobre o resto sozinho.
- **Locatário cancela:** locatário recebe 100% **menos a taxa real que a Stripe cobrou** na cobrança original (não é estimativa — vem do `balance_transaction.fee`). A ShareO também abre mão da comissão neste caso.

Isso substitui por completo a política anterior por antecedência (100%/70%/50%). A antecedência deixou de importar — só importa quem cancela. Implementado em `lib/cancellationPolicy.ts` / `lib/payments/refund.ts`; texto de Políticas e Central de Ajuda (web + app) atualizado junto.

---

## 3. Dois documentos publicados se contradizem

### O problema

Sobre o prazo para analisar uma disputa entre locador e locatário:

| Documento | Prazo prometido |
|---|---|
| Central de Ajuda | **3 dias úteis** |
| Políticas | **5 dias úteis** |

Os dois estão publicados. Um está errado, e não dá para saber qual sem vocês.

**Contexto para escolher:** o atendimento funciona de segunda a sexta, das 9h às 17h. Uma disputa costuma exigir ouvir as duas partes e analisar fotos. Três dias úteis é apertado.

### E há um segundo ponto

Os dois documentos dizem que a disputa pode ser aberta em **até 48 horas** após a devolução.

**Esse prazo não é aplicado.** O sistema aceita abrir disputa a qualquer momento enquanto a reserva não for encerrada pelo locador — o que pode levar semanas.

Isso tem efeito no bolso do locador: enquanto há disputa aberta, o repasse fica bloqueado. Uma disputa aberta tarde trava um pagamento que já deveria ter saído.

### O que precisa ser decidido

**(a) O prazo de análise é 3 ou 5 dias úteis?** *(sugestão: 5 — é o que o documento contratual já diz, e é realista)*

**(b) O prazo de 48h para abrir disputa deve valer de verdade?**
- **Sim** — protege o locador, mas prejudica quem descobre o problema depois do prazo.
- **Não** — então o texto precisa sair dos dois documentos, porque hoje promete algo que não existe.

### ✅ Decisão (Raimundo, 25/08/2026)

(a) **5 dias úteis**, em ambos os casos — alinha com o que Políticas já dizia; Central de Ajuda precisa ser corrigida (dizia 3).

(b) Sim, a janela passa a valer — mas com regra assimétrica por quem abre, não um único prazo de 48h para os dois:
- **Locador abre disputa:** só entre a devolução (`mark_returned`) e **48h depois**.
- **Locatário abre disputa:** só entre a retirada (`mark_active`) e o prazo de devolução — ou seja, durante a locação ativa, antes da devolução.

Nenhum dos dois pode abrir fora da própria janela. Pendente de implementação em `TRANSITIONS.open_dispute` (`app/api/bookings/[id]/route.ts`) — hoje aceita os dois lados a qualquer momento entre ACTIVE e RETURNED, sem checagem de prazo.

---

## 4. O limite de R$ 1.000 por item

### O que está publicado

Que a plataforma aceita apenas itens de até R$ 1.000 de valor estimado.

### O que mudou hoje

Até esta semana, esse limite existia **só no texto** — qualquer valor era aceito. Agora ele é verificado ao publicar um anúncio.

### Três fatos que recomendam revisar o número

**Primeiro:** dos 92 itens hoje cadastrados no ambiente de testes, **59 estão acima de R$ 1.000** — inclusive itens que representam bem o que a plataforma se propõe a fazer: câmera fotográfica, drone, projetor.

**Segundo:** a própria tabela de preços de referência do projeto sugere diária entre 3% e 5% do valor do bem, com eletrônicos a R$ 100/dia. Isso descreve itens de **R$ 2.000 a R$ 3.300** — acima do limite.

**Terceiro:** o limite ainda é contornável. O campo de valor estimado é opcional, então basta não preenchê-lo. E anúncios entram no ar direto, sem fila de revisão.

### O que precisa ser decidido

**(a) R$ 1.000 é o número certo?** Ele existe para limitar o risco na fase inicial. Mas hoje ele exclui boa parte do catálogo que a plataforma quer ter.

**(b) O campo de valor deve ser obrigatório?** Enquanto for opcional, o limite vale só para quem preenche honestamente.

**(c) Anúncios acima do limite entram em revisão manual?** Se sim, **quem revisa?** Hoje não existe essa fila.

### ✅ Decisão (Raimundo, 25/08/2026): "durante o período inicial, até haver definição de Seguro"

(a) **Sim, R$ 1.000 é o número certo** por enquanto.

(b) **Sim, o campo de valor estimado passa a ser obrigatório** — hoje é opcional, o que deixava o teto contornável por quem simplesmente não preenchia.

(c) **Não** — sem fila de revisão manual. Anúncio acima do limite é recusado na publicação, com mensagem informando que itens desse valor serão aceitos numa fase futura (quando o Seguro estiver definido).

Pendente de implementação: tornar `estimatedRetailPrice` obrigatório no schema Zod de criação de item + mensagem de rejeição no formulário/API quando acima de R$ 1.000.

---

## Resumo — o que sai desta conversa

| # | Decisão | Quem decide | Bloqueia go-live? |
|---|---|---|---|
| 1 | ✅ Estorno automático ou manual com processo — **decidido: automatizar (25/08)**, implementado | Vocês dois | ~~Sim~~ Resolvido |
| 2 | ✅ Locador cancela → 100%? E quem paga a taxa? — **decidido: quem cancela paga a taxa Stripe (25/08)**, implementado | Vocês dois | ~~Sim~~ Resolvido |
| 3 | ✅ Prazo de disputa: 3 ou 5 dias · 48h vale? — **decidido: 5 dias, janela assimétrica por quem abre (25/08)**, pendente de código | Vocês dois | ~~Sim~~ Decidido, código pendente |
| 4 | ✅ Valor do limite · campo obrigatório · quem revisa — **decidido: R$1.000 mantido, campo obrigatório, sem fila (25/08)**, pendente de código | Vocês dois | Não |

---

## O que já foi resolvido, para vocês não se preocuparem

- O texto sobre reembolso não promete mais prazo que a ShareO não controla.
- A promessa de *"repasse toda segunda-feira"* saiu de todo o site — o pagamento ao locador sai por janela de dias após a devolução, que é o que o sistema faz de verdade.
- A Central de Ajuda do aplicativo, que ainda descrevia o meio de pagamento anterior e prometia Pix e bandeiras de cartão que não aceitamos, foi reescrita.
- O limite de valor por item passou a ser verificado de fato.

*Detalhamento técnico em `docs/auditorias/auditoria-pagamento-stripe-2026-08-21.md` e `docs/juridico/decisoes-pendentes-cancelamento-disputa.md`.*
