# Redação proposta — itens 1 e 3 da pauta de disputas

**1º de setembro de 2026** · para revisão de Raimundo

**Nada aqui foi publicado.** Alterar Ajuda e Políticas é perímetro da consulta jurídica em curso. Este documento traz o texto atual, o texto proposto e o porquê de cada mudança, para você aprovar, ajustar ou recusar.

Decisão de Roberto (01/09): o **item 1** (recurso) se resolve pelo texto; o **item 2** (reembolso parcial) se resolve pelo código — este último **já foi implementado**, e por isso não aparece aqui.

---

## Item 1 — Direito de recurso

### Onde está

`app/ajuda/page.tsx`, seção **Disputas e Proteção**, pergunta *"Posso apelar de uma decisão de disputa?"*.

### Texto publicado hoje

> Sim. Se você discordar da decisão, tem até **5 dias úteis** para solicitar uma revisão. Envie novas evidências que não foram analisadas anteriormente e explique o motivo do recurso. **A revisão é feita por um time diferente do que tomou a decisão original.** Caso o problema persista, você pode acionar os canais de defesa do consumidor (Procon) ou o e-Consumidor.

### O que o sistema faz

Nada disso. Não existe botão de recurso, tela, campo no banco nem aviso à equipe. Uma disputa decidida é definitiva no sistema. E o "time diferente" descreve uma estrutura de atendimento que a ShareO não tem: hoje quem analisa disputa é a mesma pessoa, qualquer que seja o caso.

### Por que preocupa

É promessa de **procedimento**, não de resultado. O usuário insatisfeito vai procurar o botão de recurso, não vai encontrar, e terá em mãos um texto nosso dizendo que tinha esse direito — com o Procon citado na frase seguinte, o que praticamente indica o caminho da reclamação.

### Texto proposto

> Sim. Se você discordar da decisão, escreva para **suporte@shareo.com.br** explicando o motivo e anexando evidências que ainda não tenham sido analisadas. A equipe reavalia o caso quando há elemento novo. Caso o problema persista, você pode acionar os canais de defesa do consumidor (Procon) ou o e-Consumidor.

### O que muda, e o que não muda

| | Antes | Depois |
|---|---|---|
| Existe caminho para contestar? | sim | **sim** — o suporte, que funciona hoje |
| Prazo prometido | 5 dias úteis | nenhum |
| Quem reavalia | "time diferente" | a equipe |
| Condição | novas evidências | novas evidências (mantida) |

A proposta **não retira o direito de contestar** — retira a promessa de um procedimento formal que não existe. É a diferença entre prometer menos e prometer o que não se cumpre.

### Se preferir manter a promessa

Aí o caminho é construir: reabertura do caso, prazo controlado e registro da segunda decisão. Esforço médio — o histórico da disputa já é guardado. O "time diferente", porém, não é código: é decisão de estrutura, e não pode ser prometido enquanto uma pessoa só analisar tudo.

---

## Item 3 — Botão "Atendimento emergencial"

### Onde está

`app/ajuda/page.tsx`, seção **Suporte**, pergunta *"Quais são os canais de atendimento?"*. A mesma frase existe na Central de Ajuda do aplicativo (`apps/mobile/app/ajuda.tsx`).

### Texto publicado hoje

> Você pode nos contatar por: Email (suporte@shareo.com.br) — respondemos em até 8 horas úteis (casos urgentes: até 4 horas úteis); Chat interno do app — disponível em reservas ativas; e, em casos urgentes, pelo botão **'Atendimento emergencial'** dentro da reserva com disputa ativa. Nosso horário de atendimento é segunda a sexta, das 09h às 17h.

### O que o sistema faz

A expressão "Atendimento emergencial" aparece em **exatamente dois lugares do projeto**: a Central de Ajuda do site e a do aplicativo. Em nenhuma tela de reserva. O botão nunca existiu.

Quem está em situação urgente — justamente quem mais precisa — vai procurar dentro da reserva e não vai achar.

### Texto proposto

> Você pode nos contatar por: Email (suporte@shareo.com.br) — respondemos em até 8 horas úteis (casos urgentes: até 4 horas úteis); e pelo chat interno, disponível nas reservas ativas. Nosso horário de atendimento é segunda a sexta, das 09h às 17h.

Só remove o canal inexistente. Os outros dois continuam, com os mesmos prazos.

### Se preferir criar o botão

O difícil não é o botão: é definir **o que "urgente" obriga a equipe a fazer, e em quanto tempo**. Sem esse compromisso, teríamos um canal "urgente" com o mesmo prazo de todos os outros — o que frustra igual, com um clique a mais.

---

## Como aplicar, quando aprovado

As duas mudanças são de texto, em dois arquivos:

- `app/ajuda/page.tsx` — itens 1 e 3
- `apps/mobile/app/ajuda.tsx` — item 3 (a Ajuda do app repete a frase)

O item 3 precisa sair **nos dois**, senão o app segue prometendo um botão que o site já parou de prometer.

---

## Contexto

Os cinco pontos completos estão em `docs/juridico/pauta-disputa-2026-09-01.md`. O item 2 (reembolso parcial) foi resolvido por código: a equipe agora pode dividir o valor entre as partes, e as Políticas 3.3 passaram a descrever algo que o sistema faz.
