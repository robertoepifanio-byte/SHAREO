# Pauta para decisão — Roberto e Raimundo

**1º de setembro de 2026** · assunto: **disputas**

Hoje o sistema de disputas mudou. O que estava quebrado foi corrigido: até esta manhã, quando alguém reportava um problema, a locação **congelava por inteiro** — sumiam todos os botões da tela, o locatário não conseguia nem devolver o item, e a equipe só conseguia encerrar uma análise cancelando a locação junto. Isso está resolvido e no ar em ambiente de teste.

Ao revisar o que o site **promete** sobre disputas, apareceram **cinco pontos que dependem de decisão de vocês** — não de programação. Três são promessas publicadas que o sistema não cumpre (e duas delas são anteriores a hoje, só ficaram visíveis agora). Duas são capacidades novas que os documentos não preveem.

Este documento não pede aprovação técnica. Cada item mostra o que está publicado, o que o sistema faz, e as opções com seus custos.

**O item 1 é o mais sério** — está no documento contratual e promete algo que a operação não tem como cumprir. Pelo Código de Defesa do Consumidor, o que está escrito vincula (art. 30).

---

## 1. Prometemos direito de recurso — e ele não existe

### O que está publicado

Central de Ajuda, seção Disputas:

> Sim. Se você discordar da decisão, tem até 5 dias úteis para solicitar uma revisão. Envie novas evidências que não foram analisadas anteriormente e explique o motivo do recurso. **A revisão é feita por um time diferente do que tomou a decisão original.**

### O que o sistema faz

**Nada.** Não existe botão de recurso, não existe tela, não existe campo no banco, não existe aviso para a equipe. Uma disputa decidida é definitiva no sistema.

E o "time diferente" descreve uma estrutura que a ShareO não tem: hoje quem analisa disputa é a mesma pessoa, qualquer que seja o caso.

### Por que isso é o item mais grave desta pauta

É uma promessa de **procedimento** — o usuário insatisfeito vai procurar o botão de recurso, não vai encontrar, e vai ter em mãos um texto nosso dizendo que ele tinha esse direito. É o tipo de contradição que se sustenta mal numa reclamação no Procon, que o próprio texto cita logo em seguida.

### O que precisa ser decidido

**Opção A — construir o recurso.** Prazo de 5 dias, reenvio de evidências, reabertura do caso.
- Esforço: médio. O caso já guarda o histórico; falta reabrir e registrar a segunda decisão.
- Não resolve o "time diferente" — isso é decisão de estrutura, não de código.

**Opção B — corrigir o texto para o que existe.** Dizer que a decisão pode ser reconsiderada mediante novas evidências enviadas ao suporte, sem prometer prazo nem segundo time.
- Esforço: quase zero.
- É honesto e continua oferecendo um caminho real — o e-mail do suporte já funciona.

**Opção C — prometer menos agora e construir depois.** Texto da B, e o recurso formal entra no roadmap.

**Recomendação: B agora, A no roadmap.** A promessa atual não é sustentável nem no texto nem na operação. Mas tirar qualquer forma de contestação seria pior — a redação da B mantém a porta aberta sem inventar estrutura.

---

## 2. Prometemos retenção parcial do valor — o sistema é tudo ou nada

### O que está publicado

**Políticas de Uso, seção 3.3** (documento contratual):

> O ShareO analisará as evidências apresentadas e emitirá uma decisão em até 5 dias úteis, que poderá incluir **reembolso parcial** ou total ao Locatário ou liberação do valor ao Locador.

**Central de Ajuda**, sobre danos:

> …decide se o repasse é liberado, **parcialmente retido** ou cancelado conforme o prejuízo apurado.

### O que o sistema faz

Só existem desfechos inteiros:

| Decisão | O que acontece com o dinheiro |
|---|---|
| A favor do locador | ele recebe **tudo** |
| A favor do locatário | ele é reembolsado **integralmente** (100%) |
| Encerrar sem decidir | ninguém recebe nada extra; a locação segue |

