# Plano — App ShareO nas Lojas (Android primeiro)

**Data:** 2026-07-01 · **Sessão:** s41
**App:** `apps/mobile/` — Expo + React Native · **Loja-alvo:** Google Play (iOS depois)
**Bloqueador de go-live comercial:** D4 (jurídico)

---

## 1. Sumário executivo

**O gargalo não é o build — é o produto.** Hoje o app mobile é essencialmente **read-only**: o usuário navega, vê itens e conversa no chat, mas **não consegue reservar, pagar nem anunciar** dentro do app (o botão "Reservar" apenas o manda para o site). Publicar na loja um app que não fecha o ciclo de negócio não faz sentido — por isso o esforço principal está em **fechar o fluxo do locatário (reservar + pagar)**, não em configurar a Play Store.

| | Situação |
|---|---|
| Base técnica (Expo/RN/navegação/auth) | ✅ Pronta |
| Fluxo de **reservar + pagar** | ❌ **Faltando (maior lacuna)** |
| **Anunciar** item / upload de fotos | ❌ Faltando |
| **KYC / verificação de identidade** | ❌ Faltando |
| Mapa (Mapbox) e favoritos | ❌ Faltando |
| Config de build (URL da API, EAS) | 🟡 Ajustes pontuais |
| Requisitos da Play Store | 🟡 A providenciar (parte depende do D4) |

**Recomendação de escopo do 1º release:** **app do locatário** (buscar + reservar + pagar), deixando anunciar/KYC para uma atualização seguinte. **Recomendação de pagamento:** **WebView do Checkout Pro do Mercado Pago**, reaproveitando o checkout que já existe no backend.

---

## 2. O que já está pronto (funciona)

- **Base Expo sólida:** SDK 54, React Native 0.81, expo-router (rotas tipadas), NativeWind (Tailwind), React Query, nova arquitetura ligada.
- **Telas navegáveis:** login / cadastro / esqueci-senha; abas **Início / Reservas / Perfil / Mensagens**; detalhe de item; detalhe de reserva; chat.
- **Autenticação mobile real:** endpoints de backend `app/api/auth/mobile/login` + `app/api/auth/mobile/refresh`; o cliente já faz refresh de token com retry (`apps/mobile/lib/api.ts`).
- **Permissões Android declaradas** (câmera, localização) + ícones/splash atualizados (`apps/mobile/app.json`).
- **Perfis EAS prontos:** `preview` (gera APK) e `production` (gera AAB/app-bundle) — `apps/mobile/eas.json`.
- Testes jest-expo configurados.

---

## 3. Lacunas de produto (bloqueiam um app útil)

Ordenadas por impacto:

1. **Reservar + pagar (a maior lacuna).** Hoje o botão "Reservar" mostra um alerta mandando o usuário ao site (`apps/mobile/app/itens/[id].tsx`). Falta:
   - Tela de seleção de datas / cálculo de preço — espelhar a lógica de `app/itens/[id]/_PriceCalc.tsx` (diária/semanal/mensal).
   - **Checkout Mercado Pago** — abrir o `init_point` do MP numa **WebView** e voltar via **deep-link** (o app já tem o scheme `shareo://`), reaproveitando `app/api/payments/mp/checkout/route.ts`.
2. **Anunciar** — não existe tela de criar item nem upload de fotos (o app já traz `expo-image-picker`/`expo-camera` nas dependências, mas sem tela).
3. **KYC / verificação de identidade (biometria)** — o fluxo de selfie/consentimento tratado no D4 não existe no app.
4. **Mapa e favoritos** — o site usa Mapbox para busca por proximidade; o app não tem mapa nem lista de favoritos.
5. **Copy desatualizada** — a tela de item ainda exibe **"Caução"** e **"Pagamento seguro via ShareO"**, que contradizem as decisões vigentes (sem caução no MVP; a custódia do dinheiro é do **Mercado Pago**, não da ShareO). Corrigir junto com a Fase 2.

---

## 4. Ajustes técnicos de build/config

- 🔴 **URL da API aponta para o lugar errado.** O default é `https://shareo-rouge.vercel.app` (`apps/mobile/lib/api.ts`), mas com a **Deployment Protection (Vercel Authentication) ligada**, todo `*.vercel.app` agora exige login → o app tomaria **401**. Apontar para `https://staging.shareo.com.br` (e depois o domínio de produção) via variável `EXPO_PUBLIC_API_URL` no painel Expo/EAS.
- 🟡 **Refazer o build EAS.** O último falhou em 2026-06-03 ("Gradle build failed with unknown error", nunca investigado). Refazer `eas build --platform android --profile preview` e ler os logs da fase "Run gradlew".
- 🟡 **`eas.json`:** adicionar `"cli": { "appVersionSource": "remote" }` (elimina warning de versionamento).
- 🟡 **Variáveis de ambiente** (`EXPO_PUBLIC_API_URL` etc.) configuradas no painel Expo/EAS por perfil.

