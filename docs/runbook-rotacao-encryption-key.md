# Runbook — rotação da `ENCRYPTION_KEY` (recifragem)

**Criado em:** 23/09/2026 · Fecha a lacuna apontada no plano de incidentes (`docs/juridico/plano-resposta-incidentes-e-direitos-titular.md`), no `ADR-005` (itens em aberto) e no RIPD (risco F-01, "rotação periódica de chaves").

> **Estado: IMPLEMENTADO E TESTADO COM FAKE EM MEMÓRIA. NÃO EXERCITADO EM BANCO REAL — nem em staging.**
> O que os testes provam: a lógica (ida-e-volta, idempotência, retomada, chave errada, dry-run que não grava, conflito, sem vazamento em log) e a *forma* das consultas ao Prisma. O que **não** provam: que o script roda contra o Postgres do Supabase (pooler, timeouts, volume). Um runbook não exercitado é hipótese escrita em prosa: o **primeiro uso deve ser um ensaio em staging**, e o resultado deve ser anotado aqui.

Arquivos: `scripts/rotate-encryption-key.ts` (CLI) · `scripts/lib/rotation-cli.ts` (argumentos, chaves, relatório) · `lib/crypto-rotation.ts` (núcleo) · `__tests__/unit/lib/crypto-rotation.test.ts`.

---

## Quando usar

- A `ENCRYPTION_KEY` vazou ou se suspeita que vazou (commit público, log, ex-colaborador, máquina perdida).
- Rotação periódica, ou saída de alguém que a conhecia.

Vazamento da chave **sem** o banco/backup não expõe nada; vazamento da chave **com** acesso ao banco expõe CPF/CNPJ e segredos TOTP. Rotacionar contém dali em diante — **não desfaz** o que já foi lido. Se houve acesso ao banco, acionar também o plano de incidentes (registro, Encarregado, avaliação de comunicação).

## O que a chave protege (levantamento em 23/09/2026)

Todas as colunas ficam em `User` (tabela `users`). Formato `iv:tag:ciphertext` em hex (AES-256-GCM), **sem id de chave** — só se descobre a chave certa tentando.

| Coluna | Grava | Lê |
|---|---|---|
| `cpfEncrypted` | `complete-registration`, `scripts/fix-incomplete-pf.ts` | `perfil/documentos`, `id-verification`, `lib/financial-export` |
| `cnpjEncrypted` | `lib/pjVerification` | `perfil/documentos`, `id-verification`, `admin/usuarios/kyb-pendentes`, `admin/users/[id]/kyb-approve`, `cron/kyb`, `lib/financial-export` |
| `cnpjResponsavelLegalEncrypted` | `lib/pjVerification` | `admin/usuarios/kyb-pendentes` |
| `totpSecretEnc` | `lib/auth/mfa` (cadastro do 2FA), `api/test/enroll-admin-totp` | `lib/auth/mfa` (login e confirmação) |

**Não** usam essa chave: os arquivos do Storage (`id-docs` é bucket privado, mas o conteúdo não é cifrado pela aplicação), `totpRecoveryHashes`, tokens de e-mail/reset (SHA-256 sem chave) e `pixKey` (texto puro no banco). Os hashes `cpfHash`/`cnpjHash` são caso à parte — ver **HMAC**, abaixo.

Um teste (`guardas contra lista desatualizada`) reprova a CI se surgir coluna `*Encrypted`/`*Enc` no schema, ou um arquivo novo que chame `encryptDocument`/`encryptPII`, sem que esta lista seja revista.

---

## Antes de começar

1. **HMAC_KEY fixada — pré-condição, não opcional.** `hashDocument` usa `HMAC_KEY || ENCRYPTION_KEY`. Se `HMAC_KEY` estiver vazia, trocar a `ENCRYPTION_KEY` troca **em silêncio** a chave dos hashes: as checagens de unicidade (`findFirst({ cpfHash })` no cadastro, `findUnique({ cnpjHash })` no `upgrade-pj`) passam a não achar ninguém e o mesmo CPF/CNPJ pode ser cadastrado de novo. Conferir em `GET /api/health` → `flags.crypto.hmac`:
   - `"ok"` → já distinta da `ENCRYPTION_KEY`; nada a fazer.
   - `"igual-a-encryption"` → está no fallback. **Antes** de rotacionar: definir `HMAC_KEY` com o valor **atual** da `ENCRYPTION_KEY` (Vercel + GitHub Secret), redeployar e reconferir `hmac: "ok"`. Nenhum dado muda. (No workflow de staging só `ENCRYPTION_KEY` é injetada — `deploy.yml`, passo de build; é provável que o staging use o fallback. Confirmar, não presumir.)
