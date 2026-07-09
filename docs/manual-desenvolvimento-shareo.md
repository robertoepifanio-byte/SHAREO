# Manual de Desenvolvimento do ShareO — Guia do Roberto

> **Para quem é isto:** você, Roberto — fundador que **conduz** o desenvolvimento do ShareO
> conversando com o Claude Code, sem escrever código diretamente. Este guia reúne as
> **regras que nunca se quebram**, o **fluxo de trabalho**, o que você precisa saber de
> **arquitetura** pra dirigir bem, e as **armadilhas** que já morderam o projeto — pra você
> saber o que exigir, o que lembrar ao Claude, e o que desconfiar.
>
> **Como está organizado:** começa pelas regras inegociáveis (§1). Depois o ciclo do dia a
> dia (§2), ambientes/deploy (§3), arquitetura (§4), o app mobile (§5), banco (§6), e o
> capítulo mais "seu" — **como trabalhar com o Claude** (§7). No fim, um **catálogo de
> armadilhas** pra consulta rápida (§8) e as referências (§9).
>
> _Fonte: síntese de `CLAUDE.md`, dos ~60 aprendizados na memória do projeto, dos ADRs e
> dos docs. Última revisão: 2026-07-09._

---

## Sumário

1. [As regras que nunca se quebram](#1-as-regras-que-nunca-se-quebram)
2. [O ciclo de desenvolvimento](#2-o-ciclo-de-desenvolvimento)
3. [Ambientes, deploy e releases](#3-ambientes-deploy-e-releases)
4. [Arquitetura essencial](#4-arquitetura-essencial)
5. [Desenvolvimento mobile (o app Android)](#5-desenvolvimento-mobile-o-app-android)
6. [Banco de dados e migrations](#6-banco-de-dados-e-migrations)
7. [Trabalhando com o Claude Code](#7-trabalhando-com-o-claude-code)
8. [Catálogo de armadilhas (consulta rápida)](#8-catálogo-de-armadilhas-consulta-rápida)
9. [Referências](#9-referências)

---

## 1. As regras que nunca se quebram

Estas são inegociáveis. Se um agente (ou você) estiver prestes a violar uma, **pare**.

### 🔴 1.1 D4 — nada de produção antes do parecer jurídico
**Regra:** nenhuma atividade de produção (criar Supabase de produção, deploy live, apontar
o domínio `shareo.com.br`, ativar Mercado Pago/Stripe live, captar usuários reais, empurrar
a tag `web-v1.12.0`) acontece **antes** do sign-off formal do D4 **e** da validação total do
staging.
**Por quê:** o D4 (consulta jurídica sobre o modelo de pagamento) é o **único bloqueador** de
go-live. Mesmo com o parecer FORMAL recebido, ainda faltam: contrato Mercado Pago + conta PJ
ativa + Termos/Política publicados + checklist 100%.
**Como aplicar:** ao pedir "próximos passos", o Claude deve listar **só tarefas de staging**.
Features de conformidade entram em staging **atrás de flag OFF / draft**, nunca ativadas.

### 🔴 1.2 Taxa da plataforma é SEMPRE dinâmica
**Regra:** a taxa (hoje 15%) vem sempre de `getPlatformFeeRate()` (`lib/platform-config.ts`,
em basis points). **Nunca** hardcodar `0.15`, `"15%"`, `0.10`, `"10%"` em lugar nenhum.
**Por quê:** o SuperAdmin muda a taxa pelo painel. Valor fixo no código fica defasado e engana
o usuário — **bug real:** a calculadora mostrava 10% quando a taxa era 15%.
**Como aplicar:** Server Component lê `getPlatformFeeRate()`; Client Component recebe a % como
prop. Ao criar/rever qualquer texto de preço, Termos, Ajuda ou calculadora, procure `%` fixos.

### 🔴 1.3 O app mobile é uma TRANSCRIÇÃO do site (375px) — nunca invenção
**Regra:** toda tela do app (`apps/mobile/`) replica **1:1** o site renderizado em viewport
375px — rótulos, ordem, ícones e cores **verbatim**. Nunca "adaptar", redesenhar ou usar um
"padrão nativo" quando existe equivalente no site. **Na dúvida entre nativo e copiar o site,
copie o site.**
**Por quê:** o site mobile-first **já é** a spec visual aprovada. O fundador rejeitou (duas
vezes no mesmo dia) protótipos que inventaram visual próprio. Ver §5 pro protocolo completo.

### 🟠 1.4 Lançamento nacional — sem Natal/RN como default
**Regra:** textos, placeholders, SEO, seeds e e-mails **não** citam Natal/RN/Ponta Negra como
default. Use "em todo o Brasil" ou texto neutro. O mapa sem cidade = centro do Brasil, zoom 4.
**Por quê:** decisão dos fundadores — o lançamento é nacional. (A cidade real do usuário logado
continua dinâmica; a exceção é a fixture de teste E2E, que mantém Natal de propósito.)

### 🟠 1.5 Dois projetos Supabase — não misturar
**Regra:** `shareo-dev` (`.env`, ref `kehbrjlllfkooauaswtp`) é **só** dev local.
`shareo-staging` (`.env.local`/`.env.staging-migrate`, ref `zythygwvmrwrqmnrdufq`) é o **banco
REAL** do staging. SQL de manutenção/migration do staging **sempre** no `zythygwvmrwrqmnrdufq`.
**Por quê:** confundir faz o comando cair no banco errado. **Produção (`shareo-prd`) ainda não
existe.**
**Atenção:** `.env.staging-check` está **stale** (vazio, ref antigo) — use `.env.staging-migrate`.

### 🟠 1.6 Segurança é sempre no servidor (RLS está desligado)
**Regra:** RLS do Supabase está **desabilitado** (incompatível com o PgBouncer). Toda proteção
vive na camada de API: `if (recurso.ownerId !== session.user.id) return 403`. Todo API Route
que mexe num recurso de usuário **precisa** desse guard.
**Por quê:** sem RLS, é o guard server-side que impede um usuário de acessar dados de outro.

### 🟡 1.7 Verde claro `#59C686` nunca com texto branco
**Regra:** o verde claro `#59C686` tem contraste 2.07:1 com branco — **reprovado**. Nunca use
texto branco sobre ele. (Navy `#003366`, verde ação `#007B3C` são os primários.)

> **As três que você mais vai repetir ao Claude:** D4 (§1.1), taxa dinâmica (§1.2) e
> transcrição do mobile (§1.3). Se uma sessão longa "esquecer", relembre.

---

## 2. O ciclo de desenvolvimento

O fluxo padrão de qualquer mudança:

```
branch  →  gate (tsc + jest + build)  →  commit + push  →  PR  →  CI verde  →  merge → deploy staging  →  verificar
```

- **Branch:** nunca commitar direto na `main`. Uma branch por mudança.
- **Gate obrigatório antes de todo commit:** `tsc --noEmit` + `jest`. Se tocar no app mobile,
  o gate é maior (§5). Um gate vermelho **nunca** vira commit.
- **PR + CI:** o CI ("CI - ShareO") roda lint, testes, security audit, build e E2E em **todo
  push**. Todos precisam ficar **verdes** antes do merge.
- **Nunca declarar "resolvido" sem verde / sem evidência.** "Passou no meu teste local" não
  basta — o CI é a fonte da verdade. Ver §7.3.
- **Merge → staging automático:** ao mesclar na `main`, o staging **redeploya sozinho**
  (`staging.shareo.com.br`). Não precisa de ação manual.
- **Verificar:** depois do deploy, confirme que a mudança está no ar de verdade (o Claude deve
  testar, não só dizer que fez).

**Regra de ouro:** mergear na `main` = deploy real no staging. Trate cada merge como uma
publicação — merecendo CI verde e, quando faz sentido, sua aprovação.

---

## 3. Ambientes, deploy e releases

### 3.1 Os três ambientes

| Ambiente | Dispara em | Onde | Banco |
|---|---|---|---|
| **Development** | qualquer | local (`pnpm dev`) | Supabase `shareo-dev` |
| **Staging** | push na `main` | Vercel automático | Supabase `shareo-staging` |
| **Production** | tag `web-v*` + aprovação | Vercel manual | Supabase `shareo-prd` (**ainda não existe**) |

Staging **não é produção** — é o ambiente real de validação. Produção só existe pós-D4 (§1.1).

### 3.2 Convenção de tags de release (ADR-027, adotada 2026-07-09)

| Plataforma | Tag | Dispara |
|---|---|---|
| **Site (web)** | `web-v*` (ex.: `web-v1.12.0`) | Deploy de produção (`deploy.yml`, com aprovação) |
| **App mobile** | `mobile-v*` (ex.: `mobile-v1.1.0`) | Build EAS (`eas-release.yml`, requer `EXPO_TOKEN`) |

Os prefixos não colidem. **Nenhuma tag deve ser empurrada** enquanto produção está gated por
D4 e o mobile está sem o secret `EXPO_TOKEN`. As tags antigas `v1.x` são só histórico.

### 3.3 Trocar o banco do staging exige DOIS lados 🔴
**Regra:** trocar de projeto Supabase no staging = atualizar **GitHub Secrets `*_STAGING`**
(`gh secret set …`) **E** as env vars do **Vercel**.
**Por quê:** o deploy injeta `NEXT_PUBLIC_SUPABASE_URL_STAGING` etc. no **build-time** (a partir
dos GitHub Secrets, inlinados no bundle). As env do Vercel só valem no **runtime**. Se esquecer
os Secrets, a URL fica inlinada no banco velho. **Sintoma:** health check `db:ok` +
`storage:error`.

### 3.4 Armadilhas de deploy/build conhecidas

| Armadilha | Sintoma | Fix |
|---|---|---|
| `NEXT_PUBLIC_*` marcada **Sensitive** no Vercel | variável vazia no cliente | Desmarcar Sensitive — é o **1º suspeito** |
| `SENTRY_AUTH_TOKEN` expirado | build quebra **silenciosamente** | `npx vercel env rm SENTRY_AUTH_TOKEN production` |
| `@upstash/redis` no Edge Runtime | build/edge quebra | usar fetch direto à API REST do Upstash |
| `scripts/` e `e2e/` no tsc | build quebra | mantê-los no `exclude` do `tsconfig.json` |
| staging e prod usam o **mesmo** `VERCEL_PROJECT_ID` | uma tag `web-v*` jogaria prod no slot do staging | criar projeto Vercel `shareo-prod` + secret `VERCEL_PROJECT_ID_PROD` (**antes do 1º deploy de prod**) |
| pipeline bate em `*.vercel.app` | 401 (Deployment Protection) | sempre usar o domínio público (`staging.shareo.com.br`) |
| trocar os NS do domínio pra Vercel | perde e-mail/DNS | **NUNCA** trocar NS; apex e www reservados pra produção |

### 3.5 Produção (pós-D4): banco VAZIO, nunca clonar
**Regra:** o Supabase de produção nasce via `migrate deploy` num banco **vazio** — **nunca**
clonar dev/staging (carregam drift/dados de teste). A org FREE só cabe 2 projetos → upgrade
Pro antes. Segredos de teste (chave PIX pessoal, tokens sandbox) **jamais** no runtime de prod.

---

## 4. Arquitetura essencial

O que você precisa conhecer pra dirigir bem — não pra implementar.

### 4.1 Autenticação
- **NextAuth v5, JWT, sem PrismaAdapter.** O `authorize()` faz `prisma.user.findUnique` direto.
- **Web** autentica por **cookie** de sessão; **mobile** autentica por **Bearer JWT** no header.
- Toda rota de API que o **app** consome deve resolver o usuário com **`resolveUserId(req)`**
  (aceita Bearer **ou** cookie) — nunca só `auth()` (cookie-only), senão o app leva **401**.
  **Exceção:** `/api/admin/**` fica **cookie-only** de propósito (um Bearer não abre o painel
  admin). Ver §5 — esse foi um bug sistêmico corrigido em ~8 rotas.

### 4.2 Segurança e dados
- **RLS off → guards server-side** (§1.6). O guard `ownerId → 403` é obrigatório.
- **CPF/CNPJ** guardados em **dois** campos: `hash` (unicidade) + `encrypted` (exibição).
- **Upload de imagem:** validar **magic bytes** no servidor, nunca confiar no `Content-Type`.
- **CSP:** todo `fetch()` client-side pra domínio externo precisa estar no `connect-src`
  (`middleware.ts`, dois blocos: dev e prod). **Sintoma de CSP faltando:** "Erro de conexão"
  no `catch` sem erro de rede aparente → **1º suspeito é o CSP**.

### 4.3 Pagamentos (ADR-026)
- Migrando pra **Mercado Pago, Modelo B (split/marketplace)**: cada locador conecta conta MP;
  o MP divide o pagamento; a ShareO retém 15% como `marketplace_fee`. Assim a **ShareO não é
  _merchant of record_** — reduz o risco regulatório (foi o núcleo do D4).
- Webhooks de pagamento são processados por **fila idempotente** (dedup por event id).
- Teto de **R$500** por transação (`CHECKOUT_MAX_CENTS`).

### 4.4 Padrões que evitam bugs reais
- **Features novas entram em `PlatformConfig` com default OFF** — nada liga sozinho.
- **Nunca reusar uma instância de `NextResponse`/`Response`** em vários `return` (o stream é
  consumido uma vez). Bug real no forgot-password.
- **Fire-and-forget morre no Vercel:** uma `void promise` some quando a lambda congela — sempre
  `await` ou `after()`.
- **`next/image` quebra com `blob:` URL** — previews de upload ficam `<img>` comum.
- **Geolocalização:** Mapbox pro geocoding (fire-and-forget com `after()`); distância por
  **Haversine em JS** pós-fetch (não no Prisma).
- **Estado:** React Query (servidor) + URL (filtros) + NextAuth (sessão). **Sem Zustand** no web.
- **SEO:** conteúdo indexável **nunca** é CSR — SSR/ISR pras páginas públicas.

---

## 5. Desenvolvimento mobile (o app Android)

O capítulo mais denso — é onde mais bugs "invisíveis" aparecem.

### 5.1 A regra-mãe: transcrição literal do site (repetindo §1.3)
O app replica o site em 375px **verbatim**. O **protocolo** que todo agente mobile deve seguir:
- **Ler o componente-fonte do site COMPLETO** antes de escrever (ex.: `AppHeader.tsx`,
  `MobileMenu.tsx`, `app/itens/page.tsx`, `app/(auth)/login`) e copiar markup/classes 1:1.
- Todo arquivo novo começa com `// Fonte: <arquivo do site transcrito>`.
- O PR traz uma **tabela componente → arquivo-fonte**.
- **Testes RNTL fixam os rótulos exatos** (rótulo inventado = teste quebra).
- **Nunca inventar** ícone (checar o PNG/SVG real primeiro) nem nome de parâmetro de API
  (ler o schema Zod real). Respeitar as **Rules of Hooks**. `accessibilityRole` só com valores
  confirmados válidos no RN.

### 5.2 🔴 Gates verdes NÃO garantem que o app roda
**A lição mais cara do mobile:** `tsc --noEmit` + `jest` passando **não** provam que o app
funciona. Nenhum desses gates invoca o transform do Metro nem roda o app.
- **Casos reais:** `declare` em campo de classe passa no tsc mas o Babel do Expo quebra o
  bundle; `accessibilityRole="tabbar"` é válido no tsc mas **crasha** o Android; deps fantasma;
  parâmetros de API errados (`q`/`category` em vez de `search`/`categoryId` — ninguém leu o Zod).
- **Gate mobile final obrigatório** (de dentro de `apps/mobile/`):
  ```
  npx tsc --noEmit && npx jest && npx expo export:embed --eager --platform android --dev false --reset-cache
  ```
  O `expo export:embed` **bundla de verdade** — é o que pega o que tsc/jest não pegam.
- **Mesmo assim, só o device real prova.** Auditoria "com `// Fonte:` + testes RNTL" dá
  **falsa confiança**. Antes de dizer "pronto", teste no Metro/device (ver §5.4).

### 5.3 O padrão sistêmico das APIs do mobile (dois bugs recorrentes)
1. **Auth cookie-only:** rotas que usam `auth()` dão **401** pro Bearer do app. Fix:
   `resolveUserId(req)`. Já mordeu ~8 rotas (middleware, PATCH bookings, PUT items, contract,
   photos, reviews…). **Sempre desconfie disso** quando uma tela do app dá 401.
2. **Campo buscado mas descartado:** o `select`/`include` do Prisma traz o campo, mas o shape
   de saída da resposta (`NextResponse.json`) o descarta — e o tipo do mobile assume que ele
   existe → funcionalidade roda com `undefined` silenciosamente. **Bug mais grave:**
   `paymentStatus` fazia o botão "Pagar" aparecer em reserva já paga. **Ao estender uma API,
   confira que o campo chega no JSON e que o tipo TS do mobile bate.**

### 5.4 Setup de teste em device (JS puro recarrega via Metro, sem novo build)
1. Conectar o celular (USB) → `adb devices -l` confirma `device`.
2. `adb reverse tcp:8081 tcp:8081`.
3. `cd apps/mobile && npx expo start --dev-client` — **SEM `CI=1`** (com CI o watch/Fast
   Refresh desliga).
4. O Metro tem que servir de um worktree no `main` atualizado; abrir o app ShareO no celular.
- **Coordenadas de `adb tap`:** o screenshot exibido é 900×2000, o device real é 1080×2400 —
  **multiplicar por 1.2** antes do `input tap`.
- **`SafeAreaView` do `react-native` é iOS-only** — no Android importar de
  `react-native-safe-area-context`.
- **`headerShown:false` é global** — toda tela nova precisa do próprio botão voltar.

### 5.5 🟠 O device de teste é o celular PESSOAL do fundador
Cuidado com automação de toques: notificação real ou dev-menu pode **interceptar o tap** — já
causou uma **reserva real acidental** e a abertura do **WhatsApp pessoal**. Ao automatizar,
tenha isso em mente; prefira o **smoke no CI** (emulador na nuvem via Maestro) pra não tocar no
aparelho físico.

### 5.6 `runtimeVersion` e novos builds EAS
- `app.json` tem `runtimeVersion: { policy: "appVersion" }` — **subir a versão do app muda o
  runtimeVersion** e o **dev-client instalado deixa de casar** com o Metro (mostra tela de
  incompatibilidade). Por isso o bump de versão mobile só acontece **junto** com um **novo
  build EAS** do dev-client (foi o motivo de deferir o bump em 1.1.0 no ADR-027).
- **Novo build EAS só é necessário quando se adiciona dependência NATIVA** (mudança de JS puro
  recarrega via Metro). E sempre buildar de um **worktree limpo do `origin/main`**.
- Release EAS precisa do secret **`EXPO_TOKEN`** (o token pessoal anterior foi rotacionado).

### 5.7 Decisões de escopo que **não** são bug
Algumas telas do app **abrem no site** via `Linking` de propósito (fallback pra features não
portadas — ex.: "Ver no mapa", páginas de Minha Conta/Ajuda). O wiring desses links fica no
`MobileMenu.tsx`. Isso é **decisão de escopo aprovada**, não um bug a "corrigir".

---

## 6. Banco de dados e migrations

- **SQL de reparo/migration vai nos DOIS Supabase** (dev e staging) + deploy junto. Rename de
  categoria idem (o `CategoryIcon` resolve por **slug**, então rename = UPDATE nos dois + deploy
  simultâneo).
- **Migrations Prisma — lições:**
  - `ALTER TYPE ... ADD VALUE` e `UPDATE` **não** podem ir na mesma transação PG — separar em
    dois SQLs.
  - RLS policies bloqueiam `DROP COLUMN` → **dropar as policies antes** do DROP.
- **Nunca rodar `--reset`** em staging nem no `daily-sim` (apaga a base demo preservada).
- Produção nasce em banco **vazio** via `migrate deploy` (§3.5).

---

## 7. Trabalhando com o Claude Code

O capítulo mais "seu" — como conduzir o desenvolvimento pra render e não tomar susto.

### 7.1 Como reportar um bug (as 4 partes)
Print sozinho força investigação às cegas. Junto ao print, diga:
1. **Qual tela** (nome do menu/aba, não "a tela X").
2. **O que você tocou** exatamente antes do erro.
3. **O que o site faz** nesse mesmo ponto (mesmo que seja só "no site tem um calendário aqui").
4. Se for tela de erro: a **1ª linha do Call Stack que cita um arquivo de `apps/mobile/`**
   (não as internas do React) — geralmente aponta o arquivo certo direto.

### 7.2 Gates verdes ≠ funciona (exija validação de verdade)
tsc/jest/RNTL/tabela de auditoria **não provam** que o app mobile funciona — **só o device
prova** (§5.2). Quando o Claude disser "pronto/funcionando", para mudanças observáveis peça a
**evidência**: um teste no device, um screenshot, um `curl` mostrando o resultado, o CI verde.

### 7.3 Exija evidência antes de aceitar "resolvido"
"Deve funcionar" / "passou no meu teste" não é conclusão. Peça o CI verde, o resultado da API,
o comportamento observado. É barato e evita retrabalho.

### 7.4 Guardrails permanentes pra relembrar (em sessões longas o Claude pode esquecer)
- **Nada de produção antes do D4** (§1.1).
- **Taxa da plataforma é sempre dinâmica** (§1.2).
- **UI do mobile é transcrição 1:1 do site em 375px** (§1.3).

### 7.5 Sobre delegar e subagentes
- **Delegue via workflow/skill nomeado**, não via spawns ad-hoc repetidos — fica rastreável e
  reproduzível. Para trabalho grande e paralelo (auditoria, migração, review), o padrão é um
  **workflow** que abre em leque e **verifica adversarialmente** os achados.
- **`/loop` autônomo serve pra auditoria rápida, NÃO pra construir features grandes** — ele
  tende a marcar "feito" o que não testou.
- **Subagente com `isolation: worktree` pode trocar a branch do seu repo PRINCIPAL** — depois
  de agentes empilhados, confira `git branch --show-current` + o reflog.
- **Subagente pode introduzir regressão** — **sempre revise o diff antes de mesclar**. E
  **reverifique o achado de um subagente contra o código ATUAL** antes de mandar corrigir (o
  código pode ter mudado; o achado pode ser falso positivo).
- **Corrigir um bug num arquivo NÃO garante que as outras ocorrências foram cobertas** — para
  padrões sistêmicos (ex.: o auth cookie-only), peça um **sweep explícito** de todas as
  ocorrências.
- **Auditoria geral não enxerga duplicação (DRY)** — se quer caçar código repetido, peça um
  **eixo explícito** de "fonte única".

### 7.6 O que exige sua autorização INEQUÍVOCA
- Escrever em `settings.json` / `CLAUDE.md`.
- **Deletar** arquivos.
- **Mesclar/deployar** (cada merge na `main` = deploy no staging real).
- Qualquer ação **externa/irreversível** (empurrar tag, publicar, mandar e-mail).

### 7.7 Nem todo redirect é bug; e checar a URL do tester
- Telas do app que **abrem no site** podem ser fallback de escopo decidido (§5.7) — não é bug.
- Tester relatando "erro no cadastro"? **Cheque a URL que ele está usando antes do código** —
  já houve caso de tester num deploy `*.vercel.app` velho em vez do `staging.shareo.com.br`.

### 7.8 Acompanhar pelo celular
Você monitora as tarefas longas pelo app do Claude (Remote Control). O Claude deve **te
notificar no celular** (push, em pt-BR) ao **concluir uma tarefa longa** ou ao **travar numa
decisão** que é sua.

---

## 8. Catálogo de armadilhas (consulta rápida)

Sintoma → causa → fix. Pra quando algo quebra e você quer o atalho.

| Sintoma | Causa provável | Fix |
|---|---|---|
| Tela do app dá **401** numa ação | rota usa `auth()` cookie-only, não aceita Bearer | trocar por `resolveUserId(req)` (§5.3) |
| Funcionalidade do app roda com dado faltando | campo buscado no Prisma mas **descartado** no JSON | incluir o campo no shape de saída; conferir tipo TS (§5.3) |
| `NEXT_PUBLIC_*` vazia no cliente | flag **Sensitive** no Vercel | desmarcar Sensitive (§3.4) |
| Build da Vercel quebra "sem motivo" | `SENTRY_AUTH_TOKEN` expirado | remover o token (§3.4) |
| Health check `db:ok` + `storage:error` | trocou banco só num lado | atualizar **GitHub Secrets + Vercel** (§3.3) |
| "Erro de conexão" no `catch`, sem erro de rede | domínio externo faltando no **CSP** | adicionar no `connect-src` do `middleware.ts` (§4.2) |
| Bundle do app quebra mas tsc passa | sintaxe TS que o Babel do Expo não suporta / `<ellipse>` etc. | rodar `expo export:embed`; evitar a sintaxe (§5.2) |
| App crasha no Android ao abrir uma tela | `accessibilityRole` inválido / `SafeAreaView` do RN no Android | valor confirmado / importar de `react-native-safe-area-context` (§5.2, §5.4) |
| Dev-client não conecta / "runtime mismatch" | bump de versão mudou o `runtimeVersion` | rebuild do dev-client, ou não bumpar durante validação (§5.6) |
| Reserva/ação real acidental no device | toque de automação num device pessoal | cuidado com notificações; preferir smoke no CI (§5.5) |
| Calculadora/Termos com % errada | taxa hardcoded | `getPlatformFeeRate()` (§1.2) |
| Deploy de produção rejeita a tag `web-v*` | allowlist do Environment ainda em `v*` | ajustar pra `web-v*` (ADR-027) |
| `void algumaPromise()` não executou na Vercel | fire-and-forget morreu na lambda | `await` ou `after()` (§4.4) |
| Response "já enviada" / stream vazio | reuso de instância `NextResponse` | criar uma nova por `return` (§4.4) |

---

## 9. Referências

- **`CLAUDE.md`** (raiz) — as instruções canônicas do projeto (a fonte que o Claude lê sempre).
- **`docs/adr/`** — decisões arquiteturais (ADR-001…027). Destaques: ADR-026 (Mercado Pago
  Modelo B), ADR-027 (tags de release por plataforma).
- **`docs/STATUS.md`** — estado atual do projeto.
- **`docs/checklist-go-live.md`** — o checklist de produção (gated por D4).
- **`docs/backlog-atividades-priorizadas.md`** — backlog P0–P3.
- **Memória do projeto** (`~/.claude/.../memory/`) — os ~60 aprendizados que alimentaram este
  guia; o `MEMORY.md` é o índice.
- **Skills disponíveis** — `/shareo-status`, `/shareo-review-pr`, `/shareo-security-check`,
  `/shareo-user-story`, `/shareo-adr`, `/shareo-juridico`, `/shareo-marketing`,
  `/shareo-transcrever-tela`, `/shareo-painel-auditoria` (painel de especialistas com verificação
  adversarial — "delegue aos especialistas").

---

> **Como manter este guia vivo:** quando uma regra nova nascer de um incidente (o padrão de
> "isso mordeu, então a regra é…"), peça ao Claude pra registrar aqui **e** na memória do
> projeto. Um guia que não é atualizado depois de cada susto vira ficção.
