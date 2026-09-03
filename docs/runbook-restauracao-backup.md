# Runbook — restauração de backup

**Criado em:** 02/09/2026 · Fecha o item "Backups/PITR + política de retenção + runbook de restauração" do `docs/checklist-go-live.md`.

> ⚠️ **Este procedimento nunca foi executado.** Um runbook não testado é uma hipótese
> escrita em prosa. O primeiro item da seção "Antes de precisar" existe para
> mudar isso, e deve ser feito **em staging**, com calma, antes de qualquer
> incidente.

---

## O que está protegido, medido em 02/09/2026

Conferido no painel do `shareo-prod` (`jdxdndrhjxtkaifbpagr`):

| | Estado |
|---|---|
| Backups do banco | **7 diários**, físicos, ~00h do fuso da região |
| Retenção | **7 dias** (incluída no plano Pro; nada a configurar) |
| Janela de perda (RPO) | **até 24 horas** |
| PITR | **não contratado** — reduziria o RPO a ~2 min por ~US$ 100/mês + compute Small |
| **Objetos do Storage** | ❌ **NÃO entram no backup** |

---

## 🔴 O buraco que importa: as fotos das reservas não têm backup nenhum

O aviso do painel é literal: *"Database backups do not include objects stored via the Storage API"*. O banco guarda só os **metadados** — o caminho do arquivo —, e o Supabase **não oferece backup nativo de Storage**; é responsabilidade do cliente.

Três buckets, com consequências bem diferentes:

| Bucket | Se perder |
|---|---|
| `booking-photos` | 🔴 **Grave.** São as fotos de check-in e check-out — a **base de prova das disputas**. Sem elas, a equipe decide mediação sem evidência, e não consegue justificar uma decisão já tomada. |
| `id-docs` | 🟠 Trilha de verificação de identidade. A perda não prejudica o usuário (é PII que a LGPD manda minimizar), mas apaga o lastro do KYC. |
| `item-images` | 🟢 Anúncios ficam sem foto; recuperável pedindo reenvio aos proprietários. |

**Consequência prática de uma restauração:** o banco volta ao estado de até 24h atrás, e os arquivos do Storage **não voltam**. Se um arquivo foi apagado depois do backup, o banco restaurado vai apontar para um caminho que não existe mais — link quebrado, não erro visível.

**Ação em aberto:** não existe rotina de cópia dos buckets. Antes do go-live, decidir entre (a) job periódico copiando `booking-photos` e `id-docs` para armazenamento externo, ou (b) aceitar o risco por escrito. Hoje o risco é pequeno porque o volume é pequeno; com locações reais, `booking-photos` vira o ativo probatório da plataforma.

---

## Backup manual — o que cobre o buraco do Storage

```bash
node scripts/backup-manual.mjs prod
```

Uma vez por máquina, antes: `npx supabase login` (abre o navegador).

🪤 **Node, não shell.** No Windows, `bash` resolve para o WSL
(`C:/Windows/system32/bash.exe`), que nesta máquina **não tem distribuição
instalada** — um script `.sh` falharia com uma mensagem sobre a Microsoft Store.
O `.mjs` roda igual no PowerShell e no Git Bash.

O script baixa, numa pasta datada em `backups/`:

1. **Schema do banco** (`schema.sql`) — o que recria a estrutura num banco vazio
2. **Dados do banco** (`dados.sql`, com `COPY` em vez de `INSERT`)
3. **Os três buckets** do Storage — a parte que o backup automático **não** cobre

Ele **exige** dizer `staging` ou `prod`, de propósito: os dois refs se parecem
(`zythy…` e `jdxd…`) e já houve confusão entre ambientes.

⚠️ **`backups/` está no `.gitignore`, e precisa continuar.** O repositório é
público e a pasta contém dump do banco e o bucket `id-docs` — documentos de
identidade de usuários reais.

