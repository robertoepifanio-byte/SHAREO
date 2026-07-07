# ShareO — Formulário Data Safety (Google Play)

**Documento:** Prep de loja (Fase 3 da meta `docs/planos/meta-app-android-build.md`)
**Data:** 2026-07-01
**Base técnica:** `apps/mobile/app.json` (permissões Android), `prisma/schema.prisma` (modelo de dados),
`lib/imageUpload.ts`, `lib/geocodeItem.ts`, `lib/mercadopago.ts`, `app/api/` (endpoints)
**Status:** Rascunho para revisão — confirmar itens marcados como "CONFIRMAR" com DPO/jurídico antes de submeter

---

## O que é o Data Safety

O formulário Data Safety do Google Play exige que o desenvolvedor declare:
- Quais tipos de dados o app coleta ou compartilha.
- Para qual finalidade.
- Se a coleta é obrigatória ou opcional.
- Se os dados são criptografados em trânsito.
- Se o usuário pode solicitar exclusão dos seus dados.

Este documento preenche cada campo com base no comportamento técnico real do ShareO.

---

## Seção 1 — Pergunta inicial

**O app coleta ou compartilha dados de usuários?**
Resposta: **Sim**

**O app usa criptografia em trânsito para todos os dados coletados ou compartilhados?**
Resposta: **Sim** — toda comunicação usa HTTPS/TLS. O cliente Supabase e as chamadas ao backend (`EXPO_PUBLIC_API_URL`) usam HTTPS obrigatoriamente.

