# Roadmap H1 — ShareO MVP

**Versão:** 1.0
**Data:** 2026-05-30
**Owner:** Product Owner
**Status:** Ativo

---

## 1. Objetivo do H1

Lançar o MVP do ShareO em Natal/RN com o conjunto mínimo de funcionalidades que permita a uma pessoa publicar um item para alugar, a outra pessoa encontrá-lo, solicitar o aluguel, combinar a entrega via chat in-app e concluir a locação com avaliação bilateral — tudo dentro da plataforma, sem dependência de canais externos (WhatsApp, pagamento externo ou apps nativos).

**Declaração de visão do H1:**
Entregar a experiência central de aluguel local — do cadastro ao feedback pós-devolução — com confiança, usabilidade mobile-first e base técnica que suporte o crescimento do H2.

---

## 2. Metricas de Sucesso (90 dias apos lancamento)

| Metrica | Meta | Referencia |
|---|---|---|
| Usuarios cadastrados | 500 | PRD seção 8 |
| Anuncios ativos | 200 | PRD seção 8 |
| Solicitacoes de aluguel enviadas | 100 | PRD seção 8 |
| Alugueis completados (primeiros 100) | 30 no periodo piloto | PRD seção 8 |
| NPS pos-locacao | maior ou igual a 50 | Referencia Airbnb early stage |
| Taxa de conversao (visita → solicitacao) | maior ou igual a 8% | Meta produto |
| Taxa de resposta dos proprietarios | maior ou igual a 70% em 4h | Saude do marketplace |
| Bounce rate na home | menor que 40% | Meta SEO/produto |
| Taxa de bugs criticos pos-deploy | 0 (zero) | Definition of Done |
| Cobertura de testes (dominios core) | maior ou igual a 70% | CLAUDE.md |

**Nota sobre o NPS:** a meta e maior ou igual a 50 (Net Promoter Score), que e considerado excelente para marketplace em fase inicial. A coleta sera feita via formulario in-app, exibido 24 horas apos a conclusao do primeiro aluguel do usuario.

---

## 3. Historias de Usuario em Ordem de Prioridade

A ordem abaixo reflete a sequencia de entrega recomendada, combinando prioridade MoSCoW (Must/Should), valor para o usuario e dependencias tecnicas.

### Bloco 1 — Fundacao (P0, sem estas nada funciona)

| Ordem | HU | Titulo | Estimativa | Dependencias |
|---|---|---|---|---|
| 1 | HU-001 | Cadastro de Conta PF | M | nenhuma |
| 2 | HU-013 | Cadastro de Conta PJ | M | nenhuma (paralelo a HU-001) |
| 3 | HU-002 | Login e Logout | M | HU-001, HU-013 |
| 4 | HU-014 | Anunciar Item | L | HU-002 |
| 5 | HU-003 | Busca por Localizacao e Categoria | L | HU-014 |

### Bloco 2 — Jornada central de aluguel (P0/P1)

| Ordem | HU | Titulo | Estimativa | Dependencias |
|---|---|---|---|---|
| 6 | HU-004 | Ver Detalhe do Item | M | HU-003 |
| 7 | HU-005 | Solicitar Reserva | L | HU-004, HU-002 |
| 8 | HU-015 | Confirmar ou Recusar Pedido | M | HU-005, HU-014 |
| 9 | HU-007 | Chat com Proprietario | L | HU-015 |
| 10 | HU-016 | Marcar Item como Ativo | S | HU-015 |

### Bloco 3 — Enceramento e confianca (P1)

| Ordem | HU | Titulo | Estimativa | Dependencias |
|---|---|---|---|---|
| 11 | HU-008 | Confirmar Devolucao (Locatario) | S | HU-016, HU-007 |
| 12 | HU-017 | Confirmar Devolucao e Avaliar (Proprietario) | M | HU-016, HU-009 |
| 13 | HU-009 | Avaliar Proprietario e Item | M | HU-008 |
| 14 | HU-011 | Cancelar Reserva | S | HU-005 |
| 15 | HU-012 | Reportar Problema | M | HU-005, HU-008 |

### Bloco 4 — Engajamento e gestao (P1)

| Ordem | HU | Titulo | Estimativa | Dependencias |
|---|---|---|---|---|
| 16 | HU-006 | Acompanhar Status da Reserva | M | HU-005 |
| 17 | HU-010 | Favoritar Itens | S | HU-002 |
| 18 | HU-018 | Gerenciar Anuncios | M | HU-014 |
| 19 | HU-019 | Ver Historico de Locacoes | S | HU-014, HU-015 |
| 20 | HU-020 | Ver Earnings no Dashboard | M | HU-019 |

### Bloco 5 — Administracao e seguranca (P1)

| Ordem | HU | Titulo | Estimativa | Dependencias |
|---|---|---|---|---|
| 21 | HU-021 | Aprovar ou Reprovar Anuncios | M | HU-014 |
| 22 | HU-022 | Suspender Usuarios | M | HU-001, HU-013 |

---

## 4. Dependencias entre Historias

O grafo abaixo descreve as dependencias diretas entre as 22 HUs. Uma seta indica "deve ser entregue antes".

```
HU-001 ──┐
          ├──► HU-002 ──────────────────────────────► HU-014 ──┐
HU-013 ──┘                                                      │
                                                                 ├──► HU-003 ──► HU-004 ──► HU-005
                                                                 │                              │
                                                                 ├──► HU-018                    ├──► HU-015 ──────► HU-007
                                                                 ├──► HU-019 ──► HU-020         │        │
                                                                 └──► HU-021                    │        └──► HU-016 ──► HU-008 ──► HU-009
                                                                                                │                  │
                                                                                                ├──► HU-011        └──► HU-017
                                                                                                ├──► HU-006
                                                                                                └──► HU-012

HU-002 ──► HU-010 (paralelo, sem dependencia da jornada de aluguel)
HU-001 + HU-013 ──► HU-022 (pode ser desenvolvido em paralelo ao bloco 2)
```

