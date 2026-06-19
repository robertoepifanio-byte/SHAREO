# Robô de Validação Diária — `daily-sim`

Simula um **dia de operação** do ShareO para validar, ao longo de ~7 dias de testes
manuais, o fluxo completo: **cadastros → anúncios → locações → pagamentos (Pix
fictício) → retiradas/devoluções → chat → repasse financeiro**.

Acionado **manualmente, 1× por dia**. Cada execução = 1 "dia". O contador de dias e
os IDs criados ficam num arquivo de estado (`scripts/daily-sim-logs/state-<env>.json`),
então as locações também ocorrem entre usuários acumulados de dias anteriores.

## Como roda (arquitetura híbrida)

Decisão dos fundadores: **fluxos críticos via API HTTP real**, apoio via Prisma.

| Etapa | Como |
|---|---|
| Cadastro mínimo, login, completar cadastro | **API** (`/api/auth/*`, `/api/users/me/complete-registration`) |
| Criar anúncio | **API** (`POST /api/items`) |
| Criar reserva | **API** (`POST /api/bookings`) |
| Confirmar / retirar / devolver / disputar / cancelar | **API** (`PATCH /api/bookings/[id]`) |
| Chat | **API** (`POST /api/conversations/[id]/messages`) |
| Marcar e-mail verificado (gate de reserva) | Prisma (apoio) |
| Publicar foto (DRAFT→AVAILABLE) | Prisma (apoio) |
| Pix fictício (marcar pago + split de comissão) | Prisma (apoio — espelha o checkout) |
| Conta de recebimento PIX + repasse (payout) | Prisma (apoio) |

Os fluxos via API exercitam **de verdade** os gates (cadastro completo, e-mail
verificado), validações Zod, rate-limit e o **split de comissão** (15% retidos do
repasse ao dono — o mesmo do checkout).

## Ambiente

**Configurável, default `local`.** Produção é **bloqueada** (D4).

| `--env` | Banco | API |
|---|---|---|
| `local` (default) | `.env.local` / `.env` (`jtianehxosfdrhjzqvqj`) | `http://localhost:3000` |
| `staging` | `.env.staging-migrate` (`fflpuoluiqmhpvcxubqi`) | `https://staging.shareo.com.br` |

> **local** exige o dev server rodando (`npm run dev`).
> **staging** insere dados no banco de homologação (visíveis no app).
>
> **Rate-limit (429):** o robô é **resiliente** — ao tomar 429 (ex.: register é
> 5/min por IP), ele respeita o `Retry-After` e re-tenta automaticamente (até 5×).
> O `E2E_SECRET` é **opcional**: se presente (e correto), faz o **bypass** do limite
> e o run fica mais rápido; se ausente/errado, o robô só fica mais lento (aguarda a
> janela), mas **não pula** cadastros.

## Uso

```bash
# Dia típico (5 cadastros, 5 anúncios, 5 locações) no local
npx tsx scripts/daily-sim.ts --env local

# Ajustando os volumes
npx tsx scripts/daily-sim.ts --env local --users 3 --items 4 --bookings 6

# Dia de repasse — processa os payouts pendentes da simulação
npx tsx scripts/daily-sim.ts --env local --repasse

# Reprodutível (mesma semente = mesmos dados)
npx tsx scripts/daily-sim.ts --env local --seed 42

# Limpar TODA a simulação do env (seguro: só remove a tag @daily-sim.shareo.test)
npx tsx scripts/daily-sim.ts --env local --reset

# Ajuda
npx tsx scripts/daily-sim.ts --help
```

Sugestão de roteiro de 7 dias (manual): rode sem `--repasse` nos dias 1–6 e com
`--repasse` no dia 7 (ou em qualquer dia que queira consolidar os repasses).

## Desfechos (aleatoriedade controlada)

Cada locação recebe um desfecho ponderado (maioria sucesso, minoria com problemas):

| Desfecho | Peso | O que acontece |
|---|---|---|
| `SUCCESS` | 64% | ciclo completo → COMPLETED + repasse elegível |
| `LATE_RETURN` | 10% | concluída, mas devolução após o prazo (taxa de atraso) |
| `CANCELLED` | 12% | desistência (cancela em PENDING/CONFIRMED) |
| `DISPUTED` | 8% | item danificado → disputa aberta |
| `PAYMENT_PENDING` | 6% | pagamento não concluído (fica preso em CONFIRMED) |

Os pesos ficam em `OUTCOME_WEIGHTS` no topo de `scripts/daily-sim.ts`.

## Saída

`scripts/daily-sim-logs/` (gitignored):

- `day-NN-<env>-<timestamp>.json` — eventos estruturados + resumo do dia
- `day-NN-<env>-<timestamp>.log` — log legível
- `state-<env>.json` — contador de dias, IDs criados, sementes (reuso entre dias)

## Retenção de dados (validação dos fundadores)

⚠️ **Os dados gerados DEVEM PERMANECER na base** para validação dos resultados
pelos fundadores. **Só excluir quando explicitamente solicitado**, na fase de
validação.

- O robô **nunca** apaga nada sozinho — ele só **insere**. A persistência é o
  comportamento padrão.
- A limpeza acontece **exclusivamente** via `--reset`, executado **sob demanda**
  quando a exclusão for pedida. Não rode `--reset` antes disso.
- Rode `--reset` várias vezes / dias seguidos sem medo de perder histórico — ele
  só remove ao ser chamado.

## Segurança

- Toca **apenas** entidades de usuários com e-mail `@daily-sim.shareo.test`.
- `--reset` apaga **somente** essas entidades, no env escolhido (uso sob demanda —
  ver "Retenção de dados" acima).
- **Nunca** roda contra produção.
- Em `staging`, avisa explicitamente que vai inserir dados de homologação.
