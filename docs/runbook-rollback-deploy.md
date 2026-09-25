# Runbook — voltar atrás um deploy de produção

**Criado em:** 24/09/2026 (D-7), sobre o commit `839e7176` · Cobre, **no papel**, o item 10 da Infra de `docs/checklist-go-live-2026-10-01.md` ("Rollback e interruptor de emergência nunca ensaiados"). Só o ensaio de D-2 (seção 8) fecha o item de verdade.

> **Estado: NÃO ENSAIADO.** Nada deste runbook foi executado contra a produção. As afirmações vêm de três fontes, e cada uma vem marcada:
>
> - **[CÓDIGO]** lido em arquivo do repositório neste commit (nome do passo, função ou chave citados; sem número de linha, porque muda).
> - **[CHECKLIST]** registro do `docs/checklist-go-live-2026-10-01.md` (verificações de 24/09), não refeito aqui.
> - **NÃO ENSAIADO** comportamento da Vercel ou de comando que nunca rodou neste projeto. Vem do conhecimento geral da ferramenta e **precisa ser conferido no ensaio**. Antes de usar um comando de CLI, rode `vercel <comando> --help` na versão fixada pelo workflow (54.6.1). **A ficha da seção 8 é a única lista do que continua NÃO ENSAIADO**; as marcas do texto apontam para a linha dela.
>
> Referências como "Infra 9", "Seg 10" e "Pagamentos 8" são itens do Anexo do `docs/checklist-go-live-2026-10-01.md`.
>
> Este documento não repete os vizinhos: restaurar o banco está em `docs/runbook-restauracao-backup.md`; vazamento da **`ENCRYPTION_KEY`** (recifragem de CPF/TOTP), em `docs/runbook-rotacao-encryption-key.md`; vazamento de **qualquer outra credencial** (`AUTH_SECRET`, `CRON_SECRET`, service role, chaves Stripe), na ordem de rotação do item 14 da Infra do checklist (escrita para o staging; a sequência é a mesma na produção, com os nomes `_PROD`): gerar o valor uma vez, testar no `.env` local, gravar na Vercel e no GitHub e só então invalidar o antigo; vazamento de dados pessoais, em `docs/juridico/plano-resposta-incidentes-e-direitos-titular.md`. As sondas de saúde (P1 a P6) estão em `docs/checklist-dia-d0.md`.
>
> **Fatos que mudam quando PRs pendentes forem mesclados** (ordem da migração no deploy, gate de cobrança, restrição de ref do ambiente `production`) estão registrados **uma só vez**, com a lista das seções de cada documento a atualizar, em `docs/checklist-dia-d0.md`, seção 8.1. Este runbook descreve o estado do commit `839e7176`.

---

## 1. Leia isto primeiro

1. **Reverter um PR na `main` NÃO corrige a produção.** [CÓDIGO] Push na `main` só dispara o job `staging` do `deploy.yml`. A produção só sai por tag `web-v*` ou por `workflow_dispatch`.
2. **O banco não volta.** `prisma migrate deploy` só anda para frente; não existe `down`. Rollback é de **código**. O que a migração já mudou fica (seção 5).
3. **No workflow de hoje a migração roda DEPOIS do deploy** [CÓDIGO]: o código novo passa a atender, e só então `prisma migrate deploy` roda (o checklist, Infra 9, propõe inverter; ver 8.1 do checklist do D0).
4. **Não existe modo manutenção, modo somente leitura nem gate de cobrança** no commit `839e7176` (seção 3.3). Os interruptores que existem são poucos e têm efeito colateral.
5. **A produção é pública**: o alias `shareo-prod.vercel.app` responde 200 sem login [CHECKLIST]. A Deployment Protection cobre só URLs de deployment; não serve para "fechar o site".
6. **A campanha posta os leads no alias** `shareo-prod.vercel.app` [CHECKLIST]. Nenhum passo deste runbook pode redirecionar esse endereço nem deixá-lo fora do ar sem avisar: a captação da mídia paga para junto.

---

## 2. Como a produção é publicada (o que o workflow faz de fato)

Arquivo: `.github/workflows/deploy.yml`, job `production`. [CÓDIGO]

| Gatilho | O que acontece |
|---|---|
| Push na `main` | Só o job `staging` (e o E2E). **Não toca a produção.** |
| Push de tag `web-v*` | Job `production`. Uma tag `v*` sem o prefixo `web-` **não** dispara. |
| `workflow_dispatch` | Job `production` na ref escolhida (`--ref`). Sem parâmetros. |
| Pull request | Só preview. |

**Ordem dos passos do job `production`:**

