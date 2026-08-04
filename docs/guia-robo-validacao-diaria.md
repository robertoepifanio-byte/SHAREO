# Guia — Robô de Validação Diária (daily-sim)

Guia prático para **executar** o robô e **acompanhar/interpretar** os dados que ele
gera. Para detalhes técnicos do script, veja também [`scripts/daily-sim.README.md`](../scripts/daily-sim.README.md).

> **O que o robô faz:** simula um "dia" de operação do ShareO — cadastros, anúncios,
> locações, pagamentos (Pix fictício), retirada/devolução, chat e repasse — para
> validar o fluxo completo ao longo de ~7 dias de testes manuais.

> ✅ **Status (17/06/2026):** staging **já configurado e validado** — Dias 1 e 2
> rodados (10 usuários / 10 anúncios). O `E2E_SECRET` já está no `.env.staging-migrate`.
> A partir daqui os dados **permanecem** (ver §6).

---

## 1. Antes de começar (pré-requisitos)

| Item | Local | Staging |
|---|---|---|
| Node.js 20+ | ✅ (`node -v`) | ✅ |
| Dev server rodando | ✅ `npm run dev` (porta 3000) | — (usa o staging publicado) |
| Arquivo de ambiente | `.env.local` / `.env` | `.env.staging-migrate` |
| `E2E_SECRET` | opcional | **já no `.env.staging-migrate`** — não precisa setar |

**O `E2E_SECRET`** libera a "rajada" de requisições do robô (sem ele, execuções
maiores podem tomar `429`). **Nesta máquina ele já está no `.env.staging-migrate`**,
e o robô o lê automaticamente — não precisa setar nada no terminal. (É o mesmo valor
do segredo do staging: GitHub Secrets → `E2E_SECRET` e env do Vercel staging.)

---

## 2. Como executar

> **Windows — qual terminal?** Se ao rodar `npm`/`npx` aparecer *"a execução de
> scripts foi desabilitada neste sistema"*, use o **Prompt de Comando (cmd)** — ele
> não tem essa trava. Alternativa (1×): liberar o PowerShell com
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. Os comandos
> abaixo funcionam tanto no **cmd** quanto no **PowerShell**.

### Local (isolado — não visível aos fundadores)

```powershell
# 1) Em um terminal, deixe o app rodando:
npm run dev

# 2) Em outro terminal, rode o robô:
npx tsx scripts/daily-sim.ts --env local
```

### Staging (visível aos fundadores no app)

```bat
:: Um "dia" padrão (5 cadastros, 5 anúncios, 5 locações):
npx tsx scripts\daily-sim.ts --env staging

:: Dia de repasse (consolida os pagamentos em repasses):
npx tsx scripts\daily-sim.ts --env staging --repasse
```

Não precisa setar `E2E_SECRET` — ele já vem do `.env.staging-migrate`. O robô **avisa**
que o alvo é staging antes de inserir qualquer coisa.

### Flags disponíveis

| Flag | Default | O que faz |
|---|---|---|
| `--env local\|staging` | `local` | Ambiente alvo (produção é bloqueada) |
| `--users <n>` | 5 | Novos cadastros na execução |
| `--items <n>` | 5 | Novos anúncios na execução |
| `--bookings <n>` | 5 | Locações a simular |
| `--repasse` | off | Processa os repasses (payouts) pendentes |
| `--seed <n>` | aleatório | Semente do RNG (resultados reprodutíveis) |
| `--day <n>` | auto | Força o número do "dia" (normalmente deixa automático) |
| `--reset` | — | **Apaga** os dados da simulação (só sob demanda — ver §6) |
| `--help` | — | Ajuda |

### Roteiro sugerido de 7 dias

| Dia | Comando |
|---|---|
| 1–6 | `npx tsx scripts/daily-sim.ts --env staging` |
| 7 | `npx tsx scripts/daily-sim.ts --env staging --repasse` |

Cada execução incrementa o contador de "dia" e **acumula** usuários e itens.
Rode quando quiser — não precisa ser exatamente 1×/dia.

---

## 3. Acompanhando ao vivo (saída no terminal)

