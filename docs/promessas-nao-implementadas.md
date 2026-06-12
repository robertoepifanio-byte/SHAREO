# Promessas Não Implementadas — ShareO

**Versão:** 1.0  
**Data:** 2026-06-12  
**Autor:** Agente Product Owner — ShareO  
**Fontes analisadas:** `docs/backlog-atividades-priorizadas.md`, `docs/STATUS.md`, `prisma/schema.prisma`, `lib/platform-config.ts`, `lib/ambassador.ts`, `shareo-prototipo-v3b.html`, `app/**`, `components/**`, `CLAUDE.md`

---

## Sumário Executivo

Este documento cataloga todas as promessas feitas ao produto ShareO — em documentação, ADRs, protótipos, schema ou código — que ainda não possuem implementação completa e entregue ao usuário final. O critério de inclusão é: (a) existe registro de que a feature foi prometida ou planejada, E (b) a feature não está funcionando de ponta a ponta para o usuário em staging.

| Categoria | Qtd de itens | Bloqueador principal |
|---|---|---|
| Financeiro e Pagamentos | 9 | D4 jurídico / D1 (Stripe Connect) |
| Programa de Embaixadores | 5 | D4 jurídico |
| Programa de Fundadores | 5 | D4 jurídico |
| Configurabilidade (hardcoded) | 16 | Débito técnico — sem bloqueador externo |
| Conteúdo e Páginas | 6 | Decisão de produto / prioridade |
| Mobile (Expo) | 4 | Decisão de produto |
| Avaliações e Gamificação | 5 | Prioridade P3 |
| Admin e Operações | 3 | Prioridade P2–P3 |
| Infraestrutura e Qualidade | 6 | D4 / prioridade |
| Verificação de Identidade | 2 | Prioridade P3 |
| SEO e Performance | 3 | Prioridade P3 |
| **Total** | **64** | |

---

## 1. Financeiro e Pagamentos

### 1.1 Repasse PIX automático (execução manual no MVP)

**Prometido:** fluxo de repasse automático via PIX direto ao proprietário após janela de 3 dias.  
**Situação atual:** o cron `/api/cron/payout` marca repasses como `PROCESSING` e envia e-mail ao `ADMIN_FINANCEIRO` para execução **manual** do PIX fora da plataforma. Não há integração bancária real.  
**Documentado em:** `docs/STATUS.md` linha 56 ("MVP: marca repasses elegíveis como PROCESSING... para execução manual"), `app/api/cron/payout/route.ts` linha 6 ("execução manual via PIX. Integração automática na V1+").  
**Bloqueador:** decisão arquitetural D1 — integração automática planejada para V1+ pós-produção.  
**Prioridade sugerida:** H2 — imediatamente após validação de volume em produção.

---

### 1.2 Stripe Connect Brasil (split automático de pagamentos)

**Prometido:** divisão automática do valor entre plataforma e proprietário via Stripe Connect BR, com o proprietário recebendo diretamente na conta.  
**Situação atual:** código Stripe preservado mas invisível na UI (`app/admin/financeiro/page.tsx` linha 266 — card "Reavaliação: Stripe Connect Brasil"). Split calculado no banco (modelo `PlatformTransaction`, `Payout`) mas repasse é manual via PIX.  
**Documentado em:** `CLAUDE.md` ("UI Stripe Connect oculta até dez/2026"), `docs/STATUS.md` decisão D1, `docs/backlog-atividades-priorizadas.md` seção "Fora de escopo".  
**Bloqueador:** D1 — reavaliação prevista ~dez/2026 após maturidade do Stripe Connect BR para marketplace.  
**Prioridade sugerida:** H3 — dependente de D4 + volume de produção.

---

### 1.3 Caução (depósito de segurança)

**Prometido:** sistema de caução integrado ao fluxo de checkout para proteger proprietários de danos. Campo `depositAmount` existe no schema de `Item` e `Booking`; enum `DepositStatus` (NONE/HELD/RELEASED/RETAINED) implementado.  
**Situação atual:** `depositAmount` sempre nulo no MVP. Campo visível no schema mas sem UI, sem lógica de cobrança, sem lógica de liberação/retenção.  
**Documentado em:** `docs/STATUS.md` decisão D2 ("Sem caução, teto R$500 por transação"), `docs/STATUS.md` linha 152 ("FIN-6 — Caução: implementar após V1-Financeiro estável em produção").  
**Bloqueador:** D2 — decisão dos fundadores de não incluir caução no MVP. Planejado para pós V1-Financeiro.  
**Prioridade sugerida:** H2.

---

### 1.4 Informe de Imposto de Renda em PDF