1. `vercel pull --environment=production` no projeto `VERCEL_PROJECT_ID_PROD`.
2. `vercel build --prod`, com os segredos `*_PROD` injetados. Ficam **fixos no build**: `NEXT_PUBLIC_NOINDEX=true` e `NEXT_PUBLIC_APP_URL=https://app.shareo.com.br`. `E2E_BYPASS_DISABLED=true` também é injetado aqui, mas **só o `middleware.ts` o inlina**; os handlers o leem em runtime, do painel (seção 3.2).
3. `vercel deploy --prebuilt --prod --archive=tgz`: **o código novo passa a atender aqui.**
4. `pnpm prisma generate && pnpm db:migrate:deploy`, contra `DATABASE_URL_PROD`/`DIRECT_URL_PROD`.
5. Health check em `https://app.shareo.com.br/api/health`: até 6 tentativas com 15 s de intervalo; exige HTTP 200 **e** `"status":"healthy"` no corpo.

**O que isso implica:**

- **Janela entre os passos 3 e 4.** O código novo atende com o schema antigo até a migração acabar. Se o passo 4 falhar, fica assim, e o passo 5 é pulado. Aconteceu em 24/09 (run 36002633108, erro P1013 de URL do banco) [CHECKLIST, Infra 9]. Run vermelho na produção = ir olhar, mesmo que o site pareça normal.
- **O health check é raso.** Confere `db`, `storage` e `storage_private` (`app/api/health/route.ts`); não exercita login, reserva nem checkout. Verde não prova que o app funciona.
- **Fila, não cancelamento.** O grupo de concorrência `deploy-production` tem `cancel-in-progress: false`. O comentário do próprio workflow explica o motivo (escrito para o staging, vale mais para a produção): cancelar um run pode matá-lo entre duas migrações e deixar o banco parcial. **Nunca cancele um run que já passou do passo 3.** Um `workflow_dispatch` disparado com outro run em andamento fica **pendente**, e o GitHub guarda só o pendente **mais recente** do grupo: outro dispatch, ou uma tag `web-v*`, nesse intervalo **descarta o pendente anterior sem aviso** (o mesmo comentário descreve esse descarte). **Durante um rollback por workflow não dispare nem tague nada**, e confira com `gh run list` que o run do rollback segue pendente ou em andamento; se ele entrou atrás de um deploy ruim ainda rodando, ele só começa quando esse terminar.
- **Sem aprovação.** O ambiente `production` do GitHub não tem revisores nem restrição de ref [CHECKLIST, Infra 8; `docs/README.md` ainda diz "com aprovação"]. Quem tem permissão de escrita no repositório publica com um comando, e o rollback por workflow também não pede aprovação.
- **Rebuild de ref antiga usa o `deploy.yml` daquela ref.** `gh workflow run --ref X` lê o arquivo do workflow em X. Refs anteriores ao PR #503 (`b09b92ed`) usam o health check antigo (esperava 302 na URL do deployment) e `NEXT_PUBLIC_APP_URL=https://shareo-prod.vercel.app`. Prefira refs de 24/09 (pós-#503) em diante.

---

## 3. Interruptores de emergência que existem de verdade

Levantados lendo `lib/`, `middleware.ts`, `app/api/` e `deploy.yml` neste commit. **A lista curta é o achado.**

### 3.1 Sem redeploy: chaves de `PlatformConfig` (efeito em até ~60 s)

[CÓDIGO] `lib/platform-config.ts` mantém um cache de 60 s por instância (`CONFIG_TTL_MS`); a escrita limpa o cache só da instância que a recebeu, e as outras propagam dentro do TTL. Escrever: `PATCH /api/admin/platform-config?key=<chave>` com `{"value":"true"|"false"}`, **só `ADMIN_SUPERADMIN` com sessão de 2FA**. Só algumas chaves têm formulário em `/admin` (taxa, multiplicadores de preço, raio de busca, auto-cancelamento, embaixadores); as chaves abaixo são só por `PATCH`, feito do console do navegador logado como superadmin. NÃO ENSAIADO em produção (ficha, linha 10).

| Chave | O que faz de fato | Serve de emergência? |
|---|---|---|
| `stripeConnectEnabled` | Com `false`, o onboarding Connect (`/api/stripe/connect/return`, `/refresh`, `/api/payments/stripe/connect`) responde 404 e a UI "Conectar recebimento" some. | **Parcial.** Fecha só o cadastro de novos recebedores. **Não** bloqueia checkout e **não** bloqueia o cron de repasse (que olha o `stripeConnectStatus` da conta, não a flag). |