**O usuário pode solicitar que seus dados sejam excluídos?**
Resposta: **Sim** — há endpoint de exclusão de conta em conformidade com a LGPD (PR #74 s33). O app (Fase 5, pós-MVP) deve expor o botão de "Excluir conta" na tela de perfil; no momento o fluxo existe no backend e na versão web.

---

## Seção 2 — Tipos de dados declarados

### 2.1 Informações pessoais — Nome

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Não (não é transmitido a terceiros como dado independente) |
| Finalidade | Funcionalidade do app (identificar o usuário nas reservas e avaliações) |
| Obrigatório? | Sim — sem nome não é possível criar conta |
| Criptografado em trânsito? | Sim (HTTPS) |
| Processado em servidor? | Sim — armazenado em banco PostgreSQL (Supabase sa-east-1) |

**Nota:** o nome do locatário é exibido ao proprietário do item durante o processo de reserva (necessário para a operação do serviço).

---

### 2.2 Informações pessoais — Endereço de e-mail

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Sim — Resend (provedor de e-mail transacional, EUA) para envio de notificações e confirmações |
| Finalidade | Funcionalidade do app (login, confirmações de reserva, notificações de pagamento) |
| Obrigatório? | Sim |
| Criptografado em trânsito? | Sim |
| Processado em servidor? | Sim |

**Nota de terceiro:** Resend atua como subprocessador para envio de e-mail transacional (confirmações, alertas). O e-mail não é usado para publicidade de terceiros.

---

### 2.3 Informações pessoais — CPF (número de documento de identidade)

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Sim — Receita Federal (validação de CNPJ via API pública, sem envio do CPF); Mercado Pago (ver nota abaixo) |
| Finalidade | Verificação de identidade (KYC) e prevenção a fraudes; exigido para anunciar ou reservar itens |
| Obrigatório? | Sim, para completar o cadastro e realizar transações |
| Criptografado em trânsito? | Sim |
| Criptografado em repouso? | Sim — campo `cpfEncrypted` armazenado com criptografia AES via `encryptPII()` no servidor (`lib/crypto.ts`) |
| Processado em servidor? | Sim |

**Nota sobre Mercado Pago:** o CPF pode ser informado pelo usuário diretamente no checkout do Mercado Pago (WebView do Checkout Pro), caso o MP solicite para processar o pagamento. Nesse caso o CPF é coletado e processado pelo Mercado Pago como controlador independente, sob a política de privacidade do MP — não pela ShareO. **CONFIRMAR com jurídico/DPO se isso deve ser declarado como "compartilhado" ou se o MP é controlador independente neste fluxo.**

---

### 2.4 Informações pessoais — Foto / selfie (verificação de identidade)

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Não (armazenado internamente) |
| Finalidade | Verificação de identidade (KYC) — fluxo de selfie exigido para publicar anúncios |
| Obrigatório? | Sim, para anunciar itens (não é exigido para apenas buscar/alugar) |
| Criptografado em trânsito? | Sim |
| Criptografado em repouso? | Sim — bucket `id-docs` privado no Supabase Storage (acesso por service role key, nunca URL pública) |
| Processado em servidor? | Sim — upload via API server-side com service role key |
| Dado biométrico (LGPD art. 11)? | **CONFIRMAR com DPO** — a selfie para verificação de identidade pode ser classificada como dado biométrico dependendo do tratamento (comparação facial vs. arquivo estático para revisão manual). Hoje a revisão é manual pelo admin; se for adotada comparação facial automática (Fase 5+), declarar como biométrico. |

**Nota:** o flag `biometricConsentRequired` está implementado (PR #139) mas **desligado (OFF)**. Quando ligado, o usuário deve consentir explicitamente antes do upload da selfie. Declarar como biométrico e ativar o consentimento antes do go-live se o tratamento for classificado como biométrico.

---

### 2.5 Fotos e vídeos — Fotos de itens e check-in/checkout

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Não diretamente — fotos de itens são públicas no marketplace (bucket `item-images`, acesso público de leitura); fotos de check-in/checkout ficam no bucket `booking-photos` (público) |
| Finalidade | Funcionalidade do app (exibir o item no anúncio; documentar estado na retirada e devolução) |
| Obrigatório? | Fotos de itens: sim para publicar um anúncio; fotos de check-in: sim para registrar retirada/devolução |
| Criptografado em trânsito? | Sim |
| Processado em servidor? | Sim — upload via API server-side |

**Permissão Android utilizada:** `CAMERA` (câmera) + leitura de galeria via `expo-image-picker`.
**Texto da permissão no app.json:** "Permitir que o ShareO acesse sua câmera para fotos de check-in/checkout."

---

### 2.6 Áudio

| Campo | Valor |
|---|---|
| Coletado? | **Não coletado ativamente** |
| Permissão declarada? | Sim — `RECORD_AUDIO` está em `app.json` |
| Justificativa da permissão | A permissão é solicitada por dependência da biblioteca `expo-camera` no Android; ela não é usada para gravar áudio intencionalmente. **CONFIRMAR com devops-shareo:** se a câmera de foto não usa RECORD_AUDIO em nenhum fluxo, remover a permissão de `app.json` antes da submissão para evitar questionamento do Google Play na revisão de permissões sensíveis. |
| Criptografado em trânsito? | N/A (não coletado) |

**Ação recomendada:** auditar se `RECORD_AUDIO` é necessária ou pode ser removida. Permissões não utilizadas aumentam o risco de rejeição na revisão do Google Play.

---

### 2.7 Localização — Localização aproximada

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Sim — Mapbox Geocoding API (converte coordenadas em endereço/CEP); Mapbox opera nos EUA |
| Finalidade | Funcionalidade do app (mostrar itens próximos ao usuário; preencher endereço no anúncio) |
| Obrigatório? | Não — o usuário pode informar CEP manualmente se recusar a permissão |
| Criptografado em trânsito? | Sim |
| Coletado em segundo plano? | Não — apenas quando o app está em uso (foreground) |

**Permissão Android:** `ACCESS_COARSE_LOCATION`
**Texto da permissão no app.json:** "Permitir que o ShareO use sua localização para encontrar itens próximos."

---

### 2.8 Localização — Localização precisa

| Campo | Valor |
|---|---|
| Coletado? | Sim |
| Compartilhado com terceiros? | Sim — Mapbox Geocoding API (mesma justificativa da localização aproximada) |
| Finalidade | Funcionalidade do app (ordenar itens por distância com precisão; geocodificar anúncio) |
| Obrigatório? | Não — localização aproximada é suficiente para busca básica |
| Criptografado em trânsito? | Sim |
| Coletado em segundo plano? | Não |

**Permissão Android:** `ACCESS_FINE_LOCATION`
**Nota:** a coordenada precisa do anúncio (latitude/longitude) é armazenada no banco (`items.latitude`, `items.longitude`) para o filtro de distância por Haversine. A localização do locatário não é armazenada permanentemente — é usada apenas na sessão de busca.

---

### 2.9 Identificadores de dispositivo (push notifications)

| Campo | Valor |
|---|---|
| Coletado? | Sim — token de push notification (Expo Notifications) |
| Compartilhado com terceiros? | Sim — Expo Push Notification Service (serviço intermediário da Expo, EUA) para envio de notificações |
| Finalidade | Funcionalidade do app (notificações de mensagens no chat, atualizações de reserva) |
| Obrigatório? | Não — o usuário pode recusar a permissão de notificações |
| Criptografado em trânsito? | Sim |

**Nota:** o token de push é armazenado em `users.pushToken` no banco. Não é usado para rastreamento de publicidade.

---

### 2.10 Dados financeiros — Informações de pagamento

| Campo | Valor |
|---|---|
| Coletado pelo app ShareO? | **Não** — o pagamento é processado integralmente pelo Mercado Pago via WebView (Checkout Pro). A ShareO não coleta, armazena nem transmite dados de cartão de crédito ou conta bancária. |
| O que a ShareO armazena? | Identificador da transação MP (`mpPaymentId`), status do pagamento, valor da transação e split calculado — apenas metadados, não dados financeiros sensíveis. |
| Compartilhado com terceiros? | Sim — os metadados de transação são gerados pelo Mercado Pago e recebidos via webhook |

**Nota importante para o formulário:** o Google Play tem categoria "Informações financeiras > Informações de pagamento". A ShareO deve **não marcar** essa categoria como "coletada", pois os dados de pagamento são coletados diretamente pelo Mercado Pago no fluxo WebView. Se o Google Play questionar, a justificativa é que o pagamento ocorre em WebView de terceiro (Mercado Pago), que é o controlador dos dados financeiros.

---

### 2.11 Dados de uso do app (analytics / diagnóstico)

| Campo | Valor |
|---|---|
| Coletado? | **CONFIRMAR** — Sentry está referenciado nos ambientes (`SENTRY_DSN`); coleta automaticamente dados de diagnóstico (stack traces, dados do dispositivo, versão do app). |
| Compartilhado com terceiros? | Sim — Sentry Inc. (EUA) se o SDK estiver ativo no app mobile |
| Finalidade | Diagnóstico e correção de erros (não publicidade) |
| Obrigatório? | Não (diagnóstico de erros) |

**Ação necessária:** verificar se o SDK do Sentry está instalado e inicializado em `apps/mobile/` antes de declarar esta categoria. Se não estiver, não declarar.

---

## Seção 3 — Resumo para preenchimento no Console

Ao abrir o formulário Data Safety no Google Play Console, marcar:

| Categoria de dado | Subcategoria | Coletado | Compartilhado | Finalidade |
|---|---|---|---|---|
| Informações pessoais | Nome | Sim | Não | Funcionalidade do app |
| Informações pessoais | Endereço de e-mail | Sim | Sim (Resend) | Funcionalidade do app |
| Informações pessoais | ID do usuário (CPF) | Sim | Confirmar (MP) | Funcionalidade do app, prevenção de fraudes |
| Informações pessoais | Foto (selfie KYC) | Sim | Não | Verificação de conta |
| Fotos e vídeos | Fotos | Sim | Não | Funcionalidade do app |
| Áudio | Gravações de voz | Confirmar (remover permissão) | Não | N/A |
| Localização | Localização aproximada | Sim | Sim (Mapbox) | Funcionalidade do app |
| Localização | Localização precisa | Sim | Sim (Mapbox) | Funcionalidade do app |
| Aplicativos e desempenho | Logs de falhas | Confirmar (Sentry) | Sim (Sentry) | Análise, Diagnóstico |
| Identificadores | ID de dispositivo (push token) | Sim | Sim (Expo) | Funcionalidade do app |

---

## Seção 4 — Terceiros e subprocessadores declarados

| Terceiro | País | Dado compartilhado | Base legal |
|---|---|---|---|
| Resend | EUA | E-mail | Legítimo interesse / execução de contrato |
| Mapbox | EUA | Coordenadas de localização (anonimizadas por não incluir ID de usuário) | Legítimo interesse |
| Expo Push Service | EUA | Token de push | Legítimo interesse |
| Mercado Pago | Brasil (controlador independente no fluxo de pagamento) | Dados de pagamento e CPF na WebView | Execução de contrato |
| Sentry | EUA | Diagnóstico/logs de erro | Confirmar |
| Supabase | Brasil (sa-east-1, PostgreSQL) | Todos os dados do banco | Execução de contrato (processador) |

**Nota LGPD / transferência internacional:** Resend, Mapbox, Expo e Sentry operam nos EUA. A transferência internacional de dados deve estar coberta nos Termos de Uso e na Política de Privacidade (item em andamento no checklist de conformidade, gated D4). Ver `docs/juridico/checklist-conformidade-juridica.md`.

---

## Itens que requerem confirmação antes de submeter

| Item | O que confirmar | Quem confirma |
|---|---|---|
| CPF no Mercado Pago WebView | Mercado Pago é controlador independente ou subprocessador neste fluxo? Deve ser declarado como "compartilhado"? | DPO / jurídico |
| Permissão RECORD_AUDIO | É necessária ou pode ser removida de app.json? | devops-shareo |
| Selfie como dado biométrico | O tratamento atual (revisão manual) classifica como biométrico sob LGPD art. 11? | DPO / jurídico |
| Sentry no mobile | O SDK do Sentry está instalado e inicializado em apps/mobile/? | devops-shareo |
| Exclusão de dados pelo app | O botão "Excluir conta" está acessível no app mobile (Fase 5)? | fullstack-dev-shareo |

---

*Documento de trabalho — preenchimento final depende das confirmações acima e do sinal verde do D4.*
