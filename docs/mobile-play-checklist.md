# ShareO — Checklist de Submissão à Google Play Store

**Documento:** Prep de loja (Fase 3 da meta `docs/meta-app-android-build.md`)
**Data:** 2026-07-01
**App:** `apps/mobile/` — Expo + React Native · Package: `com.shareo.app`
**EAS Project ID:** `77b68688-0ceb-486f-8af7-a54ca55dbfb2`

Legenda:
- ✅ Pronto / já existe
- 🔨 A fazer (ação técnica interna)
- 🔵 Externo (ação humana, conta, serviço de terceiro)
- 🔴 Gated D4 (não executar antes do cumprimento das 4 condições de go-live)

---

## Bloco 1 — Conta e acesso

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 1.1 | Conta Google Play Developer criada | 🔵 | Taxa única de US$ 25. Acessar: play.google.com/console. Usar e-mail corporativo da ShareO PJ — gated D4 (conta PJ necessária para registrar como organização). |
| 1.2 | Conta registrada como organização (não pessoal) | 🔵 🔴 | Exige CNPJ e conta PJ ativa. Gated D4 (condição 2 — contrato MP + conta PJ). |
| 1.3 | Aceite dos termos do Google Play Developer | 🔵 | Feito no momento de criação da conta. |
| 1.4 | Verificação de identidade da conta (D-U-N-S ou verificação Google) | 🔵 🔴 | O Google pode solicitar verificação da empresa para publicar. Gated D4. |

---

## Bloco 2 — App criado no Console

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 2.1 | App criado no Play Console (`com.shareo.app`) | 🔵 | Criar em: Play Console → Todos os apps → Criar app. Package name: `com.shareo.app`. |
| 2.2 | Idioma padrão definido como Português (Brasil) | 🔵 | Selecionar `pt-BR` como idioma principal ao criar o app. |
| 2.3 | Tipo de app: app (não jogo) | 🔵 | Selecionar "App" no criação. |
| 2.4 | Distribuição: gratuito | 🔵 | App é gratuito; a monetização ocorre via transações internas (Mercado Pago). |

---

## Bloco 3 — Listing da loja (ficha de conteúdo)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 3.1 | Título definido (≤ 30 chars) | 🔨 | Ver `docs/mobile-play-listing.md` — fundadores escolhem entre opções A, B ou C. |
| 3.2 | Descrição curta (≤ 80 chars) | ✅ | Texto pronto em `docs/mobile-play-listing.md`. |
| 3.3 | Descrição longa (≤ 4.000 chars) | ✅ | Texto pronto em `docs/mobile-play-listing.md`. Revisão de fundadores recomendada. |
| 3.4 | Nome do desenvolvedor | 🔴 🔵 | Nome jurídico da PJ. Gated D4 (conta PJ). |
| 3.5 | E-mail de suporte | 🔵 | Usar `atendimento@shareo.com.br` (Zoho Mail já ativo). |
| 3.6 | Site do app | 🔴 | URL pública (`shareo.com.br`). Gated D4 (site de produção). |
| 3.7 | Política de privacidade (URL pública) | 🔴 | **Obrigatório.** Publicar `/privacidade` em produção. Gated D4 (condição 3 — Termos/Política publicados). O conteúdo revisado já existe (`docs/draft-clausulas-mp-termos-privacidade.md`); só publicar após D4. |
| 3.8 | Categoria: Compras (Shopping) | 🔵 | Selecionar ao configurar a ficha. |

---

## Bloco 4 — Assets visuais da loja

Todos os assets devem ser produzidos pelo designer com o app buildado e instalado num Android real.

| # | Item | Status | Especificação técnica |
|---|---|---|---|
| 4.1 | Ícone do app (Hi-res icon) | ✅ | 512×512px PNG, sem alpha (fundo sólido). Usar versão do logo sem transparência. Fonte: `apps/mobile/assets/icon.png` (verificar se é 512px; gerar versão 512px se necessário). |
| 4.2 | Feature Graphic | 🔨 | 1024×500px JPG ou PNG (sem alpha). Exibido no topo do listing. Composição sugerida: logotipo ShareO à esquerda + screenshot da tela de busca à direita + fundo na cor navy `#003366`. Produzir no Figma. |
| 4.3 | Screenshots — Smartphone (obrigatório, mín. 2, máx. 8) | 🔵 | JPEG ou PNG, 16:9 ou 9:16. Tamanho mín. 320px, máx. 3840px. Produzir com o app buildado num Android físico ou emulador. Ver telas recomendadas abaixo. |
| 4.4 | Screenshots — Tablet 7" (opcional mas recomendado) | 🔵 | Mesmo spec de smartphone; capturar em tablet ou emulador 7". |
| 4.5 | Screenshots — Tablet 10" (opcional) | 🔵 | Idem. |

### Telas recomendadas para screenshots (smartphone, 9:16)

Ordem sugerida para máximo impacto no listing:

1. **Tela de busca com itens próximos** — mostra o core do produto (localização + resultados).
2. **Detalhe de um item** — foto do item, preço por dia, avaliações, botão "Reservar".
3. **Tela de seleção de datas e cálculo de preço** — mostra o fluxo de reserva (diária/semanal/mensal).
4. **Chat com o proprietário** — diferencial de segurança/comunicação.
5. **Tela de reservas ativas** — painel do locatário.
6. **Tela de anúncio (proprietário)** — para atrair o perfil anunciante.

**Instrução para o designer:** adicionar banners/captions em português sobre cada screenshot para contextualizar o benefício (ex.: "Itens a poucos km de você", "Reserve em segundos", "Pague com segurança pelo Mercado Pago"). Ferramenta sugerida: Figma com template de device frame Android.

---

## Bloco 5 — Data Safety

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 5.1 | Rascunho do Data Safety elaborado | ✅ | Ver `docs/mobile-data-safety.md`. |
| 5.2 | Confirmação: permissão RECORD_AUDIO necessária? | 🔨 | devops-shareo deve verificar e remover de `app.json` se desnecessária. |
| 5.3 | Confirmação: Sentry instalado no mobile? | 🔨 | devops-shareo deve verificar `apps/mobile/package.json` e `apps/mobile/app/_layout.tsx`. |
| 5.4 | Confirmação jurídica: CPF no fluxo Mercado Pago | 🔴 | DPO / jurídico. Gated D4. |
| 5.5 | Confirmação jurídica: selfie = dado biométrico? | 🔴 | DPO / jurídico. Gated D4. |
| 5.6 | Formulário Data Safety preenchido no Console | 🔵 🔴 | Preencher no Play Console após confirmações acima. Submeter antes do primeiro AAB para revisão. |

---

## Bloco 6 — Classificação de conteúdo (IARC)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 6.1 | Questionário IARC respondido no Console | 🔵 | O Google Play usa o sistema IARC (International Age Rating Coalition). O responsável deve responder o questionário no Console. Duração estimada: 10–15 minutos. |
| 6.2 | Classificação esperada | 🔨 | Livre (sem violência, conteúdo adulto ou linguagem inapropriada). O questionário confirmará. |
| 6.3 | Declaração de conteúdo gerado pelo usuário (UGC) | 🔨 | O app tem UGC (fotos de itens, avaliações, mensagens no chat). Declarar e descrever o processo de moderação no questionário. |

---

## Bloco 7 — Permissões sensíveis (justificativa)

O Google Play pode solicitar justificativa para permissões classificadas como sensíveis. Preparar as declarações abaixo:

| Permissão | Justificativa para o Google Play |
|---|---|
| `CAMERA` | Usada para fotos de check-in e checkout de itens alugados (documentar o estado do item na retirada e na devolução) e para fotos do anúncio do item. |
| `ACCESS_FINE_LOCATION` | Usada para ordenar os itens disponíveis por distância do usuário, melhorando a relevância dos resultados de busca. |
| `ACCESS_COARSE_LOCATION` | Fallback para quando a localização precisa não está disponível; mesma finalidade. |
| `RECORD_AUDIO` | Confirmar necessidade — ver item 5.2. Se desnecessária, remover antes da submissão. |

---