**As demais chaves não seguram nada em emergência:** `payoutWindowDays` só vale para repasses futuros (lida ao criar o `Payout`, em `eligibleAfter`); `platformFeeRate` (pontos-base, padrão 1500; aceita 0 a 10000) e `rentalContractAcceptanceEnabled` só valem para reservas e cobranças novas; `accessLogsEnabled` (gravação de `access_logs`, Marco Civil, art. 15) não afeta o usuário e só se mexe com o jurídico. **Não mexa em `biometricConsentRequired`:** com `false` (padrão hoje) a selfie do KYC é gravada sem registrar consentimento, e desligar a chave, se ela estiver ligada, só piora esse quadro.

### 3.2 Com redeploy: variáveis do painel da Vercel + `gh workflow run deploy.yml` (~4 min, [CHECKLIST])

Variável de runtime muda só depois de um **novo deployment**. Caminho: editar no painel (nunca colar o valor em comando ou chat) e disparar o workflow (seção 4.3).

| Interruptor | Efeito real | Efeitos colaterais que pegam de surpresa |
|---|---|---|
| **Remover `STRIPE_SECRET_KEY`** (único jeito de parar cobrança hoje) | `POST /api/payments/checkout` devolve 500 `INTERNAL_ERROR` "Erro interno." (`getStripe()` lança dentro do `try`). Onboarding Connect vira 404. | (1) **Webhook:** `getStripe()` também roda na verificação, então a rota responde 400 e o pagamento já feito não é registrado enquanto a chave estiver ausente (a Stripe reenvia; por quanto tempo, NÃO ENSAIADO, ficha, linha 9). (2) **Cron de repasse:** os `Payout` PENDING elegíveis de contas Connect caem em **FAILED**, e não há caminho de volta (o cron lê só PENDING; a rota admin só aceita PROCESSING) [CHECKLIST, Pagamentos 8]. (3) **Estorno:** cancelar reserva paga não emite o estorno; só grava `refundAmount` para reprocesso manual (`lib/payments/refund.ts`). Antes de remover a chave, olhar `/admin/financeiro/repasses`: havendo `Payout` elegível, esperar o cron das 13:00 UTC rodar antes de remover a chave, ou aplicar também a linha seguinte. |
| **Remover `CRON_SECRET`** | Todos os 17 crons passam a responder 401 (`assertCronAuth`; conferido: todas as rotas de `app/api/cron/` o usam). Para o repasse. | Para **tudo**: `email-retry` (a cada 5 min), `expire-bookings`, `auto-cancel`, `reminders`, `flush-view-counts`, os purges. E-mail que falhou no primeiro envio não é reenviado. Só como última opção e por pouco tempo (ficha, linha 11). |
| `E2E_BYPASS_DISABLED=true` | **Já está ligado no build**, fixo no `deploy.yml`, mas o valor do build só vale para o `middleware.ts` (inlinado: apaga `/api/test/*` com 404). Os handlers (`withE2EGuard`) e o bypass de rate limit (`lib/rateLimit.ts`) o leem em **runtime**, do painel; `SKIP_RATE_LIMIT` e `E2E_SECRET` também. | **Nunca remova.** Sonda: `GET /api/test/enroll-admin-totp` deve dar 404 com `{"error":"Not found"}` [CHECKLIST]; ela prova o `middleware`, não o handler. Por isso confira no painel de produção os **nomes** (`E2E_BYPASS_DISABLED=true` existe; `E2E_SECRET` e `SKIP_RATE_LIMIT` não): Pagamentos 12, ficha linha 13. |
| `NEXT_PUBLIC_NOINDEX=true` | **Já está ligado**, fixo no build (`NEXT_PUBLIC_*` é inlinado). Estado seguro: `robots.txt` = `Disallow: /`. | Vale o do `deploy.yml`, **não** o do painel (o comentário no workflow explica). Trocar exige PR e novo deploy. Confira em `flags.noindex` do `/api/health`. |

### 3.3 O que NÃO existe (não improvise no meio de um incidente)

Busca (sem diferenciar maiúsculas) por `maintenance`, `manutenção`, `readOnly`, `checkoutEnabled`, `signupsEnabled` e `paymentsEnabled` em `lib/`, `app/`, `middleware.ts`, `prisma/schema.prisma` e `packages/` no commit `839e7176`: nenhuma ocorrência é interruptor da plataforma. (`stripeChargesEnabled` existe, mas espelha a capacidade da conta Connect de **cada proprietário**; não liga nem desliga nada no site.)