**Prometido:** informe IR formal em PDF para proprietários com renda declarável na plataforma.  
**Situação atual:** existe rota `/perfil/imposto-de-renda` que exibe dados de ganhos anuais em tela (HTML), mas **sem geração de PDF**. ADR-019 documentou explicitamente a omissão do PDF no MVP.  
**Documentado em:** `docs/STATUS.md` linha 154 ("IR — PDF formal: ADR-019: sem PDF no MVP, adicionar em V1+ se houver demanda").  
**Bloqueador:** decisão de produto — demanda não validada.  
**Prioridade sugerida:** H2, somente após feedback de usuários proprietários ativos.

---

### 1.5 Relatório mensal por e-mail para proprietários

**Prometido:** envio automático de relatório mensal consolidado (GMV, receita, repasses) por e-mail para proprietários PJ e/ou admins.  
**Situação atual:** cron `monthly-report` registrado em `vercel.json` (1º/mês 12h UTC), mas ADR-020 documenta que o relatório fica em V1+ aguardando Resend configurado.  
**Documentado em:** `docs/STATUS.md` linha 155 ("Relatório mensal por e-mail: ADR-020: V1+ quando SendGrid/Resend configurado").  
**Bloqueador:** Resend em free tier (100 e-mails/dia) — necessita upgrade para Starter. Depende de volume de produção.  
**Prioridade sugerida:** H2.

---

### 1.6 Verificação manual de contas PIX

**Prometido:** processo de verificação de contas PIX cadastradas por proprietários antes de habilitar repasses. Status `PENDING_VERIFICATION` existe no schema.  
**Situação atual:** existe link em `/admin/financeiro` para `/admin/financeiro/contas-pix`, mas não há processo documentado ou automatizado para validação das chaves PIX. A verificação é marcada manualmente pelo ADMIN_FINANCEIRO sem validação bancária real (ex.: via API de validação de chaves Bacen).  
**Documentado em:** `app/admin/financeiro/page.tsx` linha 144 ("Verificar contas →").  
**Bloqueador:** ausência de integração com API do Banco Central para validação de chaves PIX.  
**Prioridade sugerida:** P1 — bloqueia confiabilidade dos repasses.

---

### 1.7 Teto de transação (R$500) refletido na UI do locatário

**Prometido:** locatários devem ser informados do teto de R$500 por transação **antes** de tentar reservar.  
**Situação atual:** `CHECKOUT_MAX_CENTS = 50_000` bloqueia o checkout no servidor com erro, mas não há aviso proativo na página do item ou no `PriceCalc` quando o total excede R$500.  
**Documentado em:** `lib/platform-config.ts` linha 27, `CLAUDE.md` ("teto R$500 por transação").  
**Bloqueador:** débito de UX — sem bloqueador externo.  
**Prioridade sugerida:** P1.

---

### 1.8 Stripe live mode ativo

**Prometido:** pagamentos reais em produção com Stripe em live mode.  
**Situação atual:** `STRIPE_SECRET_KEY` é `sk_test_...` em todos os ambientes. Stripe em test mode.  
**Documentado em:** `docs/STATUS.md` linha 291 ("Stripe live mode: Live mode — só após D4"), `docs/STATUS.md` linha 206 ("sk_live_... — só após D4").  
**Bloqueador:** D4 — consulta jurídica pendente.  
**Prioridade sugerida:** bloqueador de produção.

---

### 1.9 Exportação assíncrona de CSVs (> 90 dias)

**Prometido:** para períodos superiores a 90 dias, exportação financeira é gerada em background e link enviado por e-mail (ADR-016). Modelo `ExportJob` e endpoint `/api/financeiro/exportar/async` implementados.  
**Situação atual:** o fluxo assíncrono existe no backend, mas o e-mail de notificação com link para download (URL assinada do Supabase Storage, validade 48h) depende do Resend configurado para domínio `@shareo.com.br`.  
**Documentado em:** `docs/STATUS.md` linha 175 ("Exportação financeira: Síncrono ≤90 dias, assíncrono >90 dias").  
**Bloqueador:** Resend sem domínio verificado em produção.  
**Prioridade sugerida:** P1 pré-produção.

---

## 2. Programa de Embaixadores

### 2.1 Payout de comissões de embaixadores

**Prometido:** embaixadores recebem comissões em dinheiro (3–7% da taxa ShareO) por locações de indicados via PIX.  
**Situação atual:** comissões são calculadas e acumuladas no banco (`AmbassadorCommission`, status `PENDING`/`APPROVED`), mas nunca pagas. Flag `ambassadorPayoutEnabled = false` em `PlatformConfig`. Banner na UI de `/perfil/embaixador` informa "Comissões em análise jurídica."  
**Documentado em:** `lib/ambassador.ts` linha 7 ("Payout bloqueado até D4 jurídico"), `prisma/schema.prisma` linha 162 ("PAID — bloqueado até D4").  
**Bloqueador:** D4 — consulta jurídica.  
**Prioridade sugerida:** H2 — logo após D4.

