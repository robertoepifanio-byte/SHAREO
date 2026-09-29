# ShareO — Checklist de Submissão à Google Play Store

**Documento:** Prep de loja (Fase 3 da meta `docs/planos/meta-app-android-build.md`)
**Criado:** 2026-07-01 · **Revisado:** 2026-09-27 — cenário Stripe Connect (Mercado Pago removido em 24/08; ADR-028), D4 desbloqueado em 24/09 e PR #537 mesclado.
**App:** `apps/mobile/` — Expo + React Native · Package: `com.shareo.app` · versão `1.1.0` / `versionCode 2`
**EAS Project ID:** `77b68688-0ceb-486f-8af7-a54ca55dbfb2`

Legenda:
- ✅ Pronto / já existe
- 🔨 A fazer (ação técnica interna)
- 🔵 Externo (ação humana, conta, serviço de terceiro)
- ⚖️ Pendência jurídica ABERTA — o D4 foi desbloqueado em 24/09/2026 com risco assumido pelos fundadores, mas as pendências seguem abertas em `docs/juridico/decisao-desbloqueio-d4-2026-09-24.md`. Não marcar como resolvida.

> **Pagamentos:** PSP único = **Stripe Connect**, checkout **só cartão**, teto R$ 500 por transação. O app abre o Checkout hospedado da Stripe no navegador (`expo-web-browser`) e volta por deep link `shareo://`. Dados de cartão nunca passam pelo app nem pelos servidores do ShareO.

---

## Bloco 1 — Conta e acesso

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 1.1 | Conta Google Play Developer criada | 🔵 | Taxa única de US$ 25 em play.google.com/console. Usar e-mail corporativo da ShareO. |
| 1.2 | Conta registrada como organização (não pessoal) | 🔵 | Exige CNPJ e **D-U-N-S**. Conta de organização dispensa a regra de 12 testadores por 14 dias exigida de contas pessoais novas. |
| 1.3 | D-U-N-S da PJ | 🔵 | Consultar em `developer.apple.com/enroll/duns-lookup` (aceita Brasil). A busca `my.dnb.com/lookup` é **só EUA** — "no results" lá não significa que não existe. Se não existir, solicitar pela D&B Brasil (gratuito, alguns dias úteis). Usar a razão social exata do cartão CNPJ. |
| 1.4 | Verificação da conta aprovada pelo Google | 🔵 | Conferir em Play Console → Configurações → Detalhes da conta de desenvolvedor. Enquanto não verificada, o Console não permite publicar. |
| 1.5 | Aceite dos termos do Google Play Developer | 🔵 | Feito na criação da conta. |

---

## Bloco 2 — App criado no Console

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 2.1 | App criado no Play Console (`com.shareo.app`) | 🔵 | Play Console → Todos os apps → Criar app. |
| 2.2 | Idioma padrão Português (Brasil) | 🔵 | `pt-BR`. |
| 2.3 | Tipo: app (não jogo) | 🔵 | |
| 2.4 | Distribuição: gratuito | 🔵 | Monetização por taxa de plataforma nas locações, cobrada via Stripe. |
| 2.5 | Play App Signing ativado | 🔵 | O Google guarda a chave de assinatura do app; o ShareO assina o AAB com a **upload key** (Bloco 8). Perder a upload key é recuperável pelo suporte do Google; perder a chave do app não seria. |

---

## Bloco 3 — Listing da loja (ficha de conteúdo)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 3.1 | Título definido (≤ 30 chars) | 🔨 | Ver `docs/mobile/mobile-play-listing.md` — fundadores escolhem entre A, B ou C. |
| 3.2 | Descrição curta (≤ 80 chars) | ✅ | Pronta em `mobile-play-listing.md`. |
| 3.3 | Descrição longa (≤ 4.000 chars) | 🔨 | Pronta em `mobile-play-listing.md`, mas **revisar menções a Mercado Pago/PIX** → Stripe, cartão. |
| 3.4 | Nome do desenvolvedor | 🔵 | Razão social exata da PJ (conferir no cartão CNPJ, não em rascunho). |
| 3.5 | E-mail de suporte | 🔵 | `atendimento@shareo.com.br`. |
| 3.6 | Site do app | 🔵 | Hoje `shareo.com.br` serve a **landing da campanha**, não o marketplace. Decidir qual URL informar; apontar o domínio para o app exige instrução explícita do fundador. |
| 3.7 | Política de privacidade (URL pública) | 🔨 ⚖️ | `https://shareo-prod.vercel.app/privacidade` responde 200 (conferido 27/09). Usar a URL definitiva do domínio de produção quando existir. Conteúdo segue com pendências jurídicas abertas. |
| 3.8 | Categoria: Compras (Shopping) | 🔵 | |