- **Gate de cobrança:** não existe. O checkout só depende de `getStripe()`, isto é, de `STRIPE_SECRET_KEY`. O checklist prevê o gate para D-4 (27/09), com padrão desligado. Existindo, a chave dele é o primeiro interruptor do ramo C da árvore (o que atualizar: 8.1 do checklist do D0).
- **Modo manutenção / somente leitura / página de status:** não existem.
- **Fechar o cadastro ou exigir convite:** não existe (checklist, decisão 3).
- **Pausar um único módulo** (mensagens, anúncios, reservas): não existe.
- **Deployment Protection não fecha o site.** Cobre só URLs de deployment e preview; o alias é público. O passo 1 do `docs/runbook-restauracao-backup.md` ("parar a escrita por Deployment Protection") **não funciona para o alias**. Sobra remover `DATABASE_URL` e redeployar, o que derruba o site inteiro (`/api/health` = 503) e a captação da campanha junto.
- **Pausar só o repasse:** não há chave. Um `Payout` fica retido enquanto a reserva tem disputa aberta (`disputeStatus = OPEN`), mas isso é por reserva, não global.

### 3.4 A landing da campanha é outro projeto

`shareo.com.br` e `www` servem `apps/campanha`, com projeto e deploy próprios; **não há workflow para ela em `.github/workflows/`** e ela publica direto ao mesclar na `main`, sem staging [CHECKLIST, Infra 2 e §5]. Reverter texto da landing = outro procedimento (Instant Rollback no projeto dela ou reverter e mesclar), NÃO ENSAIADO (ficha, linha 12), e independente do rollback do marketplace.

---

## 4. Como voltar atrás

Escolha o caminho pela **árvore da seção 7**, não por preferência.

### 4.0 Antes de mexer: ponto de retorno e alvo

