# Roteiro de Teste de Usabilidade — Modo Escuro (Dark Mode)

**Produto:** ShareO · **Funcionalidade:** Modo Escuro (claro/escuro/sistema)
**Ambiente:** `https://staging.shareo.com.br` (NÃO é produção)
**Versão:** 1.0 · **Data:** 2026-06-20
**Referência:** `docs/dark-mode-plan.md` (§8 protótipos/validação, §9 checklist)

> Objetivo deste roteiro: validar com pessoas reais, **antes de qualquer go-live**, três coisas que só usuários respondem — (1) descobrem o controle de tema sem ajuda? (2) o texto é legível e confortável no escuro? (3) qual tema preferem. É um guia de **moderação** — o moderador conduz, observa e anota; não entrega este arquivo ao participante.

---

## 1. O que estamos validando

| # | Pergunta de pesquisa | Como medimos |
|---|---|---|
| Q1 | O usuário **encontra** o seletor de tema sozinho? | Taxa de sucesso da Tarefa 1 + tempo até achar + nº de dicas |
| Q2 | O conteúdo é **legível/confortável** no escuro? | Escalas pós-tarefa (1–5) + comentários em voz alta |
| Q3 | Qual a **preferência** declarada (claro/escuro/sistema)? | Pergunta final + observação |
| Q4 | A troca de tema é **óbvia e sem surpresas** (sem flash, persiste)? | Observação nas Tarefas 2 e 4 |

---

## 2. Participantes e recrutamento

- **Quantidade:** 5 a 7 pessoas (o suficiente para achar ~85% dos problemas de usabilidade).
- **Perfil:** mistura de perfis-alvo do ShareO — quem **alugaria** e quem **anunciaria** itens; variar idade e familiaridade com apps.
- **Incluir pelo menos:** 1–2 pessoas que usam o celular no escuro/à noite com frequência; 1 pessoa que nunca mexeu em "modo escuro" conscientemente.
- **Evitar:** pessoas que participaram do desenvolvimento (viés).

## 3. Logística

- **Dispositivo:** prioridade **celular** (o ShareO é mobile-first). Se possível, teste 1–2 sessões também em desktop.
- **Onde:** presencial ou por chamada com compartilhamento de tela do celular.
- **Duração:** 15–20 min por pessoa.
- **Preparação do moderador (antes de cada sessão):**
  1. Abrir `https://staging.shareo.com.br` numa aba **anônima/privada** (estado limpo, sem tema salvo).
  2. Garantir que o tema do **sistema** do aparelho esteja no **claro** (para a Tarefa 1 começar no claro e o participante ter que agir).
  3. Ter este roteiro + a folha de registro (seção 7) à mão.
- **Consentimento:** avisar que a sessão pode ser gravada (tela/áudio) só para análise interna; pedir o "ok" verbal. Não coletar dados pessoais.

## 4. Introdução (ler para o participante)

> "Obrigado por ajudar! Vou te pedir para fazer algumas tarefas num site que estamos finalizando. **Não é você que está sendo testado — é o site.** Não existe resposta certa ou errada. Por favor, **pense em voz alta**: fale o que está vendo, procurando e sentindo. Se travar, tudo bem — isso é justamente o que precisamos descobrir. Pode começar quando quiser."

Não explique onde fica nada. Não diga as palavras "modo escuro", "tema" ou "botão" antes da Tarefa 1.

---

## 5. Pré-teste (2 perguntas rápidas)

1. "Você costuma usar seus apps/celular no **modo escuro**?" (sim / não / não sei o que é)
2. "Em que situações? (ex.: à noite, sempre, nunca)"

---

## 6. Tarefas

Para cada tarefa: leia o cenário, **fique em silêncio** e observe. Só dê dica se o participante pedir ou travar por mais de ~60s (anote que houve dica).

### Tarefa 1 — Descoberta (Q1) · *crítica*
**Cenário:** "Está de noite, a tela está te ofuscando. Deixe o site **mais escuro/confortável** para os olhos."
- ✅ **Sucesso:** ativa o modo escuro pelo seletor de tema (no celular: menu ☰ → seção **Tema**; no desktop: os 3 ícones no topo, ☀️/🖥️/🌙).
- 👀 **Observar:** Onde olha primeiro? Procura no menu? Confunde com outra coisa (busca, perfil)? Quanto tempo leva?
- 📝 **Anotar:** achou sozinho? (S/N) · tempo (s) · nº de dicas · onde procurou.