**Caminhos criticos:**

1. **Jornada locatario completa** (maior caminho): HU-001 → HU-002 → HU-014 → HU-003 → HU-004 → HU-005 → HU-015 → HU-007 → HU-016 → HU-008 → HU-009
   Total estimado: 2M + M + L + L + M + L + M + L + S + S + M = aprox. 8-10 semanas com 1 desenvolvedor full-stack

2. **Jornada proprietario**: HU-013 → HU-002 → HU-014 → HU-015 → HU-016 → HU-017
   Parcialmente sobreposta com o caminho critico acima.

3. **Admin independente**: HU-021 e HU-022 podem ser desenvolvidas em paralelo ao bloco 3, pois dependem apenas de HU-014 (para moderar anuncios) e HU-001/HU-013 (para suspender usuarios) — ambas ja entregues no bloco 1.

---

## 5. Distribuicao por Sprint (referencia)

Estimativa para um time de 2 desenvolvedor full-stack + 1 designer. Sprints de 2 semanas.

| Sprint | HUs | Foco |
|---|---|---|
| Sprint 1 | HU-001, HU-013, HU-002 | Autenticacao e cadastro (PF + PJ + login/logout) |
| Sprint 2 | HU-014, HU-003 | Anunciar item + Busca geolocalizada |
| Sprint 3 | HU-004, HU-005 | Detalhe do item + Solicitacao de reserva |
| Sprint 4 | HU-015, HU-007, HU-016 | Confirmacao + Chat in-app + Marcacao ativo |
| Sprint 5 | HU-008, HU-017, HU-009, HU-011 | Devolucao + Avaliacao bilateral + Cancelamento |
| Sprint 6 | HU-006, HU-010, HU-012 | Acompanhar status + Favoritos + Reportar problema |
| Sprint 7 | HU-018, HU-019, HU-020 | Gerenciar anuncios + Historico + Earnings |
| Sprint 8 | HU-021, HU-022 | Dashboard admin (aprovar anuncios + suspender usuarios) |
| Sprint 9 | — | Buffer: itens P0 do backlog tecnico, hardening, testes e2e, deploy producao |

**Observacao:** esta distribuicao e uma referencia inicial para o Planning. O Gestor de Projeto e o time devem ajustar com base na velocidade real apos a Sprint 1 e nos impedimentos identificados.

---

## 6. Itens P0 do Backlog Tecnico que Desbloqueiam o H1

Os itens abaixo do backlog tecnico nao sao historias de usuario, mas sao pre-requisitos para qualquer release. Devem ser iniciados na Sprint 1 em paralelo ao desenvolvimento das HUs.

| Item Backlog | Descricao | Bloqueia |
|---|---|---|
| P0 #1 | Ativar coverageThreshold no jest.config.ts | CI/CD confiavel |
| P0 #2–4 | Testes unitarios: bookings, pricing, crypto | Base de testes P0 |
| P0 #8 | Configurar 3 instâncias Supabase (dev/staging/prod) | Todos os ambientes |
| P0 #9 | Criar .github/workflows/ci.yml | Pipeline CI/CD |
| P0 #10 | Implementar politicas RLS no Supabase | Seguranca de todos os dados |

---

## 7. Criterios de Saida do H1 (Definition of Done do MVP)

O H1 esta concluido quando:

1. As 22 historias de usuario estao com todos os criterios de aceitacao atendidos e demonstradas em Review.
2. A jornada completa locatario → proprietario → COMPLETED passou nos testes e2e (`e2e/booking-flow.spec.ts`).
3. A cobertura de testes nos dominios core (auth, items, bookings, users) e maior ou igual a 70%.
4. Core Web Vitals nas paginas `/`, `/itens`, `/itens/[id]` atendem: LCP menor que 2,5s, CLS menor que 0,1, INP menor que 200ms.
5. Nenhuma vulnerabilidade OWASP Top 10 identificada em audit de segurança.
6. LGPD: consentimento, minimizacao e exclusao de dados funcionando e testados.
7. Acessibilidade WCAG 2.1 AA verificada com jest-axe nos componentes principais.
8. Deploy em producao (Vercel) com aprovacao manual do PO.

---

## 8. O Que NAO Esta no H1

Para evitar scope creep, os itens abaixo estao explicitamente fora do H1:

| Feature | Horizonte |
|---|---|
| Pagamento integrado (Stripe/Pix/Pagar.me) | H3 |
| Seguro integrado do item | H2 |
| Assinatura Premium PJ | H2 |
| Analytics avancado para anunciantes | H2 |
| App mobile nativo (React Native) | H3 |
| Verificacao de identidade via KYC externo | H2 |
| Push notifications Firebase FCM | Fora do escopo |
| Integracao com WhatsApp | Descartado (decisao de produto) |
| Estoque sincronizado PJ | H2 |
| Gamificacao (badges, pontos, reputacao) | P3 — pos-MVP |
| Emails de reengajamento (SendGrid/Resend) | P3 — pos-MVP |

---

## 9. Proximas Revisoes

Este documento deve ser revisado:

- Ao final de cada Sprint, para ajustar estimativas e prioridades com base na velocidade real do time.
- Apos cada sessao de feedback com usuarios piloto em Natal/RN.
- Antes do Planning da Sprint 5, para decidir se itens P2 (qualidade pre-lancamento) serao puxados para o H1 ou postergados para o H1.5.

---

*Shareo — "Use Mais. Possua Menos." — Documento gerado em 2026-05-30*
