# ADR-022 — Programa de Indicação por Tiers (Embaixadores ShareO)

**Status:** Proposto
**Data:** 2026-06-11
**Decisores:** arquiteto-shareo, product-owner-shareo, seguranca-shareo
**Consulted:** Compliance (D4 pendente bloqueia payout real), fullstack-dev-shareo, designer-shareo
**Substitui:** mecânica de cashback fixo de R$15 em `lib/referral.ts` + `ReferralCredit` (ADR informal incorporada ao MVP H1)

---

## Contexto

O programa de indicação atual entrega um **crédito fixo de R$15** (`REFERRAL_CREDIT_CENTS = 1_500`) tanto para quem indica quanto para quem é indicado, válido por 90 dias e usável no primeiro aluguel concluído. Após uso real em staging e conversa com o PO, três limitações ficaram evidentes:

1. **Sem efeito composto** — quem indica 50 pessoas ganha o mesmo valor unitário de quem indica 1; não há incentivo para construir uma base. O programa não cria embaixadores de longo prazo.
2. **Crédito on-platform tem custo de oportunidade ruim** — R$15 saem do GMV futuro da própria plataforma (locatário gasta R$15 a menos), o que é caro e não escala com o engajamento do indicador.
3. **Modelo CDC/jurídico fica em zona cinza** — “R$15 para quem indica” é promessa contratual difícil de revogar; um modelo de comissão variável atrelada a transação real é mais defensável (remuneração por serviço de captação) e alinhado a programas de afiliados conhecidos.

Adicionalmente, o time precisa de uma alavanca de crescimento orgânico antes do go-live de produção (pós-D4), e o PO definiu como objetivo transformar superusuários em distribuidores oficiais via tiers — **Bronze / Silver / Gold**.

### Restrições não-negociáveis do MVP

- **D4 (consulta jurídica) bloqueia payout real.** O MVP deve **rastrear** indicações, **calcular** tier vigente e **acumular** comissão sem efetivamente pagar. Stripe Connect permanece oculto até dez/2026 (decisão D1).
- **LGPD Art. 7-9** — participação no programa exige consentimento explícito (opt-in), revogável a qualquer momento. Indicado *não* precisa consentir para gerar comissão para o indicador (é apenas atribuição); o indicador é quem precisa ter aceitado o termo do programa.
- **RLS desabilitado** (ADR-009) — toda checagem de propriedade é via guards server-side com `session.user.id`.
- **Stack inalterada** — Prisma v6, PostgreSQL/Supabase, sem PostGIS/CTE pesadas no caminho crítico de booking.

---

## Decisão

### Resumo executivo

Substituir o cashback fixo R$15 por um **programa de embaixadores em três tiers** (BRONZE 3%, SILVER 5%, GOLD 7%), onde o percentual incide sobre a **taxa da plataforma** (não sobre o GMV) de cada reserva paga em que o locatário foi um indicado ativo do embaixador. A comissão é **registrada** no MVP mas **não paga**; payout depende de D4 jurídico + Stripe Connect (ou trilho PIX alternativo).

### 1. Modelo de domínio — quatro entidades

| Entidade | Responsabilidade |
|---|---|
| `AmbassadorProfile` | Vínculo 1:1 com `User`. Armazena estado denormalizado: tier vigente, slug público, totais acumulados, consentimento LGPD do programa. |
| `Referral` | Aresta do grafo de indicações: `referrerId → referredId`. Status (`PENDING`, `ACTIVE`, `EXPIRED`), data de ativação (primeira reserva paga), janela de 12 meses para contar em tier. |
| `AmbassadorCommission` | Snapshot imutável de cada comissão gerada por uma reserva paga. Vinculada a `Booking`, `Referral` e tier vigente no momento. |
| `AmbassadorTierHistory` (opcional, v2) | Auditoria de transições de tier. Adiada para o pós-MVP — recálculo on-the-fly por enquanto. |

**Atualizações em `User`:**
- `referralCode` (existente) é **renomeado conceitualmente** para `referralSlug` no domínio do embaixador; o campo do schema permanece como `referralCode` para minimizar churn de migration e backwards-compat. Mantemos `referralCode @unique`.
- `referredById` (existente) permanece como FK self-relation.
- `ambassadorProfile`: nova relação opcional para `AmbassadorProfile`.