### Tarefa 2 — Alternância e modelo mental (Q3, Q4)
**Cenário:** "Existem três opções de tema. Experimente as três e me diga o que entende de cada uma."
- ✅ **Sucesso:** alterna entre **Claro**, **Escuro** e **Sistema** e percebe a diferença.
- 👀 **Observar:** entende o que "Sistema" faz? A troca é instantânea? Notou algum **piscar/flash** estranho?
- 📝 **Anotar:** entendeu "Sistema"? (S/N) · percebeu flash? (S/N) · comentários.

### Tarefa 3 — Legibilidade em uso real (Q2)
**Cenário (com o tema no escuro):** "Encontre um item para alugar, abra os detalhes e me diga o **preço por dia** e se ele está **disponível**."
- ✅ **Sucesso:** navega em `/itens`, abre um item, lê preço e status sem dificuldade.
- 👀 **Observar:** algum texto difícil de ler? Botões/preços/etiquetas de status com baixo contraste? O verde de ação se destaca? Forçou os olhos em algum ponto?
- 📝 **Anotar:** apontou algum texto/elemento ruim? Qual? · esforço visual (ver escala pós-tarefa).

### Tarefa 4 — Persistência (Q4)
**Cenário:** "Atualize a página (ou volte para a Início) e me diga o que acontece com o tema."
- ✅ **Sucesso:** percebe que o tema escolhido **permanece** após recarregar/navegar.
- 📝 **Anotar:** o tema persistiu? (S/N) · o participante reparou/comentou?

---

## 7. Pós-tarefa e pós-teste (escalas + abertas)

**Após a Tarefa 3** (legibilidade), pergunte (escala 1–5):
- "Quão **fácil de ler** ficou o conteúdo no escuro?" (1 = muito difícil · 5 = muito fácil)
- "Quão **confortável** para os olhos?" (1 = desconfortável · 5 = muito confortável)

**Ao final:**
- "De 1 a 5, quão **fácil foi encontrar** o controle de tema?"
- "Qual tema você **deixaria ligado** no dia a dia?" (claro / escuro / sistema / tanto faz)
- "Teve **algo confuso, feio ou difícil de ler**? O quê?"
- "Mudaria alguma coisa?"
- (Opcional) "De 0 a 10, quão provável você recomendaria o app a um amigo?" (NPS)

---

## 8. Folha de registro (uma linha por participante)

| P# | Perfil | T1 achou sozinho? | T1 tempo (s) | T1 dicas | Entendeu "Sistema"? | Notou flash? | Legibilidade (1-5) | Conforto (1-5) | Achar toggle (1-5) | Preferência | Problemas observados |
|----|--------|-------------------|--------------|----------|---------------------|--------------|--------------------|----------------|--------------------|-------------|----------------------|
| 1  |        |                   |              |          |                     |              |                    |                |                    |             |                      |
| 2  |        |                   |              |          |                     |              |                    |                |                    |             |                      |
| 3  |        |                   |              |          |                     |              |                    |                |                    |             |                      |
| 4  |        |                   |              |          |                     |              |                    |                |                    |             |                      |
| 5  |        |                   |              |          |                     |              |                    |                |                    |             |                      |
| 6  |        |                   |              |          |                     |              |                    |                |                    |             |                      |
| 7  |        |                   |              |          |                     |              |                    |                |                    |             |                      |

**Classificação de severidade dos problemas** (para a coluna final): `crítico` (impede a tarefa) · `sério` (atrapalha bastante) · `menor` (incômodo) · `cosmético`.

---

## 9. Critérios de aprovação (sugeridos)

O dark mode passa na validação de usabilidade se, no conjunto dos participantes:

- ✅ **≥ 80% encontram** o seletor de tema sem dica (Tarefa 1).
- ✅ **Legibilidade e conforto médios ≥ 4,0/5** no escuro.
- ✅ **Nenhum** problema de severidade **crítico**; problemas sérios têm plano de correção antes do go-live.
- ✅ **Ninguém relata flash/piscar** ao trocar de tema (confirma o no-FOUC).
- ✅ Maioria entende a opção **"Sistema"**.

Se um critério falhar, registrar o achado, priorizar a correção e (se for de UI) reabrir uma rodada curta da fase correspondente (ver `docs/dark-mode-plan.md`).

---

## 10. Onde registrar o resultado

- Consolidar a folha (seção 8) + 3–5 principais achados num resumo de 1 página.
- Anexar ao acompanhamento do projeto e atualizar o checklist §9 do `docs/dark-mode-plan.md` (item "Testes de usabilidade").
- Achados de UI viram ajustes pontuais; nada disso bloqueia o staging — **produção segue gated por D4 (jurídico)**.
