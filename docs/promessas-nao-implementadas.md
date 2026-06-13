# Promessas Não Implementadas — ShareO

**Versão:** 2.0 (re-auditoria completa contra o código)
**Data:** 2026-06-12 (noite)
**Autor:** Re-auditoria por Claude Code — cada item verificado contra `main` (commit `cdf677f`)
**Versão anterior:** v1.0 (2026-06-12 manhã) — catalogou 64 itens; **32 já estavam ou foram resolvidos**, incluindo itens que a v1.0 classificou errado (ex.: webhooks PJ já tinham UI+API+disparo completos).

> **Lição da v1.0:** vários itens foram catalogados consultando só schema/docs sem verificar a UI correspondente. Esta versão verificou cada item no código. Regra para futuras auditorias: grep na UI (`app/**`, `components/**`) antes de declarar "sem UI".

---

## Sumário Executivo

| Situação | Qtd |
|---|---|
| ✅ Resolvidos (verificados no código) | 32 |
| ⏳ Bloqueados por D4 (jurídico) | 9 |
| 🤝 Aguardam decisão de fundadores/produto | 11 |
| 🔨 Executáveis agora (sem bloqueador externo) | 6 |
| 📅 H2/H3 por prioridade de roadmap | 6 |
| **Total** | **64** |

---

## ✅ Resolvidos (32 itens)

| Item v1.0 | O que era | Resolução |
|---|---|---|
| 1.7 | Teto R$500 sem aviso na UI | Alerta + CTA desabilitado no `_PriceCalc.tsx` quando subtotal > teto (`287c64c`) |
| 2.2 | Limiares de tier embaixador hardcoded | `getAmbassadorThresholds()` em PlatformConfig (`939c8b6`) |
| 2.3 | Janela referral 30d hardcoded | `getReferralWindowDays()` em PlatformConfig (`939c8b6`) |
| 2.4 | Cron ambassador-decay não registrado | Está em `vercel.json` (verificado) |
| 4.1–4.16 | 16 valores hardcoded | Todos movidos para PlatformConfig ou constantes nomeadas (`939c8b6` + `287c64c`): cancelamento, late fee, tiers, referral, auto-cancel, payout window, uploads, RATE_LIMITS, TTLs de token (`lib/auth-config.ts`), badges, CO₂, Stripe expiry |
| 5.5 | PWA ícones placeholder | Ícones 192/512 + screenshots atualizados (jun/10); STATUS: "PWA ✅ validado" |
| 7.1 | Avaliação por critérios sem UI | Form completo em `_ReviewForm.tsx` (critérios por tipo, média automática) + exibição nos cards (`cdf677f`) |
| 7.2 | Emoji de satisfação sem UI | Seletor 😠–😍 no form + exibição nos cards (`cdf677f`) |
| 7.3 | Foto na avaliação sem UI | Upload no form (reviewType ITEM) + exibição nos cards (`cdf677f`) |
| 7.4* | Badges/reputação sem exibição | Seção "Conquistas" em `/perfil/[id]`: badge locatário, Avaliador Ativo, pontos, progress bar. *Exceção: cupom 10% off por avaliar → movido para item P-4 abaixo |
| 7.5 | Templates de chat | 5 chips no `_ChatWindow.tsx` quando input vazio (P3-66) |
| 8.2 | Webhooks PJ "sem UI nem disparo" | **Erro da v1.0** — já existia completo: UI `/meus-anuncios/integracoes`, API `pj/webhooks`, disparo `lib/outboundWebhooks.ts` integrado em bookings/Stripe |
| 8.3 | E-mail de exportação pronta | `sendExportReadyEmail` em `lib/email.ts`, usado em `admin/export` (`287c64c`) |
| 9.3 | 6 scripts temporários no repo | Deletados (`939c8b6`, confirmado: arquivos não existem) |
| 9.4 | Lighthouse CI ausente | Roda no `main.yml` via `treosh/lighthouse-ci-action` contra staging (modo warning, não bloqueia — gate bloqueante é opcional futuro) |
| 9.6 | geocodeItem fire-and-forget | `after()` aplicado em POST/PUT items (`287c64c`); varredura completa em ~30 rotas (`28ca951`) |
| 11.2 | Duplicata haversine | Não existe — `utils/geo.ts` só tem `buildSlug`; canônico é `lib/haversine.ts` |
| 12.b | "Mais alugados" sem ordenação | `?sort=rented` por contagem de bookings + opção no SortSelect (`1c6a7dc`) |
| 12.c | Filtro por rating não implementado | `minRating` com média em JS + radio na UI de filtros (já existia) |
| 12.d | Estimativa de ganhos sem página | `/ganhar` com `_EarningsCalc` (já existia) |
| 12.e | Dashboard fora da nav | Decisão de design: substituído por `/perfil` — não é gap |
| 12.f | Indicações não linkado | `/perfil/indicacoes` no UserDropdown → redireciona a `/perfil/embaixador` (já existia) |
| 12.g | Stats da homepage fictícios | Conectados ao banco: itens, proprietários, avaliação média (≥5 reviews), categorias (`1c6a7dc`) |

---

## ⏳ Bloqueados por D4 — consulta jurídica (9 itens)