---

## Bloco 4 — Assets visuais da loja

| # | Item | Status | Especificação técnica |
|---|---|---|---|
| 4.1 | Ícone hi-res | 🔨 | 512×512 PNG sem alpha. Conferir se `apps/mobile/assets/icon.png` atende; gerar se não. |
| 4.2 | Feature Graphic | 🔨 | 1024×500 JPG/PNG sem alpha. Logo à esquerda + tela de busca à direita + fundo navy `#003366`. |
| 4.3 | Screenshots smartphone (mín. 2, máx. 8) | 🔵 | 9:16, capturados do app 1.1.0 num Android real (`scripts/adb-device.sh shot`). |
| 4.4 | Screenshots tablet 7"/10" | 🔵 | Opcional. |

### Telas recomendadas (smartphone, 9:16)

1. Busca com itens próximos · 2. Detalhe do item · 3. Seleção de datas e preço (diária/semanal/mensal) · 4. Chat com o proprietário · 5. Reserva com **Pagar agora** · 6. Anunciar item.

Captions sugeridas: "Itens a poucos km de você", "Reserve em segundos", "Pagamento seguro com cartão pela Stripe". **Não** citar Mercado Pago nem PIX de checkout.

---

## Bloco 5 — Data Safety

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 5.1 | Rascunho do Data Safety | 🔨 | `docs/mobile/mobile-data-safety.md` foi escrito para o Mercado Pago — **atualizar**: dados de pagamento (cartão) são coletados pela **Stripe** no checkout hospedado, não pelo app; o app só recebe status de pagamento. Repasse ao proprietário: Stripe Connect (dados bancários coletados pela Stripe) ou chave PIX informada no app (caminho manual). |
| 5.2 | Permissão RECORD_AUDIO | ✅ | Removida em `app.json` (PR #537). `expo-camera`/`expo-image-picker` já com `microphonePermission: false`. |
| 5.3 | Sentry no mobile | ✅ | Não instalado em `apps/mobile/package.json` (conferido 27/09) — não declarar coleta de diagnóstico por Sentry. |
| 5.4 | CPF: finalidade e compartilhamento | ⚖️ | Antes era "CPF → Mercado Pago". Revisar se o CPF vai para a Stripe (KYC Connect) e declarar conforme. DPO. |
| 5.5 | Selfie = dado biométrico? | ⚖️ | DPO / jurídico. |
| 5.6 | Exclusão de conta pelo app | ✅ | Existe em `apps/mobile/app/perfil/` (dados/segurança). O Google também exige **URL web** de exclusão de conta — informar no formulário. |
| 5.7 | Formulário Data Safety no Console | 🔵 | Preencher após 5.1, 5.4 e 5.5. |

---

## Bloco 6 — Classificação de conteúdo (IARC)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 6.1 | Questionário IARC | 🔵 | 10–15 min no Console. |
| 6.2 | Classificação esperada | 🔨 | Livre. |
| 6.3 | Declaração de UGC | 🔨 | Fotos de itens, avaliações, chat. Descrever moderação e denúncia. |

---

## Bloco 7 — Permissões sensíveis (justificativa)

| Permissão | Justificativa para o Google Play |
|---|---|
| `CAMERA` | Fotos de retirada e devolução (estado do item) e fotos do anúncio. |
| `ACCESS_FINE_LOCATION` | Ordenar itens por distância do usuário. |
| `ACCESS_COARSE_LOCATION` | Fallback da localização precisa; mesma finalidade. |

`RECORD_AUDIO` não é mais declarada (PR #537).

---

## Bloco 8 — Build AAB assinado

Caminho escolhido: **GitHub Actions** (`.github/workflows/aab-build.yml`), grátis em repo público — sem depender da cota do EAS. Passo a passo em `docs/mobile/mobile-build-android.md` §10.

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 8.1 | Workflow `aab-build.yml` (`bundleRelease`, todas as ABIs) | ✅ | PR #537. Disparo: `gh workflow run aab-build.yml --ref main`. Artefato do workflow (14 dias), não release público. |
| 8.2 | Upload keystore gerada | 🔵 | `keytool` (§10.1). Guardar a keystore e as senhas fora do repositório, com backup. |
| 8.3 | 4 secrets no GitHub | 🔵 | `ANDROID_UPLOAD_KEYSTORE_BASE64`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD` (§10.2). |
| 8.4 | API de produção no build | ✅ | `EXPO_PUBLIC_API_URL=https://shareo-prod.vercel.app` no perfil `production` (PR #537). **Não** usar `shareo.com.br` enquanto ele servir a campanha. |
| 8.5 | Versão | ✅ | `1.1.0` / `versionCode 2` / `runtimeVersion` literal `1.1.0`. Regra: `versionCode` +1 a cada envio; `version` e `runtimeVersion` sobem juntos. |
| 8.6 | Mapa (Mapbox nativo) | 🔵 | Desligado no build. Opcional para o MVP: cadastrar secret `MAPBOX_DOWNLOADS_TOKEN` (token `sk.`) e disparar com `include_mapbox=true`. |
| 8.7 | AAB de produção gerado sem erros | 🔵 | Depende de 8.2 e 8.3. Ainda **não** executado. |
| 8.8 | APK de teste da versão 1.1.0 | ✅ | Compilou (run 36294459833) e instalou/abriu num Android real em 27/09. |

---

## Bloco 9 — Faixa de teste interna (antes de produção)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 9.1 | AAB carregado em "Teste interno" | 🔵 | Até 100 testadores, sem revisão do Google. |
| 9.2 | Testadores adicionados | 🔵 | Contas Google dos fundadores e testers. |
| 9.3 | Link de opt-in enviado | 🔵 | |
| 9.4 | Pagamento Stripe no app validado (modo teste) | 🔨 | **Ainda não testado.** No APK de staging: reserva confirmada → **Pagar agora** → cartão `4242 4242 4242 4242` → app volta sozinho para a reserva, que aparece como paga. ⚠️ Risco não verificado: a Stripe pode recusar `success_url` com esquema `shareo://`; se recusar, voltar por página `https` que redireciona ao app. |
| 9.5 | Ciclo completo no AAB de produção | 🔵 | Busca → reserva → confirmação → pagamento → devolução → repasse. Pagamento real em produção exige Stripe live (instrução explícita do fundador). |
| 9.6 | Faixa fechada/aberta | 🔵 | Opcional. |

---

## Bloco 10 — Go-live em produção

Cada passo com efeito público exige instrução explícita do fundador.

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 10.1 | Política de Privacidade e Termos públicos | ✅ ⚖️ | Publicados em produção (200 em 27/09); pendências jurídicas seguem abertas. |
| 10.2 | Stripe live no backend de produção | 🔵 | Estado e decisão no handoff do go-live web; não alterar sem instrução do fundador. |
| 10.3 | Proprietários com Connect `ACTIVE` ou PIX de repasse cadastrado | 🔵 | Sem Connect ativo o repasse cai no caminho manual por PIX. |
| 10.4 | App promovido para produção | 🔵 | Revisão do Google: de horas a 7 dias. |
| 10.5 | Monitoramento pós-publicação | 🔵 | ANRs, crashes e avaliações no Play Console nas primeiras 48 h (sem Sentry no mobile). |

---

## Bloco 11 — Requisitos legais e de conteúdo

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 11.1 | Sem conteúdo adulto, violência ou ódio | ✅ | |
| 11.2 | Fora da Play Billing | ✅ | Pagamento por aluguel de bens físicos, via Stripe — não sujeito à Play Billing. |
| 11.3 | Política de Dados do Usuário do Google Play | 🔨 | Depende do Data Safety atualizado (Bloco 5). |
| 11.4 | Política de permissões sensíveis | ✅ | Só câmera e localização, justificadas no Bloco 7. |
| 11.5 | LGPD | ⚖️ | DPO, RIPD e política — pendências abertas. |

---

## Resumo de ações por responsável

| Responsável | Ações |
|---|---|
| **Fundadores** | Conta Play de organização + D-U-N-S + verificação (1.x); título (3.1); URL do site (3.6); upload keystore + 4 secrets (8.2, 8.3); testar o pagamento no app (9.4); autorizar Stripe live e publicação (10.x). |
| **Dev** | Revisar textos do listing (3.3); atualizar `mobile-data-safety.md` para Stripe (5.1); corrigir o retorno `shareo://` se a Stripe recusar (9.4); gerar o AAB quando houver secrets (8.7). |
| **Designer** | Feature Graphic (4.2); screenshots da versão 1.1.0 (4.3). |
| **DPO / jurídico** | CPF na Stripe (5.4); selfie biométrica (5.5); LGPD (11.5). |

---

*Pendências jurídicas: `docs/juridico/decisao-desbloqueio-d4-2026-09-24.md` e `docs/juridico/checklist-conformidade-juridica.md`.*