---

### 2.2 Limiares de tier de embaixador hardcoded

**Prometido:** configuração de limiares de tier (Bronze 1–10 / Prata 11–50 / Ouro 51+) sem deploy.  
**Situação atual:** valores literais em `lib/ambassador.ts` linha 16. As **taxas** (3%/5%/7%) são configuráveis via `/admin/financeiro`, mas os **limiares de quantidade** não estão em `PlatformConfig`.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P0 item 7.  
**Bloqueador:** débito técnico — sem bloqueador externo.  
**Prioridade sugerida:** P0.

---

### 2.3 Janela de referral hardcoded (30 dias)

**Prometido:** janela de atribuição de referral configurável pelo SuperAdmin.  
**Situação atual:** 30 dias codificados literalmente em `lib/referral.ts` linha 11. Mudar requer deploy.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P0 item 8.  
**Bloqueador:** débito técnico — sem bloqueador externo.  
**Prioridade sugerida:** P0.

---

### 2.4 Decaimento automático de referrals após 12 meses — cron não registrado

**Prometido:** cron `ambassador-decay` expira indicados sem reserva paga em 12 meses (mantendo integridade do tier).  
**Situação atual:** `lib/ambassador.ts` tem a função `expireStaleReferrals()` implementada. A rota de cron existe, mas não foi confirmada como registrada em `vercel.json` com agendamento mensal.  
**Documentado em:** `lib/ambassador.ts` linha 319.  
**Bloqueador:** verificar `vercel.json` — possível item faltante.  
**Prioridade sugerida:** P1.

---

### 2.5 Conta de payout do embaixador via Stripe Connect

**Prometido:** campo `stripeConnectAccountId` em `AmbassadorProfile` para receita via Stripe Connect (alternativa ao PIX).  
**Situação atual:** campo existe no schema (`prisma/schema.prisma` linha 898) mas sem UI de cadastro, sem API de criação de conta Stripe Connect e sem lógica de payout via Connect.  
**Documentado em:** `prisma/schema.prisma` linha 897 ("reservado para evolução pós-dez/2026").  
**Bloqueador:** D1 (Stripe Connect reavaliado ~dez/2026) + D4.  
**Prioridade sugerida:** H3.

---

## 3. Programa de Fundadores

### 3.1 Taxa customizada para fundadores (customFeeRate)

**Prometido:** fundadores das waves 1–3 recebem taxa de plataforma reduzida (campo `customFeeRate` em `User`).  
**Situação atual:** campo existe no schema (`prisma/schema.prisma` linha 274) com nota explícita: "não ativar customFeeRate/searchBoost antes do D4 jurídico". Nenhuma lógica em `getPlatformFeeRate()` consulta o `customFeeRate` do usuário.  
**Documentado em:** `prisma/schema.prisma` linha 270, `docs/STATUS.md`.  
**Bloqueador:** D4 — consulta jurídica.  
**Prioridade sugerida:** H2 pós-D4.

---

### 3.2 Boost de relevância de busca para fundadores (searchBoost)

**Prometido:** fundadores têm seus anúncios priorizados nos resultados de busca via campo `searchBoost`.  
**Situação atual:** campo existe no schema mas sem implementação no filtro de busca (`app/api/items/route.ts` não usa `searchBoost`).  
**Documentado em:** `prisma/schema.prisma` linha 275.  
**Bloqueador:** D4 + lógica de ranking de busca não implementada.  
**Prioridade sugerida:** H2 pós-D4.

---

### 3.3 Convite de fundadores via link (LeadStatus INVITED → CONVERTED)

**Prometido:** fundadores da lista VIP recebem link de convite personalizado para criar conta com benefícios pré-ativados.  
**Situação atual:** modelo `FounderLead` tem campo `invitedAt` e `convertedAt`, enum `LeadStatus.INVITED`. Não existe endpoint de envio de convite nem lógica de conversão de lead em usuário fundador.  
**Documentado em:** `prisma/schema.prisma` linhas 828–831.  
**Bloqueador:** D4 (benefícios financeiros bloqueados) + decisão de produto sobre timing do convite.  
**Prioridade sugerida:** H2 pós-D4.

---

### 3.4 Benefícios por wave (FounderBenefit)