### 2. Mecânica de tiers e cálculo de comissão

```
comissão_centavos = round(platformFeeAmount × tierPercentBp / 10000)
```

| Tier | Faixa de indicados ATIVOS (últimos 12 meses) | Percentual da taxa | Bp |
|---|---|---|---|
| BRONZE | 1–10 | 3% | 300 |
| SILVER | 11–50 | 5% | 500 |
| GOLD | 51+ | 7% | 700 |

**“Indicado ativo”** é um `Referral` com `status = ACTIVE` (primeira reserva paga concluída) e `activatedAt >= now() - interval '12 months'`.

**Tier é calculado no momento da geração da comissão** (não em cron). Função `getAmbassadorTier(activeReferrals)` é pura e testável; usada também no painel `/perfil/embaixador`.

Exemplo: reserva R$200, taxa 15% → `platformFeeAmount = 3000` (centavos)
- BRONZE → 90 centavos (R$0,90)
- SILVER → 150 centavos (R$1,50)
- GOLD → 210 centavos (R$2,10)

### 3. Estados do `Referral`

```
PENDING → (primeira reserva paga do indicado) → ACTIVE → (12 meses sem reserva) → EXPIRED
```

- `PENDING`: indicado se cadastrou com o slug do embaixador, ainda não pagou nenhuma reserva.
- `ACTIVE`: indicado já teve pelo menos uma reserva paga (`paymentStatus = PAID`); `activatedAt` é gravado.
- `EXPIRED`: cron mensal (`/api/cron/ambassador-decay`) marca como EXPIRED quem não tem reserva paga nos últimos 12 meses. Não deleta — auditoria precisa do histórico.

`Referral` é único por `(referrerId, referredId)` — bloqueia duplicação. Continua respeitando a janela de 30 dias do `applyReferralCode` atual para o indicado **aplicar** o código (regra herdada).

### 4. Estados do `AmbassadorCommission`

```
PENDING → APPROVED → PAID
              ↓
          CANCELLED (booking cancelado, refund, dispute lost)
```

- `PENDING`: criada no momento em que o webhook Stripe processa `checkout.session.completed` da reserva.
- `APPROVED`: cron diário marca como APPROVED após `T+7 dias` da conclusão do booking (janela de proteção contra dispute/refund — mesma lógica do `eligibleAfter` de `Payout`).
- `PAID`: marcada após payout efetivo. **Bloqueado até D4.** Em staging/MVP nenhuma comissão atinge esse estado.
- `CANCELLED`: cancelada se o booking de origem entrar em `REFUNDED`, `DISPUTED` perdida ou `CANCELLED`.

### 5. Integração com `PlatformTransaction`

A comissão do embaixador **reduz a receita líquida da plataforma**, mas **não altera o split do proprietário** (`ownerNetAmount` continua igual). A taxa da plataforma já foi descontada do proprietário; a comissão sai do bolso da ShareO.

Portanto, ao aprovar uma `AmbassadorCommission` (estado APPROVED), criamos um registro em `PlatformTransaction` com o novo type `AMBASSADOR_COMMISSION` (negativo do ponto de vista do P&L da plataforma) para manter o ledger consistente. A função `calcSplit` em `lib/platform-config.ts` **não muda** — a comissão é um custo de marketing fora do split.

Novo enum value:
```prisma
enum TransactionType {
  // ...existentes
  AMBASSADOR_COMMISSION
}
```

### 6. Consentimento LGPD do programa

Aderir ao programa é opt-in explícito. Ao criar `AmbassadorProfile`, gravamos:
- `consentAt` (timestamp)
- `consentIp`
- `consentUserAgent`
- `consentVersion` (ex.: `"v1.0"`)

Revogação: `revokedAt` preenchido encerra atribuição futura de comissões; comissões já APPROVED permanecem (direito adquirido). `Referral`s permanecem para auditoria.

O **indicado** não precisa consentir — para ele, isso é apenas atribuição interna de origem (campo `referredById`, já existente). Nenhuma comunicação adicional é disparada por estar indicado.