## Bloco 8 — Build AAB assinado

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 8.1 | Conta Expo (EAS) existente | ✅ | EAS Project ID: `77b68688-0ceb-486f-8af7-a54ca55dbfb2`. |
| 8.2 | Perfil `production` configurado em `eas.json` | ✅ | Gera AAB (`app-bundle`) necessário para a Play Store. |
| 8.3 | `appVersionSource: "remote"` configurado em `eas.json` | 🔨 | PR #152 (s41) documentou o ajuste; verificar se foi aplicado em `apps/mobile/eas.json`. |
| 8.4 | Variáveis de ambiente configuradas no painel EAS | 🔨 | `EXPO_PUBLIC_API_URL=https://shareo.com.br` (produção). Hoje aponta para staging (PR #152). Ajustar para o domínio de produção antes do build de produção. Gated D4 (domínio de produção). |
| 8.5 | Keystore gerenciada pelo Expo | ✅ | Keystore `wVVAayBbVZ default` gerenciada pelo EAS (não local). NÃO perder acesso à conta Expo — a keystore é necessária para todas as atualizações futuras do app. |
| 8.6 | Build `eas build --platform android --profile production` executado | 🔵 | Requer créditos EAS ou plano pago. O último build (`preview`) falhou em 2026-06-03; recomenda-se primeiro refazer o build `preview` (APK) para validar, depois fazer o `production` (AAB). |
| 8.7 | AAB de produção gerado sem erros | 🔵 | Dependente do item 8.6. |
| 8.8 | Versão do app definida (`versionCode` e `versionName`) | 🔨 | `version: "1.0.0"` em `app.json`. O `versionCode` (inteiro crescente) deve ser gerenciado via `appVersionSource: "remote"` (item 8.3). |

---

## Bloco 9 — Faixa de teste interna (antes de produção)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 9.1 | AAB carregado na faixa "Teste interno" | 🔵 | Faixa de teste interna permite até 100 testadores sem revisão do Google. Disponível imediatamente após o upload. |
| 9.2 | Testadores adicionados (e-mails das contas Google) | 🔵 | Adicionar os fundadores e testers confiáveis. Usar contas Google dos testers (@gmail.com). |
| 9.3 | Link de teste enviado para os testers | 🔵 | O Console gera um link de opt-in. Cada tester deve abrir no Android com a conta Google cadastrada. |
| 9.4 | Validação do ciclo completo em teste interno | 🔵 🔴 | Testar busca → reserva → checkout Mercado Pago → retorno por deep-link. Gated D4 (pagamento real ativo). |
| 9.5 | Faixa fechada (closed testing) ou aberta (open testing) | 🔵 🔴 | Opcional antes da produção. Permite mais testadores externos. Gated D4 para pagamento real. |

---

## Bloco 10 — Go-live em produção (gated D4)

Estes itens só podem ser executados após o cumprimento das 4 condições de go-live do D4:
1. Parecer jurídico formal ✅ (recebido 2026-06-30)
2. Contrato Mercado Pago assinado + conta PJ ativa (em andamento)
3. Termos de Uso e Política de Privacidade publicados em URL pública
4. Checklist de conformidade 100% (ver `docs/checklist-conformidade-juridica.md`)

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 10.1 | Política de Privacidade publicada em URL pública | 🔴 | Publicar `/privacidade` no domínio de produção. Conteúdo já redigido. |
| 10.2 | Flag `mercadoPagoEnabled` ON em produção | 🔴 | Ativar via `/admin/financeiro`. Só após contrato MP assinado + conta PJ. |
| 10.3 | Override de sandbox MP removido | 🔴 | `MP_SANDBOX_SELLER_TOKEN` e o helper `sandboxSellerTokenOverride()` devem ser removidos antes do go-live (PR #122 deixou marcado com 🔴 REMOVER). |
| 10.4 | `EXPO_PUBLIC_API_URL` apontando para produção | 🔴 | Atualizar no painel EAS para `https://shareo.com.br`. |
| 10.5 | Build AAB de produção com URL correta | 🔴 | Recriar o build `production` com as variáveis de produção. |
| 10.6 | App promovido da faixa de teste para produção | 🔴 | No Play Console: "Promover para produção". O Google Play pode levar de 2 horas a 7 dias para revisar e publicar. |
| 10.7 | Monitoramento pós-publicação ativo | 🔴 | Acompanhar ANRs, crashes e avaliações nas primeiras 48 horas via Play Console + Sentry. |

---

## Bloco 11 — Requisitos legais e de conteúdo

| # | Item | Status | Detalhe / Ação |
|---|---|---|---|
| 11.1 | App não contém conteúdo adulto, violência ou discurso de ódio | ✅ | Marketplace de aluguel de itens. Sem risco de rejeição por conteúdo. |
| 11.2 | App não facilita transações fora da Play Billing para bens digitais | ✅ | Os pagamentos são por bens físicos (aluguel de itens reais) — não sujeito à Play Billing. |
| 11.3 | Conformidade com a Política de Dados do Usuário do Google Play | 🔴 | Depende do Data Safety completo (itens 5.x) e da Política de Privacidade publicada. |
| 11.4 | Conformidade com a política de permissões sensíveis | 🔨 | Ver Bloco 7. Remover RECORD_AUDIO se desnecessária (item 5.2). |
| 11.5 | Conformidade com LGPD (dados de usuários brasileiros) | 🔴 | Gated D4 — DPO, RIPD e Política de Privacidade. |

---

## Resumo de ações por responsável

| Responsável | Ações |
|---|---|
| **Fundadores** | Criar conta Play Developer (1.1); escolher título do app (3.1); escolher e-mail de suporte (3.5); registrar a organização (1.2); assinar contrato MP (10.2). |
| **devops-shareo** | Verificar/remover RECORD_AUDIO (5.2); verificar Sentry no mobile (5.3); confirmar `appVersionSource` no `eas.json` (8.3); executar build EAS (8.6). |
| **designer-shareo** | Feature Graphic 1024×500px (4.2); screenshots das 6 telas recomendadas (4.3); banners/captions sobre screenshots. |
| **fullstack-dev-shareo** | Expor botão "Excluir conta" no app mobile (Fase 5) (5.5 indireto). |
| **DPO / jurídico** | Confirmar CPF no fluxo MP (5.4); confirmar selfie biométrica (5.5); aprovar Política de Privacidade para publicação (10.1). |
| **product-owner-shareo** | Este documento. Aprovar listing com fundadores. Coordenar sequência de publicação. |

---

*Documento de trabalho — gated D4 nos itens marcados. Go-live de produção segue bloqueado até cumprimento das 4 condições. Ver `docs/checklist-conformidade-juridica.md` e `docs/checklist-go-live.md`.*