Enquanto roda, o robô imprime cada ação. Legenda das linhas de **locação**:

| Linha | Significado |
|---|---|
| `✓ reserva CONCLUÍDA — repasse R$X (taxa R$Y)` | ciclo completo: confirmou → pagou → retirou → devolveu → concluiu. Gera repasse. |
| `⏰ reserva CONCLUÍDA com ATRASO …` | concluída, mas devolução após o prazo (com taxa de atraso) |
| `↩ reserva CANCELADA (R$X)` | desistência (cancelada antes de concluir) |
| `⚠ reserva em DISPUTA (R$X)` | item danificado / divergência → disputa aberta |
| `⏳ reserva CONFIRMADA, pagamento PENDENTE (R$X)` | locatário não concluiu o pagamento |
| `✗ …` | falha técnica numa etapa (ver §7) |

No fim, um **resumo do dia**:

```
📊 Resumo do dia
  Usuários novos:  4  (acumulado 7)
  Anúncios novos:  5  (acumulado 8)
  Locações:        12 → SUCCESS:9 · CANCELLED:1 · LATE_RETURN:1 · PAYMENT_PENDING:1
  Repasses:        14 (R$ 1.637,95)
```

---

## 4. Os arquivos gerados (`scripts/daily-sim-logs/`)

Cada execução grava três tipos de arquivo (essa pasta é ignorada pelo Git):

### `day-NN-<env>-<timestamp>.json` — relatório estruturado
```json
{
  "env": "staging",
  "day": 2,
  "summary": {
    "newUsers": 4, "newItems": 5, "bookings": 12,
    "byOutcome": { "SUCCESS": 9, "CANCELLED": 1, "LATE_RETURN": 1, "PAYMENT_PENDING": 1 },
    "repasse": { "count": 14, "total": 163795 },
    "seed": 3
  },
  "events": [
    { "ts": "...", "type": "user.created",      "id": "...", "name": "...", "email": "..." },
    { "ts": "...", "type": "item.created",      "id": "...", "title": "...", "pricePerDay": 12700 },
    { "ts": "...", "type": "booking.created",   "id": "...", "outcome": "SUCCESS", "totalPrice": 14400 },
    { "ts": "...", "type": "payment.paid",      "id": "...", "platformFeeAmount": 2160, "ownerNetAmount": 12240 },
    { "ts": "...", "type": "booking.completed", "id": "...", "outcome": "SUCCESS" },
    { "ts": "...", "type": "chat.message",      "from": "borrower" }
  ]
}
```
> **Valores monetários estão em centavos** (`14400` = R$ 144,00). `repasse.total: 163795` = R$ 1.637,95.

### `day-NN-<env>-<timestamp>.log` — log legível
A mesma saída que apareceu no terminal, salva em texto.

### `state-<env>.json` — estado acumulado (entre dias)
```json
{ "env": "staging", "dayCounter": 2, "seed": 3,
  "userIds": ["..."], "itemIds": ["..."],
  "bookings": [{ "id": "...", "outcome": "SUCCESS" }],
  "payoutsCreated": 0, "payoutsPaid": 14 }
```
Use-o para saber em que "dia" você está e quantas entidades já existem.

---

## 5. Interpretando os resultados

### 5.1 No app de staging (o que os fundadores veem)

| O que validar | Onde |
|---|---|
| **Anúncios publicados** (com foto, em São Paulo) | `https://staging.shareo.com.br/itens` |
| **Reservas** em vários estados | abrir um item → ou via conta de um usuário |
| **Financeiro: repasses, taxas, transações** | `/admin/financeiro` (login admin) |
| **Usuários / itens / disputas** | `/admin` (login admin) |

**Login admin do staging** (seed): `admin@shareo.com.br`, `financeiro@shareo.com.br`
ou `operacional@shareo.com.br` — senha `ShareO@2026`.

Os usuários da simulação têm e-mail terminando em **`@daily-sim.shareo.test`** (filtro
fácil para identificá-los).

### 5.2 Checklist de validação (o que "tem que bater")