2. **Planejar a janela de manutenção.** Ela cobre **apply, troca da env e redeploy** (passos 2 a 7 abaixo); o dry-run fica fora, só lê. A aplicação lê uma chave só: entre o `--apply` e a troca da env, a versão no ar não decifra as linhas já recifradas (login de admin com 2FA e telas de documento quebram). Escolher horário sem cron relevante (`vercel.json`, em UTC: `kyb` diário 06:00; relatórios mensais no dia 1, 12:00 e 14:00 — `lib/financial-export` devolve `""` em silêncio se não decifrar) e bloquear o acesso como em `docs/runbook-restauracao-backup.md` (Deployment Protection). Não verificado se a proteção alcança as rotas de cron.
3. **Backup.** Conferir que há backup automático recente do projeto (`docs/runbook-restauracao-backup.md`: 7 diários, ~00h) e, se quiser cópia extra, `node scripts/backup-manual.mjs <staging|prod>`. Backup guardado agora continua cifrado com a chave **antiga** (ver limites).
4. **Chave nova:** `openssl rand -hex 32` (ou `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). **Guardar no gerenciador de senhas e CONFIRMAR lendo de volta** (abrir a entrada e conferir que o valor é o mesmo do env-file) **antes do `--apply`**: depois dele, os dados só abrem com esta chave, e uma chave que ninguém consegue reler é dado perdido. Não colar em chat, commit nem linha de comando.
5. **Env-file dedicado** (o nome cai em `.env*`, gitignored), com o banco do ambiente **certo** — dizer antes qual ref se espera (`zythygwvmrwrqmnrdufq` = staging, `jdxdndrhjxtkaifbpagr` = prod):

```
DATABASE_URL=...
ENCRYPTION_KEY_OLD=<a chave em uso hoje>
ENCRYPTION_KEY_NEW=<a chave nova>
```

## Passo a passo

**0. Ensaio em staging** (obrigatório da primeira vez): todos os passos abaixo no `shareo-staging`, com usuário de teste com CPF, PJ e um admin com 2FA. Anotar aqui tempo, volume e problemas.

**1. Dry-run** — só lê, não grava; pode rodar com o site no ar, antes da janela:

```
node --env-file=.env.rotacao-staging --import tsx scripts/rotate-encryption-key.ts
```

O script imprime o banco (host e ref), a impressão de cada chave (8 hex do SHA-256 — para não trocar OLD e NEW) e, por coluna, `lidos / já-na-chave-nova / a-recifrar / conflitos / falhos`. **Esperado:** `falhos=0` e `a-recifrar` > 0. Este é o teste de que `ENCRYPTION_KEY_OLD` é a chave certa: com a errada, *todas* as linhas falham (`nenhuma-chave-decifra`) e o script para ao somar 20 falhas. Exit code ≠ 0 se houver falha.

**2. Ligar a manutenção** (ver "Antes de começar", item 2) e reconferir o backup.

**3. Apply** — exige o ref do banco e a confirmação do HMAC:

```
node --env-file=.env.rotacao-staging --import tsx scripts/rotate-encryption-key.ts --apply --confirmar-banco=<ref> --hmac-fixada
```

Grava em lotes de 100, uma transação por lote, e só depois de decifrar o novo valor com a chave nova e conferir que volta ao mesmo texto. Uma linha que a aplicação alterou entre a leitura e a gravação **não** é sobrescrita (conflito). Termina com `RESULTADO: OK` (exit 0). Os contadores dizem o que o script fez; **quem diz como o banco ficou é o dry-run do passo 6.**

**4. Trocar a env** nos dois lados, como em "Trocar banco do staging exige DOIS lados" do `CLAUDE.md`:
- Vercel: variável `ENCRYPTION_KEY` (o nome que o **código** lê) nos escopos onde existe;
- GitHub Secrets: `ENCRYPTION_KEY` (staging) / `ENCRYPTION_KEY_PROD` (produção), usados em `deploy.yml`.

**5. Redeploy** (env da Vercel só vale em deploy novo) e conferir que o deploy novo está no ar (`gh run` verde + hash do deployment), não só "mesclado".

**6. Verificar** (ao vivo, não por inferência): `/api/health` → `flags.crypto.encryption: "ok"` e `hmac: "ok"`; login de um admin com 2FA (decifra `totpSecretEnc`); `/perfil/documentos` de um usuário com CPF mostra o documento mascarado; `/admin/usuarios/kyb-pendentes` mostra o responsável legal de um PJ. **E rodar de novo o dry-run do passo 1 (mesmas chaves):** deve dar `a-recifrar=0`, `falhos=0` e `já-na-chave-nova` = tudo. Se `a-recifrar` > 0, algo foi gravado com a chave antiga durante a janela — repetir o passo 3.

**7. Encerrar a manutenção.**

**8. Aposentar a chave antiga:** apagar o env-file (`.env.rotacao-*`) e remover `ENCRYPTION_KEY_OLD` de qualquer lugar. Decidir por escrito quanto tempo guardar a antiga: os backups automáticos (7 dias) e cópias em `backups/` anteriores à rotação **só abrem com ela**. Se a rotação foi por vazamento, guardar a chave vazada tem custo; destruí-la torna ilegível a restauração desses backups. Decisão do fundador/Encarregado, não do script.

## Se falhar no meio

- **Script interrompido, rede caiu, erro de banco:** nada a desfazer — cada lote é atômico e o que já está na chave nova é pulado. Rodar o passo 3 de novo. Não trocar a env até o apply terminar com `RESULTADO: OK`.
- **`falhos > 0`** (o relatório lista todos os `id` e o motivo; nenhum valor):
  - `nenhuma-chave-decifra` em **todas** as linhas → `ENCRYPTION_KEY_OLD` errada. Parar e conferir a origem da chave.
  - em **poucas** linhas → dado cifrado por outra chave (fixture antiga de staging, dado corrompido). Não há recuperação automática; decisão humana por caso: `totpSecretEnc` → `scripts/reset-admin-2fa.ts`; `cpfEncrypted`/`cnpjEncrypted` → o usuário refaz o cadastro. O script nunca apaga nada.
  - `formato-invalido` → valor que não é `iv:tag:ciphertext`; investigar a origem.
  - `ida-e-volta-divergente` → **não deveria acontecer.** Tratar como bug: não trocar a env e abrir investigação.
  - `erro-de-banco` → o lote inteiro não foi gravado; rodar de novo.
- **`conflitos > 0`:** a aplicação escreveu naquelas linhas durante a rodada; rodar de novo (com manutenção ligada não devem ocorrer).
- **Reverter uma rotação já aplicada:** a rotina é simétrica — rodar `--apply` com `ENCRYPTION_KEY_OLD` e `ENCRYPTION_KEY_NEW` **trocadas** devolve tudo à chave antiga (coberto por teste com fake; conferir as impressões antes). Se a env já foi trocada, voltar a env antiga só se o banco também voltou.
- **Sintoma depois da troca de env:** login de admin falha, documento em branco, PDF/CSV financeiro com CPF vazio → a env e o banco estão em chaves diferentes. Reconferir passos 3 e 4.

## O que este procedimento NÃO cobre

- **HMAC (`cpfHash`, `cnpjHash`).** Se a `HMAC_KEY` for distinta e **não** vazou, rotacionar a `ENCRYPTION_KEY` não os afeta. Se a `HMAC_KEY` vazou junto (ou é o fallback = a chave vazada), o índice de unicidade fica exposto: o espaço de CPF é pequeno e o HMAC é força-bruta-ável por quem tem chave e banco. Rotacioná-la exige **recalcular** os hashes: o script já decifra o CPF/CNPJ, então é viável, mas **não foi implementado** porque não é trivial nem seguro sem: (1) escrita parada — dois hashes convivendo quebram a unicidade; (2) trocar `HMAC_KEY` na mesma janela em que todo hash é reescrito (a aplicação não consulta dois hashes); (3) hash sem `Encrypted` correspondente não é recalculável (hoje a exclusão de conta zera os dois, ao contrário do que o ADR-005 descreve). Proposta: follow-up "rehash de CPF/CNPJ" reaproveitando `RotationStore`.
- **`hashToken`** (SHA-256 sem chave): não há chave a rotacionar.
- **Backups antigos** (automáticos e `backups/`): seguem cifrados com a chave antiga. Quem tem o backup e a chave vazada lê. Mitigação é expirar/apagar, não recifrar.
- **Dado já exposto.** A rotação não recupera o que foi lido antes dela.
- **Janela de manutenção — alternativa pós-D4: `ENCRYPTION_KEY_PREVIOUS`.** A aplicação lê uma chave só, por isso a janela. Um fallback de leitura (`decryptDocument` tenta a chave anterior quando a atual reprova o tag; ~10 linhas em `lib/crypto.ts`) permitiria rotacionar com o site no ar: subir a env nova com a antiga como `_PREVIOUS`, recifrar, depois retirar a `_PREVIOUS`. **Não implementado:** mexe no caminho quente de todo decrypt (login de admin, telas de documento, crons). Registrado como **gate de go-live**: decidir antes do lançamento público se a janela é aceitável em produção com usuários reais ou se o fallback entra.
- **`AUTH_SECRET`, `CRON_SECRET`, chaves do Stripe/Supabase:** outros segredos, outros procedimentos (plano de incidentes).
- **Limites não medidos:** tempo e volume em banco real, e se o pooler (`pgbouncer`) aceita as transações em lote; se falhar, tentar com a `DIRECT_URL` no env-file.