---

## 5. Requisitos da Google Play (fora do código)

- **Conta Google Play Developer** — US$ 25 (taxa única).
- **Política de Privacidade com URL pública** — obrigatória para o listing. **Depende do D4** (publicar `/privacidade` revisada).
- **Formulário "Data Safety"** — declarar os dados coletados (câmera, localização, CPF/PII) e como são usados/protegidos. **Cruza com o trabalho de LGPD** (subprocessadores, criptografia).
- **Classificação de conteúdo** (questionário IARC).
- **Ficha da loja (listing):** título, descrição curta/longa, **screenshots** do app, feature graphic, ícone.
- **Justificativa de permissões** sensíveis (câmera, localização).
- **AAB assinado** — o perfil `production` já gera app-bundle; keystore gerenciada pelo Expo (`wVVAayBbVZ default`).
- **Faixa de teste primeiro** — publicar em **internal/closed testing** antes da produção (validar com usuários reais sem exposição pública).

---

## 6. Dependência do D4

Um app **público** na Play Store que aponta para um backend com **pagamento real** exige o **mesmo sinal verde do D4** (política publicada, Data Safety fiel, Mercado Pago ativo com conta PJ). Portanto o **go-live comercial (Fase 4) é gated por D4**.

**Porém:** as Fases 1–2 (destravar build + fechar o ciclo do locatário, atrás de flag) e boa parte da Fase 3 (conta, listing, screenshots) podem avançar **antes** do D4. Também é possível distribuir em **faixa de teste interna** sem lançamento comercial.

---

## 7. Roadmap faseado

| Fase | Entregas | Depende de D4? | Esforço aprox. |
|---|---|---|---|
| **1. Destravar o build** | Corrigir `API_URL` → `staging.shareo.com.br`; refazer EAS build `preview` (APK); instalar num Android real; validar login/navegação end-to-end | ❌ Não | Baixo (≈ 1–2 dias) |
| **2. Fechar o ciclo do locatário** | Tela de datas/preço (espelhar `_PriceCalc.tsx`); **checkout MP via WebView** + retorno por deep-link; corrigir copy (caução/custódia); estados de pagamento na tela de reserva | ❌ Não (atrás de flag) | **Alto (o grosso do trabalho)** |
| **3. Prep de loja** | Conta Play Developer; screenshots; listing (textos/gráficos); Data Safety; classificação de conteúdo; publicar em faixa de teste interna | Parcial | Médio |
| **4. Go-live comercial** | AAB de produção; **política pública** publicada; **Mercado Pago ON** em produção; promover da faixa de teste para produção | ✅ **Sim (gated D4)** | Baixo (após 1–3) |
| **5. Pós-MVP (atualização)** | Anunciar item + upload de fotos; KYC/biometria; mapa (Mapbox); favoritos | Conforme | Alto |

---

## 8. Recomendações e decisões em aberto

- **Escopo do 1º release (recomendado):** **app do locatário** — chega à loja mais rápido, com o ciclo que gera receita. *Alternativas:* (a) **paridade com o site** (inclui anunciar + KYC no 1º release — bem mais demorado); (b) **só leitura** numa faixa de teste (valida build/distribuição sem reservar/pagar).
- **Pagamento (recomendado):** **WebView do Checkout Pro do MP** — reaproveita o backend, sem superfície extra de PCI. *Alternativa:* SDK nativo do Mercado Pago (mais UX/controle, mais trabalho e conformidade).
- **iOS:** deixar para depois; o `bundleIdentifier` `com.shareo.app` já está reservado. Publicar na App Store tem exigências próprias (conta Apple Developer US$ 99/ano, revisão mais rígida).
- **Sincronização com o D4:** planejar a Fase 4 para logo após o contrato Mercado Pago + conta PJ + política publicada, para o app entrar na loja junto (ou pouco depois) do go-live do site.

---

*Documento de trabalho — insumo para os fundadores decidirem o escopo do app mobile. As Fases 1–2 podem começar sem esperar o D4; o go-live na loja segue gated. Ver `docs/STATUS.md` e o relatório de status técnico.*