Nenhuma ação de código pendente; destravam no sign-off. Preparação paralela permitida (sem go-live).

| # | Item | Detalhe |
|---|---|---|
| D4-1 | Stripe live mode (era 1.8) | `sk_live_...` só após D4 |
| D4-2 | Payout de comissões de embaixadores (2.1) | `ambassadorPayoutEnabled=false`; cálculo já acumula no banco |
| D4-3 | customFeeRate de fundadores (3.1) | Campo no schema; `getPlatformFeeRate()` não consulta — implementar pós-D4 |
| D4-4 | searchBoost de fundadores (3.2) | Campo no schema; sem lógica de ranking |
| D4-5 | Convite de fundadores via link (3.3) | `FounderLead.invitedAt/convertedAt` sem endpoint de convite |
| D4-6 | Benefícios por wave — FounderBenefit (3.4) | Model sem UI admin nem aplicação |
| D4-7 | `/politicas` com texto jurídico real (5.2) | Página existe (~96 linhas) mas é stub; jurídico revisa o texto |
| D4-8 | Supabase production (9.1) | 3º projeto isolado — criar no dia do sign-off |
| D4-9 | Domínio shareo.com.br + SPF/DKIM (9.2) | Também destrava o e-mail da exportação assíncrona (era 1.9 — o template já existe) |

---

## 🤝 Aguardam decisão de fundadores/produto (11 itens)

| # | Item | Decisão pendente |
|---|---|---|
| F-1 | Repasse PIX automático (1.1) | D1: integração bancária real em V1+ após volume |
| F-2 | Stripe Connect BR (1.2) + conta Connect embaixador (2.5) | D1: reavaliação ~dez/2026 |
| F-3 | Caução (1.3) | D2: pós V1-Financeiro |
| F-4 | Informe IR em PDF (1.4) | ADR-019: só se houver demanda |
| F-5 | Relatório mensal por e-mail (1.5) | ADR-020: V1+ com Resend pago |
| F-6 | Lista VIP — revisão LGPD do consentimento (3.5) | Form e seção já estão na homepage (`ListaVIP` + `FounderCaptureForm`); falta validar texto de consentimento pré-produção |
| F-7 | `/sobre` — equipe com nomes reais (5.1) | Conteúdo depende de aprovação dos fundadores |
| F-8 | Canal real de suporte (5.3) | E-mail/SLA/horário não definidos |
| F-9 | App mobile: teste, build EAS, lojas (6.1–6.4) | Roberto decide quando retomar (último build falhou Gradle jun/03) |
| F-10 | Stats da homepage: números honestos vs. copy aspiracional | Staging mostra 27 itens / 2 proprietários reais |
| F-11 | Moderação proativa de itens (8.1) | H2 quando houver volume |

---

## 🔨 Executáveis agora — sem bloqueador externo (6 itens)

| # | Item | Esforço | Prioridade sugerida |
|---|---|---|---|
| P-1 | Verificação de contas PIX (1.6) — processo documentado p/ ADMIN_FINANCEIRO (validação Bacen é H2) | Baixo (doc + checklist na UI) | P1 pré-produção |
| P-2 | k6 load test (9.5) — 50 VUs em `GET /api/items`, P95 < 1s | Médio | P2 |
| P-3 | KPIs GA4 (11.1) — eventos customizados (CTR cards, conversão busca→contato) | Médio | P2 |
| P-4 | Cupom 10% off por avaliar (resto do 7.4) | Médio (model de cupom não existe) | P3 |
| P-5 | Página/seção "Dicas para anfitriões" (5.6) | Baixo (conteúdo em `/ajuda`) | P3 |
| P-6 | Lighthouse CI com gate bloqueante (resto do 9.4) | Baixo | P3 |

---

## 📅 H2/H3 por roadmap (6 itens)

| # | Item | Horizonte |
|---|---|---|
| H-1 | Verificação de celular Zenvia SMS OTP (10.1) — schema ainda sem campos `phoneOtp*` | H2 (decisão Raimundo: disparar na 1ª reserva) |
| H-2 | NextAuth v5 beta → GA (10.2) | Monitorar; agir só se GA trouxer breaking changes |
| H-3 | CO₂ por categoria (11.3) | H2/H3 (migration) |
| H-4 | View de mapa fullscreen (12.a) | H2 (mapa já existe embutido em `/itens`) |
| H-5 | Comunidade — fórum/eventos reais (5.4) | H3 |
| H-6 | Push notifications FCM (6.3) | H3 |

---

## Próximos Passos Recomendados

1. **Agora:** P-1 (processo de verificação PIX) e P-3 (KPIs GA4) — ambos pré-produção e sem dependência.
2. **Paralelo ao D4:** preparar provisionamento (checklist do STATUS.md §Arquitetura de Produção) sem executar.
3. **Dia do sign-off D4:** executar D4-1 a D4-9 em bloco (roteiro já existe no STATUS.md).
4. **H2:** verificação de celular, repasse automático, moderação proativa, CO₂ por categoria.

---

*Documento re-auditado em 2026-06-12 contra o commit `cdf677f`. Revisar após cada bloco de entregas — a v1.0 ficou obsoleta em menos de um dia.*