⚠️ **O backup cria uma cópia de dados pessoais fora do ambiente controlado.**
A pasta contém `id-docs` — documentos de identidade e selfies de usuários
reais — e o dump do banco, com e-mails, telefones, endereços e CPF cifrado.
Pela LGPD o ShareO segue sendo o controlador desses dados onde quer que eles
estejam, inclusive numa pasta de Downloads. Portanto: não deixar em pasta
sincronizada com nuvem pessoal, guardar em disco cifrado se for reter, e apagar
quando não precisar mais.

⚠️ **Uma cópia só, num equipamento só, é frágil.** Não pelo motivo genérico de
"não guardar junto do original" — o original está no Supabase e a cópia no seu
computador, já estão separados. É porque se aquele equipamento morrer, o backup
morre junto. O que resolve é redundância da cópia, não distância do original.

**Estado:** o script nunca foi executado ponta a ponta — falta credencial de
quem tem acesso ao painel. Verificado até onde dá sem ela: a CLI aceita a forma
dos comandos e para na autenticação. Na primeira execução, anotar aqui quanto
tempo levou e o tamanho gerado.

---

## Antes de precisar (fazer agora, não no incidente)

1. **Testar uma restauração no staging.** Escolher um backup, restaurar, e anotar aqui: quanto tempo levou, se o projeto ficou indisponível, e o que a tela pediu de confirmação. **Sem isso, os passos abaixo são suposição.**
2. Conferir se o `shareo-staging` (`zythygwvmrwrqmnrdufq`) também mostra os 7 diários.
3. Anotar quem tem acesso ao painel do Supabase — restaurar exige essa conta, e num incidente ninguém quer descobrir que só uma pessoa tem.

---

## Se o banco for corrompido ou perdido

1. **Parar a escrita antes de restaurar.** Em Vercel → projeto → Settings → Deployment Protection, ou removendo a `DATABASE_URL`. Restaurar com a aplicação recebendo tráfego mistura dados novos com dados antigos.
2. **Supabase → projeto → Database → Backups.** Cada linha tem um botão **Restore**. Escolher o backup **anterior ao incidente**, não o mais recente — o mais recente pode já conter o estrago.
3. Confirmar na tela. **Ler o que ela diz antes de aceitar**: é aqui que se descobre se a operação é destrutiva e quanto tempo leva. Anotar neste runbook depois.
4. **Rodar `pnpm prisma migrate status`** contra o banco restaurado. Backup antigo pode estar numa migração anterior à do código em produção — nesse caso, `migrate deploy` antes de liberar tráfego.
5. **Conferir o `/api/health`**: `db` e `storage` devem voltar `ok`.
6. **Reabrir o tráfego** e avisar quem estava usando. Reservas criadas na janela perdida **não voltam** — é preciso decidir o que comunicar aos envolvidos.

---

## Se for perda de arquivos do Storage

Não há restauração. Os arquivos não estão em backup nenhum.

O que dá para fazer: identificar as reservas afetadas (`BookingPhoto`, `Booking.disputeStatus`) e pedir reenvio às partes enquanto a locação estiver viva. Depois de encerrada, a prova está perdida — e é exatamente por isso que o item de backup de Storage está em aberto acima.

---

## O que este runbook NÃO cobre

- **PITR**, porque não está contratado. Se for contratado antes do go-live, os passos mudam: a restauração passa a ser por horário, não por backup diário.
- **Restauração para projeto novo** (migração ou self-host). É outro procedimento, com backup lógico.
- **Edge Functions, configurações de Auth e Realtime**, que segundo a documentação precisam ser recriados à mão numa migração — irrelevante numa restauração no mesmo projeto, relevante se o projeto for recriado.

---

## Fontes

- [Database Backups | Supabase Docs](https://supabase.com/docs/guides/platform/backups) — retenção por plano, PITR, exclusão do Storage
- [Restore Dashboard backup | Supabase Docs](https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore) — procedimento para backup lógico
