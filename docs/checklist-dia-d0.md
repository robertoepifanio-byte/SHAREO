# Checklist do D-2 ao D0 (29/09 a 01/10/2026)

**Criado em:** 24/09/2026 (D-7), sobre o commit `839e7176` · Esta página **ordena e dá as sondas**. A fonte de cada item e o seu estado estão em `docs/checklist-go-live-2026-10-01.md` (aqui: "Infra 13" = item 13 da tabela de Infra do Anexo; "Seg", "Prod" e "Pag" idem para Segurança, Produto e Pagamentos; "§N" = seção N **do checklist principal**, não desta página: "§6" é o calendário). Reverter um deploy: `docs/runbook-rollback-deploy.md`. Smoke de 15 passos: `docs/roteiro-smoke-d0.md`.

> **Estado: a sequência é NÃO ENSAIADO** (ninguém a percorreu; o ensaio é o D-2). As **sondas** da seção 3 foram validadas em 24/09/2026 segundo o registro do checklist principal (seção 0 e PRs #503, #505, #507 e #508); esta página **não as reexecutou** e não hospeda evidência nova. O que é **inferência minha** (derivada do código, não visto rodar) vem marcado **[INFERIDO]**, e a ordem dos passos públicos do D0 é **proposta minha, NÃO ENSAIADO**.
>
> **Donos** são os do checklist principal: **Roberto**, **técnico** ou **Roberto + técnico**. Quem cobre plantão, suporte e disputa (escala das 72 h) **ainda não está definido** (checklist, Infra 19 e lacuna 4); este documento deixa o campo em branco de propósito.

---

## 1. Endereços

| Endereço | O que é | Cuidado |
|---|---|---|
| `https://app.shareo.com.br` | **Domínio público do marketplace** (CNAME na GoDaddy, certificado da Vercel; no ar em 24/09). É o que o usuário acessa, o que o health check do deploy testa e onde fica o webhook da Stripe (`/api/webhooks/stripe`). | Nunca trocar NS do domínio (quebra e-mail). |
| `https://shareo-prod.vercel.app` | **Alias de produção** que a landing da campanha usa para postar leads (`NEXT_PUBLIC_SHAREO_API_URL`; decidido em 24/09: fica assim). Público, sem login. | **Não pode redirecionar** para outro domínio: o preflight CORS da campanha falha com redirect e a Stripe não segue redirect em webhook (checklist, contradição 3). |
| `https://staging.shareo.com.br` | **Staging** (banco `zythy…`), pelo domínio custom público: é por ele que o workflow testa o staging. Nunca produção. | `shareo-rouge.vercel.app` é a URL do projeto de staging e pode estar atrás de Deployment Protection (401/302): **não use como sonda**. |
| `https://shareo.com.br` e `www` | **Landing da campanha** (`apps/campanha`, projeto próprio). Publica direto ao mesclar, sem staging. | Mexer nela com mídia paga no ar tem efeito público imediato. |

## 2. Regras do dia

1. **Nenhum deploy de produção entre 11:00 e 14:00 UTC** (08:00 a 11:00 BRT) nos dias D-1 e D0 (§6; decisão 11). Nessa janela rodam crons de `vercel.json` (ver seção 6). **Exceção:** um rollback ou um interruptor de emergência decidido pelo Roberto vale dentro da janela (árvore da seção 7 do `docs/runbook-rollback-deploy.md`); antes, olhe o painel de Cron Jobs para saber se algum cron está em execução.
2. **Passo com efeito público só com instrução explícita do Roberto** (CLAUDE.md): tag `web-v*`, Stripe live, apontar domínio, convidar leads, publicar a copy da campanha. Publicar por tag **não pede aprovação** no GitHub (Infra 8), então a regra é de processo, não de sistema.
3. **Freeze desde o fim de 28/09.** Depois disso só correção crítica aprovada pelo Roberto; o resto vira risco aceito por escrito (§6).
4. **Ref primeiro.** Antes de qualquer consulta ao banco ou script em produção, dizer em voz alta o ref esperado: produção é `jdxd…`, staging é `zythy…`. Credencial nunca inline no comando (`--env-file`).
5. **Sondas só com `GET`/`OPTIONS`/`HEAD`.** Nada de `POST` em produção fora de um passo do smoke.
6. **No PowerShell use `curl.exe`** (o alias `curl` é o `Invoke-WebRequest`) e, nos comandos com `/dev/null`, troque por `NUL`.

---

## 3. Sondas P1 a P6

Repita-as **depois de cada deploy** (ensaio, tag, correção) e às 08h do D0. Todas só leem. **São o paliativo manual** até o item Infra 22 do checklist (virar um passo de smoke pós-deploy no workflow, com falha automática): enquanto ele não existir, ninguém é avisado se uma sonda divergir depois de um deploy, a não ser quem se lembrar de rodá-las. O critério de "saudável" do P1 (HTTP 200 e `"status":"healthy"` no JSON compacto) tem **uma fonte**, o passo "Post-deploy health check" do job `production` do `deploy.yml`; se um dos dois mudar, mude o outro.

### P1. Saúde

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://app.shareo.com.br/api/health
```

Esperado (JSON compacto, mesma forma que o passo do workflow procura com `grep`):

| Campo | Valor esperado | Se diferente |
|---|---|---|
| HTTP | `200` | `503` = `status:"degraded"`: ler `checks` e `codes` |
| `status` | `"healthy"` | ver acima |
| `checks.db`, `checks.storage`, `checks.storage_private` | `"ok"` nos três | `error` em `db` traz também `dbUrl` (impressão digital da connection string); `db` ok + `storage` erro = `NEXT_PUBLIC_SUPABASE_URL` de outro projeto |
| `flags.upstash` | `"ok"` | `sem-chave` (variáveis ausentes), `erro-rede`, `erro-resposta` ou `erro-<http>` (`erro-401` = token recusado): o rate limit cai para memória por instância, em silêncio |
| `flags.upstashNs` | produção começa com `jdxd`; staging com `zythy` | `"local"` = a URL do Supabase do build está fora do padrão e os dois ambientes voltam a dividir chaves do Redis |
| `flags.email` | `"ok"` | `sem-chave` = `RESEND_API_KEY` não chegou ao runtime (só diz isso; não prova o plano nem a entrega) |
| `flags.crypto` | `{"encryption":"ok","hmac":"ok"}` | `ausente`, `tamanho-invalido` ou `igual-a-encryption` |
| `flags.noindex` | `true` enquanto a produção ficar fora do índice | `false` sem decisão do Roberto = site indexável por engano |

Rode contra **três** endereços: `app.shareo.com.br`, `shareo-prod.vercel.app` (mesmo `upstashNs` de produção) e `staging.shareo.com.br` (`upstashNs` de staging; use o domínio custom, não `shareo-rouge.vercel.app`, que pode dar 401/302 por Deployment Protection e não diria se o defeito é do staging). **Não martele:** o `PING` do Upstash é cacheado por 5 min por instância, mas a cota do plano free é compartilhada entre staging e produção (checklist, seção 0: monitorar toda semana).

### P2. Categorias

```bash
curl -sS https://app.shareo.com.br/api/categories | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.length))"
```
```powershell
(curl.exe -sS https://app.shareo.com.br/api/categories | ConvertFrom-Json).data.Count
```

Esperado: **`6`** (os seis slugs de `prisma/seed.ts`: `ferramentas`, `eletronicos`, `casa-jardim`, `construcao`, `esporte`, `festas`). `0` = as categorias sumiram ou nunca foram inseridas: ninguém consegue anunciar (Seg 4).

### P3. Provedores de autenticação

```bash
curl -sS https://app.shareo.com.br/api/auth/providers
```

Esperado: cada `signinUrl` e `callbackUrl` começa com **`https://app.shareo.com.br/api/auth/`**. Host `shareo-rouge.vercel.app` = `AUTH_URL`/`NEXTAUTH_URL` ausentes no runtime: os e-mails de verificação e de "Esqueci a senha" e os retornos do Stripe vão para o staging (`lib/app-url.ts`).

*Controle extra **[INFERIDO]**, não validado em 24/09:* repita contra `shareo-prod.vercel.app`. Se `AUTH_URL` for o que manda, a resposta continua trazendo `app.shareo.com.br`.

### P4. Preflight CORS da campanha

```bash
curl -sS -i -X OPTIONS https://shareo-prod.vercel.app/api/founders/leads -H "Origin: https://shareo.com.br" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
curl -sS -i -X OPTIONS https://app.shareo.com.br/api/founders/leads      -H "Origin: https://shareo.com.br" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
```

Esperado nos **dois** endereços: **`204`**, `access-control-allow-origin: https://shareo.com.br`, `access-control-allow-methods: POST, GET, OPTIONS`, `access-control-allow-headers: Content-Type` e `vary: Origin`. Qualquer `3xx` = alguém pôs redirect no alias; `403` = a origem não está em `CAMPANHA_ORIGINS` (lista do runtime, `lib/cors-campanha.ts`). Se a sonda falha, a captação da mídia paga para.

*Controle negativo **[INFERIDO]** do código (`respostaPreflight`), não validado em 24/09:* repita com `-H "Origin: https://exemplo.invalid"`. Esperado `403`. Uma sonda que responde 204 para qualquer origem seria CORS aberto (`*`), que a rota proíbe de propósito.

### P5. HTTP redireciona para HTTPS

```bash
curl -sSI http://app.shareo.com.br/api/health
```

Esperado: **`308`** com `Location: https://app.shareo.com.br/api/health`.

### P6. O alias não redireciona

```bash
curl -sS -o /dev/null -w "%{http_code} redirect=[%{redirect_url}]\n" https://shareo-prod.vercel.app/api/health
```

Esperado: `200 redirect=[]`. Qualquer `3xx` ou `redirect` preenchido quebra a campanha e o webhook da Stripe (seção 1).

---

## 4. D-2 · terça 29/09 · ensaio geral

Objetivo (§6): provar deploy, rollback e o smoke **enquanto a produção só tem 2 usuários**.

| # | Ação | Dono | Pronto quando | Ref. |
|---|---|---|---|---|
| 1 | Confirmar o freeze: sem PR de código aberto pedindo entrada; anotar o **SHA candidato** da `main`. | técnico | SHA anotado; `gh run list --commit <sha>` com CI verde | §6 D-3; Infra 15 |
| 2 | Ver o que a leva traz no banco: `git diff --name-only <sha-em-produção> <sha-candidato> -- prisma/migrations` e ler o SQL. **Nenhuma migração destrutiva** (`DROP`, `RENAME`, `SET NOT NULL`) depois de D-3. | técnico | Lista de migrações e classificação (aditiva/destrutiva) escrita | Infra 9 e 15; runbook de rollback, seção 5 |
| 3 | Confirmar no painel do Supabase de produção que existe o **backup do dia**, antes de um deploy com migração. | Roberto | Print ou data do backup anotada | Seg 15 |
| 4 | **Ensaio de deploy**: `gh workflow run deploy.yml --ref main`, acompanhar com `gh run watch <id>`. Cronometrar. | Roberto + técnico | Passos build, deploy, migração e health check verdes; duração anotada (a ordem da migração no workflow muda com o Infra 9: ver 8.1) | §6; Infra 9 e 10 |
| 5 | Repetir **P1 a P6** contra a produção depois do ensaio. | técnico | Seis sondas conforme a seção 3 | Infra 22 |
| 6 | **Ensaio de rollback e de interruptores**: a ficha da seção 8 do `docs/runbook-rollback-deploy.md` **inteira** (rollback, refazer por ref, `PlatformConfig`, gate de cobrança `billingEnabled`, que só age com chave live, `STRIPE_SECRET_KEY` só se a chave já existir na produção), com a tag `prod-ok-2026-09-29-HHMM` criada no deploy verde. A ficha é a única fonte do procedimento. | Roberto + técnico | Ficha preenchida, com efeito e tempo de cada interruptor; sondas verdes depois de voltar e depois de avançar | Infra 10; §6; Pag 2 |
| 7 | **Smoke de 15 passos** em produção. Registrar antes o estado da cobrança. Apagar o que der (seção 3 do roteiro). O passo 1 do smoke só acrescenta `/api/stats` às sondas: se P1 a P6 acabaram de rodar, não as repita. | Roberto + técnico | Ficha do roteiro preenchida; nada `[TESTE D0]` ativo no fim | Prod 22 |
| 8 | **Restauração do banco ensaiada num projeto descartável** (não no staging), cronometrada. | Roberto + técnico | Tempo e passos anotados em `docs/runbook-restauracao-backup.md`; **projeto descartável apagado no mesmo dia**, com data e hora anotadas (esquecido, custa ~US$10/mês e guarda uma cópia de dados pessoais, incluindo KYC, fora do controle) | §6; Infra 12; Seg 15 |
| 9 | **Recifragem da `ENCRYPTION_KEY` (#500)**: mesclar depois de ensaiar em staging, ou **adiar por escrito**. Até lá, não trocar a chave em produção. | Roberto | Decisão registrada | Seg 14 |
| 10 | **Roteiro único do dinheiro**, na ordem: categorias, chave e webhooks live, 1ª locação assistida, estorno, só então abrir. Depende da decisão 1 (escopo do D0). | Roberto + técnico | Ordem e datas escritas, ou cobrança declarada fechada | §6; §4 contradição 5; Pag 10 |
| 11 | **Preparar (sem publicar)** a home, `/pilotos/*` e a campanha em tempo presente. A campanha só publica no minuto do anúncio. | Roberto + técnico | Rascunhos prontos; nada no ar | Prod 6 |
| 12 | Definir quem abre `/admin/disputas`, `/admin/verificacoes` e `/admin/usuarios/kyb-pendentes`, quem lê `suporte@` e o horário; escrever o runbook de estorno recusado e chargeback. | Roberto | Nomes e horário escritos; SLA publicado relaxado se ninguém cumpre | Prod 13; Pag 11 |
| 13 | `pnpm audit --prod` e conferir as restrições do token Mapbox (domínio final e alias). | técnico / Roberto | Resultado do audit anotado; mapa carrega em `/itens?view=map` | Seg 18; Infra 18 |

## 5. D-1 · quarta 30/09 · deploy final

| # | Ação | Dono | Pronto quando | Ref. |
|---|---|---|---|---|
| 1 | Confirmar o SHA congelado e a CI verde nele; conferir a tag **`web-v1.14.0`** (número decidido pelo Roberto em 25/09; `package.json` ainda diz `1.13.0`, alinhar antes da tag, e a última tag é `v1.13.0`). | Roberto + técnico | `package.json` e tag com o mesmo número; CI verde | Infra 15 |
| 2 | Rodar **um** backup do Storage de produção: `node scripts/backup-manual.mjs prod` (a pasta tem documentos de identidade: guardar cifrado, não em nuvem pessoal sincronizada). | Roberto | Backup feito; destino registrado | Seg 10; Infra 11 |
| 3 | **Deploy final por tag** `web-v*` no SHA congelado, **fora de 11:00 a 14:00 UTC**. Só com a instrução explícita do Roberto: **publica em produção na hora, sem aprovação.** | Roberto | Run verde nos passos de build, deploy, migração e health check do job `production` | §6; Infra 15 |
| 4 | Repetir **P1 a P6**; comparar com o ensaio de D-2. Criar `prod-ok-2026-09-30-HHMM` (hora UTC) no deploy verde. | técnico | Seis sondas conforme a seção 3 | Infra 22 |
| 5 | **Reconferir os crons** no painel de Cron Jobs da Vercel: `email-retry`, `expire-bookings`, `auto-cancel`, `reminders` e `kyb` com **200** nas últimas execuções. | Roberto | Cinco crons com 200 | Infra 13 |
| 6 | Reconferir os textos legais: `/termos`, `/politicas` e `/privacidade` em produção depois do último deploy. | técnico | Razão social, CNPJ e Encarregado presentes nas três | Prod 20 |
| 7 | **Selfie do KYC**: aplicar a decisão 5 (texto aprovado e `biometricConsentRequired` ligada, ou o caminho da selfie desligado). | Roberto + técnico | Estado escrito e testado no site e no app | Seg 7 |
| 8 | **Registros de acesso** (`accessLogsEnabled`): ligar em produção (superadmin, com 2FA) e provar a 1ª linha depois de um login de teste, **ou** ajustar a Política. | Roberto + técnico | 1ª linha em `access_logs`, ou Política ajustada | Seg 8 |
| 9 | **Comunicar ao time e aos testadores:** produção é outro banco; contas do staging não migram; onde reportar bug; ninguém testa com cartão real sem combinar. | Roberto | Mensagem enviada | §6; §5 lacuna 1 |
| 10 | Escala das primeiras 72 h **publicada**: quem olha Sentry, Dashboard da Stripe, `suporte@` e `/admin/financeiro/repasses`, em que horário, e quem executa o rollback (hoje só o Roberto acessa a Vercel). | Roberto | Nomes e contatos de emergência em arquivo **fora do repositório** | Infra 19; lacuna 4 |
| 11 | **1ª locação real assistida**, aqui **ou** de D+3 a D+7, conforme a decisão 1. | Roberto + técnico | Conforme `docs/guias/roteiro-teste-stripe-ponta-a-ponta.md` e Pag 10 | §6 |

## 6. D0 · quinta 01/10 · só passos de efeito público

**Antes de tudo**, o Roberto dá o **go/no-go**: sondas P1 a P6 verdes, smoke de D-2 aprovado, estado da cobrança registrado, escala das 72 h publicada, ficha de rollback preenchida. Sem os cinco, não há passo público.

| Hora BRT (UTC) | Ação | Dono | Observação |
|---|---|---|---|
| 08:00 (11:00) | Repetir **P1 a P6** e os **passos 1 a 4 do smoke** (com uma conta nova `[TESTE D0]`; apagar depois). O passo 1 do smoke só acrescenta `/api/stats` às sondas: não as leia duas vezes. | Roberto + técnico | Coincide com os crons de 11:00 UTC. É leitura; não há deploy aqui. |
| Depois do go/no-go | **Cada passo público abaixo pede uma instrução explícita e separada do Roberto.** A ordem é **proposta desta página** (o checklist não ordena esses passos: lacuna 7). | Roberto | |
| a | *(só se decidido)* **Stripe live**: chave live e os dois webhooks no runtime da Vercel, novo deploy, `flags` e sonda conforme o roteiro do dinheiro. | Roberto + técnico | Vem primeiro para o 1º convidado poder pagar. Estado da cobrança volta ao campo do smoke. |
| b | **Convidar os 7 leads**, envio manual e conferido. | Roberto | Antes da campanha: o e-mail de boas-vindas prometeu acesso antecipado (Prod 11). O checklist diz D-1 no item de Produto e D0 no §6; vale o §6 (precedência das seções 1 a 7). Resend Pro antes (Infra 4). |
| c | **Publicar a copy nova da campanha**, com CTA para o cadastro do app. | Roberto | Por último: é o passo que traz tráfego pago ao funil. Publica direto, sem staging. |
| d | **Fora do D0** (decidido pelo Roberto em 25/09): o `noindex` fica **ligado** no D0; desligar `NEXT_PUBLIC_NOINDEX` só na abertura por cidade, depois das 72 h estáveis. Quando chegar: PR no `deploy.yml`, tag, e conferir `flags.noindex=false`, `robots.txt` com `Allow` e ausência da meta `noindex`. | Roberto + técnico | Exige **outro** deploy: respeitar a janela 11 a 14 UTC. No D0 o P1 continua esperando `flags.noindex=true`. |
| Fim do dia | Repetir P1 a P6; olhar Sentry; conferir cadastros novos e o funil de leads. | técnico | |

**Crons do dia 1** (`vercel.json`; a Vercel dispara os crons em UTC). Em 01/10 rodam, além dos diários, **os seis mensais**:

| UTC | BRT | Cron |
|---|---|---|
| 02:00 | 23:00 de 30/09 | `purge-admin-logs` (mensal) |
| 03:00 | 00:00 | `purge-fiscal-records`, `purge-consent-ips` (mensais) |
| 11:00 | 08:00 | `reminders` (diário), `ambassador-decay` (mensal) |
| 12:00 | 09:00 | `monthly-report` (mensal) |
| 13:00 | 10:00 | `payout` (diário): **esperado `processed: 0` se não houver locação real paga com repasse elegível**. Senão, o contador sobe (ele conta tanto o Transfer Connect quanto o repasse PIX manual em `PROCESSING`); confira cada `Payout` em `/admin/financeiro/repasses` e no Dashboard Stripe. A locação assistida (D-1, item 11), prevista com `payoutWindowDays` = 0 (checklist, §4), faria este cron mover **dinheiro de verdade** |
| 14:00 | 11:00 | `intermediation-report` (mensal) |

## 7. D+1 · sexta 02/10 · o dia seguinte

| # | Ação | Dono | Pronto quando | Ref. |
|---|---|---|---|---|
| 1 | Conferir os **6 mensais** de 01/10 no Sentry e nos logs da Vercel. | Roberto | Seis execuções sem erro | Infra 13 |
| 2 | Repetir P1 a P6. Conferir a **cota do Upstash** (o uso passa por staging e produção; a decisão de 24/09 é migrar de plano quando chegar a 90%). | técnico | Uso anotado | §0 (linha do Upstash) |
| 3 | Revisar a escala de 72 h com o que apareceu. | Roberto | Ajustes escritos | Infra 19 |

---

## 8. Divergências entre as fontes, e como esta página resolveu

| Divergência | Resolução aqui |
|---|---|
| Convidar leads: Prod 11 diz D-1; §6 diz D0. | **D0**, pela regra "seções 1 a 7 valem" do checklist. |
| Restauração do banco: Infra 12 diz staging; §6 diz projeto descartável. | **Projeto descartável**, pelo §6. |
| Backup do Storage: Infra 11 diz D0; Seg 10 diz antes do D0. | **D-1** (antes). |
| Ordem da migração no deploy: o checklist (Infra 9) propõe migrar **antes**; o `deploy.yml` de `839e7176` migra **depois**. | Vale o arquivo. Ao mesclar o PR, ver 8.1. |
| README de `docs/` diz que a tag `web-v*` roda produção "com aprovação". | O ambiente `production` do GitHub não tem revisores (Infra 8). Vale o checklist. |

### 8.1 Fatos provisórios: onde mudar quando o PR pendente for mesclado

O estado provisório fica **só aqui**. Os procedimentos dos outros documentos descrevem o commit `839e7176` e não repetem "quando mesclar, atualize": quem mesclar um destes PRs percorre a linha correspondente.

| Fato de hoje (`839e7176`) | O que o muda | O que atualizar |
|---|---|---|
| A migração roda **depois** do deploy. | Infra 9 (D-4). | **Runbook de rollback:** seção 1 (item 3), seção 2 (ordem dos passos e "janela entre os passos 3 e 4"), árvore A2 (seção 7), seção 4.3 (`migrate deploy` contra banco à frente), seção 4.4 (item 4) e seção 5. **Esta página:** D-2 item 4. |
| O ambiente `production` do GitHub aceita qualquer ref. | Infra 8 (restringe a `main` + `web-v*`). | **Runbook de rollback:** seção 2 (bullet "Sem aprovação"), seção 4.3 (nota do filtro) e ficha, linha 4 (reensaiar `--ref prod-ok-…`). **Esta página:** a linha do README, acima. |

## 9. Decisões que continuam abertas e travam esta sequência

1. **Escopo do D0 e cobrança** (decisão 1): define o passo 11 do smoke, o item 10 de D-2 e o item **a** do D0.
2. ~~Número da tag~~ **Decidido em 25/09:** `web-v1.14.0`.
3. **Escala e contatos das 72 h** (nomes; contatos fora do repositório).
4. ~~`noindex` no D0 ou na abertura por cidade~~ **Decidido em 25/09:** ligado no D0; desligar na abertura por cidade, depois das 72 h estáveis (item **d** do D0).
5. **Quando abrir a cobrança.** O gate `billingEnabled` já está no ar (#510, `b17c1308`; padrão fechado com chave live, documentado no runbook, seção 3.1). Falta decidir o momento (decisão 1) e ensaiar o interruptor (ficha do runbook, linha 10). Com chave de teste ele não age.