### 7. Remoção do crédito R$15 — estratégia

`ReferralCredit` e `REFERRAL_CREDIT_CENTS` são **descontinuados**, não apagados retroativamente:

1. **Schema:** remover o model `ReferralCredit` e a relação `referralCredits` em `User`. Tabela `referral_credits` é dropada no migration.
2. **Código:** `lib/referral.ts` é reescrito mantendo apenas `applyReferralCode` (que agora cria um `Referral` PENDING em vez de creditar R$15). O método `getReferralStats` é substituído por `getAmbassadorStats` em `lib/ambassador.ts`.
3. **UI:** `app/perfil/_ReferralSection.tsx` e `app/perfil/indicacoes/page.tsx` migram para `/perfil/embaixador` com o novo painel (tier vigente, comissão acumulada, link de indicação, lista de indicados).
4. **Notificações:** o tipo `NotificationType.REFERRAL_CREDIT` é mantido (não removemos enum values sem necessidade) mas **não é mais disparado**. Adicionamos:
   - `AMBASSADOR_REFERRAL_ACTIVATED` — quando um indicado faz a primeira reserva paga
   - `AMBASSADOR_TIER_UP` — quando o embaixador sobe de tier
5. **Staging:** créditos não usados (`usedAt = null`) são listados em export antes do drop e comunicados via e-mail ao usuário (script `scripts/communicate-credit-deprecation.ts`). Em **produção**, este passo é obrigatório por LGPD/CDC.

---

## Alternativas consideradas

### A. Manter o R$15 fixo e adicionar bônus por volume
- **Prós:** menor disrupção; usuários já entendem o modelo.
- **Contras:** mantém o custo de oportunidade no GMV; sem efeito embaixador; não resolve a fadiga do programa.
- **Descartado** porque é incremental demais para o salto de engajamento que o PO espera.

### B. Comissão sobre o GMV (e não sobre a taxa)
Ex.: 1% sobre o `totalPrice`.
- **Prós:** valores percebidos maiores (1% de R$200 = R$2 vs 3% de R$30 = R$0,90 no Bronze).
- **Contras:** **come direto do margem do proprietário** se descontado dele (impacto na confiança), ou come da ShareO em valores muito maiores que os 3-7% da taxa (insustentável). Em locações de alto valor, a comissão poderia ultrapassar a própria margem da plataforma.
- **Descartado** por insustentabilidade financeira e risco de afetar o split do proprietário.

### C. Stripe Connect com payout automático no MVP
- **Prós:** automação total; reduz toil do time financeiro.
- **Contras:** Connect é UI oculta até dez/2026 (decisão D1); KYC do embaixador (envio de documentos, validação) é complexo; LGPD/CDC ainda dependem de D4.
- **Descartado para o MVP**; preserva-se o caminho como evolução (campo `stripeConnectAccountId` em `AmbassadorProfile` para futuro uso).

### D. Tier calculado por cron noturno (denormalizado em `AmbassadorProfile.currentTier`)
- **Prós:** leitura O(1) no painel.
- **Contras:** **defasagem até 24h** entre virada de tier e comissão correta. Cron job adicional para manter.
- **Descartado para o cálculo da comissão** (cálculo on-the-fly no webhook é mais correto), mas o campo `currentTier` em `AmbassadorProfile` é atualizado pelo mesmo webhook e exibido no painel — leitura rápida, sem cron.

### E. Janela de qualificação (12 meses) usando snapshot mensal
- **Prós:** previsibilidade — tier não oscila no meio do mês.
- **Contras:** complexidade significativamente maior; difícil de explicar ao usuário.
- **Descartado** em favor da janela contínua de 12 meses; reavaliar se feedback do usuário indicar confusão.

---

## Consequências

### Positivas

