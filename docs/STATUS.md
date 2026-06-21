# ShareO — Status do Projeto

**Atualizado em**: 2026-06-21 (sessão s32 — **carrinho de locação multi-item do mesmo dono MESCLADO + no ar no staging** (Story B/ADR-025, PRs #69 Fases 1–6 + #70 quadro "Ou itens do mesmo anunciante"; E2E 4/4 + Regressão Staging verdes) + lote de UX p/ tester (onboarding /bem-vindo, descoberta da importação PJ, copy /sobre); s31 = modo escuro no staging; histórico s13–s31 abaixo)
**Ambiente staging**: https://staging.shareo.com.br (canônico desde 15/06; `shareo-rouge.vercel.app` segue como alias) — deploy via GitHub Actions "Deploy - ShareO" (token); projeto Vercel **shareo** agora no Team **shareo-marketplace** (Pro), Production = staging
**Último commit**: dark mode mesclado na `main` (Fase 1 `#52` + integração `#60` + docs `#51`/`#61`); E2E de regressão pós-deploy verde no staging. CI da main verde + Deploy Staging verde sob o Team corporativo.
**Release atual**: [`v1.9.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.9.0) — **Modo Escuro (dark mode)**: tokens CSS vars `:root`/`.dark`, toggle tri-state, next-themes (nonce CSP), migração de cores, Mapbox/Sonner dark, a11y de contraste, sombras theme-aware (PRs #51–#62) — no ar no staging; aguarda D4 para produção
**Release anterior**: [`v1.8.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.8.0) — Campanha: atribuição UTM + landings de cidade (PR [#50](https://github.com/robertoepifanio-byte/SHAREO/pull/50), merge `33601cb`)

---

## ⚠️ BLOQUEADOR ATIVO

**D4 — Consulta jurídica pendente.** Nenhuma atividade de produção (criação de projeto Supabase, deploy, DNS, go-live) antes do retorno formal do jurídico.

---

## Resumo Executivo

**🛒 s32 — Carrinho de locação multi-item do mesmo dono (Story B / ADR-025) + lote de UX p/ tester** (2026-06-21). **(1) Lote de UX (4 PRs mesclados + no ar no staging):** [#65](https://github.com/robertoepifanio-byte/SHAREO/pull/65) onboarding — signup passa a cair em `/bem-vindo` (escolha "Explorar" × "Completar cadastro") + aviso "Complete seu cadastro" no dashboard; [#66](https://github.com/robertoepifanio-byte/SHAREO/pull/66) `/bem-vindo` — removido selo de piloto e "Completar cadastro" destacado (botão preenchido); [#67](https://github.com/robertoepifanio-byte/SHAREO/pull/67) **descoberta da importação PJ** — não havia link p/ "Meus Anúncios" no menu do avatar nem no mobile (a aba "Importar" vive lá) → adicionado "📦 Meus Anúncios" nos dois menus; e o `public/template-importacao.csv` tinha categoria inexistente "Casa e Jardim" (slug `casa-jardim`=**"Eletrodomésticos"**) + Natal/RN → corrigido; [#68](https://github.com/robertoepifanio-byte/SHAREO/pull/68) copy do hero `/sobre` + "renda" no lugar de "lucro". Raimundo (raimundo1965@gmail.com) **excluído** da base de staging p/ refazer cadastro CPF→CNPJ do zero. **(2) Pergunta de tester → consulta a especialistas:** "carrinho p/ alugar vários itens, pagar o total e gerar locações por proprietário". Arquiteto + PO convergiram: **construir só o caso MESMO DONO** (Story B, ~80% do valor / ~20% do esforço, não mexe em split/pagamento); **carrinho MULTI-DONO** (pagamento agregado + split por dono) fica **H3/pós-D4** (registrado p/ depois). **(3) Implementação Story B — MESCLADA + NO AR no staging** (PR [#69](https://github.com/robertoepifanio-byte/SHAREO/pull/69) squash, Fases 1–6): Fase 1 modelo `BookingItem` (booking_items) + migração aditiva idempotente com **backfill** (53→53); Fase 2 disponibilidade lê de booking_items (`lib/booking-availability.findOverlappingItem`) nos 3 pontos (criação/confirm/`/availability`); Fase 3 `POST /api/bookings` aceita `additionalItemIds` (mesmo dono/mesmo período, retrocompatível, valida `MIXED_OWNERS`); Fase 4 **carrinho** client-side (localStorage, `lib/cart.ts`, escopo de 1 dono) — `AddToRentalButton` na página do item, `CartIndicator` no header, página `/carrinho` (período escolhido lá, 1 POST com itemId+additionalItemIds); Fase 5 exibição (lista "Itens desta locação" em `/reservas/[id]` + badge "+N itens" na lista); Fase 6 E2E `e2e/multi-item-booking.spec.ts` (#32–#35, escrito pelo qa-shareo). **(3b) Descoberta** (PR [#70](https://github.com/robertoepifanio-byte/SHAREO/pull/70)): quadro **"Ou itens do mesmo anunciante"** na página do item, acima de "Você também pode gostar" (até 4 itens AVAILABLE do mesmo dono; similares passam a excluir os do mesmo dono). **Migração no staging:** aplicada **À MÃO antes do merge** (lição KYB) — `db execute --url $DIRECT_URL` + `migrate resolve --applied` → "schema up to date" → sem 500 de runtime. **Verificação:** tsc + jest 466 + smoke real (2 BookingItems, soma, item secundário bloqueia quando CONFIRMED) + **E2E 4/4 verde local** (sem ajuste de código de app) + **Deploy Staging + E2E Regressão Contínua (Staging) verdes** + smoke ao vivo (`/carrinho`, "Adicionar a uma locação", register 400 sem 500, quadro do mesmo anunciante 4 cards). **Decisões de escopo:** mesmo dono + mesmo período; 1 avaliação por reserva; teto R$500 sobre o total da locação (no checkout). Produção gated por **D4**. **(3c) Validação do fundador + ajustes (2026-06-21):** título do quadro passou de "Ou itens do mesmo anunciante" → **"Itens do mesmo anunciante"** (PR [#71](https://github.com/robertoepifanio-byte/SHAREO/pull/71), removido o "Ou"). **Gotcha de dados:** o quadro só renderiza quando o anunciante tem **2+ itens AVAILABLE**; a base demo tinha a maioria dos anunciantes com 1 item → o fundador navegava e "não achava" o quadro (era DADO, não bug). Corrigido com **`scripts/topup-demo-owners.ts`** (PR [#72](https://github.com/robertoepifanio-byte/SHAREO/pull/72), dry-run/`--confirm`, aditivo, **só contas de teste** `@demo.shareo.com.br`/`@daily-sim.shareo.test`, NUNCA humanos/admins): cria itens clonando conteúdo real co-localizado → staging foi de **23→42 de 44** anunciantes com 2+ itens (87→132 AVAILABLE). **Carrinho validado pelo fundador ao vivo no staging.** **Registrado p/ depois:** carrinho multi-dono (H3); pluralizar e-mails de reserva p/ multi-item. Ver memória [[project-multi-item-booking]].

**🌓 s31 — Modo Escuro IMPLEMENTADO e no ar no staging** (2026-06-20). Saiu do plano (s30) para produção-no-staging em 6 entregas, cada uma verificada no preview e mesclada na `main`. **Fase 1 — fundação de tokens** (PR [#52](https://github.com/robertoepifanio-byte/SHAREO/pull/52)): `globals.css` com CSS vars em canais RGB em `:root`+`.dark` (valores do claro idênticos) + `tailwind.config.ts` apontando p/ `rgb(var(--x)/<alpha-value>)` + `darkMode:'class'`; refactor puro, regressão zero no claro. **Fase 2 — provider+toggle+forms** (PR #53→reaberto como [#59](https://github.com/robertoepifanio-byte/SHAREO/pull/59), integrado via #60): `next-themes`+`ThemeProvider` com **nonce CSP** (x-nonce→Providers→ThemeProvider) + `suppressHydrationWarning` no `<html>`; `ThemeToggle` tri-state (Claro/Sistema/Escuro) no header e no MobileMenu; `@tailwindcss/forms`→`{strategy:'class'}` após auditoria de inputs. **Fase 3 — migração de cor fixa** (PR [#54](https://github.com/robertoepifanio-byte/SHAREO/pull/54)): ~78 trocas hardcoded→token em 36 arquivos, decidindo **por ocorrência** (superfície que adapta × chrome colorido onde `text-white` permanece). **Fase 4 — componentes especiais** (PR [#55](https://github.com/robertoepifanio-byte/SHAREO/pull/55)): Mapbox `dark-v11` via `useTheme`, `ThemedToaster` (Sonner segue o tema). **Fase 5 — a11y de contraste** (PR [#56](https://github.com/robertoepifanio-byte/SHAREO/pull/56)): marca usada como TEXTO clareada no dark via override `.dark .text-{primary,brand,blue-medium}` (#4A90D9/#5BD08B/#5BA3E0) + `bg-blue-medium` volta a fill navy (corrige cards `CasosRenda`). **Elevação** (PR [#57](https://github.com/robertoepifanio-byte/SHAREO/pull/57)): sombras theme-aware (`--shadow-rgb` navy→preto). **Teste a11y dark** (PR [#58](https://github.com/robertoepifanio-byte/SHAREO/pull/58)): `e2e/e2e-a11y-plan.spec.ts` roda axe (contraste+ARIA) emulando `prefers-color-scheme: dark`. **Gotcha do merge:** squashar a Fase 1 em `main` divergiu da Fase 1 original das branches → a pilha stacked passou a conflitar e `gh pr merge --delete-branch` fecha o PR filho; resolvido rebaseando o topo sobre `main` (`git rebase --onto main <fase1>`) e integrando via **PR [#60](https://github.com/robertoepifanio-byte/SHAREO/pull/60)** (árvore idêntica). **Verificação:** auditoria de contraste programática + axe = **0 violações nos dois temas**; Lighthouse staging (mobile) **A11y 100 / BP 96 / Perf 86 (CLS 0)**; **E2E de regressão pós-deploy VERDE** (inclui o teste dark) contra o staging; toggle tri-state + next-themes confirmados ao vivo. Docs: spec `docs/dark-mode-plan.md` v0.3 (PR [#51](https://github.com/robertoepifanio-byte/SHAREO/pull/51), checklist §9 fechado) + roteiro de teste de usabilidade `docs/dark-mode-teste-usabilidade.md` (PR [#61](https://github.com/robertoepifanio-byte/SHAREO/pull/61)). **Pendências (não-bloqueantes):** execução do teste de usabilidade pelos fundadores (roteiro pronto) e, opcional, investigar o Perf do Lighthouse (TBT — **não atribuível ao dark**, bundle idêntico entre temas). Produção segue gated por **D4**. Ver memória [[project-dark-mode-plan]].

**📋 s30 — Plano e especificação do Modo Escuro (dark mode)** (2026-06-19). **Planejamento — nada implementado na app.** Entregue `docs/dark-mode-plan.md` (spec visual+técnica, **v0.2** após revisão dos papéis `designer-shareo` e `fullstack-dev-shareo`) + `docs/dark-mode-prototype.html` (protótipo standalone com toggle Claro/Escuro/Sistema, validado por screenshots). **PR [#51](https://github.com/robertoepifanio-byte/SHAREO/pull/51)** aberto com a spec (protótipo ainda não commitado). **Diagnóstico-chave:** o ShareO **não tem dark mode** e usa **hex hardcoded** no `tailwind.config.ts` (não CSS vars) = bloqueador estrutural; o `globals.css` tem só algumas vars desconectadas e divergentes. Caminho: mover tokens p/ CSS vars (`:root`+`.dark`, canais RGB), Tailwind aponta p/ `rgb(var(--x)/<alpha-value>)`, `darkMode:'class'`, `next-themes` (no-FOUC). **Achados técnicos da revisão:** ~40 CSS vars (tokens são objetos aninhados); **`@tailwindcss/forms` precisa de `{strategy:'class'}`** senão inputs ficam brancos no dark; **CSP já tem infra de nonce** (`generateNonce`/`x-nonce` no middleware, layout já passa p/ GA) → fix = `<ThemeProvider nonce={nonce}>`; `suppressHydrationWarning` falta no `<html>`; Mapbox `ItemsMap.tsx:94` hardcoded→`useTheme`; Sonner no layout é Server Component (mover p/ client leaf); **dívida de cor fixa medida = ~383 ocorrências em 45+ arquivos** (top: AppFooter/ListaVIP/FounderCaptureForm/MobileMenu). **Paleta dark com contraste WCAG computado:** bg `#0B1524`, surface `#15233B`, foreground `#E8EEF6` (15.7:1), verde-texto `#5BD08B` (9.45:1, ≠ verde-fill `#007B3C`), status confirmed `#5BA3E0`/returned `#B49AF5`/disputed `#F0A35E`, primary fill `#1E4D80`/texto `#4A90D9`. Plano em **6 fases** (Fase 1 = fundação de tokens, refactor puro sem mudança no claro) + checklist a11y/usabilidade. Produção gated por D4. Ver memória [[project-dark-mode-plan]].

**✅ s29 — Release v1.8.0: campanha (UTM + landings) + migração Vercel Pro corporativa + caixas humanas Zoho** (2026-06-19). **(1) Campanha de pré-lançamento — habilitadores técnicos** (PR [#50](https://github.com/robertoepifanio-byte/SHAREO/pull/50), squash `33601cb`), **aprovada pelos fundadores**. **Fase 1 (UTM/atribuição):** `FounderLead` ganha `utmSource/utmMedium/utmCampaign/referrerUrl` (migration `20260618000000_add_founder_lead_utm`, idempotente, aplicada em local + staging via `db execute --url`); `POST /api/founders/leads` passa a **honrar o `source`** validado pelo schema (antes gravava `VIP_LANDING` fixo) + persiste UTM; `FounderCaptureForm` lê `utm_*`/`ref` da URL e **deriva o canal** (`meta/fb/ig`→META_ADS, `google`→GOOGLE_ADS, `ref`→REFERRAL); painel `/admin/fundadores` ganha recorte "Por canal" e "Por campanha (UTM)". **Fase 3 (landings):** `lib/pilot-cities.ts` (14 cidades) + `app/pilotos/[cidade]/page.tsx` (ISR, metadata localizado, contador por cidade, form pré-preenchido com `campaign=piloto-<slug>`) + rotas no `sitemap.xml`. **GA4 (Fase 2) adiado** (sem Measurement ID; medição inicial pelo painel). Verificado: tsc+lint limpos, E2E local do source=META_ADS persistindo, landings ao vivo no staging (`/pilotos/recife`=200, cidade inválida=404). **(2) Migração do Vercel para conta corporativa** — projeto `shareo` transferido da conta pessoal `robertoepifanio-byte` (Hobby) para o **Team `shareo-marketplace` (Pro)**; bloqueio do transfer era um **deploy órfão preso em INITIALIZING há 22 dias** (`dpl_9SvjfDT…`) → removido via `vercel remove` → transfer concluído. GitHub Secrets atualizados (`VERCEL_ORG_ID`→`team_AH51I8nuVC1fmmmorLA9Qefs`, `VERCEL_TOKEN`→token corporativo); conta pessoal **removida do Team** (Leave Team); Deploy Staging revalidado **verde sob o Team novo**, sem dependência da conta pessoal; domínios (`staging.shareo.com.br` + `shareo-rouge.vercel.app`) e env vars acompanharam o projeto; token exposto no chat **revogado**. Esteira deploya por **token** (não pela integração Git). Ver memória [[project-vercel-pro-migracao]]. **(3) Caixas humanas no Zoho Mail Lite** — `atendimento@shareo.com.br` (1 usuário) + aliases `suporte@`/`privacidade@`/`seguranca@`/`noreply@`; DNS na GoDaddy (MX Zoho + SPF + DKIM `zmail`) validado **mail-tester 10/10**; **Resend segue como provedor de envio do app** (`noreply@`, `lib/email.ts`) — papéis complementares, sem conflito de DNS. Ver memória [[project-email-provider-strategy]]. **Release [`v1.8.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.8.0)** (commit `534d1db`, tag + GitHub Release). Segue gated por D4 para produção.

**✅ s28 — Merge de todos os PRs abertos + fix durável do deploy** (2026-06-18). Limpou-se a fila de PRs (de 9 abertos para 0). **(1) Auditoria s14** — #46→#47→#48 mesclados na ordem (squash), CI verde em cada um (esperado inclusive o E2E Playwright). **(2) Email cleanup** [#16](https://github.com/robertoepifanio-byte/SHAREO/pull/16) (`chore/email-cleanup-dead-code`, s17): estava `CONFLICTING`+CI vermelho; **rebaseado na main**, conflito do mock em `register.test.ts` resolvido (mantido só `sendVerificationEmail`), removidos 3 arquivos locais que entraram por engano no commit (`Sem título.md` + guias do robô, intencionalmente não-versionados), validado tsc+jest 9/9+lint → mesclado. **(3) Dependabot (5 PRs)** [#8](https://github.com/robertoepifanio-byte/SHAREO/pull/8)/[#9](https://github.com/robertoepifanio-byte/SHAREO/pull/9) (typescript-eslint dev), [#10](https://github.com/robertoepifanio-byte/SHAREO/pull/10) (sharp), [#11](https://github.com/robertoepifanio-byte/SHAREO/pull/11) (supabase-js), [#12](https://github.com/robertoepifanio-byte/SHAREO/pull/12) (lucide-react): rebaseados via `@dependabot rebase` e mesclados **um a um** (cada merge re-conflita o `pnpm-lock.yaml` dos demais). **Insight:** PRs do Dependabot rodam **sem os secrets do repo** → o job `Build` do CI falha neles (`Invalid URL` em `/_not-found`) mesmo com bump seguro; o `Can't resolve 'dns'` de `ssrfGuard` é só warning (aparece no build verde da main). `Build` **não é check obrigatório** (estado `UNSTABLE`) → mesclar quando Tests+Lint(typecheck) passam (typecheck valida API/ícones usados); validação real do runtime = CI da main pós-merge (com secrets), que ficou **100% verde** (Build/Tests/Lint/E2E). **(4) Fix de deploy** [#49](https://github.com/robertoepifanio-byte/SHAREO/pull/49) (`133bfe8`): os 9 merges do dia estouraram o `api-upload-free` do Vercel free no Deploy Staging; adicionado **`--archive=tgz`** aos 3 comandos `vercel deploy` (preview/staging/prod) → 1 tarball por deploy em vez de milhares de arquivos. **Comprovado funcionando mesmo com a cota já estourada:** Preview Deploy do próprio #49 verde + Deploy Staging pós-merge subiu + E2E de Regressão de Staging verde. Limite eliminado de forma durável. Ver memórias [[project-auditoria-s14-execucao]] e [[project-vercel-free-upload-limit]].

**✅ s27 — Auditoria s14 executada (achados sem dependência externa) em 3 PRs** (2026-06-18). Tratados todos os achados da auditoria s14 que não dependem de jurídico/aprovação de fundadores/rotação de secret/upgrade de deps — corrigidos, já-resolvidos ou pulados com justificativa. **3 PRs ABERTOS p/ `main` (não mergeados; mesclar na ordem #46→#47→#48, sem conflitos).** **PR [#46](https://github.com/robertoepifanio-byte/SHAREO/pull/46)** (`914eda2`): **SEC-MAJ-06** (LGPD art.18) — DELETE `/api/users/me` agora anonimiza em `$transaction` `Review.comment`, `Message.content`(+soft-delete), `borrowerNote`/`ownerNote`, chave PIX (`OwnerPaymentAccount`) e docs de identidade (`idDocumentUrl`/`idSelfieUrl`/`idRejectionReason`+status→UNVERIFIED) + limpeza best-effort do bucket privado `id-docs` via `after()` (**insumo direto do D4**); **S14-MIN-07** (`/api/health` só expõe `e.message` fora de produção); **Mi17** (remove `icones/` órfão do matcher); **Mi13** (deleta `hooks/useAuth.ts` morto); **GAP-M-07b** (`take:24` nas imagens da página SSR `/itens/[id]`). **PR [#47](https://github.com/robertoepifanio-byte/SHAREO/pull/47)** (`06fe171`): **S14-M-11** (PlatformConfig lê de um load cacheado em memória, TTL 60s + `clearPlatformConfigCache()` na escrita admin — substitui ~59 `prisma.find`/request; caveat: cache por instância serverless, propagação até 60s entre instâncias); **S14-M-18** (`/api/admin/geocode-items` filtra no banco `latitude:0 OR longitude:0` — sentinela real igual ao create — em lotes de 100 c/ `hasMore`, em vez de carregar todos os itens; corrige o `==null` latente, pois Item.lat/lng são `Float` não-nulos). **PR [#48](https://github.com/robertoepifanio-byte/SHAREO/pull/48)** (`332f582`): **S14-M-17** (16 specs ganham fallback `?? process.env.STAGING_URL ??` antes do localhost — raiz das falsas-falhas do s13); **S14-M-12 (fatia segura)** (rota `reminder` ganha `code` nos 4 envelopes que só tinham `message` — aditivo, não quebra UI). **Falsos positivos / já-resolvidos (sem ação):** **Mi14** (troca de role já invalida sessão), **S14-M-16** (`pickupToken @unique` já no schema + migration `20260609000001`), **S14-M-15** ("3 fotos" é dica, não limite), **4 spec-bugs** (já corrigidos no s17 — locators do auth, pickupToken no security2 #21, 400 aceito no email-verification #4). **Pulados c/ justificativa:** **S14-M-13** (helper de owner-guard — 7 sites com intenções divergentes: bypass admin/NOT_FOUND-IDOR/msgs custom; abstrair authz piora clareza logo antes do go-live), **S14-M-12 massa** (trocar `{error:"str"}`→objeto em ~19 rotas arrisca quebrar UI/asserts E2E, não verificável por unit), **S14-MIN-11** (`consentIp` é campo de auditoria de consentimento por ADR-021/022, já fora de Sentry/respostas), **S14-MIN-12** (rotação refresh mobile exige migration + auth mobile não testada). **Verificação:** `tsc`+`next lint`+`jest` (450 passed, 24 suites) verdes nos 3 PRs; E2E não roda localmente (precisa staging+secrets), mudanças de spec são troca de string verificada por tsc. **Auditoria s14 ENCERRADA** quanto a itens sem dependência externa. Ver memória [[project-auditoria-s14-execucao]].

**✅ s26 — Base de validação demo no staging + busca de usuários no admin + lote de UX/copy** (2026-06-18). **(1) Reset + repovoamento da base de staging para validação dos fundadores** (PR [#43](https://github.com/robertoepifanio-byte/SHAREO/pull/43), `08873d6`): **hard delete** de ~4.300 registros preservando **8 contas** (5 humanas — roberto.epifanio@gmail.com, roberto.epifanio1961@outlook.com, raimundo1965@gmail.com, testethiago@gmail.com, thiagogarbuio10@gmail.com — + 3 admins @shareo.com.br) e repovoamento com **10 PJ + 50 PF** (`@demo.shareo.com.br`), **80 itens AVAILABLE todos com 3 fotos Unsplash curadas** que casam com o produto, **84 reservas cobrindo os 7 estados**, ~39 payouts PENDING (D4), ~117 reviews; nenhuma reserva > R$500. Scripts novos em `scripts/` (fora do build): `staging-cleanup.ts` (hard delete com keep-list, dry-run sem `--confirm`, ordem FK-safe), `seed-staging-demo.ts`, `polish-staging-demo.ts`, `topup-staging-demo.ts`, `fix-incomplete-pf.ts`, `lib/sim-shared.ts` (helpers extraídos do daily-sim + `generateValidCNPJ`), `lib/demo-catalog.ts` (30 produtos + 12 capitais). **⚠️ Retenção: NÃO rodar `--reset`** (dados retidos p/ validação; demo usa `@demo.shareo.com.br`, não `@daily-sim.shareo.test`). Gotchas: **E2E_SECRET precisa existir no ambiente Preview do Vercel** (não só Production); dedup por título normalizado colapsa donos distintos → usar título único; review é `POST /api/bookings/[id]/reviews`. `daily-sim --env staging` (Dia 12) rodado depois — +5 usuários/itens/reservas `@daily-sim.shareo.test`, **mantidos** por decisão do usuário. **(2) Busca de usuários no admin** (PR [#41](https://github.com/robertoepifanio-byte/SHAREO/pull/41), `6ce5792`): `/admin/usuarios` ganhou busca server-side por nome/e-mail (`?q=`, contains case-insensitive direto no banco), contador adaptado e estado vazio; mantém Server Component. **(3) Termos — taxa/repasse/teto explícitos** (PR [#42](https://github.com/robertoepifanio-byte/SHAREO/pull/42), `521f8d2`): seção de Pagamentos explicita taxa 15% (via `getPlatformFeeRate`), repasse semanal (segundas) e teto R$500 — fecha o gap #4 da pauta D4. **(4) Lote de UX/copy** (PR [#44](https://github.com/robertoepifanio-byte/SHAREO/pull/44), `8db7639`): copy de repasse semanal alinhada em recebimentos/repasses/home; **ícone do cadeado ShareO** no pilar "Pagamento protegido" (`public/icons/cadeado-shareo.png`); nova **Missão e História** na página `/sobre` (com parágrafo de visão de futuro); **marcador do mapa com o pin ShareO** (`public/icons/pin-shareo.png`, anchor bottom) em `ItemsMap`; dica de ajuda "Combine retirada e devolução" sem menção a repasse na confirmação; **Programa Embaixadores** mostra os 3 tiers (Bronze/Prata/Ouro) e deriva o nível atual de `activeReferrals` (corrige "Bronze" indevido com 0 indicados) + gramática "Falta 1 indicado ativo"; **busca da Central de Ajuda movida para o hero** (Context: `HelpSearchProvider`/`HelpSearchInput`/`HelpResults`). **(5) Fix da busca da ajuda** (PR [#45](https://github.com/robertoepifanio-byte/SHAREO/pull/45), `d4e4117`): o auto-scroll disparava no 1º caractere e atrapalhava — agora digita sem rolar, contagem clicável "Ver N resultados" ao vivo, rolagem só no clique/Enter. **Todos os PRs com CI verde + deploy de staging confirmado.** Ver memória [[project-staging-demo-base]].

**⏳ s25 — Plano de campanha de pré-lançamento nacional (captação de leads → cidades-piloto)** (2026-06-17). Elaborado um **plano de marketing + habilitadores técnicos** para captar leads (nome/e-mail/cidade/UF/intenção) em todo o Brasil e, por dados, **qualificar 3–5 cidades-piloto** para a entrada em produção (pós-D4). **Status: AGUARDANDO APROVAÇÃO DOS FUNDADORES** — nada implementado ainda. Decisões de direção já tomadas pelo usuário: **mídia de verba baixa (~R$1–3k)** (orgânico + impulsionamentos geo-segmentados cirúrgicos), **escopo completo** (marketing + técnico), critério de piloto por **densidade + equilíbrio** (≥80 leads na cidade E cada lado proprietário/locatário ≥30% do total). **Diagnóstico-chave:** a captura já está 100% pronta (form VIP, `FounderLead` com city/state/intent, painel `/admin/fundadores` por cidade, convite em massa, indicação `?ref=`); as lacunas que impedem **medir/otimizar** a campanha são (1) **atribuição de canal/UTM** — hoje `app/api/founders/leads/route.ts:68` grava `source:"VIP_LANDING"` fixo, **ignorando** o `source`/UTM que o schema valida e o form envia; (2) **GA4** (ausente, CSP já permite); (3) **landing pages `/pilotos/[cidade]`** (ISR) como destino dos anúncios + isca de SEO. Plano completo salvo em `~/.claude/plans/acione-o-agente-ou-ticklish-quail.md`. Não há agente "marketing" dedicado — execução acionaria `seo-shareo`/`fullstack-dev-shareo`/`product-owner-shareo`. Ver memória [[project-campanha-prelancamento]].

**✅ s24 — Pré-lançamento de pilotos + ajustes do tester na precificação + UX/copy** (2026-06-17). **(1) Fluxo de pré-lançamento** (PR [#38](https://github.com/robertoepifanio-byte/SHAREO/pull/38), squash `6b9bb7f`): fecha o ciclo divulgação → lista de interessados → cidade-piloto → convite → 1º acesso com link de indicação. Novo **`/admin/fundadores`** (nav "Interessados", SUPERADMIN+OPERACIONAL): `FounderLead` agrupados por cidade/estado (ranking — total, intenção anunciar/alugar, PENDING/INVITED/CONVERTED, indicados via `referredById`); botão "Convidar (N)" por cidade (confirma — dispara e-mails). `POST /api/admin/founders/invite` passou a aceitar **`city`** (antes só `wave`/`state`). Nova **`/bem-vindo`** (onboarding do 1º login — `/definir-senha` redireciona p/ `/login?callbackUrl=/bem-vindo`): explica navegar (cadastro simples) × anunciar/alugar (completar) e destaca "Gerar meu link de indicação"; e-mail de convite menciona indicação. Rastreio **já estava pronto** (`/cadastro?ref=` aplica `applyReferralCode` no signup). D4: gera+acumula, payout bloqueado. **(2) Precificação do anúncio (bug do tester, 2 PRs):** a "Sugestão" semanal/mensal era calculada a partir da diária **mínima da faixa** (valor do bem), não mudava ao alterar a diária digitada → PR [#37](https://github.com/robertoepifanio-byte/SHAREO/pull/37) (`6bf90fd`) passou a basear na diária atual + botão "Recalcular"; retorno do tester pediu **automático** → PR [#39](https://github.com/robertoepifanio-byte/SHAREO/pull/39) (`3d9c4d6`): ao mudar a diária, semana/mês **não customizados** se atualizam sozinhos (× multiplicador), preservando valores digitados à mão (`weekTouched`/`monthTouched`); "Recalcular" só p/ campos customizados. **(3) UX config embaixadores** (PR [#36](https://github.com/robertoepifanio-byte/SHAREO/pull/36), `6af74e3`): em `/admin/embaixadores` o botão "Salvar" só habilita com alteração ("Sem alterações" caso contrário) + confirmação ao ligar "Payout habilitado" (pós-D4). **(4) Copy de pagamento desatualizada** (PR [#40](https://github.com/robertoepifanio-byte/SHAREO/pull/40), `9f0c258`): removidas as frases "Pagamento liberado só após confirmação da retirada" (trust box do item) e "repassado via PIX 3 dias após a devolução confirmada" (tela de sucesso) — política de repasse agora é **semanal, toda segunda-feira**. **⚠️ Deploy do #40 pendente:** o "Deploy Staging" do `9f0c258` falhou por **limite diário do Vercel free** (`api-upload-free`, >5000 uploads/dia após ~14 deploys no dia) — NÃO é código; #37/#39/#38 já subiram (auto-recalc no ar). Decisão: **re-disparar quando a cota resetar (~24h)** via `gh run rerun 27713608806 --failed`; fix futuro = `vercel deploy --archive=tgz`. Ver memórias [[project-prelaunch-pilots]] e [[project-vercel-free-upload-limit]].

**✅ s23 — Correções do painel admin + robô resiliente a 429** (2026-06-17). **(1) "Painel Admin" deslogava o admin** (bug do tester): ao clicar em qualquer rota `/admin`, o admin era redirecionado p/ Início **deslogado**. Causa: ao rebaixar/desativar um admin gravava-se `admin:blocked:<userId>` no Redis (TTL 30d), checada no `middleware.ts` via `isAdminBlocked` → redirecionava **qualquer** token daquele userId p/ `/sair`, inclusive um **login novo e válido** de admin re-promovido. Fix (PR [#33](https://github.com/robertoepifanio-byte/SHAREO/pull/33), squash `da9e3d6`): removidos `redisKey`/`blockAdminToken`/`isAdminBlocked`/`unblockAdminToken` de `lib/redis-admin-blocklist.ts`; passa a usar **só o epoch** já existente (`invalidateUserSessions`/`isSessionStale`, SEC-CRIT-04) — mata sessões **antigas** (token com `loginAt` < epoch), mas o login novo reflete o estado atual e o `authorize()` barra conta inativa; a rota admin do middleware só barra quem não é (mais) `ADMIN` pelo token. A chave órfã do `admin@shareo.com.br` foi **deletada** via REST API do Upstash staging (banco `modest-ocelot-143145`) → destravado na hora. **Senha do admin documentada estava errada** (`ShareO@2026`) → corrigida p/ **`Admin@shareo2026`** (do seed) no CLAUDE.md (`18b5f55`); `financeiro@`/`operacional@` NÃO vêm do seed (criados via UI, `d9b763a`). **(2) "Ver conversa" da disputa dava 404** (PR [#34](https://github.com/robertoepifanio-byte/SHAREO/pull/34), squash `0a1674b`): o link em `/admin/disputas` apontava p/ `/mensagens/[id]`, que faz `notFound()` p/ quem não é participante (o admin nunca é) e ainda marca como lido / abre o chat com envio. Fix: nova rota `app/admin/disputas/[id]/page.tsx` (id = conversationId) = **visão SOMENTE LEITURA** no layout admin (sem checagem de participante, sem read-receipts, sem envio; item + locatário/proprietário com selo de papel + histórico + "Ver reserva"). Verificado no preview local logado como admin não-participante: `/mensagens/<conv>`=404 (bug), `/admin/disputas/<conv>`=200. **(2b) "Ver reserva" no Financeiro/Disputas também dava 404** (PR [#35](https://github.com/robertoepifanio-byte/SHAREO/pull/35), squash `1495c52`) — mesmo padrão: os links apontavam p/ `/reservas/[id]`, gated por participante (`app/reservas/[id]/page.tsx:140`); criada `app/admin/reservas/[id]/page.tsx` = detalhe **read-only** no layout admin (partes, período, split financeiro priorizando `platformFeeAmount`/`ownerNetAmount` persistidos, observações/disputa, link p/ a conversa); os 3 links do admin (Financeiro + a conversa do #34) repontados p/ `/admin/reservas/[id]`. **Padrão geral:** página de usuário gated por participante (`/mensagens/[id]`, `/reservas/[id]`) nunca serve p/ admin → sempre criar visão read-only sob `/admin/*`. **(2c)** `admin@shareo.com.br` promovido de `ADMIN_OPERACIONAL`→**`ADMIN_SUPERADMIN`** no staging (UPDATE Prisma + bump de epoch p/ forçar re-login). **⚠️ Lição (custou 2 round-trips de CI):** criar uma **rota de página** nova faz `<a href="/rota-interna">` **pré-existentes** (em `app/admin/disputas/page.tsx` e `app/admin/page.tsx`) passarem a casar com uma página → erro `@next/next/no-html-link-for-pages`; o **cache do ESLint do Next** (`.next/cache/eslint`) mascara isso localmente (não re-linta arquivos não alterados) e só o CI pega — trocar por `<Link>` ou limpar o cache antes do push. **(3) Robô daily-sim resiliente a 429** (PR [#32](https://github.com/robertoepifanio-byte/SHAREO/pull/32), squash `fe36065`): o bypass `x-e2e-token` nunca pegou no staging (E2E_SECRET de `.env.staging-migrate` tem 32 chars, runtime usa 64) → o robô tomava 429 sob carga (ex. `--repasse`); agora o `http.json` detecta **429**, lê `Retry-After` e **re-tenta sozinho** (até 5×, teto ~65s).

**✅ s22 — Fix de comissão na reserva + copy do rodapé + Robô de Validação Diária** (2026-06-17). **(1) Comissão (bug do tester Raimundo):** a tela `/reservas/[id]` calculava a taxa como `totalPrice − dailyPrice×totalDays` → **R$ 0,00** em reserva diária (e negativo com cupom). Modelo correto (confirmado: checkout + protótipo) — o locatário paga só a locação; a ShareO **retém 15% do repasse ao dono**. Fix usando `calcSplit()` (mesma função do checkout): a tela mostra Total da locação + Taxa retida + repasse (rótulo por perfil "Você recebe"/"Proprietário recebe"); a `_PriceCalc` parou de **somar** a taxa ao total do locatário (mostrava R$ 184 numa locação de R$ 160). Rodapé: tagline trocada p/ "Por que comprar se você pode alugar? / Marketplace de geração de renda…". PR [#27](https://github.com/robertoepifanio-byte/SHAREO/pull/27) (squash `0bd57d5`) — CI + Deploy Staging + E2E Regressão verdes. **Só exibição — checkout/booking intactos.** **(2) Robô de Validação Diária** (`scripts/daily-sim.ts` + README, PR [#28](https://github.com/robertoepifanio-byte/SHAREO/pull/28) `9271f75`): acionado manual 1×/dia, simula um dia de operação (cadastro→anúncio→locação→Pix fictício→retirada/devolução→chat→repasse). **Híbrido** (decisão dos fundadores): fluxos críticos via API HTTP real (exercita gates/validações/split), apoio via Prisma. `--env local`(default)`|staging` (prod bloqueada por D4), desfechos ponderados, logs em `scripts/daily-sim-logs/`; `scripts/` fora do build/CI. **Bug de ambiente corrigido** (PR [#29](https://github.com/robertoepifanio-byte/SHAREO/pull/29) `4278af1`): `loadEnvFile` "primeiro-vence" deixava o Prisma no banco **LOCAL** durante `--env staging` (o shell já tinha `DATABASE_URL` local) → `markEmailVerified` dava P2025. Fix: `loadEnvFile` **sobrescreve** (o arquivo do `--env` é a fonte da verdade) + Prisma usa `DIRECT_URL` + `dbRetry`. `E2E_SECRET` copiado p/ `.env.staging-migrate`. **Gotcha Windows:** `npm`/`npx`/`tsx` (.ps1) são bloqueados pela política do PowerShell → usar **cmd** ou `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. **Staging validado:** Dias 1–2 rodados limpos (10 usuários / 10 anúncios; ~6 payouts pendentes). **⚠️ Regra de retenção (instrução do usuário):** os dados PERMANECEM até a exclusão ser explicitamente solicitada — **não rodar `--reset`**. Guias `docs/guia-robo-validacao-diaria.{md,html}` mantidos **locais** (não versionados — decisão do usuário).

**✅ Release v1.6.0 — Cadastro progressivo + LGPD + Convite-piloto** (sessão s21, 2026-06-16 — PR [#26](https://github.com/robertoepifanio-byte/SHAREO/pull/26) mergeado em `main` `66bcef7`; CI 100% verde incl. E2E Playwright). Revisão do cadastro a partir do PDF dos fundadores, em 3 frentes. **(A) Cadastro progressivo:** o signup passa a ser **mínimo** (nome/e-mail/senha/cidade/estado) só para navegar; o **cadastro completo** (CPF/CNPJ + endereço) é exigido **apenas ao Anunciar ou Alugar**. Novo `User.profileCompletedAt` (+ `ageDeclaredAt`) com migration idempotente aplicada em **local e staging** (`fflpuoluiqmhpvcxubqi` via `db execute` — staging é gerido por `db push`, NÃO `migrate deploy`); página `/cadastro/completar` + `PATCH /api/users/me/complete-registration`; gates lendo do banco em `itens/novo`, `POST /api/items` e `POST /api/bookings` (403 `REGISTRATION_INCOMPLETE`) + CTA em `_PriceCalc`; helpers extraídos (`lib/registration`, `lib/forms/{masks,address}`, `lib/geocodeUser`). **Pegadinha:** `middleware.ts` tratava `/cadastro/*` como guest-only (`startsWith`) → usuário logado era jogado p/ `/dashboard` antes da página de completar rodar; `/cadastro/completar` foi excluído da regra (a página exige login). **(B) LGPD:** `lib/legal-config.ts` como fonte única de `CONSENT_VERSION`/`DPO_EMAIL` (reconcilia o `v1.0`/`v1.1` divergente); finalidade no ponto de coleta + canal do DPO no form; declaração de 18+ **persistida** (`ageDeclaredAt`); bairro opcional explícito. Itens jurídicos (idade documental, split PF×PJ, menores, RIPD) ficam **[D4]**. **(C) Convite-piloto:** `FounderLead` ganha `city`/`state` (região dos pilotos, capturados no `FounderCaptureForm`); fluxo "senha no 1º acesso" reaproveitando `PasswordResetToken` (`lib/founderInvite` + e-mail), página `/definir-senha/[token]`, `reset-password` marca o lead `CONVERTED`, trigger admin `POST /api/admin/founders/invite`. **Verificação:** build/tsc/lint/jest (450 testes) + E2E Playwright verdes; fluxo signup→gate→completar→anunciar/alugar testado no preview; CPF cifra/decifra ok. Bug do próprio PR corrigido na revisão: gate em `POST /api/items` quebrava o teste de integração (mock sem `user.findUnique`) e 2 specs E2E (signup mínimo não anuncia direto) — ambos ajustados antes do merge. **Pós-merge:** release `v1.6.0` (tag + GitHub Release, `746d718`); o workflow Deploy buildou+deployou no staging, rodou as migrations (resolve+deploy) e a **E2E Regressão Contínua (Staging) passou em 3m54s**; `Deploy Production` permanece gated por D4.

**🔒 Fix de segurança — Data API do Supabase exposta (staging)** (sessão s20, 2026-06-16). Alerta crítico do Supabase `rls_disabled_in_public` no projeto staging `fflpuoluiqmhpvcxubqi` era **real**: com RLS desligado (decisão arquitetural — NextAuth, não Supabase Auth) **+ a Data API (PostgREST) expondo o schema `public` para a chave `anon`** (pública, vai no bundle), qualquer um lia/editava/apagava todas as tabelas via `GET /rest/v1/<tabela>` (comprovado: `users` com anon = 200+linhas). **Fix (dashboard, Opção A):** Settings → API → Data API → **remover `public` dos Exposed schemas**. Resultado validado: REST anon = **404** ✅ · app/Prisma = **200** ✅ · **chat Realtime funcionando** ✅ (serviço separado, publication `supabase_realtime`, independente da Data API). **NÃO ligar RLS** (quebraria o Realtime — sem Supabase Auth não há policy). O alerta é check estático da flag RLS → pode persistir mesmo com o risco fechado. ⚠️ **Replicar na produção pós-D4** (e nunca pôr `E2E_SECRET` no runtime de prod — SEC-MAJ-07).

**✅ CI 100% verde — Lighthouse + drift de migrations + contraste/a11y + E2E resiliente** (sessão s20, 2026-06-16 — PRs [#21](https://github.com/robertoepifanio-byte/SHAREO/pull/21)/[#22](https://github.com/robertoepifanio-byte/SHAREO/pull/22)/[#23](https://github.com/robertoepifanio-byte/SHAREO/pull/23)/#25, `main` `d25eb71`→`c8c34be`). Todos os jobs verdes: **Build/Lint/Tests/Security/E2E local** (CI) + **Deploy Staging/E2E Regressão Contínua** (Deploy). **(1) Gate Lighthouse:** o `.lighthouserc.json` usava `preset: "lighthouse:no-pwa"` que assert cada audit individual em error (unused-js/css, bf-cache, meta-description, errors-in-console) — derrubava o Build mesmo com as **categorias** passando. Preset removido → gate só por categoria (perf≥0.75/a11y≥0.9 error; resto warn), que é a intenção já documentada no workflow. `errors-in-console`/`meta-description` eram transientes (propagação de deploy). **(2) Contraste/a11y:** token `destructive` #E74C3C (3.82:1, reprova AA) → **#C0392B** (5.44:1), hover #A93226; `_EnderecoForm` text-red-500→text-destructive; label-content-name-mismatch (logo/CTA), image-redundant-alt (`CategoryIcon` ganhou prop `decorative`), aria-allowed-role (`role="listitem"`→wrapper `display:contents`). axe local = **0 violações**. **(3) Drift schema×migrations** (fixar o Build destravou o job E2E local dormante → seed quebrava com `column isFounder does not exist`): várias features foram sincronizadas ao staging via `prisma db push` **sem migration** (Programa Fundadores, email-verify, tabelas `booking_photos`/`contract_acceptances`/`founder_audit_logs`, enums `CheckPhase`/+IdVerificationStatus/+NotificationType, colunas de `bookings`). DDL autoritativo gerado via `prisma migrate diff --from-url <DB pós-migrate-deploy> --to-schema-datamodel` no Postgres limpo do CI → **3 migrations idempotentes** (`20260616000000_add_founder_program`, `..001_add_enum_values` [ADD VALUE isolado], `..002_sync_remaining_drift`) que funcionam em DB limpo (CI/prod cria) e no staging (db push → no-op). **Fecha também o risco da prod futura** (DB novo por migrations estaria incompleto). **(4) E2E local** escopado p/ os specs "plan" de fluxo (espelha a Regressão de Staging; security*/cron ficam fora). **(5) E2E Regressão de Staging:** `e2e/_support.ts` `apiWithRetry()` (retry 5xx/429, backoff até ~12s) absorve 500 do pool free; **registro honra o bypass `x-e2e-token`** (`/api/auth/register` passa `req` ao checkRateLimit) com `E2E_SECRET` fiado no GitHub Secret + Vercel runtime + job CI. **Causa raiz final dos 429:** o secret `STAGING_URL` apontava p/ um deployment/alias **sem `E2E_SECRET` em runtime** — diagnóstico no CI (`echo ${#E2E_SECRET}`=64 + curl do runner: 429 vs bypass em `staging.shareo.com.br`) isolou o problema → **`STAGING_URL`→`https://staging.shareo.com.br`** → regressão **verde** (zero 429). Armadilha Windows: `prisma generate` dá EPERM com o dev server do preview rodando (lock na query_engine DLL) — usar `npx next build`.

**✅ Backlog s15–s19 registrado + P2 fechado + `/comunidade` no footer** (sessão s20, PR [#20](https://github.com/robertoepifanio-byte/SHAREO/pull/20), `d25eb71`). Backlog v3.9: nova seção "Deltas s15–s19" (staging ao vivo, e-mail do app, domínio próprio, categoria Eletrodomésticos, ícones PWA). P2 #7/#8/#9/#10 marcados concluídos — ícones/screenshots PWA, `/sobre`, `/politicas`, `/suporte`, `/comunidade` já com conteúdo real (não eram mais stubs). `/comunidade` adicionada ao footer (única sem discoverability); `/suporte` e `/politicas` ficam por URL direta (redundantes com `/ajuda`, `/termos`, `/privacidade`).

**✅ Categoria "Eletrodomésticos" + ícone por slug + novo ícone PWA + higiene de repo** (sessão s19, 2026-06-16 — `main` `30dd1fc`→`064fb74`, deployado e validado em staging). **(1) Rename de categoria:** "Casa e Cozinha" → **"Eletrodomésticos"** com slug `casa-jardim` **preservado** (não quebra URLs `?categoryId` nem itens). O nome é lido do **DB** (`categories.name`) em runtime em `/` e `/itens` → `UPDATE` aplicado nos **dois** Supabase (local `jtianehxosfdrhjzqvqj` + staging `fflpuoluiqmhpvcxubqi`) + textos de UI (`prisma/seed.ts`, `_Calculadora`, `_EarningsCalc`, `ImportForm`, hero da home). **(2) `CategoryIcon` resolve o ícone por SLUG**, não pelo nome exibido (`LUCIDE_BY_SLUG` + nova prop `slug`; as queries passam a selecionar `slug`) — renomear o rótulo nunca mais derruba o ícone. **Lição:** o DB muda na hora, mas o código precisa de **deploy**; aplicar o rename só no banco deixou o staging com rótulo novo **sem ícone** até o deploy do código. **(3) Novo ícone PWA da tela inicial** a partir do logo "SO": `pwa-icon-192/512` (any), `pwa-icon-maskable-512` (maskable, safe-zone 80% sobre navy `#001B53`) e `public/icons/shareo-logo.png` (apple-touch — **estava 404**). Fonte única `public/logos/pwa-icon-source.png`; `scripts/generate-pwa-icons.mjs` reescrito para gerar tudo a partir dela (antes desenhava o wordmark "SHARE•O" proceduralmente). **(4) Higiene de repo:** `.obsidian/` (config local do app Obsidian, versionada indevidamente) removida do git (`git rm --cached`) + adicionada ao `.gitignore`. **Validação:** deploy confirmado por hash dos assets + HTML do staging (card "Eletrodomésticos" com ícone `casa-jardim`, `maskable` 200, manifest novo). `main` local estava apenas **atrás** de `origin/main` (não divergente — `c506bba` já estava upstream) → fast-forward; branches temporárias (locais + remota `feat/…`) removidas. **Nota PWA:** o ícone na tela inicial de um celular que já tem o app instalado só troca após remover e re-adicionar (PWA faz cache do ícone).

**✅ Crítica externa (Copilot) analisada read-only + release v1.5.0 + 4 ondas de melhoria** (sessão s15, jun/14 — PR [#13](https://github.com/robertoepifanio-byte/SHAREO/pull/13) mergeado via rebase em `main`, commits `ef85d5f`→`538d35c`). Crítica genérica de Design/Usabilidade/Segurança avaliada por **2 subagentes read-only** (designer + segurança) contra o código: **~85% (design) e ~95% (segurança) improcedente** — refutada ponto a ponto com evidências `arquivo:linha`; a única verdade embutida é de **percepção** (o trabalho de design/segurança não é visível a um avaliador externo que só lê o HTML público). Cortada a release **[`v1.5.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.5.0)** como baseline pré-melhorias (consolida hardening s13+s14; `package.json` sincronizado 1.3.0→1.5.0, corrigindo drift herdado da v1.4.0). Os poucos gaps reais corrigidos em **4 ondas**: **(1 — a11y/UI)** token `muted` declarado em `tailwind.config.ts`, `text-accent`→`text-success` no `FounderCaptureForm` (contraste 2.1→5.1:1, WCAG AA), data da privacidade jan/2025→jun/2026; **(2 — UX)** toasts Sonner (estavam montados no layout mas **inertes** — zero `toast()` em runtime) ligados em favoritar, toggle ativo/pausado e ações de booking; **(3 — visibilidade)** nova página `/seguranca` (linguagem leiga, sem expor detalhes sensíveis), `public/.well-known/security.txt` (RFC 9116), link + trust badges no footer; **(4 — hardening)** `lib/ssrfGuard.ts` agora resolve DNS (`dns.promises.lookup`) e valida cada IP → mitiga **DNS rebinding** + 42 testes unitários, e nota no `middleware.ts` documentando por que `style-src 'unsafe-inline'` permanece (Tailwind/Mapbox). **Validação:** `tsc --noEmit` limpo + **42/42 testes ssrfGuard verdes** (inclui DNS rebinding + fail-closed). **Follow-ups pós-MVP:** TOCTOU residual de DNS (exigiria IP pinning), migração `style-src`→hash SHA-256.

**✅ Auditorias críticas s13 + s14 + hardening de segurança aplicado e validado** (commits `26bbeb5`→`e8c54dc`, jun/13–14). Duas auditorias **read-only multi-aspecto** (QA/E2E + Segurança + Arquitetura, delegadas a subagentes), consolidadas em `docs/backlog-atividades-priorizadas.md` v3.8, com **reverificação do orquestrador** antes de agir. **Resolvidos e validados** (todos sem dependência externa, deliberados com o fundador):
- **s13** — stored XSS no JSON-LD (`lib/jsonLd.ts`), crons **fail-closed**, validação MIME+magic-bytes em uploads (`lib/imageUpload.ts`), **invalidação de sessão pós-troca de senha** (claim `loginAt` + epoch Redis — Caminho B sem migration), headers **COOP + CSP frame-ancestors**, `pickupToken` via `crypto.randomInt`, truncamento de lat/lng, remoção de código morto, + **10 specs E2E** cobrindo gaps (commits `26bbeb5`/`8563b03`/`ef38d34`/`57841b6`/`21ecc69`).
- **s14** — **3 Critical**: idempotência do webhook Stripe via `StripeEventQueue`; **TOCTOU** no booking `confirm` (`$transaction` serializável); TOCTOU no `mark_active` (`updateMany` condicional). Gaps de cobertura completados: lat/lng em `/api/items/[id]`+SSR; invalidação de sessão estendida a **mobile/Bearer** e **reset-password**. 2ª onda: **SSRF guard** em webhooks PJ (`lib/ssrfGuard.ts`), **CSV formula-injection** no export, **admin-role granular**, `geocodeUserLocation` via `after()` (commits `8eaf50b`/`e8c54dc`).
- **Validação:** ciclo booking PENDING→COMPLETED verde no staging; lat/lng truncada confirmada via curl; SSRF guard 9 casos unit; `session-invalidation` E2E verde. `tsc`+`build` verdes em todas as ondas.
- **Lição reforçada:** sempre reverificar achados de subagente — o s13 teve 3 falsos positivos (SEC-CRIT-03, SEC-MIN-10, middleware:99); o s14 foi bem mais preciso.
- **Permanecem para deliberação:** `pickupToken @unique` (migration), PlatformConfig cache (staleness×perf), error-envelopes/ownership-helper (refactor amplo), upload-limit drift (copy/produto), GAP-M-07b, + dependência externa (D4, rotação de secret no Vercel, upgrade de deps, decisões de produto, NextAuth GA).

**✅ Os 2 bugs funcionais reais da suíte E2E corrigidos e validados verde** (commits `767d834`→`14c51f2`, jun/13 s12). A triagem da suíte de staging (s11b: 240✅/17❌) tinha isolado apenas **2 falhas reais** — o resto é artefato de ambiente (BASE_URL, dados de teste, rate-limit sequencial). Ambas agora resolvidas e revalidadas (`6 passed` re-rodando `e2e-a11y-plan` + `phone-verification` com `BASE_URL`+`STAGING_URL` corretos). **(QA-14)** `POST /api/auth/phone/send-otp` passou a autenticar **antes** de validar o body → **401** sem sessão (era 400); stub retorna 422 enquanto a integração Zenvia + migration de schema seguem pendentes (decisão Raimundo). **(QA-01)** As 3 violações de contraste WCAG AA eram o **mesmo elemento** — footer "Desenvolvido por Pratika IA" em 3 páginas públicas. Causa: o footer tem fundo **verde `#007B3C`** (não navy) — branco a 80% dá 4,03:1 (reprova os 4,5:1), corrigido para **`text-white/90`** (4,67:1, alinhado ao resto do footer que já passava). `tsc`+`lint`+`build` ✅. Lição reforçada: conferir o fundo real do elemento antes de escolher o alpha (footer = verde; hero/menus = navy). Higiene de repo na mesma sessão: `.gitignore` ampliado para artefatos não-fonte (PDFs na raiz, `k6/last-summary.json`, PNGs de teste de logo, screenshots de debug, `.critique/`, relatório desempacotado).

**✅ Auditoria técnica por 6 aspectos + execução dos 5 achados** (commits `5cf77c1`→`7eb66c2`, jun/13 s9). Novo `relatorio-auditoria-tecnica.html`: cada aspecto (Performance/UX/Design/Funcionalidades/Segurança/Estratégia) verificado contra o código — nota geral **A−**; riscos genéricos de template desmontados com evidência (não é SPA → SEO 100; XSS em forms não se aplica → Zod+CSP). Os 5 achados sem bloqueador foram **todos executados** (`e04d6a1`, `206a259`): **(P1)** `public/icones/` removido (~15 MB, zero refs — os usados ficam em `public/icons/` EN); **(P2)** PWA icons 944 KB→10/64 KB via sharp (fonte era 1254px); **(P2)** 10 `<img>`→`next/image` — 3 previews `blob:` mantidos de propósito (next/image não otimiza object URL); **(P3)** Mapbox `ItemsMap` com `onError` (degrada só se não carregar) + Resend `sendWithRetry` nos e-mails críticos (verificação/reset) em `lib/email.ts`; **(P3)** baseline Lighthouse **mobile** (Perf 92 · A11y 97 · BP 96 · SEO 100 · LCP 1.6s · CLS 0.008) em `docs/lighthouse-baseline-mobile.md` (o anterior era desktop, só perf 97). `tsc`+`lint`+`build` ✅. Os dois relatórios executivos também atualizados (`033c4c0`): **207 funcionalidades / 27 categorias / 52 endpoints**.

**✅ Avaliações exibidas por completo** (commit `cdf677f`, jun/12). O form de avaliação já coletava emoji de satisfação, critérios por estrela (P3-67/68/69) e foto do item em uso, mas esses dados nunca eram exibidos. Novo `components/reviews/ReviewDetails.tsx` renderiza tudo nos cards de avaliação da página do item e do perfil público. Os demais itens do bloco "features médias" já existiam: badges/Conquistas no perfil público, templates de chat, webhooks PJ.

**✅ Re-auditoria de promessas — v2.0** (commit `409b547`, jun/12). Cada um dos 64 itens da v1.0 foi verificado contra o código: **32 já resolvidos** (a v1.0 ficou obsoleta no mesmo dia e continha erros de catalogação — ex.: webhooks PJ já existiam completos). Doc reorganizado por bloqueador: 9 itens D4, 11 decisão de fundadores, 6 executáveis sem bloqueador (verificação PIX, k6, KPIs GA4, cupom por avaliar, dicas de anfitriões, gate Lighthouse), 6 H2/H3. Regra nova: verificar UI no código antes de declarar item "sem UI".

**✅ Fix crítico — e-mails de verificação não chegavam + links 404** (commits `28ca951`–`5c55582`, jun/12). Duas causas raiz: (1) e-mails disparados fire-and-forget morriam quando a lambda congelava após a resposta — `after()` do `next/server` aplicado em ~30 rotas; (2) `NEXTAUTH_URL` vazia no Vercel + fallback com `??` (que não captura string vazia) gerava links quebrados — criado `lib/app-url.ts` com `||` + strip de barra final, e a var foi recriada limpa no Vercel. UI de reenvio em `/perfil/seguranca` agora mostra o motivo real (429 → "limite atingido, tente em N minutos" via Retry-After; rate limit é 3/hora).

**✅ Bloco rápido jun/12 s7b** (commit `1c6a7dc`). (1) Stats da homepage agora reais do banco: itens disponíveis, proprietários ativos, avaliação média (mín. 5 reviews) e categorias — staging mostra 27 itens / 2 proprietários (decisão aberta: fundadores podem preferir copy aspiracional). (2) Ordenação "Mais alugados" (`?sort=rented` por contagem de bookings) no Explorar. (3) E2E PriceCalc estabilizado — 18/18 em 3 execuções paralelas (fix de race de hidratação + seletor escopado) + teste novo do teto R$500. (4) Verificado que já existiam (doc promessas desatualizado): link Indicações, filtro minRating, cron ambassador-decay. (5) P1/P2 sem bloqueador (`287c64c`): getAutoCancelConfig, getPayoutWindowDays, getUploadLimits, RATE_LIMITS nomeado em 13 endpoints, alerta R$500 no PriceCalc, `await` em payout.create. Suíte: 23 suítes / 408 testes ✅.

**✅ Staging re-seedado por capitais** (jun/12). 29 itens demo antigos de Natal soft-deletados (preservados itens E2E — a "Câmera Fixture E2E Smoke Test" tem 235 bookings da suíte); `seed-demo-items.ts` recriou 21 itens, 3 por capital (SP, RJ, BH, Curitiba, POA, Salvador, Recife), **todos com foto validada**. Regra: só sobe item com foto — os 8 itens do `prisma/seed.ts` (sem imagens) não foram recriados. Validado no banco e na API pública.

**✅ Fixes UI da sessão jun/12** (commits `9a7e395`–`031ed30`). (1) Badge do sino zera ao ler a mensagem — abrir conversa marca notificações `NEW_MESSAGE` como lidas + novo `PATCH /api/notifications/[id]/read` + clique individual no dropdown (optimistic). (2) Compartilhamento embaixador: og:description do /cadastro e template WhatsApp reescritos. (3) Endereço: dados salvos exibidos; placeholders "Ex: …" removidos; criar conta sem cidade/UF pré-preenchidos. (4) Telefone do perfil: placeholder "55 99 999999999" + normalização para `+55DDDNÚMERO` no submit.

**✅ Lançamento nacional — referências a Natal/RN removidas** (commit `7b83b4a`, jun/12). Decisão dos fundadores: o ShareO lança em âmbito nacional. UI sem Natal/RN hardcoded (placeholders, Lista VIP, e-mails de fundador, metadados "em todo o Brasil"); depoimentos fictícios com cidades variadas (SP/BH/Curitiba/POA); mapa default centra no Brasil (zoom 4) para usuário sem cidade; /sobre sem o stat "cidade de origem". Seeds (`prisma/seed.ts`, `scripts/seed-demo-items.ts`) espalham itens por 8 capitais. ADR-002 e ADR-015 receberam notas de atualização (premissas geográficas superadas). Cidade real do usuário logado continua exibida normalmente.

**✅ Bugfix crítico — pickupToken no fluxo PIX** (commit `db9397d`, jun/10). O token de retirada só era gerado pelo webhook do Stripe; no fluxo PIX (MVP) o `mark_active` falharia sempre com `TOKEN_REQUIRED`. Agora o token é gerado no `confirm` quando ainda não existe, e o `GET /api/bookings/[id]` retorna o token (locatário exibe o código). Suite nova `e2e/features-jun09.spec.ts`: **16/16 ✅** (token, actualTime, multiplicadores, 3 fotos, taxa dinâmica). booking-flow 5/5 ✅, financeiro 40/40 ✅ (testes defasados corrigidos: 7 cards de métricas, locator de hrefs).

**✅ Crítica de design implementada — 3 prioridades** (commits `e62e8ef`/`8998860`, jun/10). (1) Seed de demonstração: `scripts/seed-demo-items.ts` — 21 itens com fotos Unsplash validadas, 3 por categoria, bairros reais de Natal; listagem deixou de mostrar itens de teste com imagem preta. (2) Detalhe do item mobile: grid com `order` — preço + CTA "Solicitar locação" acima da dobra, antes da descrição. (3) `/ajuda`: guias "Primeiros Passos" em `<details>` fechados por padrão — altura mobile caiu de ~16.100px para ~9.600px (FAQs já tinham accordion+busca via `HelpSearch`).

**✅ Taxa da plataforma 100% dinâmica** (commit `31068af`). Zero hardcodes de "15%" em todo o codebase — sempre lido de `PlatformConfig` via `getPlatformFeeRate()`. Multiplicadores semanal (3×) e mensal (15×) configuráveis pelo SuperAdmin em `/admin/financeiro`. Central de ajuda, calculadoras e todas as páginas de conteúdo atualizam automaticamente quando o SuperAdmin altera a taxa.

**✅ Módulo Financeiro MVP completo.** Fases 0–4 implementadas e deployadas em staging (commit `65cbf67`). Fluxo financeiro ponta-a-ponta: PIX cadastrado → checkout com split → payout automático → four-eyes admin → chargebacks → exportação CSV → informe IR → relatório mensal. Suite E2E financeiro: **33 testes** (suite base: 87 passed). ADRs 012–020 documentados.

**✅ Gestão de admins via UI** (commit `d9b763a`). Tela `/admin/usuarios/admins` exclusiva para SUPERADMIN: criar admins, alterar `adminRole` por dropdown, ativar/desativar — todas as ações auditadas no `AdminLog`. Admins criados nos dois bancos (local + staging): `admin@shareo.com.br` (SUPERADMIN), `financeiro@shareo.com.br` (FINANCEIRO), `operacional@shareo.com.br` (OPERACIONAL).

**✅ Conteúdo pós-módulo financeiro atualizado** (commit `d9b763a`). Central de ajuda, ganhar/page, Seguranca, reservas/sucesso: taxa corrigida para 15%, caução removida do MVP, PIX + hold 3 dias documentados, limite R$ 500, rota real informe IR. Hero: "casa e jardim" → "casa e cozinha".

**✅ Segurança admin hardening (sessão noite jun/05)** — commits `a75c015`→`4148f30`. Nav filtrada por role, guards em todas as rotas admin, blocklist Redis (Edge-compatible), rate limiting, audit log antes/depois, invalidação de sessão pós-troca de senha, formulário inline de senha para admins, tsconfig corrigido, ESLint a11y corrigido, SENTRY_AUTH_TOKEN expirado removido, webhook Vercel reativado via CLI.

**✅ Testes E2E admin** — `e2e/admin-usuarios.spec.ts` — **28 passed / 0 failed / 6 skipped** (por design) contra staging `shareo-rouge.vercel.app`. Sessions fixture: `session-admin.json`, `session-financeiro.json`, `session-operacional.json`.

**✅ Validação manual staging** (05/06/2026) — todos os fluxos validados: login por role, restrições de rota, painel financeiro, exportação CSV, contas PIX, segurança admin, gestão de admins.

**✅ UX admin segregada** (commit `46ea0e6`) — link "Painel Admin" no dropdown/mobile; menu "Anunciar" oculto para admins; seção "Atividade" substituída por atalhos admin; banner upgrade PJ oculto em `/perfil`.

**✅ P0 sem bloqueador externo resolvidos** (jun/12). (1) 6 scripts temporários deletados do repo. (2) 4 hardcoded P0 movidos para `PlatformConfig`: política de cancelamento (horas + percentuais), thresholds de tier embaixador (Prata/Ouro), janela de referral e multiplicador de late fee. Cada um tem função assíncrona em `lib/platform-config.ts` com fallback para o valor anterior como default. TypeScript limpo.

**✅ Auditoria de promessas — 64 itens catalogados** (jun/12). PO levantou todas as features prometidas (ADRs, schema, protótipo, backlog) que ainda não estão implementadas ponta-a-ponta. Documento completo em `docs/promessas-nao-implementadas.md`. Bloqueadores identificados: D4 trava 8 itens críticos; 16 valores hardcoded sem bloqueador externo (P0–P2); 7 gaps protótipo vs. app. Top P0 imediatos: scripts temporários, `/politicas` stub, limiares embaixador hardcoded, janela referral hardcoded, política de cancelamento hardcoded.

Próximo passo: resolver P0 sem bloqueador externo (hardcoded + scripts) → aguardar D4 (jurídico) para go-live em produção.

---

## Fases concluídas

| Fase | Destaques |
|---|---|
| **H1 MVP** | Auth JWT, CRUD itens, busca/filtros, chat Supabase Realtime, avaliações, favoritos, admin |
| **H2 Growth** | E-mail transacional (Resend), analytics PJ, vitrine `/loja/[slug]`, CSV import, PJ Premium |
| **H3 Scale** | Stripe Checkout Sessions, late fee, outbound webhooks, React Native scaffold |
| **Pós-H3** | SEO (sitemap/robots), PWA (manifest/service worker), geocoding automático, mapa Mapbox |
| **v2 UX** | Paleta Navy/Verde, BookingProgressBar (5 etapas), FilterBottomSheet, StickyBookingCTA |
| **Pós-v2** | Confirmação devolução bilateral, status DRAFT p/ itens sem foto, área de perfil (7 sub-páginas) |
| **Sessões jun/04** | Nav reestruturada (dropdowns), HelpButton, MobileMenu expansível, pills de categoria 2 linhas |
| **Módulo Financeiro (jun/05)** | PIX, split, payout, four-eyes, chargebacks, exportação CSV, informe IR, relatório mensal |
| **Sessão jun/05 tarde** | Gestão de admins via UI, conteúdo central de ajuda corrigido, admins criados em local + staging |
| **Sessão jun/05 noite** | Hardening segurança admin (nav por role, guards, blocklist Redis, rate limit, audit log, senha inline), E2E admin spec, fix build Vercel (Sentry + Edge Runtime + tsconfig + a11y) |
| **Sessão jun/05 tarde/noite 2** | E2E admin 28/0/6 ✅ contra staging, validação manual completa ✅, UX admin segregada (Painel Admin no menu, Anunciar oculto para admins, atalhos admin no dropdown/mobile, banner PJ oculto) |
| **Sessão jun/06** | GitGuardian fix (senhas movidas para env vars, histórico scrubado), id-docs bug fix (getPublicUrl → storage path), security2 25/0/3 ✅, security3 12/12 ✅ (smokes #23-#27), fix crítico: middleware retorna 401 para /api/* sem auth (era 307 redirect) |
| **Sessão jun/09** | Token retirada + endereço anti-golpe, prazo por horário real, repasse segundas, 3 fotos MVP, multiplicadores SuperAdmin, taxa 100% dinâmica, STATUS.md + relatório executivo com arquitetura produção, briefing D4 |
| **Sessão jun/10 manhã** | Bugfix pickupToken PIX (gerado no confirm), fix a11y labels painéis retirada/devolução, e2e/features-jun09 16/16 ✅, crítica de design + 3 prioridades (seed demo 21 itens, detalhe mobile CTA acima da dobra, /ajuda accordion −40% altura), testes defasados corrigidos (financeiro 7 cards, ajuda-plan taxa dinâmica) |
| **Sessão jun/10 tarde/noite** | Verificação de identidade: e-mail de resultado aprovação/rejeição (sendIdVerifiedEmail + sendIdRejectedEmail via Resend), fix upload mobile (removido capture forçado, compressão Canvas client-side máx 4MB), hint câmera na selfie, log detalhado erro Supabase, bucket id-docs criado no staging. Backlog v3.2: item P3 #25 verificação celular Zenvia (decisão Raimundo). Aguarda deploy manual (`npx vercel --prod`) para tester validar. |
| **Sessão jun/11** | Programa de Embaixadores (ADR-022): schema com AmbassadorProfile/Referral/AmbassadorCommission, migration local, lib/ambassador.ts (funções puras), lib/referral.ts reescrito (Referral PENDING em vez de ReferralCredit), webhook Stripe integrado, cron ambassador-decay, /api/ambassador/consent, /perfil/embaixador (painel tier/link/histórico), /admin/embaixadores (métricas + config SuperAdmin). Payout bloqueado (ambassadorPayoutEnabled=false) até D4. Commit 538b7f4. |

---

## Módulo Financeiro — Detalhe (jun/05)

| Fase | Itens | Commit |
|---|---|---|
| Fase 0 | ADRs 012–017 | `2ef6445` |
| Fase 1 | AdminRoles, schema financeiro, cadastro PIX, checkout split, teto R$500 | `2ef6445` |
| Fase 2 | Cron payout, trigger 3 dias, dashboards GMV/receita, audit log, four-eyes | `2ef6445` |
| E2E base | 21/22 testes passando | `80e7640` |
| Fase 3 | FIN-7 chargebacks (webhook dispute) | `31082cf` |
| Fase 3 | FIN-8 exportação CSV síncrona/assíncrona + ExportJob | `8038c8f` |
| Fase 4 | Informe IR, relatório mensal, card reavaliação Stripe Connect | `b66490c` |
| Docs | ADRs 018–020, CLAUDE.md atualizado | `65cbf67` |

**Decisões dos fundadores (D1–D4):**
- D1: PIX no MVP, Stripe Connect BR reavaliado ~dez/2026
- D2: Sem caução, teto R$500 por transação
- D3: AdminRoles implementadas (SUPERADMIN, FINANCEIRO, OPERACIONAL)
- D4: Consulta jurídica pendente — **go-live produção bloqueado até retorno**

---

## Infra e ambiente

| Item | Status |
|---|---|
| Staging Vercel (`shareo-rouge.vercel.app`) | ✅ Deployado |
| Supabase staging (`fflpuoluiqmhpvcxubqi`, sa-east-1) | ✅ Ativo — migrations 000000–000002 aplicadas |
| Supabase local dev (`jtianehxosfdrhjzqvqj`) | ✅ Ativo |
| CI/CD GitHub Actions (lint → test → build → deploy) | ✅ Ativo |
| UptimeRobot em `/api/health` (5min) | ✅ Ativo |
| Vercel Cron — reminders, auto-cancel, expire, return, reengagement, payout | ✅ Ativos |
| Vercel Cron — monthly-report (1º/mês 12h UTC) | ✅ Registrado em `vercel.json` |
| Sentry (`sentry.client/server/edge.config.ts`) | ✅ Source maps + alertas ativos |
| Upstash Redis (rate limiting) | ✅ Ativo |
| PWA | ✅ Ícones + screenshots + service worker validados |
| Supabase **production** | ⏳ Aguarda D4 (consulta jurídica) |

---

## Testes

| Suite | Status |
|---|---|
| Unit — `bookings`, `pricing`, `crypto`, `auth`, `rateLimit`, `middleware`, `haversine`, `co2`, `format`, `geo` | ✅ Escritos |
| Integration — `bookings/patch`, `bookings/reviews`, `auth/register`, `conversations/messages`, `items/get/post/patch` | ✅ Escritos |
| E2E Playwright staging — suite base | ✅ **87 passed / 0 failed / 20 skipped** |
| E2E Playwright — módulo financeiro (`e2e/financeiro.spec.ts`) | ✅ **33 testes** (21 base + FIN-7/8/Fase4) |
| E2E Playwright — `e2e/security2.spec.ts` (smokes #18–#22) | ✅ **25 passed / 0 failed / 3 skipped** contra staging |
| E2E Playwright — `e2e/security3.spec.ts` (smokes #23–#27) | ✅ **12 passed / 0 failed / 12 skipped** contra staging |
| `coverageThreshold` — 70% para `pricing`, `crypto`, `bookings` | ✅ Configurado |

---

## Releases

| Tag | Commit | Data | Descrição |
|---|---|---|---|
| `v1.5.0` | `80946df` | 2026-06-14 | Hardening de Segurança (auditorias s13+s14) — baseline; +4 ondas pós-crítica Copilot até `538d35c` |
| `v1.4.0` | `823387b` | 2026-06-13 | Configurabilidade, Conformidade & Auditoria Técnica (29 commits desde v1.3.0) |
| `v1.3.0` | `60b5b92` | 2026-06-12 | Lançamento Nacional + Programa de Embaixadores |
| `v1.2.0` | `e20c1e9` | 2026-06-10 | Módulo financeiro + segurança locação + UX |
| `v1.0.0` | `40d1a2b` | 2026-06-04 | Staging validado — ponto de recuperação estável |
| `v1.0` | — | pré-v2 | Estado antes da v2 UX |

---

## Pendências antes de produção

### ✅ P0, P1, P2 — Todos concluídos
### ✅ Módulo Financeiro MVP — Completo

### ⏳ Bloqueadores de produção

| Item | Detalhe |
|---|---|
| **D4 — Consulta jurídica** | Nenhum go-live em produção antes do retorno do jurídico |
| **Supabase production** | Criar 3º projeto Supabase isolado + GitHub environment `production` com Required Reviewers |
| ~~**Validação manual staging financeiro**~~ | ✅ **Concluída** — todos os fluxos validados em 05/06/2026 |

### 🟢 Próximas frentes (pós-produção)

| Item | Detalhe |
|---|---|
| FIN-6 — Caução | Implementar após V1-Financeiro estável em produção |
| Stripe Connect BR | Reavaliação prevista ~dez/2026 (D1) |
| IR — PDF formal | ADR-019: sem PDF no MVP, adicionar em V1+ se houver demanda |
| Relatório mensal por e-mail | ADR-020: V1+ quando SendGrid/Resend configurado |
| P3 backlog | Lighthouse, k6, gamificação, Expo, CO₂ — ver `docs/backlog-atividades-priorizadas.md` |

---

## Decisões técnicas consolidadas

| Decisão | Escolha |
|---|---|
| Auth | NextAuth.js v5 — JWT sem PrismaAdapter (`authorize()` → `prisma.user.findUnique` direto) |
| RLS | **Desabilitado** — incompatível com PgBouncer. Segurança via `ownerId !== session.user.id → 403` |
| Upload | Supabase Storage via service role key server-side |
| Geocoding | Mapbox API fire-and-forget em `lib/geocodeItem.ts` |
| Filtro distância | Haversine em JS pós-fetch (não no Prisma) |
| NEXT_PUBLIC_* no Vercel | **Nunca marcar como Sensitive** — não é injetado no build |
| Dark mode | Fora do escopo — não planejado para H1 |
| WhatsApp | Fora do escopo — decisão explícita do produto |
| Caução | Adiada para pós V1-Financeiro (D2) |
| Testes E2E staging | `workers: 1` obrigatório — estado compartilhado entre specs |
| Pagamentos MVP | PIX centralizado (D1) — Stripe Connect BR reavaliado ~dez/2026 |
| Exportação financeira | Síncrono ≤90 dias, assíncrono >90 dias (ADR-016) |
| Retenção de dados | 5 anos CTN Art. 173, anonimização LGPD (ADR-017) |

---

## Sessões recentes

| Sessão | Destaques |
|---|---|
| **jun/06** | GitGuardian fix (senhas movidas para env vars, histórico scrubado), id-docs bug fix, security2 25/0/3 ✅, security3 12/12 ✅ (smokes #23-#27), fix crítico: middleware retorna 401 para /api/* sem auth |
| **jun/07** | ViaCEP auto-fill endereço, CSP atualizado (`viacep.com.br`), Lighthouse CI smoke #32 ✅ |
| **jun/08** | Logo recortado (sharp) 1254×1254→1216×275, ícone mobile atualizado, taxa plataforma fix `10% → 15%` |
| **jun/09** | Multiplicadores semanal (3×) / mensal (15×) configuráveis SuperAdmin; taxa 100% dinâmica (zero hardcode); ajuda page atualizada (seguro/extravio, indicação, limite R$1.000, precificação 3–5%); fotos MVP limitadas a 3 |
| **jun/12 s7** | Hardcoded P0/P1/P2 → PlatformConfig (cancelamento, tiers embaixador, referral, late fee, auto-cancel, payout window, uploads); CEP ViaCEP no cadastro; RATE_LIMITS nomeado; auditoria de promessas (64 itens); suíte 408 testes verde |
| **jun/12 s7b** | Fix e-mails (after() em ~30 rotas + NEXTAUTH_URL recriada + lib/app-url.ts); stats homepage reais; sort "Mais alugados"; E2E PriceCalc 18/18 estável + teste teto R$500; UI reenvio de verificação mostra motivo real (429) |
| **jun/12 s7c** | ReviewDetails.tsx exibe emoji/critérios/foto nos cards de avaliação (item + perfil público); re-auditoria promessas v2.0 — 32/64 resolvidos, doc reorganizado por bloqueador |
| **jun/13 s8** | P-1..P-6 sem bloqueador (`bd53b26`): PIX checklist admin, k6 50VUs + gru1, GA4 6 eventos, Coupon model/migration/lib + checkout com split-absorção, dicas anfitrião, Lighthouse CI gate |
| **jun/13 s12** | Corrigidos os 2 bugs funcionais reais da suíte E2E: **QA-14** phone-otp 401 antes do body (`767d834`) e **QA-01** contraste WCAG no footer verde → `text-white/90` (`14c51f2`); revalidados verde (`6 passed`). `.gitignore` ampliado p/ artefatos não-fonte |
| **jun/14 s15** | Crítica externa (Copilot) analisada read-only por designer+segurança (~85–95% improcedente, refutada com evidência); release **v1.5.0** baseline; **4 ondas** mergeadas (PR #13, rebase): token `muted` + contraste WCAG, toasts Sonner, página `/seguranca` + `security.txt` RFC 9116, `ssrfGuard` DNS anti-rebinding + 42 testes. `tsc` limpo + 42/42 ssrfGuard ✅ |

---

## Arquitetura de Produção (planejamento pós-D4)

> Toda esta seção é **planejamento** — nenhuma ação executada antes do sign-off D4.

### Infraestrutura de serviços

| Serviço | Plano atual (staging) | Plano produção | Custo estimado/mês |
|---|---|---|---|
| **Vercel** | Pro (atual) | Pro — necessário para Cron Jobs e Edge Middleware | ~US$20/mês |
| **Supabase (staging)** | Free tier — `fflpuoluiqmhpvcxubqi` | **3º projeto isolado** (sa-east-1) | Free → Pro (~US$25) |
| **Supabase (produção)** | ⏳ Não criado | Pro tier — 8 GB DB, 100 GB Storage, 5M row reads/mês | ~US$25/mês |
| **Upstash Redis** | Pay-as-you-go | Pay-as-you-go (rate limit + blocklist) | ~US$0–5/mês |
| **Resend (e-mail)** | Free (100/dia) | Starter US$20/mês — 50.000 e-mails/mês | ~US$20/mês |
| **Sentry** | Free (5k eventos/mês) | Team US$26/mês se ultrapassar | ~US$0–26/mês |
| **Mapbox** | Free (50k tile requests) | Pay-as-you-go — US$0.50/1.000 requests acima do free | ~US$0–10/mês |
| **Stripe** | Test mode | Live mode — 2.99% + R$0.39 por transação (BR) | % sobre GMV |
| **UptimeRobot** | Free (5 min interval) | Free suficiente para MVP | US$0 |

**Estimativa infra mês 1 produção:** ~US$70–100/mês (≈R$370–530)

### Projetos Supabase — 3 ambientes isolados

| Ambiente | Project ID | Uso |
|---|---|---|
| Local dev | `jtianehxosfdrhjzqvqj` | Desenvolvimento local — dados fictícios |
| Staging | `fflpuoluiqmhpvcxubqi` | Validação CI/CD — dados de fixture |
| **Produção** | ⏳ Criar após D4 | Dados reais de usuários — **nunca misturar** |

**Regra absoluta:** variáveis de env de produção (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET` etc.) **nunca** no `.env`, apenas em GitHub Secrets + Vercel env `production`.

### Variáveis de ambiente por ambiente

| Variável | Local | Staging | Produção |
|---|---|---|---|
| `DATABASE_URL` | Supabase local | Supabase staging | Supabase produção (novo) |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://shareo-rouge.vercel.app` | `https://shareo.com.br` (domínio real) |
| `NEXTAUTH_SECRET` | Qualquer string | Secret staging | Secret produção — **diferente** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token dev | Token staging | Token produção — quota separada |
| `RESEND_API_KEY` | Opcional | Key staging | Key produção |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` — só após D4 |
| `CRON_SECRET` | `shareo-cron-2026` | Staging value | Novo secret produção |
| `ENCRYPTION_KEY` | 64 hex chars | Staging value | **Novo** — rotacionar antes de prod |

### Plano de provisionamento produção (pós-D4)

```
1. Criar Supabase production (sa-east-1, mesmo region do staging)
2. Executar migrations: prisma migrate deploy --schema=prisma/schema.prisma
3. Seed inicial: pnpm db:seed (apenas categorias + PlatformConfig defaults)
4. Criar Vercel project "shareo-production" ou configurar environment "production" no projeto atual
5. Configurar domínio (shareo.com.br ou equivalente) no Vercel
6. GitHub environment "production" com Required Reviewers (mínimo 1 aprovação para deploy)
7. Adicionar todas as variáveis de produção (NUNCA marcar NEXT_PUBLIC_* como Sensitive)
8. Smoke test manual nos fluxos críticos antes de abrir para usuários
9. Ativar Stripe live mode + webhook live endpoint
10. Tag v1.1.0
```

### Limites operacionais do MVP (produção)

| Limite | Valor | Configurável? |
|---|---|---|
| Valor máximo do bem anunciado | R$1.000 por item | SuperAdmin — `maxItemValueCents` |
| Teto por transação | R$500 (`CHECKOUT_MAX_CENTS = 50000`) | `lib/platform-config.ts` |
| Taxa da plataforma (default) | 15% (`DEFAULT_FEE_RATE = 1500` bps) | SuperAdmin via `/admin/financeiro` |
| Multiplicador semanal (sugerido) | 3× a diária | SuperAdmin via `/admin/financeiro` |
| Multiplicador mensal (sugerido) | 15× a diária | SuperAdmin via `/admin/financeiro` |
| Fotos por item | 3 no MVP | Hard-coded `_ItemImageUpload.tsx` |
| Rate limit (default) | 20 req/10s por IP | Upstash Ratelimit |
| Sessão JWT access token | 15 min | `lib/auth.ts` |
| Retenção de dados financeiros | 5 anos | ADR-017 (CTN Art. 173) |
| Cutoff payout semanal | Domingo 23h59 BRT | `/api/cron/payout` toda segunda |

### Licenças de dependências críticas

| Pacote | Versão | Licença | Ponto de atenção |
|---|---|---|---|
| `next` | 15.3.3 | MIT | OK |
| `next-auth` | 5.0.0-beta.31 | ISC | **Beta** — monitorar breaking changes pré-GA |
| `@prisma/client` | 6.7.0 | Apache-2.0 | OK |
| `stripe` | 22.1.1 | MIT | Termos Stripe (2.99% + R$0.39 BR) — verificar com jurídico |
| `mapbox-gl` | 3.3.0 | BSD-3 + Mapbox ToS | Mapbox ToS exige atribuição de marca |
| `react-map-gl` | 7.1.7 | MIT | OK — wrapper sobre mapbox-gl |
| `@supabase/supabase-js` | 2.46.0 | MIT | OK |
| `resend` | 4.0.0 | MIT | ToS Resend — sem spam, opt-out obrigatório |
| `@sentry/nextjs` | 8.14.0 | MIT + Sentry ToS | DSN separado para produção |
| `bcryptjs` | 2.4.3 | MIT | OK |
| `jose` | 5.9.0 | MIT | OK |
| `sharp` | 0.33.4 | Apache-2.0 | OK |
| `lucide-react` | 0.468.0 | ISC | OK |
| `@upstash/ratelimit` | 2.0.8 | MIT | OK |
| `zod` | 3.23.8 | MIT | OK |

**Aviso:** `next-auth` ainda está em beta (v5 beta.31). Antes do go-live em produção, avaliar se há versão estável disponível ou documentar risco aceito.

### Pontos de atenção pré-produção

| # | Item | Risco | Ação |
|---|---|---|---|
| 1 | **D4 — Jurídico** | Bloqueador total | Aguardar sign-off formal |
| 2 | **Stripe live mode** | Financeiro | Ativar apenas após D4; verificar KYC Stripe BR |
| 3 | **NextAuth v5 beta** | Técnico médio | Checar changelog antes do go-live; planejar migração se sair GA com breaking changes |
| 4 | **RLS desabilitado** | Segurança | Compensado por guards server-side; documentar e revisar com jurídico (LGPD) |
| 5 | **ENCRYPTION_KEY rotação** | Segurança | Gerar nova key para produção — dados criptografados em staging são ilegíveis em prod (esperado) |
| 6 | **Mapbox ToS atribuição** | Legal | Footer/mapa deve exibir "© Mapbox © OpenStreetMap" |
| 7 | **Resend domínio verificado** | E-mail | Configurar SPF/DKIM para `@shareo.com.br` antes de enviar e-mails transacionais |
| 8 | **Scripts temporários** | Segurança | Deletar 6 scripts antes de qualquer go-live (listados abaixo) |
| 9 | **Supabase Storage buckets** | Ops | Criar buckets `item-images`, `booking-photos`, `id-docs` no projeto produção |
| 10 | **Cron secrets distintos** | Segurança | `CRON_SECRET` produção deve ser diferente do staging |

### Scripts temporários a deletar antes de produção

```
scripts/reset-fixture-pwd.ts
scripts/delete-e2e-admins.ts
scripts/clear-rl.mjs
scripts/fix-admin-roles.ts
scripts/set-fixture-admin-role.ts
scripts/verify-admin-sessions.ts
```
