# META — Desenvolvimento do App Android (ShareO Mobile)

**Estabelecida:** 2026-07-01 · **Base:** `docs/planos/plano-mobile-lojas.md` · **App:** `apps/mobile/` (Expo + React Native)

---

## 🎯 Objetivo

Levar o app Android de **scaffold read-only** (só navega/vê/chat) para um **app do locatário funcional** (buscar → reservar → pagar via Mercado Pago) e, depois, paridade (anunciar/KYC/mapa/favoritos), pronto para a Play Store. Segue as **Fases 1–5** do plano.

## 🚫 Regras invioláveis

1. **Só desenvolver dentro do contexto do app Android.** Nenhuma funcionalidade nova no site/web. Reutilizar os endpoints de backend que já existem (`app/api/payments/mp/checkout`, `/api/bookings`, `/api/items`, `/api/auth/mobile/*`). Se o app exigir uma adaptação de backend (ex.: aceitar Bearer do mobile numa rota), ela deve ser **aditiva e não quebrar o comportamento web** — na dúvida, reportar em vez de alterar rota compartilhada.
2. **Não quebrar o site responsivo mobile-first.** Não tocar em `app/` (web), `components/` (web), páginas ou fluxos existentes. `tsc` + `lint` + jest web VERDES antes/depois. O app mobile é isolado em `apps/mobile/`.
3. **Nada de produção / nada de ativar flag.** Pagamento real segue **gated D4** e atrás de `mercadoPagoEnabled` (OFF). Fase 4 (go-live) **não é executável** agora.
4. **Reusar, não recriar.** Espelhar a lógica de preço de `app/itens/[id]/_PriceCalc.tsx`; usar o endpoint de checkout MP existente; deep-link com o scheme `shareo://` já configurado.
5. **PRs pequenos e revisáveis por fase.** Diff de cada PR será revisado antes de mesclar.

## 🗺️ Fases → especialista responsável

| Fase | Escopo | Responsável | Executável agora? |
|---|---|---|---|
| **1. Destravar build** | Investigar a falha do Gradle (build 03/06), deixar o projeto build-ready (`eas.json`/`app.json`/env `EXPO_PUBLIC_*`), documentar o comando `eas build` e o mapeamento de permissões→Data Safety | **devops-shareo** | ✅ config/doc (o disparo do `eas build` é externo — conta Expo) |
| **2. Fechar ciclo do locatário** | Tela de datas/preço (espelhar `_PriceCalc.tsx`) → criar reserva (`/api/bookings`) → **checkout Mercado Pago via WebView** (`/api/payments/mp/checkout` → `init_point`) → retorno por deep-link `shareo://` → status da reserva. Corrigir estados. | **fullstack-dev-shareo** (+ designer-shareo p/ UI) | ✅ (atrás da flag MP OFF; sem pagamento real) |
| **3. Prep de loja** | Copy do listing (título/descrições), **Data Safety** (mapear dados: câmera, localização, CPF/PII), classificação de conteúdo, checklist de submissão, spec de screenshots/feature graphic | **product-owner-shareo** (copy/Data Safety) + **designer-shareo** (assets) | ✅ parcial (conta Play + screenshots do app são externos) |
| **4. Go-live comercial** | AAB de produção + política pública + MP ON + promover da faixa de teste | — | ❌ **GATED D4** (documentar, não executar) |
| **5. Pós-MVP (paridade)** | Anunciar item + upload de fotos; KYC/biometria; mapa (Mapbox); favoritos | **fullstack-dev-shareo** (+ designer) | ✅ **2ª onda** (após a Fase 2 mesclar, p/ evitar conflito em `apps/mobile`) |

**Sequenciamento p/ evitar conflito:** Fases 1 (config), 2 (telas) e 3 (docs) rodam em paralelo com escopos de arquivo distintos. **Fase 5 só entra depois da Fase 2 mesclada** (ambas editam telas do app).

## ✅ Validação (E2E) — ao final

- **Web (regressão):** rodar a suíte Playwright existente (`e2e/`) para provar que o **site mobile-first não quebrou** — o principal contrato da regra 2. Como o app é isolado em `apps/mobile/`, o risco ao web é ~zero, mas confirmamos.
- **Mobile:** rodar `pnpm --filter @shareo/mobile test` (jest-expo + RNTL) sobre as telas novas. **E2E nativo (Detox/Maestro) não existe** e montá-lo seria infra nova — fora do escopo desta meta; validação nativa ponta-a-ponta fica no **APK instalado num Android real** (Fase 1, disparo externo).

---

*Fonte da verdade da build-out do app. Ver `docs/planos/plano-mobile-lojas.md`, `docs/STATUS.md`. Produção gated D4.*