- **Custo escalonável** — comissão sai da taxa da plataforma e nunca ultrapassa 7%; receita líquida fica entre 13.95% (Bronze) e 13.95% (Gold) de 15% bruto, previsível.
- **Incentivo composto** — Gold (51+ indicados ativos) tem 7x mais ganho marginal que o atual R$15 fixo após o 51º indicado.
- **Ledger limpo** — `PlatformTransaction` com type `AMBASSADOR_COMMISSION` documenta cada centavo do P&L.
- **Defensabilidade legal** — modelo de afiliados com taxa variável é mercado e amplamente regulado; mais defensável que “crédito promocional” na visão do CDC.
- **Auditoria LGPD** — opt-in explícito, revogação, snapshots de tier por commission.

### Negativas / trade-offs

- **Complexidade conceitual maior** — usuário precisa entender tier, janela de 12 meses, “indicado ativo”. Mitigação: painel `/perfil/embaixador` com explicações inline e simulador visual.
- **Comissões pequenas no Bronze** (R$0,90 a R$2,50 por locação típica) podem desmotivar até o usuário chegar a Silver. Mitigação: copy honesto + simulador “quanto eu ganharia se subisse para Silver?”.
- **Dependência de D4 para payout** — no MVP usuário **vê** o que acumulou mas **não recebe**. Mitigação: badge claro no painel — *“Comissão em validação jurídica — payout previsto após GO-LIVE de produção.”*
- **Migração de dados existentes** — usuários que receberam R$15 e ainda têm `ReferralCredit` não usado precisam de comunicação explícita. Mitigação: script + e-mail; produção bloqueada até confirmação de comunicação enviada.
- **Cron extra** (`/api/cron/ambassador-decay`) — uma nova superfície de manutenção; usa o mesmo padrão de `CRON_SECRET` (ADR-013).

### Quando reavaliar

- Se em 90 dias após go-live **menos de 5% dos usuários ativos** aderirem ao programa (consent rate baixo).
- Se a comissão média por embaixador no Gold ficar abaixo de R$50/mês — sinal de que os percentuais precisam ser revistos.
- Se D4 retornar exigindo modelo mais conservador (ex.: comissão só em PJ, ou retenção fiscal automática).
- Se Stripe Connect tornar-se disponível antes de dez/2026 — reavaliar payout automático.

---

## Estratégia de migração (passo a passo)

```
1. ADR-022 aprovado (este documento)
2. Atualizar prisma/schema.prisma (modelos + enums)
3. Gerar migration Prisma: pnpm prisma migrate dev --name add-ambassador-program
4. Aplicar SQL em docs/migrations/add-ambassador-program.sql em LOCAL (jtianehxosfdrhjzqvqj)
5. Implementar lib/ambassador.ts (funções puras + I/O)
6. Adaptar lib/referral.ts → criar Referral em vez de creditar R$15 (deprecação progressiva)
7. Adaptar app/api/webhooks/stripe/route.ts (gerar AmbassadorCommission no checkout.session.completed)
8. Adaptar app/api/bookings/route.ts (ativar Referral PENDING → ACTIVE no primeiro booking pago — opcional via webhook)
9. Criar app/api/cron/ambassador-decay/route.ts (CRON_SECRET, mensal)
10. Criar app/perfil/embaixador/page.tsx (novo painel)
11. Script scripts/communicate-credit-deprecation.ts — comunicar usuários com crédito ativo
12. Aplicar SQL em STAGING (fflpuoluiqmhpvcxubqi) APÓS comunicação enviada
13. Validar smokes E2E do novo programa
14. AGUARDAR D4 para ativar payout real (estado PAID)
```

---

## Referências

- `lib/platform-config.ts` — `calcSplit`, `DEFAULT_FEE_RATE = 1500`
- `lib/referral.ts` — implementação a ser substituída
- `app/api/webhooks/stripe/route.ts` — ponto de geração de `AmbassadorCommission`
- ADR-013 — Webhook Queue + padrão `CRON_SECRET`
- ADR-014 — Payout Trigger (mesmo padrão T+N para APPROVED)
- ADR-018 — Chargebacks (proteção CANCELLED ao perder dispute)
- ADR-021 — Programa Fundadores (precedente de opt-in LGPD auditável)
- LGPD Art. 7, IX (consentimento), Art. 9 (revogação)
- CDC Art. 30 (promessa vincula contrato) — copy do programa não pode prometer payout antes de D4