**Não há como devolver 40% ao locatário e repassar 60% ao locador.** O botão não existe, e o valor de reembolso é gravado como total ou zero.

Na prática, uma mediação com dano parcial — o item voltou funcionando mas riscado — não tem desfecho proporcional. A equipe é forçada a escolher um dos extremos.

### O que precisa ser decidido

**Opção A — construir a divisão proporcional.** A equipe informa um valor ou percentual, e o sistema divide.
- Esforço: médio. Mexe no cálculo de reembolso e no de repasse ao mesmo tempo, que é a parte sensível do dinheiro.
- Ganho real: é o desfecho mais justo na maioria dos casos de dano, que raramente são "tudo ou nada".

**Opção B — corrigir o texto.** Dizer que a decisão libera o valor ao locador ou reembolsa o locatário, sem prometer proporção.
- Esforço: quase zero.
- Custo: perde-se a ferramenta mais adequada ao caso mais comum. E o texto passa a descrever uma mediação mais crua do que seria desejável.

**Recomendação: A**, mas sem pressa — é a única desta pauta em que o texto está **melhor** que o sistema. A promessa é boa; falta cumpri-la. Enquanto não for construída, o texto precisa parar de prometê-la.

---

## 3. Prometemos um botão de atendimento emergencial que não existe

### O que está publicado

Central de Ajuda, seção Suporte:

> …e, em casos urgentes, pelo botão **'Atendimento emergencial'** dentro da reserva com disputa ativa.

### O que o sistema faz

Essa expressão aparece em exatamente dois lugares do projeto: **a Central de Ajuda do site e a do aplicativo**. Em nenhuma tela de reserva. O botão nunca existiu.

O usuário em situação urgente — que é justamente quem mais precisa — vai procurar por ele dentro da reserva e não vai achar.

### O que precisa ser decidido

**Opção A — criar o botão.** Dentro da reserva com disputa aberta, um atalho que marca o caso como urgente para a equipe.
- Esforço: pequeno-médio. O difícil não é o botão: é definir **o que "urgente" obriga a equipe a fazer**, e em que prazo.

**Opção B — remover a menção.** Os outros dois canais citados na mesma frase (e-mail do suporte e chat da reserva) existem e funcionam.
- Esforço: quase zero.

**Recomendação: B.** Criar o botão sem definir o compromisso de atendimento por trás dele só transfere o problema — passaríamos a ter um canal "urgente" com o mesmo prazo de todos os outros, o que frustra igual.

---

## 4. Agora a pessoa pode desistir da própria reclamação — e o texto não diz

### O que mudou hoje

Duas capacidades novas, que existem para reduzir mediação desnecessária:

- **Antes de abrir a reclamação**, o site sugere conversar com a outra parte e oferece o link do chat. Não obriga — quem quiser seguir clica em "Continuar".
- **Quem abriu pode desistir.** Se o assunto se resolveu na conversa, a pessoa cancela a própria reclamação e a locação segue como se nada tivesse acontecido. Só quem abriu pode fazer isso.

### O que está publicado

Nada sobre nenhuma das duas. Os textos descrevem a disputa como um caminho de mão única: abriu, a equipe analisa, a equipe decide.

### Por que vale mencionar no texto

Não é uma contradição — é uma capacidade que ninguém vai descobrir. Uma pessoa que reclamou por engano, ou que se entendeu com a outra parte, precisa saber que pode voltar atrás. Se não souber, vamos mediar casos que já estavam resolvidos.

### O que precisa ser decidido

Basicamente **quanto** dizer:

**Opção A — só a Central de Ajuda.** Duas perguntas novas na seção de Disputas. Não mexe no documento contratual.

**Opção B — Ajuda e Políticas.** A seção 3.3 passa a descrever o fluxo completo.

**Recomendação: A.** É informação de uso, não de contrato. As Políticas descrevem direitos e obrigações; poder desistir de uma reclamação não cria nem retira direito de ninguém.

---

## 5. A equipe pode encerrar uma análise sem decidir nada — e o contrato não prevê isso