**Prometido:** benefícios diferenciados por wave (ex.: taxa reduzida Wave 1, verificação gratuita Wave 2) configuráveis via `FounderBenefit`.  
**Situação atual:** modelo `FounderBenefit` existe no schema com campos `key`, `value`, `wave`, `active`, `effectiveFrom`, `effectiveUntil`. Não há UI de administração para gerenciar `FounderBenefit` e nenhuma lógica de aplicação dos benefícios em checkout ou perfil.  
**Documentado em:** `prisma/schema.prisma` linhas 844–857.  
**Bloqueador:** D4.  
**Prioridade sugerida:** H2 pós-D4.

---

### 3.5 Lista VIP — captura de leads com LGPD compliant

**Prometido:** formulário de "Entrar na Lista VIP" na homepage, captando e-mail + intenção (proprietário/locatário) com consentimento LGPD.  
**Situação atual:** `FounderCaptureForm` implementado e `FounderLead` no banco. Porém, a **exibição na homepage** (`app/page.tsx`) ainda não inclui a seção VIP do protótipo `shareo-prototipo-v3b.html` (seção `.vip-section`). Nota em MEMORY.md: "LGPD Lista VIP pendente (pré-produção)".  
**Documentado em:** `shareo-prototipo-v3b.html` (seção `.vip-section`), `MEMORY.md` ("project-homepage-redesign").  
**Bloqueador:** decisão de produto — ativação prevista pré-produção.  
**Prioridade sugerida:** P2.

---

## 4. Configurabilidade — Valores Hardcoded

Os 16 itens abaixo foram identificados na varredura de 2026-06-12 e precisam ser movidos para `PlatformConfig` ou constantes nomeadas. Nenhum tem bloqueador externo — são débitos técnicos puros.

| # | Arquivo | Valor hardcoded | O que representa | Prioridade |
|---|---|---|---|---|
| 4.1 | `lib/cancellationPolicy.ts` | `100%`, `70%`, `50%`, `24h`, `6h` | Política de reembolso e janelas de cancelamento | P0 |
| 4.2 | `lib/email.ts:561` + `app/api/cron/reminders/route.ts:118` | `1.5` | Multiplicador de taxa de atraso (late fee) | P0 |
| 4.3 | `lib/ambassador.ts:16` | `11`, `51` | Limiares de tier Bronze/Prata/Ouro | P0 |
| 4.4 | `lib/referral.ts:11` | `30` dias | Janela de atribuição de referral | P0 |
| 4.5 | `app/api/cron/expire-bookings/route.ts:26` | `2h` | Auto-cancelamento PENDING sem resposta | P1 |
| 4.6 | `app/api/cron/auto-cancel/route.ts:20` | `48h` | Auto-cancelamento quando proprietário não age | P1 |
| 4.7 | `app/api/bookings/[id]/route.ts:303` | `3` dias | Janela de elegibilidade para payout | P1 |
| 4.8 | `app/api/items/[id]/images/route.ts:10` | `10` imagens | Máximo de fotos por item | P1 |
| 4.9 | `app/api/upload/route.ts:21` et al. | `10 MB` | Limite de tamanho de arquivo | P1 |
| 4.10 | Rate limits em 8+ endpoints | vários | Requisições por IP/usuário por janela | P1 |
| 4.11 | `app/api/auth/register/route.ts:119` | `48h` | Expiração do token de verificação de e-mail | P2 |
| 4.12 | `app/api/auth/forgot-password/route.ts:50` | `60 min` | Expiração do link de reset de senha | P2 |
| 4.13 | `lib/badges.ts:19-22` | `3, 10, 25, 50` | Reservas necessárias para badge de locatário | P2 |
| 4.14 | `lib/badges.ts:58` | `10` pontos | Reputação por avaliação enviada | P2 |
| 4.15 | `lib/co2.ts:13-14` | `0.5`, `21.77` | Fatores de emissão CO₂ por booking-dia e por árvore | P2 |
| 4.16 | `app/api/payments/checkout/route.ts:125` | `30 min` | Expiração da sessão Stripe Checkout | P2 |

**Solução padrão para P0–P1:** mover para `PlatformConfig` (banco) com chave nomeada e leitura via `getPlatformFeeRate()`-style.  
**Solução padrão para P2:** extrair como constante nomeada em arquivo de configuração (ex.: `lib/auth-config.ts`, `lib/platform-config.ts`).

---

## 5. Conteúdo e Páginas

### 5.1 Página `/sobre` — equipe sem nomes reais