- **Alvo = o último deployment de produção que estava saudável, posterior ao run 36073089666** (o deploy do PR #508, que pôs o prefixo de ambiente nas chaves do Redis; a razão está na seção 5). Descubra-o por:

  ```bash
  gh run list --workflow deploy.yml --limit 50 --json databaseId,headSha,headBranch,event,conclusion,createdAt \
    --jq '.[] | select(.event=="workflow_dispatch" or (.event=="push" and (.headBranch|startswith("web-v")))) | [.databaseId,.headSha[0:8],.headBranch,.event,.conclusion,.createdAt] | @tsv'
  ```

  O filtro deixa só runs de **produção** (`workflow_dispatch`, ou push de tag `web-v*`, cujo `headBranch` é o nome da tag); push na `main` é staging e pull request é preview, e eles **não** servem de alvo (o SHA nunca esteve em produção e foi construído com segredos de staging). Escolha um com `conclusion` = `success`. O último registrado no checklist (seção 0) é o run 36073089666; **confirme com o comando acima, não assuma.** Se os 50 registros não alcançarem o período que interessa, aumente o `--limit`.
- **Regra do alvo: nunca um deployment anterior à última troca de variável de ambiente.** A Vercel guarda as variáveis junto de cada deployment; um rollback volta as variáveis daquele momento (**NÃO ENSAIADO**, ficha, linha 6). A última troca **registrada** no checklist (seção 0) é a de `AUTH_URL`/`NEXTAUTH_URL` (run 36063882381), e o piso acima já é posterior a ela; **confirme no painel a data da última edição de variável** antes de escolher o alvo.
- **Marque o retorno com um nome que NÃO dispara deploy**: tag `prod-ok-AAAA-MM-DD-HHMM` (hora UTC; nunca `web-v*`, que publicaria na hora; prefixo `v*` sem `web-` também não dispara). Crie depois de cada deploy de produção que passou nas sondas: `TAG=prod-ok-$(date -u +%Y-%m-%d-%H%M); git tag $TAG <sha-do-deploy-verde>; git push origin $TAG`. A hora no nome é de propósito: o mesmo dia pode ter mais de um deploy verde (o D-2 tem deploy e ensaio de rollback; o D0 pode ter dois), e `git tag` recusa nome repetido. **Nunca force nem mova uma tag `prod-ok-*`:** isso apaga o ponto de retorno. No commit `839e7176` não existe nenhuma dessas tags (`git tag`: só `v1.x`). Tag em push não aciona a CI (`main.yml` escuta só branches).
- **Antes de reverter, veja o que a leva trouxe no banco:** `git diff --name-only <sha-em-produção> <sha-candidato> -- prisma/migrations`. Vazio = rollback de código é seguro do lado do banco. Se não, leia o SQL (seção 5).

### 4.1 Painel da Vercel (Instant Rollback) — NÃO ENSAIADO (ficha, linhas 2 a 5)

1. Painel da Vercel, **projeto de produção** (`shareo-prod`, não o `shareo` do staging: os nomes se parecem).
2. Deployments, filtrar por Production. Escolher o deployment-alvo (status Ready).
3. Menu do deployment, **Instant Rollback**, e confirmar. O que a Vercel documenta: o domínio de produção passa a servir aquele deployment sem novo build (segundos).
4. **Efeito documentado pela Vercel e a conferir no ensaio:** o rollback desliga a atribuição automática do domínio de produção. Depois dele, um `deploy --prod` novo talvez **não** assuma o alias sozinho: é preciso promover de novo (4.2). As linhas 3 e 4 da ficha (seção 8) provam ou refutam isso. Sem essa prova, não dê nenhum deploy novo sem antes olhar para onde o alias aponta.
5. Verifique com as sondas P1 a P6 (`docs/checklist-dia-d0.md`) **e prove qual deployment está atendendo** (ver 4.4, item 1).

### 4.2 CLI da Vercel — NÃO ENSAIADO (ficha, linha 7)

```bash
# Autentique na sua máquina com `vercel login`. NUNCA cole o token no comando (regra da casa).
# Aponte para o projeto DE PRODUÇÃO (ids no painel; não estão no repositório):
export VERCEL_ORG_ID=<org>  VERCEL_PROJECT_ID=<projeto-shareo-prod>

vercel rollback --help                 # confirmar a sintaxe na versão instalada (54.6.1 no workflow)
vercel rollback <url-do-deployment>    # volta a produção para esse deployment
vercel promote  <url-do-deployment>    # promove um deployment a produção (uso para "desfazer o rollback")
```

- Confira que a URL do deployment-alvo **começa com `shareo-prod-`**. Se começar com `shareo-` sem o `prod`, é o staging.
- No PowerShell, a atribuição de variável é `$env:VERCEL_ORG_ID = "..."`.

### 4.3 Refazer o deploy de uma ref conhecida (caminho que já funcionou) — ~4 min [CHECKLIST]

```bash
gh workflow run deploy.yml --ref prod-ok-2026-09-24-1830    # tag ou branch do ponto de retorno (o `--ref` do gh aceita nome de branch ou tag)
gh run list --workflow deploy.yml --event workflow_dispatch --limit 1 --json databaseId,status,createdAt,headBranch   # pegar o id
gh run watch <id>                                            # acompanhar; `gh run view <id> --log-failed` se falhar
```

O run novo leva alguns segundos para aparecer: confira que o `createdAt` é **posterior ao disparo** e que o `headBranch` é a ref que você pediu; senão o `--limit 1` devolveu o run anterior e o `gh run watch` acompanharia o run errado. Antes de disparar, veja a seção 2 (fila e descarte de pendente).

Vantagens: não depende do comportamento do Instant Rollback, roda o health check e devolve o alias ao fluxo normal. Custos: rebuilda (variáveis `NEXT_PUBLIC_*` do workflow **daquela** ref), leva minutos e roda `prisma migrate deploy` contra um banco que pode estar **à frente** da ref antiga. Nesse caso o passo pode dar erro por causa das migrações que o código antigo não conhece; **NÃO ENSAIADO**, ficha, linha 8. Não cancele o run (seção 2).

**Se o item Infra 8 (restringir o ambiente `production` a `main` + `web-v*`) for aplicado, este caminho pode ser barrado** para uma tag `prod-ok-*`; reensaie a linha 4 da ficha depois dele, e, se barrar, o ponto de retorno terá de ter um nome que o filtro aceite (a decidir junto com o Infra 8).

### 4.4 Depois do rollback

1. Sondas P1 a P6 verdes, **mais a prova de qual deployment atende** (NÃO ENSAIADO, ficha, linhas 2 e 4): `/api/health` não traz commit nem build id, e o health check do workflow mira o alias, então um rollback que não pegou (ou um alias que ficou no deployment ruim) **passa** em P1 a P6. Confira na página Domains do projeto de produção, no painel, qual deployment está atribuído a `app.shareo.com.br`, ou com `vercel inspect app.shareo.com.br` (confirme a sintaxe com `--help`). Depois, um login real e `/itens` carregando.
2. Anote no registro do incidente (modelo em `docs/juridico/plano-resposta-incidentes-e-direitos-titular.md`, 1.5): hora, quem decidiu, alvo, sintoma, o que ficou para trás.
3. **Congele novos deploys** até haver causa e correção. Um `web-v*` esquecido republica o defeito.
4. Se a leva revertida tinha migração aditiva, o schema ficou à frente do código. Anote para o próximo deploy.

---

## 5. O que NÃO volta

| O que | Por quê | O que fazer |
|---|---|---|
| **Banco de dados** | Sem migração reversa. O repositório tem 66 migrações (`prisma/migrations/`). | Compatibilidade código antigo com schema novo: ver abaixo. Restaurar backup é o último recurso e perde tudo desde o backup (RPO até 24 h; PITR não contratado; restauração nunca testada): `docs/runbook-restauracao-backup.md`. |
| **Migração destrutiva já aplicada** | O histórico tem `DROP COLUMN`/`DROP TABLE` (a mais recente: `20260824190000_remove_mercado_pago`). O código anterior a ela quebra contra o schema atual. | Regra do checklist: **nenhuma migração destrutiva depois de D-3 (28/09)**. Antes de qualquer deploy, procurar `DROP`, `RENAME`, `SET NOT NULL`, `ALTER TYPE` no SQL da leva. |
| **Arquivos do Storage** | O backup do Supabase não inclui objetos do Storage. | `node scripts/backup-manual.mjs prod` antes do D0 (Seg 10 do checklist). |
| **Stripe** | Cobranças, transferências e estornos já feitos vivem na Stripe. | Conferir no Dashboard; corrigir à mão. |
| **E-mails enviados, leads recebidos, notificações** | Efeito externo. | Registrar; comunicar quem foi afetado. |
| **Crons já executados** | O repasse roda 13:00 UTC; em 01/10 rodam também os 6 mensais. | Ver `docs/checklist-dia-d0.md`. |
| **Variáveis de ambiente** | Podem voltar às do deployment antigo (seção 4.0). NÃO ENSAIADO (ficha, linha 6). | Escolher alvo posterior à última troca. |
| **Chaves do Upstash** | Vivem no Redis compartilhado (staging e produção), separadas pelo prefixo de ambiente **desde o #508** (deploy do run 36073089666). | **Voltar a um deployment anterior a esse run** devolve a produção a chaves de views, funil e rate limit **sem prefixo**: os contadores gravados com prefixo ficam órfãos e o cron de views de cada ambiente volta a apagar as views do outro. Por isso o piso do alvo em 4.0. Dentro do período pós-#508 não há nada a desfazer; monitorar a cota. |

**Código antigo contra schema novo** funciona quando a migração é só aditiva: `CREATE TABLE`, `ADD COLUMN` nula ou com `DEFAULT`, `CREATE INDEX`. Não funciona com `DROP`, `RENAME`, `SET NOT NULL` sem default, ou remoção de valor de enum. **Compatibilidade de `migrate deploy` de ref antiga com `_prisma_migrations` à frente: NÃO ENSAIADO** (ficha, linha 8).

---

## 6. Sinais objetivos para decidir (primeiros 72 h)

O checklist pede "critério objetivo de rollback" (lacuna 4). Ponto de partida, a ajustar no ensaio (ficha, linha 14):

| Sinal | Onde ver | Limiar sugerido | Ação |
|---|---|---|---|
| `/api/health` diferente de 200 `healthy` | sonda P1 | 2 consultas seguidas, 1 min entre elas | Árvore A |
| `checks.db` ou `checks.storage*` = `error` | corpo do P1 | 1 vez, confirmado | Árvore A |
| 5xx em rota de negócio (`/api/bookings`, `/api/auth`, `/api/payments`) | Sentry | Alertas de "erro novo" e de taxa, **quando existirem** (o checklist, Infra 5, manda criá-los; não há prova de que existam) | Árvore B |
| `Payout` em FAILED | `/admin/financeiro/repasses` | Qualquer um | Árvore C |
| Fila de e-mail parada | Cron `email-retry` sem 200 no painel; `flags.email` ≠ `ok` | 2 execuções sem 200 | Árvore A/B |
| Cobrança duplicada ou split errado | Dashboard Stripe x reserva | Qualquer | Árvore C |

**Quem decide e quem executa** (checklist, Infra 19: hoje só o Roberto acessa a Vercel; sem plantão definido): os **papéis** (quem decide, quem executa o rollback, quem é acionado) e os contatos de emergência vão até 30/09 para o arquivo **fora do repositório** do item 10 de D-1 de `docs/checklist-dia-d0.md`. O repositório é público: **não escreva aqui nome, telefone nem e-mail.**

---

## 7. Árvore de decisão de 5 minutos

Relógio: **0 a 1 min** confirmar · **1 a 3 min** decidir · **3 a 5 min** executar. Verificar leva mais 5 (seção 4.4).

**Janela de 01/10:** rollback ou interruptor decidido pelo Roberto vale **mesmo entre 11:00 e 14:00 UTC** (exceção à regra 1 de `docs/checklist-dia-d0.md`). Olhe antes o painel de Cron Jobs: o que um deploy faz com um cron em andamento é NÃO ENSAIADO, então, se o cron não for a causa, prefira esperar a execução acabar; se for a causa (por exemplo o `payout` das 13:00 UTC), o ramo C2 tem prioridade.

```
0:00  Algo está errado. Rode P1 (saúde) e P6 (alias) de docs/checklist-dia-d0.md.
      |
      +-- P1 = 503 / timeout / degraded ...................................... [A]
      +-- P1 = 200 healthy, mas há bug de comportamento após um deploy ....... [B]
      +-- P1 ok e o problema é DINHEIRO (cobrança, repasse, estorno) ......... [C]
      +-- suspeita de vazamento de dados ou acesso indevido .................. [D]

[A] Saúde degradada
    A1. Houve deploy de produção nas últimas ~2 h?   (o comando de 4.0 já filtra staging
        e preview; olhe o createdAt e aumente o --limit se os 50 registros não chegarem lá)
        NÃO -> não é caso de rollback. Ler `checks` e `codes` do P1:
               db=error      -> Supabase / DATABASE_URL (o P1 mostra `dbUrl`, a impressão digital);
               storage=error com db=ok -> NEXT_PUBLIC_SUPABASE_URL de outro projeto (sintoma
                             documentado no CLAUDE.md); a URL é fixada no BUILD: corrige-se com
                             novo build, ou com rollback se o build anterior estava certo.
        SIM -> A2.
    A2. O passo "Run DB migrations on production" desse run falhou?
        SIM -> código novo + schema antigo. Opções: (i) corrigir e rodar o dispatch de novo, ou
               (ii) voltar o código (4.1/4.3). (ii) é seguro do lado do banco se NENHUMA migração
               da leva chegou a aplicar (cada uma é transação própria: confira `migrate status`).
        NÃO -> ir a [B].

[B] Bug de comportamento após um deploy
    B1. A leva trouxe migração?  git diff --name-only <em-produção> <candidato> -- prisma/migrations
        VAZIO ................................ rollback seguro -> B3
        SÓ ADITIVA (CREATE/ADD nulo/INDEX) ... rollback provavelmente seguro -> B3
        DROP / RENAME / NOT NULL / ENUM ...... NÃO reverter o código. Corrigir para frente
                                               (hotfix -> dispatch) ou decidir com o Roberto se
                                               restaura o banco (runbook de backup; perde dados).
    B3. Alvo pela regra de 4.0 (posterior ao run 36073089666 e à última troca de env). Instant
        Rollback (4.1); se falhar ou não houver alvo, refazer o deploy de uma ref conhecida (4.3).
    B4. Verificar, provando qual deployment atende (4.4). Congelar deploys.

[C] Dinheiro (NÃO reverter código como primeiro reflexo)
    C1. Cobrança errada, duplicada ou de quem não devia: parar cobranças.
        Se existir gate de cobrança (3.3): desligar a flag (~60 s).
        Senão, a única alavanca é remover STRIPE_SECRET_KEY + dispatch (3.2), com decisão
        EXPLÍCITA do Roberto, e ela tem três efeitos que não voltam sozinhos: (1) o webhook
        responde 400 e o pagamento já feito não é registrado; (2) Payout Connect elegível cai
        em FAILED, sem caminho de volta; (3) cancelar reserva paga não emite estorno (fica em
        booking.refundAmount).
    C2. Payout FAILED ou repasse errado:
        ANTES das 13:00 UTC e com repasse errado ainda PENDING: a única alavanca é remover
        CRON_SECRET + dispatch (3.2), que para os 17 crons; decisão explícita do Roberto, e o
        run leva ~4 min, então decida cedo.
        DEPOIS do cron: conferir /admin/financeiro/repasses E o Dashboard Stripe antes de
        qualquer reprocesso. Não existe ação de reprocessar FAILED (checklist, Pagamentos 8).
    C3. Estorno recusado: o valor fica em booking.refundAmount; estornar à mão no Dashboard.

[D] Dados
    Conter primeiro, rotacionando a credencial envolvida: a ENCRYPTION_KEY pelo
    docs/runbook-rotacao-encryption-key.md; qualquer outra pela ordem de rotação do item 14
    da Infra do checklist (gerar uma vez, testar local, gravar na Vercel e no GitHub, só então
    invalidar a antiga). Depois seguir docs/juridico/plano-resposta-incidentes-e-direitos-titular.md
    (Parte 1): o relógio da comunicação corre desde a ciência do incidente. Não apague evidência.
```

**Se ficar em dúvida entre reverter e consertar para frente, e a leva teve migração: conserte para frente.** Reverter código sobre schema à frente é o erro que este runbook existe para evitar.

---

## 8. Ficha do ensaio (preencher em D-2, 29/09, com só 2 usuários na produção)

O ensaio é o que transforma este documento de hipótese em runbook. Cronometre cada linha e anote o que a tela pediu. **A ordem importa:** a linha 4 só é respondível com a produção ainda em rollback, antes da linha 5 (que promove de volta).

| # | O que ensaiar | Resultado | Tempo | Observações |
|---|---|---|---|---|
| 1 | Criar a tag `prod-ok-AAAA-MM-DD-HHMM` no deploy verde e conferir que o push não dispara workflow (`gh run list`) |  |  |  |
| 2 | Instant Rollback pelo painel para o deployment anterior. **Provar qual deployment atende** (Domains no painel, ou `vercel inspect app.shareo.com.br`); P1 a P6 verdes |  |  |  |
| 3 | O rollback **desligou a atribuição automática do domínio**? (mensagem no painel) |  |  |  |
| 4 | Com a produção **ainda em rollback**: `gh workflow run deploy.yml --ref prod-ok-…` (a tag aponta o SHA que já está no ar, então reconstrói um artefato equivalente ao atual). (a) O deploy novo **assume o alias sozinho**? Provar qual deployment atende. (b) Build, migrate e health check verdes? **Duração** (a árvore da seção 7 reserva 3 a 5 min para executar, e o caminho por variável de 3.2 passa por este mesmo build). Se o Infra 8 já estiver aplicado, o ambiente barra a tag? |  |  |  |
| 5 | Promover de volta o deployment que deve ficar no ar (`Promote` no painel ou `vercel promote`); o alias voltou? (se a linha 4 já o tinha assumido, promova mesmo assim, para provar o comando) |  |  |  |
| 6 | Alvo **anterior** à troca de variável: as variáveis do deployment antigo voltam? (`AUTH_URL` no P3, links de e-mail). **Volte ao deployment bom logo depois**; não deixe a produção nesse estado |  |  |  |
| 7 | `vercel rollback --help`, `vercel promote --help` e `vercel inspect --help` na versão 54.6.1: a sintaxe das seções 4.2 e 4.4 confere? |  |  |  |
| 8 | Ref antiga com banco à frente: `migrate deploy` passa ou reclama? |  |  |  |
| 9 | Remover `STRIPE_SECRET_KEY` (**só se a chave existir na produção**): checkout dá 500 como descrito? webhook dá 400? Devolver a chave e conferir |  |  |  |
| 10 | Interruptores de `PlatformConfig` (3.1): `PATCH` de uma chave gravando o **mesmo valor** que ela já tem (status 200 e o tempo até o efeito, esperado ~60 s). Gate de cobrança **quando existir**: flipar e medir |  |  |  |
| 11 | Remover `CRON_SECRET` (**opcional**; só com o valor à mão para devolver e fora de 11:00 a 14:00 UTC): os crons dão 401? Devolver e conferir que voltaram a 200 |  |  |  |
| 12 | Landing da campanha (3.4): **só ler, não executar.** O projeto dela tem Instant Rollback? Quem tem acesso? (há mídia paga no ar: um rollback real tem efeito público) |  |  |  |
| 13 | Painel de produção, só os **nomes**: `E2E_BYPASS_DISABLED=true` existe; `E2E_SECRET` e `SKIP_RATE_LIMIT` não existem (Pagamentos 12) |  |  |  |
| 14 | Fechar: ajustar os limiares da seção 6 e o orçamento de tempo da árvore (seção 7) com o que foi medido |  |  |  |

Onde cada NÃO ENSAIADO do texto é respondido: Instant Rollback e CLI (4.1, 4.2) nas linhas 2 a 5 e 7; regra do alvo e variáveis por deployment (4.0, seção 5) na linha 6; `migrate deploy` de ref antiga (4.3, seção 5) na linha 8; efeitos colaterais de remover `STRIPE_SECRET_KEY` e `CRON_SECRET` (3.2) nas linhas 9 e 11; `PATCH` de `PlatformConfig` e propagação (3.1) na linha 10; rollback da landing (3.4) na linha 12; limiares (seção 6) na linha 14.

Ao fechar a ficha, troque os "NÃO ENSAIADO" desta página pelo resultado medido e atualize o item 10 da Infra em `docs/checklist-go-live-2026-10-01.md`.