### O que mudou hoje

A equipe ganhou um terceiro desfecho: **encerrar a disputa sem consequência financeira**. A locação continua exatamente onde estava, ninguém é reembolsado, ninguém perde o repasse. Serve para quando as partes se entenderam sozinhas ou quando não há o que decidir.

Isso existia como necessidade real: antes, encerrar uma análise **obrigava** a cancelar a locação e devolver todo o dinheiro — mesmo quando ninguém queria isso.

### O que está publicado

**Políticas de Uso, 3.3** prevê **dois** desfechos, e apenas dois:

> …que poderá incluir reembolso parcial ou total ao Locatário **ou** liberação do valor ao Locador. A decisão do ShareO é vinculante para efeitos do repasse do valor retido na plataforma.

### Por que este item merece atenção sua, Raimundo

É diferente dos outros quatro. Aqui não se trata de uma promessa não cumprida: trata-se de **um poder que a plataforma passou a exercer e que o contrato de adesão não descreve**.

A ShareO pode encerrar unilateralmente uma mediação sem decidir o mérito. Isso é razoável na operação — mas quem assinou o contrato leu que a análise termina em uma de duas decisões, ambas com efeito sobre o dinheiro. Num contrato de adesão, poder não previsto é poder frágil.

### O que precisa ser decidido

**Opção A — descrever o desfecho na seção 3.3.** Acrescentar que a análise pode ser encerrada sem alteração financeira quando as partes se compõem ou quando não há elementos para decidir.
- Esforço: quase zero de programação; é redação contratual.
- É o caminho que torna o poder legítimo por ser declarado.

**Opção B — restringir o uso do desfecho.** Permitir encerrar sem decisão **apenas** quando a parte que abriu já tiver desistido, ou com concordância das duas.
- Esforço: pequeno no código.
- Mais defensável, e mais engessado: tira da equipe a saída para o caso em que ninguém responde.

**Opção C — as duas.** Descrever no contrato **e** exigir justificativa registrada.
- A justificativa registrada **já é obrigatória** — foi construída hoje, junto com o desfecho, exatamente porque é o único que não deixa rastro no dinheiro.

**Recomendação: A**, aproveitando que a justificativa obrigatória já existe. A B só se você achar que a redação não basta.

---

## Resumo

| # | Assunto | Quem decide | Bloqueia go-live? |
|---|---|---|---|
| 1 | Recurso prometido que não existe | Vocês dois | **Sim** — está publicado e é procedimento |
| 2 | Reembolso parcial prometido, sistema é tudo-ou-nada | Vocês dois | **Sim** — está nas Políticas |
| 3 | Botão de atendimento emergencial inexistente | Roberto | Não, mas é rápido |
| 4 | Desistir da própria reclamação (novo) | Roberto | Não |
| 5 | Encerrar análise sem decidir (novo) | **Raimundo** | Não, mas é poder contratual |

**Nada aqui bloqueia o trabalho em andamento.** Os itens 1 e 2 estão em documentos que vinculam e precisam estar resolvidos antes do go-live — pela correção do texto ou pela construção da funcionalidade, tanto faz para o risco, muda só o esforço.

Nenhum texto foi alterado. Alterar documento contratual é perímetro da consulta jurídica em curso.

---

## O que já foi resolvido hoje, para vocês não se preocuparem

- Reportar um problema **não trava mais a locação**: as duas partes continuam com todos os botões, e o item pode ser devolvido normalmente durante a análise.
- Encerrar uma análise **não cancela mais a locação junto** — era o único caminho que existia.
- O rótulo do botão da equipe dizia "Cancelar" e cancelava a **reserva**, não a disputa. Agora diz o que faz.
- O dinheiro fica retido **enquanto** a disputa está aberta, e volta a andar assim que ela é encerrada — antes, uma disputa já resolvida podia continuar travando repasse.

*Detalhamento técnico em `docs/testes/roteiro-teste-disputa.md` e `docs/backlog-atividades-priorizadas.md`.*