**Prometido:** página `/sobre` com missão, história e equipe do ShareO.  
**Situação atual:** página existe e está implementada (`app/sobre/page.tsx`). Porém, a seção "Equipe" usa descrições genéricas sem nomes, fotos ou cargos reais dos fundadores. Números como "2.400+ itens" e "R$2.000 renda média/mês" são fictícios (dados de seed de demonstração).  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P2 item 9 ("Prioritária entre os stubs — missão, história, equipe do ShareO").  
**Bloqueador:** decisão dos fundadores — conteúdo real depende de aprovação.  
**Prioridade sugerida:** P2 — atualizar antes de produção.

---

### 5.2 Página `/politicas` — conteúdo stub

**Prometido:** política de uso, privacidade e responsabilidade detalhadas, LGPD compliant.  
**Situação atual:** página existe (`app/politicas/page.tsx`) com 3 seções em bullet points genéricos. Não há: Termos de Serviço legalmente revisados, Política de Privacidade detalhada (LGPD Art. 9), DPO identificado, mecanismo de opt-out, versionamento de políticas.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P2 item 10 ("Stubs com conteúdo").  
**Bloqueador:** D4 — jurídico deve revisar e aprovar texto antes de produção.  
**Prioridade sugerida:** P0 bloqueador de produção.

---

### 5.3 Página `/suporte` — sem canal real de atendimento

**Prometido:** central de suporte com atendimento real ao usuário.  
**Situação atual:** página existe (`app/suporte/page.tsx`) mas menciona "Chat integrado" e "E-mail" sem links reais. Não há endereço de e-mail de suporte, form de contato, ticket system, SLA ou horário de atendimento definido.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P2 item 10.  
**Bloqueador:** decisão operacional — canal de suporte não definido.  
**Prioridade sugerida:** P1 pré-produção.

---

### 5.4 Página `/comunidade` — conteúdo stub sem funcionalidade

**Prometido:** comunidade com fóruns, grupos e eventos de economia circular.  
**Situação atual:** página existe (`app/comunidade/page.tsx`) com texto genérico sobre "fóruns e grupos de discussão" e "eventos". Não há: fórum real, canal de discussão, agenda de eventos ou qualquer funcionalidade interativa.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P2 item 10.  
**Bloqueador:** H3 — funcionalidade de comunidade não planejada para MVP.  
**Prioridade sugerida:** H3.

---

### 5.5 PWA — ícones e screenshots de produção

**Prometido:** Progressive Web App instalável com ícones e screenshots finais.  
**Situação atual:** `manifest.ts` requer `pwa-icon-192.png`, `pwa-icon-512.png`, screenshots `wide` e `mobile`. Assets são placeholders — substituição depende do Roberto (decisão de UI).  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P2 itens 7 e 8.  
**Bloqueador:** assets finais pendentes com o responsável pelo design.  
**Prioridade sugerida:** P2.

---

### 5.6 Protótipo — seção "Dicas para anfitriões" (nav)

**Prometido:** no protótipo `shareo-prototipo-v3b.html`, o dropdown "Anunciar" da nav desktop inclui o item "Dicas para anfitriões — Maximize seus aluguéis" como link dedicado.  
**Situação atual:** não existe página `/dicas` ou equivalente. O link aponta para a homepage no protótipo. A Central de Ajuda cobre parcialmente esse conteúdo.  
**Documentado em:** `shareo-prototipo-v3b.html` linha 537.  
**Bloqueador:** decisão de conteúdo.  
**Prioridade sugerida:** H2 — pode ser seção de `/ajuda` expandida.

---

## 6. Mobile (Expo / React Native)

### 6.1 App mobile não testado

**Prometido:** aplicativo móvel nativo (iOS e Android) via Expo + React Native, scaffold completo.  
**Situação atual:** `apps/mobile/` existe com scaffold, ícone atualizado (jun/08), mas o app não foi testado em dispositivo real. Último build EAS falhou em Gradle jun/03.  
**Documentado em:** `CLAUDE.md` ("Expo + React Native — scaffold completo, não testado"), `docs/backlog-atividades-priorizadas.md` P3 item 17.  
**Bloqueador:** decisão de produto — Roberto decide quando iniciar testes mobile.  
**Prioridade sugerida:** P3 / H2.

---

### 6.2 Validação Android em dispositivo real (Samsung Galaxy A13)

**Prometido:** validação do app mobile em dispositivo Android de entrada.  
**Situação atual:** não realizada.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 24.  
**Bloqueador:** aguarda build EAS funcional.  
**Prioridade sugerida:** P3.

---

### 6.3 Push notifications FCM

