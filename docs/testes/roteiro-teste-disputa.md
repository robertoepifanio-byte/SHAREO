# Roteiro de teste — Disputa como estado paralelo (01/09/2026)

**Ambiente:** staging (`https://staging.shareo.com.br`). **Nunca em produção** — `shareo-prod` está travado pelo D4.

**O que este roteiro prova:** que abrir uma disputa deixou de congelar a locação. Até 01/09 `DISPUTED` era um valor de `BookingStatus`, então abrir disputa sobrescrevia o `ACTIVE`/`RETURNED` e a reserva ficava **sem nenhum botão** — o locatário não conseguia devolver o item, quem abriu não conseguia desistir, e o admin só encerrava a mediação cancelando a locação junto. Os 4 relatos do Thiago (QA, 01/09) são 4 sintomas disso.

**Estado atual do código:** mesclado no `main` (PRs #425, #428, #427), deploy de staging verde, migração confirmada no banco (`zythygwvmrwrqmnrdufq`: 4 colunas `dispute*`, enum com 5 valores, **zero** reservas em `status: DISPUTED`). **Nada abaixo foi exercitado em tela** — é exatamente o que este roteiro existe para fechar.

> ⚠️ **Nada aqui pode ser marcado ✅ sem a evidência da coluna correspondente.** Código mesclado ≠ comportamento verificado.

---

## 🪤 As três armadilhas que fazem perder tempo

Leia antes de começar, porque cada uma parece bug e não é:

**1. A janela de disputa é assimétrica.** Quem pode abrir, e quando, depende do papel (`lib/disputeWindow.ts`, decisão do Raimundo de 25/08):

| Quem abre | Quando pode | Fora disso |
|---|---|---|
| **Locatário** | só com a reserva `ACTIVE` — entre a retirada e a devolução | `422 DISPUTE_WINDOW_CLOSED` |
| **Locador** | só depois do `mark_returned`, e só por **48h** | `422 DISPUTE_WINDOW_CLOSED` |

Consequência prática para o teste: **o locatário perde o direito de abrir disputa no instante em que devolve.** Para testar "devolver com disputa aberta" (Fase 2), a disputa tem de ser aberta **antes** da devolução.

**2. A devolução exige foto.** `mark_returned` recusa com `422 RETURN_PHOTO_REQUIRED` sem ao menos uma foto de fase `CHECKOUT`. Não é falha da disputa.

**3. O Deployment Protection da Vercel pode devolver 302** em acesso automatizado. Se a página não carregar, abrir no navegador logado antes de concluir que quebrou.

---

## Fase 0 — Preparação

**Atores:** 3 contas distintas em staging — **proprietário**, **locatário** e **admin** (`admin@shareo.com.br`, senha `Admin@shareo2026`, papel `ADMIN_SUPERADMIN`). Não reaproveitar a mesma conta em dois papéis: as guardas de autoria são justamente o que está sendo testado.

| # | Passo | Como verificar |
|---|---|---|
| 0.1 | Proprietário tem um item publicado | item aparece em `/itens` |
| 0.2 | Locatário cria uma reserva nesse item | reserva em `PENDING` |
| 0.3 | Proprietário confirma | `CONFIRMED`, e um `pickupToken` de 6 dígitos é gerado |
| 0.4 | Marcar como paga | pelo checkout Stripe (cartão de teste) **ou** via `POST /api/test/mark-booking-paid` (exige `E2E_SECRET` + header `x-e2e-token`) |
| 0.5 | Proprietário faz "Marcar como ativo" com o código do locatário | `ACTIVE` |

Guardar o **ID da reserva** — ele aparece na URL `/reservas/<id>` e é usado nas conferências de banco.

---

## Fase 1 — Contato antes da reclamação (Correção 1)

Como **locatário**, na reserva `ACTIVE`.

| # | Ação | Resultado esperado | Evidência |
|---|---|---|---|
| 1.1 | Clicar em **"Reportar problema"** | **não** abre o formulário direto: aparece o painel "Antes de abrir uma reclamação" | screenshot |
| 1.2 | Conferir o texto | oferece **"Falar com o proprietário"** (link para o chat) e **"Continuar"** | screenshot |
| 1.3 | Clicar em "Falar com o proprietário" | abre `/mensagens/<id>` da conversa da reserva | — |
| 1.4 | Voltar, clicar em **"Continuar"** | aí sim abre o formulário de motivo + descrição + foto | screenshot |
| 1.5 | Repetir 1.1 como **proprietário** (numa reserva `RETURNED`, ver Fase 3) | o texto diz **"Falar com o locatário"** — o passo vale para os dois lados | screenshot |

---

## Fase 2 — Devolver com disputa aberta (Correção 2) ⭐

**A fase mais importante.** É o defeito principal do Thiago.

| # | Ação | Resultado esperado | Evidência |
|---|---|---|---|
| 2.1 | Locatário abre a disputa (Fase 1 até o fim, enviar o relatório) | mensagem de sucesso | screenshot |
| 2.2 | **Olhar o selo de status** | aparecem **DOIS** selos: "Em andamento" **e** "Em disputa". O status **não** virou "Em disputa" sozinho | screenshot — é a prova visual do refactor |
| 2.3 | Olhar a área de ações | banner laranja **"Disputa em análise"**, e os botões **continuam na tela** | screenshot |
| 2.4 | Conferir que **"Devolver"** está disponível | ⚠️ antes desta correção a tela ficava **vazia** aqui | screenshot |
| 2.5 | Banco: `SELECT status, "disputeStatus", "disputeOpenedById" FROM bookings WHERE id = '<id>'` | `status = ACTIVE`, `disputeStatus = OPEN`, `disputeOpenedById` = id do locatário | saída do SQL |
| 2.6 | Tentar abrir uma **segunda** disputa | recusado — `422 DISPUTE_ALREADY_OPEN` | screenshot do erro |
| 2.7 | Devolver de fato (com foto) | reserva vai a `RETURNED` **e** `disputeStatus` continua `OPEN` | SQL + screenshot |

> 🪤 Se em 2.4 não houver botão nenhum, o deploy antigo ainda está servindo a página. Conferir o hash do deployment antes de reportar bug.

---

## Fase 3 — Cancelar a própria disputa (Correção 3)

| # | Ação | Resultado esperado | Evidência |
|---|---|---|---|
| 3.1 | Como **locatário** (autor da disputa), ver as ações | existe **"Cancelar disputa"** | screenshot |
| 3.2 | Como **proprietário**, ver a mesma reserva | **não** existe "Cancelar disputa" — só quem abriu cancela | screenshot |
| 3.3 | Locatário clica em "Cancelar disputa" | selo "Em disputa" some; o status da reserva **não muda** | screenshot antes/depois |
| 3.4 | Banco | `disputeStatus = DISMISSED`, `disputeResolvedAt` preenchido, `status` **inalterado**, `cancelledAt` e `refundAmount` **nulos** | saída do SQL |
| 3.5 | Notificação do proprietário | "Disputa cancelada — a locação segue normalmente" | screenshot |
| 3.6 | Locatário tenta abrir disputa de novo | permitido **se** a reserva ainda estiver `ACTIVE`; recusado se já devolveu (armadilha 1) | screenshot |

**Não testável hoje:** disputas legadas (sem `disputeOpenedById`) não podem ser canceladas por ninguém — proposital, porque não há prova de autoria. O staging tem zero dessas linhas.

---

## Fase 4 — Os três desfechos do admin (Correção 4) ⭐

Abrir uma disputa nova (Fases 1–2) e entrar em `/admin/disputas` como **admin**.

| # | Ação | Resultado esperado | Evidência |
|---|---|---|---|
| 4.1 | A disputa aparece na fila | listada como aberta | screenshot |
| 4.2 | Clicar em "Resolver" | aparecem **TRÊS** botões: "Concluir", **"Cancelar reserva e estornar"** e **"Encerrar disputa"** | screenshot |
| 4.3 | Conferir o rótulo do segundo | ⚠️ antes dizia só **"Cancelar"** — e cancelava a RESERVA, não a disputa | screenshot |
| 4.4 | Tentar "Encerrar disputa" **sem** preencher a nota | botão desabilitado; forçando pela API, `400` com "Explique por que a disputa está sendo encerrada" | screenshot |
| 4.5 | Preencher a nota e clicar em **"Encerrar disputa"** | disputa sai da fila | screenshot |
| 4.6 | Banco — **o coração da correção 4** | `disputeStatus = DISMISSED`; `status` **inalterado**; `cancelledAt`, `cancelledById`, `refundAmount`, `refundPercent` **nulos** | saída do SQL |
| 4.7 | Notificação das duas partes | "Disputa encerrada — a locação segue normalmente". **Não** pode dizer "cancelada" | screenshot dos dois lados |
| 4.8 | Reserva do locatário | segue viva e operável | screenshot |

### 4b — os outros dois desfechos (numa disputa nova cada)

| # | Ação | Resultado esperado |
|---|---|---|
| 4.9 | "Concluir" | `status = COMPLETED`, `disputeStatus = RESOLVED_OWNER`, `Payout` criado para o proprietário |
| 4.10 | "Cancelar reserva e estornar" | `status = CANCELLED`, `disputeStatus = RESOLVED_BORROWER`, `refundAmount` = total e `refundPercent = 100` (se paga) |

---

## Fase 5 — Repasse retido só enquanto a disputa está aberta

| # | Ação | Resultado esperado | Evidência |
|---|---|---|---|
| 5.1 | Com `disputeStatus = OPEN` numa reserva com `Payout` `PENDING` e `eligibleAfter` vencido, rodar `GET /api/cron/payout` | o repasse **não** sai | log do cron |
| 5.2 | Encerrar a disputa (`DISMISSED`) e rodar de novo | o repasse **sai** | log + linha do `Payout` |

> Antes o filtro era `status != DISPUTED`. Agora é `disputeStatus != OPEN` — uma disputa **encerrada** não pode continuar travando dinheiro que tem dono.

---

## Fase 6 — Chargeback do Stripe (opcional, exige Stripe test)

| # | Ação | Resultado esperado |
|---|---|---|
| 6.1 | Disparar `charge.dispute.created` no Workbench para o PaymentIntent da reserva | `disputeStatus = OPEN` e **`status` inalterado** — o chargeback também parou de sequestrar o ciclo de vida |
| 6.2 | Disparar `charge.dispute.closed` com `status: lost` | `status = CANCELLED`, `disputeStatus = RESOLVED_BORROWER` |

---

## Folha de resultado

| Fase | Correção do Thiago | Resultado | Evidência |
|---|---|---|---|
| 1 | C1 — contato antes da reclamação | ⬜ | |
| 2 | C2 — devolver com disputa aberta | ⬜ | |
| 3 | C3 — cancelar a própria disputa | ⬜ | |
| 4 | C4 — encerrar sem cancelar a reserva | ⬜ | |
| 5 | repasse retido só enquanto aberta | ⬜ | |
| 6 | chargeback (opcional) | ⬜ | |

**Fora do escopo deste roteiro** (registrado em `docs/backlog-atividades-priorizadas.md`):

- **App mobile** — recebeu só o selo "Em disputa". Não tem o passo de contato, o botão de cancelar disputa nem o banner. Não é regressão; é paridade pendente.
- **Texto publicado** — Ajuda e Políticas não mencionam nada do fluxo novo. Alterar texto contratual é perímetro **D4**.