- [ ] **Cadastros** criados e com cadastro **completo** (CPF + endereço) — habilita anunciar/alugar.
- [ ] **Anúncios** publicados (status disponível, com foto).
- [ ] **Reservas** distribuídas em desfechos variados (a maioria concluída).
- [ ] **Split de comissão correto**: em toda reserva paga, `taxa (15%) + repasse = total`.
  Ex.: total R$ 144,00 → taxa R$ 21,60 + repasse R$ 122,40. ✔
- [ ] **Repasses** gerados nas reservas concluídas e marcados como concluídos no dia de `--repasse`.
- [ ] **Chat** com mensagens trocadas entre locador e locatário.
- [ ] **Distribuição** de desfechos ~ proporcional aos pesos (SUCCESS ~64%, etc.).

### 5.3 Conferência direta no banco (opcional, técnico)

Para somar/contar rápido sem abrir o app (usa a tag de segurança):

```powershell
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const dom='@daily-sim.shareo.test';const u=await p.user.findMany({where:{email:{endsWith:dom}},select:{id:true}});const ids=u.map(x=>x.id);console.log('usuarios:',ids.length);console.log('itens:',await p.item.count({where:{ownerId:{in:ids}}}));console.log('reservas por status:',JSON.stringify((await p.booking.groupBy({by:['status'],where:{ownerId:{in:ids}},_count:true})).map(b=>({s:b.status,n:b._count}))));console.log('payouts:',JSON.stringify((await p.payout.groupBy({by:['status'],where:{booking:{ownerId:{in:ids}}},_count:true,_sum:{amount:true}})).map(x=>({s:x.status,n:x._count,total:x._sum.amount}))));await p.$disconnect();})()"
```
> No staging, esse comando precisa do `.env.staging-migrate` carregado. Para mirar o
> staging, rode-o com as variáveis do staging no ambiente (ou peça que eu rode/interprete).

---

## 6. Retenção e limpeza dos dados

⚠️ **Os dados PERMANECEM na base** para a validação dos fundadores. O robô **só
insere** — nunca apaga sozinho.

A limpeza acontece **exclusivamente sob demanda**, quando a exclusão for solicitada:

```powershell
npx tsx scripts/daily-sim.ts --env staging --reset
```

`--reset` remove **apenas** as entidades da simulação (tag `@daily-sim.shareo.test`)
no ambiente escolhido — nada de dados reais é tocado.

---

## 7. Problemas comuns (troubleshooting)

| Sintoma | Causa provável | Solução |
|---|---|---|
| `npm.ps1 … a execução de scripts foi desabilitada` | política do PowerShell | usar o **cmd**, ou `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `✗ cadastro … → 429` (muitos `429`) | rate-limit do staging | confirmar que o `E2E_SECRET` está no `.env.staging-migrate` |
| `registro não encontrado` / `markEmailVerified` falha | banco errado (corrigido em #29) | atualizar para a `main` mais recente — o robô já força o alvo do `--env` |
| `✗ login …` | credencial/sessão | conferir se o `register` retornou 201 antes; reexecutar |
| Erro de conexão / `ECONNREFUSED` (local) | dev server não está rodando | `npm run dev` em outro terminal |
| `.env.staging-migrate não encontrado` | arquivo ausente | confirmar que o arquivo existe na raiz |
| `Nenhuma categoria no banco` | banco sem seed | rodar o seed do ambiente antes |
| Tudo deu `SUCCESS` (ou muitos `DISPUTED`) | variância com poucas reservas | é normal; ao longo de 7 dias se aproxima dos pesos. Aumente `--bookings` para amostra maior |

---

## 8. Ajustes finos

- **Pesos dos desfechos**: edite `OUTCOME_WEIGHTS` no topo de [`scripts/daily-sim.ts`](../scripts/daily-sim.ts).
- **Volumes**: flags `--users / --items / --bookings`.
- **Reprodutibilidade**: `--seed <n>` (mesma semente = mesmos dados).
- **Cidade/itens/mensagens**: pools no topo do script (`SP_BAIRROS`, `ITEM_TEMPLATES`, `CHAT`).

> Precisa de ajuda para ler um relatório específico ou conferir um número? É só
> me passar o arquivo de `scripts/daily-sim-logs/` que eu interpreto.