**Prometido:** notificações push no mobile (nova reserva, nova mensagem, avaliações).  
**Situação atual:** não planejado para H1. Schema `Notification` existe mas apenas para notificações in-app.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` ("Push notifications FCM — Não planejado para H1").  
**Bloqueador:** decisão de produto — H3.  
**Prioridade sugerida:** H3.

---

### 6.4 EAS Build e publicação nas lojas (App Store / Google Play)

**Prometido:** publicação do app nas lojas de aplicativos.  
**Situação atual:** nenhuma configuração de publicação realizada. EAS configurado mas build falhou.  
**Documentado em:** `MEMORY.md` ("EAS Build Mobile — Build pendente").  
**Bloqueador:** aguarda D4 + app funcional.  
**Prioridade sugerida:** H2/H3.

---

## 7. Avaliações e Gamificação

### 7.1 Avaliação por critérios múltiplos

**Prometido:** avaliação em 4 dimensões: item como descrito, pontualidade, comunicação, conservação.  
**Situação atual:** campos `itemAsDescribed`, `punctuality`, `communication`, `conservation` existem no schema `Review` (com comentários `P3-67`). A UI de avaliação (`app/reservas/[id]/avaliar/`) exibe apenas nota geral (1–5) e comentário de texto.  
**Documentado em:** `prisma/schema.prisma` linhas 505–510, `docs/backlog-atividades-priorizadas.md` P3 item 19.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2.

---

### 7.2 Emoji de satisfação (sentiment) na avaliação

**Prometido:** campo de sentimento emoji (😠😕😐😊😍) na avaliação.  
**Situação atual:** campo `sentiment` existe no schema `Review` (`P3-68`). Sem UI.  
**Documentado em:** `prisma/schema.prisma` linha 503.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2.

---

### 7.3 Foto do item em uso na avaliação

**Prometido:** locatário pode adicionar foto do item em uso ao enviar avaliação.  
**Situação atual:** campo `photoUrl` existe no schema `Review` (`P3-69`). Sem UI de upload na avaliação.  
**Documentado em:** `prisma/schema.prisma` linha 511.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2.

---

### 7.4 Gamificação — Badges e pontos de reputação

**Prometido:** sistema de badges Bronze/Prata/Ouro por quantidade de reservas concluídas, pontos de reputação (+10 por avaliação), cupom 10% off por avaliar.  
**Situação atual:** `lib/badges.ts` com lógica de cálculo de badges; `reputationPoints` no schema de `User`. Badges não são exibidos na UI do perfil público nem na página de item. Cupom de desconto não implementado.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 20, `prisma/schema.prisma` linha 255.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2.

---

### 7.5 Templates de mensagens no chat

**Prometido:** mensagens pré-prontas no chat que preenchem o campo (ex.: "Já retirei o item, obrigado!") sem envio automático.  
**Situação atual:** não implementado. Chat funciona com campo livre de texto.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 18.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2.

---

## 8. Admin e Operações

### 8.1 Moderação proativa de itens (isApproved)

**Prometido:** campo `isApproved` em `Item` permite moderação de anúncios pelo admin antes de publicação.  
**Situação atual:** `isApproved` defaults para `true` no schema — "publicação direta (moderação reativa no MVP)". Não há fila de moderação, nem UI admin para aprovar/rejeitar itens, nem fluxo de notificação ao anunciante quando reprovado.  
**Documentado em:** `prisma/schema.prisma` linha 362 ("moderação reativa no MVP").  
**Bloqueador:** decisão de produto — moderação proativa planejada para H2 quando houver volume.  
**Prioridade sugerida:** H2.

---

### 8.2 Webhooks de saída para integração PJ (OutboundWebhook)

**Prometido:** proprietários PJ podem configurar webhooks de saída para integrar com ERPs e sistemas externos (eventos `booking.confirmed`, `booking.paid`, etc.).  
**Situação atual:** modelo `OutboundWebhook` existe no schema com todos os campos necessários. Não há UI de cadastro de webhook para o proprietário PJ, nem endpoint de disparo de eventos, nem lógica de retry em `failureCount`.  
**Documentado em:** `prisma/schema.prisma` linhas 644–665.  
**Bloqueador:** H2 — feature PJ Premium não implantada.  
**Prioridade sugerida:** H2.

---

### 8.3 Exportação assíncrona — notificação por e-mail

**Prometido:** quando exportação CSV >90 dias é concluída, admin recebe e-mail com link de download.  
**Situação atual:** `ExportJob` atualiza `fileUrl` quando concluído, mas o e-mail de notificação não foi implementado (`lib/email.ts` não tem template de `sendExportReadyEmail`).  
**Documentado em:** ADR-016 (síncrono ≤90 dias, assíncrono >90 dias com e-mail).  
**Bloqueador:** débito técnico — sem bloqueador externo.  
**Prioridade sugerida:** P2.

---

## 9. Infraestrutura e Qualidade

### 9.1 Supabase production — projeto isolado

**Prometido:** banco de dados de produção completamente isolado dos ambientes de dev e staging.  
**Situação atual:** apenas dois projetos Supabase existem (`jtianehxosfdrhjzqvqj` local e `fflpuoluiqmhpvcxubqi` staging). O terceiro projeto de produção não foi criado.  
**Documentado em:** `docs/STATUS.md` linha 107 ("Supabase production: Aguarda D4").  
**Bloqueador:** D4 — bloqueador absoluto de produção.  
**Prioridade sugerida:** P0 bloqueador de produção.

---

### 9.2 Domínio shareo.com.br + SPF/DKIM configurados

**Prometido:** e-mails transacionais enviados de `@shareo.com.br` com autenticação correta.  
**Situação atual:** Resend configurado em staging com domínio de teste. SPF/DKIM para `@shareo.com.br` não configurados.  
**Documentado em:** `docs/STATUS.md` linha 297 ("Configurar SPF/DKIM para @shareo.com.br antes de enviar e-mails transacionais").  
**Bloqueador:** D4 (domínio de produção depende de go-live).  
**Prioridade sugerida:** P0 bloqueador de produção.

---

### 9.3 Scripts temporários — exclusão antes de produção

**Prometido:** 6 scripts de fixture/manutenção devem ser deletados antes de qualquer go-live.  
**Situação atual:** scripts ainda existem no repositório.  
**Arquivos:** `scripts/reset-fixture-pwd.ts`, `scripts/delete-e2e-admins.ts`, `scripts/clear-rl.mjs`, `scripts/fix-admin-roles.ts`, `scripts/set-fixture-admin-role.ts`, `scripts/verify-admin-sessions.ts`.  
**Documentado em:** `CLAUDE.md` ("Scripts temporários a deletar antes de produção"), `docs/STATUS.md` linhas 301–310.  
**Bloqueador:** nenhum — pode ser feito a qualquer momento.  
**Prioridade sugerida:** P0 — executar antes do go-live.

---

### 9.4 Lighthouse CI — métricas de performance

**Prometido:** LCP < 2,5s, CLS < 0,1, INP < 200ms medidos no CI após preview URL estável.  
**Situação atual:** não configurado no CI. Smoke #32 executa Lighthouse manualmente, mas sem gates de qualidade automatizados.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 15.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2.

---

### 9.5 k6 load test

**Prometido:** 50 usuários simultâneos em `GET /api/items`, P95 < 1s.  
**Situação atual:** não configurado.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 16.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2 pré-escala.

---

### 9.6 Fire-and-forget no Vercel — geocodeItem pendente

**Prometido:** geocoding automático de items via Mapbox ao criar/editar anúncio.  
**Situação atual:** `lib/geocodeItem.ts` existe, mas a regra "void promise morre quando lambda congela após resposta" não foi corrigida para `geocodeItem`. A nota em MEMORY.md indica que o arquivo ainda usa fire-and-forget sem `after()`.  
**Documentado em:** `MEMORY.md` ("Fire-and-forget no Vercel — Regra: geocodeItem ainda pendente").  
**Bloqueador:** débito técnico.  
**Prioridade sugerida:** P1 — impacta visibilidade dos anúncios no mapa.

---

## 10. Verificação de Identidade e Segurança

### 10.1 Verificação de celular via SMS OTP (Zenvia)

**Prometido:** verificação de telefone via OTP 6 dígitos por SMS (Zenvia). Gate: bloqueia primeira reserva se telefone não verificado.  
**Situação atual:** campos no schema (`phoneVerifiedAt`, `phoneOtpHash`, `phoneOtpExpiresAt`) não existem na migration atual. Endpoints `POST /api/phone/send-otp` e `POST /api/phone/verify-otp` não implementados. UI em `/perfil/seguranca` sem o fluxo OTP.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 25, `MEMORY.md` ("Verificação de Celular").  
**Bloqueador:** prioridade P3. Requer: migration de schema, conta Zenvia (~R$0,12–0,20/SMS), ~1 sprint de desenvolvimento.  
**Prioridade sugerida:** H2 — impacto direto em confiança e prevenção de fraude.

---

### 10.2 Migração da NextAuth v5 beta para GA

**Prometido:** plataforma estável em auth sem dependência de versão beta.  
**Situação atual:** `next-auth` v5.0.0-beta.31. Versão GA não lançada. Risco de breaking changes antes do go-live.  
**Documentado em:** `docs/STATUS.md` linha 269 ("next-auth: Beta — monitorar breaking changes pré-GA"), linha 283 ("planejar migração se sair GA com breaking changes").  
**Bloqueador:** dependência do calendário de lançamento da NextAuth team.  
**Prioridade sugerida:** monitorar — agir somente se GA lançar com breaking changes.

---

## 11. SEO e Performance

### 11.1 KPIs de negócio instrumentados

**Prometido:** monitoramento de Bounce < 40%, CTR cards > 15%, conversão > 8%, NPS > 50.  
**Situação atual:** Google Analytics e Sentry configurados, mas KPIs específicos não foram definidos como eventos GA4 customizados nem configurados como goals.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 23.  
**Bloqueador:** prioridade P3.  
**Prioridade sugerida:** H2 — crítico para decisões de produto pós-lançamento.

---

### 11.2 Duplicata de função haversine

**Prometido:** base de código limpa e sem duplicatas.  
**Situação atual:** duas implementações de distância coexistem: `lib/haversine.ts` (resultado em km) e `utils/geo.ts` (resultado em metros). Não há canônico definido.  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 22.  
**Bloqueador:** débito técnico — sem bloqueador externo.  
**Prioridade sugerida:** P2 — risco de inconsistência nos filtros de distância.

---

### 11.3 CO₂ — campo por categoria no schema

**Prometido:** cálculo de impacto ambiental por categoria de item, não apenas por booking-dia genérico.  
**Situação atual:** `lib/co2.ts` usa fator único de 0,5 kg CO₂/booking-dia para todos os itens. Campo `co2PerDay` por categoria foi adiado (risco de migration).  
**Documentado em:** `docs/backlog-atividades-priorizadas.md` P3 item 21.  
**Bloqueador:** risco de migration em produção — adiado para H2/H3.  
**Prioridade sugerida:** H2.

---

## 12. Features do Protótipo sem Implementação

As seguintes funcionalidades aparecem no protótipo `shareo-prototipo-v3b.html` como navegação primária, mas não possuem página ou funcionalidade correspondente na aplicação real:

| Feature no protótipo | Localização no protótipo | Status na app |
|---|---|---|
| "Buscar no mapa" — view de mapa com pins de itens próximos | `shareo-prototipo-v3b.html` nav "Explorar" | Mapa Mapbox existe em `/itens` mas sem view dedicada de mapa fullscreen |
| "Mais alugados" — listagem de itens mais populares | nav "Explorar" | Sem endpoint ou página dedicada; `viewCount` existe mas sem ordenação por popularidade na UI |
| "Mais bem avaliados" — filtro por rating acima de 4 estrelas | nav "Explorar" | Filtro por rating não implementado no `GET /api/items` |
| "Estimativa de ganhos" no dropdown "Anunciar" | nav "Anunciar" | Simulador existe na homepage, mas sem página dedicada com URL própria |
| "Dashboard" no menu do usuário | user dropdown | `/dashboard` existe mas não está na nav oficial (foi substituído por `/perfil`) |
| "Indicações" no menu do usuário | user dropdown do protótipo | Existe em `/perfil/embaixador` mas não linkado no UserDropdown atual |
| Estatísticas da homepage ("2.400+ itens", "R$2.000 renda média") | hero section | Valores fictos — sem conexão real com o banco de dados |

---

## Consolidado de Bloqueadores

| Bloqueador | Impacto | Itens afetados |
|---|---|---|
| **D4 — Consulta jurídica** | Impede qualquer go-live em produção | 1.8, 2.1, 3.1, 3.2, 3.3, 3.4, 9.1, 9.2 |
| **D1 — Stripe Connect** | Repasse automático e split nativo | 1.2, 2.5 |
| **Decisão dos fundadores** | Features aguardando validação de negócio | 1.3, 1.4, 5.5, 6.1–6.4 |
| **Débito técnico** | Sem bloqueador externo — apenas prioridade | Todos da seção 4, 8.3, 9.3, 9.6, 11.2 |

---

## Próximos Passos Recomendados

1. **Agora (P0 — pré-produção):** resolver os 16 valores hardcoded críticos (seção 4, itens P0 e P1) e excluir os 6 scripts temporários.
2. **Paralelo ao D4:** preparar infraestrutura de produção (Supabase production, SPF/DKIM, Stripe live mode) para que esteja pronta no dia do sign-off jurídico.
3. **Sprint pós-D4:** ativar payout de embaixadores, customFeeRate de fundadores, enviar convites da Lista VIP.
4. **H2:** implementar repasse PIX automático, verificação de celular (Zenvia), avaliação por critérios, webhooks PJ.
5. **H3:** Stripe Connect, app mobile publicado, CO₂ por categoria, gamificação completa.

---

*Documento gerado pelo agente ProductOwner-ShareO em 2026-06-12. Fonte da verdade: código em `main` + documentação em `docs/`. Revisar a cada ciclo trimestral ou após mudanças de roadmap.*
