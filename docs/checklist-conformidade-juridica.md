# Checklist de Conformidade Jurídica — ShareO

**Atualizado:** 2026-06-30 (s41) · **Fonte:** **parecer jurídico FORMAL** do D4 (revisado com a contratação do Mercado Pago como PSP — [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) + dossiê [`briefing-juridico-d4.md`](briefing-juridico-d4.md) + revisão da Central de Ajuda (s41).

> ✅ **Parecer FORMAL recebido** (condição 1 das 4 de go-live cumprida). ⚠️ **Go-live ainda NÃO liberado:** faltam **contrato com o Mercado Pago assinado + conta PJ ativa**, **Termos/Política revisados e publicados** e **checklist 100%**. Até lá, **nenhuma atividade de produção** (regra absoluta). Este checklist **rastreia** os ajustes exigidos; não os declara cumpridos juridicamente.

> Legenda: ✅ **pronto** (no produto/código) · 🟡 **parcial / verificar** · 🔨 **trabalho novo** · 🔵 **decisão de negócio/jurídico** (fora do código)

---

## 1. Pagamentos (Lei 12.865/2013 · BACEN)
- 🔵🔨 Migrar recebimento para **PSP licenciado** — **DECIDIDO + CONFIRMADO no parecer FORMAL: Mercado Pago** (ShareO **deixa de ser *merchant of record***; risco da Lei 12.865 reduzido substancialmente) ([[project-mercadopago-migration]]). Hoje o staging usa PIX manual em **chave pessoal de sócio** (temporário). Ciclo E2E de split validado em sandbox.
- 🔵 Formalizar **contrato com o PSP** (Mercado Pago) — fundadores/jurídico. **Condição 2 de go-live.**
- 🔨 Garantir fluxo **split/escrow** para afastar enquadramento como instituição de pagamento (aponta para o "Modelo B" da migração MP).
- 🔵 **Conta de recebimento = PJ da ShareO** (nunca pessoal) — societário.

## 2. Fiscal / Tributário
- 🔨 **Emissão de NF** sobre a taxa de 15% (receita da plataforma).
- 🔵 Definição contábil: **85% repassado ao proprietário ≠ receita** da ShareO.
- 🟡 Orientação fiscal a proprietários (PF declara IR / PJ emite NF própria) — hoje há **Informe de IR informativo** com disclaimer; formalizar orientação.
- 🔵 Revisão por **tributarista** (ISS/PIS/COFINS).

## 3. LGPD (Lei 13.709/2018)
- ✅ **DPO/Encarregado** designado + canal (`privacidade@shareo.com.br`, `lib/legal-config.ts`).
- 🔨 **Mercado Pago como operador de dados financeiros** (exigência do parecer revisado) — incluir no **RIPD** (Seções B/D.2/C.6) e na **Política de Privacidade** (`/privacidade`, nova subseção 4.1). Rascunhos em [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md).
- 🟡 **RIPD** (Relatório de Impacto) — **rascunho elaborado** (#116, [`rascunho-ripd.md`](rascunho-ripd.md)); falta validação do DPO/jurídico + arquivamento formal.
- 🟡 **Formalizar transferência internacional** (Resend/Sentry/Mapbox/Vercel — EUA) — **rascunho** (#116, [`transferencia-internacional-dados.md`](transferencia-internacional-dados.md)); falta assinar cláusulas-padrão (art. 33).
- 🔨 **Expurgo de dados** (minimização/retenção) — crons `purge-admin-logs` / `purge-consent-ips` / `purge-access-logs` implementados (#118, flag-safe); **prazos (5a / 180d) a confirmar com jurídico** antes de ativar em produção.
- ✅ **Direitos do titular**: acesso/exclusão (art. 18, `DELETE /api/users/me`) + portabilidade (art. 20, `GET /api/users/me/export`).
- ✅ **Segurança**: AES-256-GCM em CPF/CNPJ + HMAC; bucket `id-docs` privado; PII mascarada em logs.
- 🔨 **Ressalvas da auditoria s40 — REMEDIADAS (PRs abertos, pendente merge, s41 2026-06-30):** (1) `HMAC_KEY` separada de `ENCRYPTION_KEY` (fallback retrocompat) #125; (2) `DELETE /api/users/me` respeita janela fiscal de 5a (ADR-017) #127; (3) export art. 20 completo (+mensagens/financeiro/KYC/ambassador) #127; (4) scrub unificado `lib/sentry-scrub.ts` (edge/server/client) #125; (5) `lib/logger.ts` `safeServerError()` mascara `console.error` #125; (6) `SENSITIVE_RE` com `pixKey`/`holderName`/`responsavelLegal` #125. **PRs #125/#127** — ainda **não mesclados**; flags OFF, sem produção. Ver `auditoria-conformidade-tecnica-s40.md`.

## 4. CDC / Termos de Uso
- ✅ **Taxa de 15% destacada** na UI e nos Termos (`app/termos`).
- 🔨 **Política de arrependimento** (art. 49 — 7 dias corridos, **antes da retirada**).
- 🔨 Cláusula de **responsabilidade primária do proprietário** — **sem excluir** a responsabilidade **solidária** da ShareO.
- 🟡 **Política de cancelamento/devolução** clara — existe fluxo de cancelamento/devolução; formalizar a redação.
- 🔨 Cláusula de **limitação de responsabilidade** da plataforma (sem excluir obrigações do CDC).

## 5. PLD/FT (Lei 9.613/1998 · COAF)
- 🔵 Definir se a ShareO é **sujeito obrigado** (depende da estrutura de pagamentos; com PSP, parte recai no PSP).
- 🟡 **KYC/KYB mínimo** — KYB leve de PJ já iniciado (CNPJ na Receita + declaração).
- 🔨 Política de **monitoramento de transações suspeitas**.
- 🔨 Procedimento de **comunicação ao COAF** (se aplicável).

## 6. Civil / Contratos (CC, locação de coisas)
- 🟡 **Contrato de locação aceito eletronicamente** por locador e locatário — **implementado atrás de flag** `rentalContractAcceptanceEnabled` (OFF) (#117, [`lib/rental-contract.ts`](../lib/rental-contract.ts) + `contractVersion`/`contractTextHash`); ligar pós-parecer, com o texto contratual aprovado.
- 🔨 Cláusula de **responsabilidade por dano/perda** do item (risco do locatário, salvo vício preexistente).
- 🔵 **Seguro opcional** disponível (parceria/seguradora) — decisão de negócio.
- 🟡 **Multas e atrasos** previstos — verificar cobertura atual (devolução em atraso).

## 7. Marco Civil da Internet (Lei 12.965/2014)
- 🔨 **Guarda de logs por 6 meses** (art. 15) — **scaffolding implementado, flag OFF** (#118, s40): tabela `access_logs` (sa-east-1) + `lib/access-log.ts` (grava só com `accessLogsEnabled="true"`) + cron de expurgo aos 180d. **`logAccess()` já integrado nas rotas autenticadas** (`users/me`, `bookings`, `conversations`) no **PR #125** (s41, flag ainda OFF → zero I/O). **Ainda NÃO conforme em produção** — falta jurídico decidir **Opção I** (Vercel Log Drain → Axiom/Better Stack/S3, dados EUA) × **Opção II** (tabela sa-east-1, recomendada p/ H1) e **ligar a flag**. Ver [`retencao-logs-art15.md`](retencao-logs-art15.md) e [`auditoria-conformidade-tecnica-s40.md`](auditoria-conformidade-tecnica-s40.md).
- 🔨 Política de **notificação e retirada** de conteúdo (art. 19).
- ✅ **Termos de Uso e Política de Privacidade publicados/acessíveis** (`/termos`, `/privacidade`) — **revisar o conteúdo** conforme o parecer.

## 8. Complementar
- ✅ **Registro da marca "ShareO" no INPI** — **FEITO** (confirmado no parecer).
- 🔵 Avaliar **seguro coletivo** / parceria com seguradora.
- 🔵 **Estrutura societária** revisada (PJ titular da conta e dos contratos com PSP).

## 9. Central de Ajuda (`/ajuda`) — revisão dos especialistas (s41)
Revisão read-only por product-owner + designer + segurança. Relatório consolidado: [`ajuda-revisao-especialistas-s41.md`](ajuda-revisao-especialistas-s41.md). Itens a levar à advogada (gated D4 — **não publicar antes do sign-off**):
- 🔨 **Conteúdo de pagamento cita "Stripe"** em 7 trechos — reescrever para **Mercado Pago** (cruza item 1). Risco de **propaganda enganosa** (CDC art. 30/37); a FAQ "regulamentado pelo Banco Central via Stripe" toca a Lei 12.865 → **validar redação com a advogada**.
- 🔨 **"Dinheiro retido na plataforma"** (6×) contradiz o Modelo B/split (custódia é do PSP) — reescrever (cruza itens 1/3).
- 🔨 **"Exclusão em 15 dias conforme a LGPD"** — impreciso (art. 18 §3º; 15 dias é do art. 19) — alinhar com #3 e o RIPD.
- 🔨 **"Nunca compartilhamos com terceiros"** — falso (subprocessadores + MP, transferência internacional) — alinhar com #3.
- 🔨 **"Seguro opcional 1%"** — vender "seguro" sem seguradora SUSEP é irregular (DL 73/66); confirmar parceiro ou renomear "proteção" (cruza item 6, ⊕ checar se é promessa não implementada).
- 🟡 SLAs publicados (4h/2h/"7 dias 8h–22h") viram oferta vinculante (CDC art. 30) — alinhar com capacidade real; multa/cancelamento espelhar nos Termos (item 4).
- ✅ **Já corrigido (não-gated, PR #124):** a11y (tap targets/contraste/aria-live) + inconsistência interna da regra de liberação de pagamento.

---

## 🚦 Go-live só após (condições do próprio parecer)
1. ✅ **Parecer jurídico FORMAL** — **recebido** (versão revisada com o Mercado Pago como PSP, [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)).
2. 🔵 **Contrato com PSP (Mercado Pago) assinado + conta PJ ativa.**
3. 🔨 **Termos de Uso e Política de Privacidade revisados e publicados** (rascunhos: [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md)).
4. 🔨 **Checklist acima 100% cumprido.**

> Ver também: [`checklist-go-live.md`](checklist-go-live.md) (infra/técnico) · [`d4-cobranca-juridico.md`](d4-cobranca-juridico.md) · memória [[project-d4-juridico]].
