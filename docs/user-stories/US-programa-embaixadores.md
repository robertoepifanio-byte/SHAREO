# US — Programa de Indicação: Embaixadores ShareO

**ID:** US-EMB-01 / US-EMB-02  
**Fase:** H2 — Crescimento  
**Prioridade MoSCoW:** Should Have (ativação UI imediata) / Won't Have pré-D4 (payout real)  
**Sprint alvo:** a definir após D4 jurídico  
**Elaborado por:** Product Owner — ShareO  
**Data:** 2026-06-11  
**Status:** Aguarda validação jurídica (D4) para ativação de créditos/pagamentos reais

---

## Contexto e Decisão de Negócio

O programa anterior de indicação (cashback fixo de R$15 por indicado) é **removido** e substituído
por um modelo de comissão percentual sobre a taxa da plataforma, com tiers progressivos baseados
em indicados ativos. O motivador central é alinhar o incentivo do embaixador ao sucesso real da
plataforma: ele só ganha quando o indicado gera locação concluída.

**Dependência crítica:** O payout real de créditos está bloqueado pelo D4 (consulta jurídica —
Lei 12.865/2013, LGPD, CDC). A UI de painel e tiers pode ser entregue antes do D4, mas créditos
acumulados só são liberados após o sign-off jurídico formal.

**Compatibilidade com o schema atual:** O model `ReferralCredit` (`prisma/schema.prisma` linha 638)
e os campos `referralCode`, `referredById`, `referrals` no model `User` (linha 214) já existem e
suportam a mecânica de rastreamento. A migração requer novos campos para tier e controle de
indicados ativos — detalhados nas Notas Técnicas abaixo.

**Taxa da plataforma:** Sempre lida via `getPlatformFeeRate()` em `lib/platform-config.ts` —
nunca hardcoded. O cálculo de comissão do embaixador incide sobre o valor retornado por esta
função (default 1500 basis points = 15%).

---

## US-EMB-01 — Embaixador: indicar, acompanhar e receber

```
TÍTULO: Programa de Indicação — Painel do Embaixador

Como usuário cadastrado no ShareO (locatário ou proprietário),
quero acessar meu link exclusivo de indicação, acompanhar meus indicados ativos
e ver minha comissão acumulada por tier,
para que eu seja recompensado proporcionalmente ao impacto real que gero na
plataforma — recebendo uma fatia da taxa ShareO a cada locação concluída
pelos usuários que indiquei.
```

### Critérios de Aceitação — US-EMB-01

---

#### Cenário 1 — Acesso ao link de indicação

```gherkin
Dado que estou autenticado na plataforma
Quando acesso a seção "Indicações" no meu perfil (rota /perfil/indicacoes)
Então vejo meu código exclusivo de indicação (ex.: "JOAO-X4K2") já disponível
E vejo o link completo "shareo.com.br/cadastro?ref=JOAO-X4K2" para copiar
E vejo um botão "Copiar link" que copia o link para o clipboard
E vejo opções de compartilhamento por WhatsApp e por e-mail
E vejo uma mensagem explicativa que diz
  "A cada locação concluída por alguém que se cadastrou com seu link,
   você recebe uma parte da nossa taxa. Quanto mais indicados ativos,
   maior sua comissão."
```

---

#### Cenário 2 — Cadastro via link de indicação

```gherkin
Dado que um novo usuário acessa o link "shareo.com.br/cadastro?ref=JOAO-X4K2"
Quando o parâmetro "ref" é válido e corresponde a um usuário ativo
Então o sistema persiste a associação entre o novo usuário e o embaixador
  no campo "referredById" do model User
E o parâmetro "ref" é armazenado em cookie seguro com TTL de 30 dias
  para cobrir casos onde o usuário não se cadastra imediatamente
E o formulário de cadastro exibe a mensagem
  "Você foi convidado por [Nome do Embaixador]. Bem-vindo ao ShareO!"
E o sistema registra o consentimento LGPD do novo usuário incluindo
  a origem da indicação (signupSource = REFERRAL) antes de criar o vínculo

Dado que o parâmetro "ref" não corresponde a nenhum usuário ativo
Quando o novo usuário tenta se cadastrar
Então o cadastro prossegue normalmente sem exibir mensagem de convite
E nenhum vínculo de indicação é criado
```

---

#### Cenário 3 — Crédito de comissão por locação concluída

```gherkin
Dado que sou embaixador com tier Bronze (1 a 10 indicados ativos)
E um usuário que se cadastrou com meu link concluiu uma locação
  com totalPrice = R$200,00 e taxa plataforma de 15% (R$30,00)
Quando o status da reserva muda para COMPLETED e o payout do proprietário
  é processado com sucesso
Então o sistema calcula minha comissão:
  comissao = platformFeeAmount × (percentual_do_tier / 100)
  comissao = R$30,00 × 3% = R$0,90
E um registro é criado em ReferralCredit com:
  amountCents = 90
  reason = "Comissão Bronze — locação #[bookingId] por [nome do indicado]"
  usedAt = null (disponível, bloqueado pré-D4)
E uma notificação do tipo REFERRAL_CREDIT é enviada para mim com o texto
  "Parabens! Voce ganhou R$0,90 pela locacao do seu indicado [nome]."
E o crédito fica visível no meu painel mas marcado como
  "Disponivel apos liberacao juridica" enquanto D4 nao estiver concluido

Dado que a locação é cancelada antes de ser concluída
Quando o status da reserva muda para CANCELLED
Então nenhum crédito de comissão é gerado para o embaixador
```

---

#### Cenário 4 — Visualizacao do painel do embaixador

```gherkin
Dado que acesso /perfil/indicacoes
Então vejo as seguintes informacoes:
  - Meu tier atual (Bronze / Prata / Ouro) com ícone visual
  - Número de indicados ativos (com locação concluída nos últimos 12 meses)
  - Número total de indicados cadastrados via meu link
  - Saldo de comissões acumuladas em reais (ex.: "R$ 4,20 acumulados")
  - Histórico de comissões: data, nome do indicado (anonimizado se necessário), valor
  - Barra de progresso para o próximo tier
    ex.: "Voce esta no Bronze. Faltam 7 indicados ativos para o Prata (5%)."
  - Status de liberação: banner amarelo exibindo
    "Pagamentos em analise juridica. Seus creditos estao seguros e serao
     liberados apos a conclusao da validacao legal."
    enquanto D4 nao estiver concluido

Dado que nunca indiquei ninguém
Quando acesso /perfil/indicacoes
Então vejo o estado vazio com mensagem
  "Voce ainda nao tem indicados. Compartilhe seu link e comece a ganhar!"
E vejo o link de indicação disponível para compartilhar
```

---

#### Cenário 5 — Progressão de tier

```gherkin
Dado que tenho 10 indicados ativos (tier Bronze) e um novo indicado conclui
  sua primeira locação nos últimos 12 meses
Quando o sistema atualiza o contador de indicados ativos para 11
Então meu tier muda automaticamente de Bronze para Prata
E recebo uma notificação:
  "Voce subiu para o tier Prata! Sua comissao agora e de 5% da taxa ShareO."
E as proximas comissoes sao calculadas com o percentual Prata (5%)
E o tier anterior Bronze nao se aplica retroativamente a creditos já gerados

Dado que um indicado que contribuia para meu tier Prata nao conclui
  nenhuma locação por mais de 12 meses consecutivos
Quando o cron de reavaliação de tiers executa (sugerido: semanal)
Então esse indicado deixa de ser contado como "ativo"
E se o total de ativos cair abaixo de 11, meu tier regride para Bronze
E recebo uma notificação explicando a mudança de tier
```

---

#### Cenário 6 — Definição de "indicado ativo"

```gherkin
Dado que um usuário se cadastrou via meu link há mais de 12 meses
E não concluiu nenhuma locação nos últimos 12 meses consecutivos
Quando o sistema calcula meu tier
Então esse usuário NÃO é contado como indicado ativo

Dado que um usuário se cadastrou via meu link
E concluiu pelo menos 1 locação (como locatário ou como proprietário)
  com data de conclusão dentro dos últimos 12 meses
Quando o sistema calcula meu tier
Então esse usuário É contado como indicado ativo
```

---

#### Cenário 7 — Consentimento LGPD antes de compartilhar

```gherkin
Dado que nunca compartilhei meu link de indicação antes
Quando acesso /perfil/indicacoes pela primeira vez
Então vejo um modal de consentimento antes de exibir o link, com o texto:
  "Ao compartilhar seu link, você aceita que o ShareO registre a origem
   do cadastro de quem usar seu convite, conforme nossa Politica de Privacidade."
E só após clicar em "Entendi e aceito" o link é exibido e habilitado
E o consentimento é registrado com timestamp e versão da política (ex.: "emb-v1.0")

Dado que já consenti anteriormente
Quando acesso /perfil/indicacoes
Então o link é exibido diretamente sem o modal de consentimento
```

---

#### Cenário 8 — Prevenção de autoindicação

```gherkin
Dado que tento usar meu próprio código de indicação no cadastro
Quando o sistema detecta que o referralCode pertence ao meu próprio usuário
Então o vínculo de indicação NÃO é criado
E o cadastro prossegue normalmente sem crédito atribuído
E nenhuma mensagem de erro é exibida ao usuário (silencioso por design)
```

---

#### Cenário 9 — Estado bloqueado pré-D4 (pagamento real)

```gherkin
Dado que a flag de liberação do programa (D4) ainda não foi ativada
  via PlatformConfig key "ambassadorPayoutEnabled" = "false"
Quando visualizo meu saldo de comissões
Então vejo o valor acumulado com o rótulo "Disponivel apos liberacao juridica"
E não existe botão "Solicitar saque" ou equivalente
E o e-mail de notificação de crédito inclui o aviso
  "Este credito sera liberado para saque apos a conclusao da analise juridica."

Dado que a flag "ambassadorPayoutEnabled" é alterada para "true" pelo SuperAdmin
Quando visualizo meu saldo
Então o botão "Solicitar resgate" é exibido
E os créditos acumulados ficam disponíveis para resgate via PIX cadastrado
```

---

### Notas Técnicas — US-EMB-01

**Schema — campos novos necessários (migration):**
```
model User {
  // Novos campos para o programa de embaixadores
  ambassadorTier          AmbassadorTier? // enum: BRONZE | SILVER | GOLD | null (sem tier)
  ambassadorTierUpdatedAt DateTime?
  ambassadorConsentAt     DateTime?       // LGPD: consentimento para compartilhar link
  ambassadorConsentVersion String?        // ex.: "emb-v1.0"
}

enum AmbassadorTier {
  BRONZE  // 1–10 indicados ativos → 3% da taxa ShareO
  SILVER  // 11–50 indicados ativos → 5% da taxa ShareO
  GOLD    // 51+ indicados ativos → 7% da taxa ShareO
}
```

**ReferralCredit — campo novo necessário:**
```
model ReferralCredit {
  // Campos existentes: id, userId, amountCents, reason, usedAt, expiresAt, createdAt
  // Campos novos:
  bookingId       String?   // FK opcional — rastreabilidade da locação que gerou o crédito
  ambassadorTier  String?   // snapshot do tier no momento da geração (Bronze/Prata/Ouro)
  commissionRate  Int?      // basis points do percentual aplicado (300 = 3%, 500 = 5%, 700 = 7%)
  isBlocked       Boolean   @default(true) // true = aguarda D4; false = disponível para resgate
}
```

**PlatformConfig — chave nova:**
- `ambassadorPayoutEnabled`: `"false"` no MVP, muda para `"true"` após D4

**Cálculo de comissão:**
```typescript
// Nunca hardcode a taxa — sempre via getPlatformFeeRate()
const feeRate = await getPlatformFeeRate()                    // ex.: 1500 bps = 15%
const platformFee = Math.round(totalPrice * feeRate / 10000) // ex.: R$30,00
const commissionRate = getTierCommissionRate(ambassadorTier)  // 300 | 500 | 700 bps
const commission = Math.round(platformFee * commissionRate / 10000) // ex.: R$0,90
```

**Trigger de crédito:** deve ser disparado no mesmo evento que processa o payout do proprietário
(cron `/api/cron/payout` ou webhook de pagamento), nunca no momento da mudança de status da
reserva para COMPLETED — aguardar confirmação do pagamento processado.

**Cookie de rastreamento:** `shareo_ref` — SameSite=Lax, Secure, HttpOnly=false
(precisa ser lido pelo middleware no cadastro), TTL 30 dias. Respeitar opt-out de cookies
do usuário (banner LGPD).

**Dependências:** ADR-017 (retenção de dados), `lib/platform-config.ts` (getPlatformFeeRate),
model `ReferralCredit`, model `User` (referralCode).

**Estimativa:** L (8–13 dias) — inclui migration, lógica de tier, painel UI, notificações,
cron de reavaliação e testes.

**Fase:** H2 — Crescimento (UI de painel pode ser H1.5 pré-D4; payout real somente pós-D4)

---

## US-EMB-02 — Admin: gerenciar tiers e visualizar relatório do programa

```
TÍTULO: Painel administrativo do Programa de Embaixadores

Como administrador com role ADMIN_SUPERADMIN ou ADMIN_FINANCEIRO,
quero visualizar o relatório do programa de indicações, ajustar os percentuais
de cada tier e controlar a liberação de pagamentos,
para que eu possa monitorar o custo do programa, detectar abusos e tomar
decisões fundamentadas sobre a sustentabilidade do modelo.
```

### Critérios de Aceitação — US-EMB-02

---

#### Cenário 1 — Visualizacao do painel admin de embaixadores

```gherkin
Dado que estou autenticado como SUPERADMIN ou ADMIN_FINANCEIRO
Quando acesso /admin/embaixadores
Então vejo as seguintes métricas agregadas:
  - Total de embaixadores ativos por tier (Bronze / Prata / Ouro)
  - Total de indicados cadastrados via link no período selecionado
  - Total de indicados que geraram pelo menos 1 locação concluída
  - Taxa de conversão: indicados cadastrados → indicados com locação concluída (%)
  - Total de comissões geradas no período (em R$)
  - Total de comissões pagas (em R$) vs bloqueadas aguardando D4
  - GMV gerado por indicados (em R$) — para avaliar ROI do programa
E vejo um filtro de período (últimos 7 dias / 30 dias / 90 dias / personalizado)
```

---

#### Cenário 2 — Configuração de percentuais de tier

```gherkin
Dado que acesso /admin/embaixadores na aba "Configuracoes"
Quando visualizo os tiers cadastrados
Então vejo uma tabela editável com:
  Tier     | Indicados ativos (min) | Indicados ativos (max) | % da taxa ShareO
  Bronze   | 1                      | 10                     | 3%
  Prata    | 11                     | 50                     | 5%
  Ouro     | 51                     | ilimitado              | 7%
E cada linha tem um campo numérico editável para o percentual
E ao salvar, os novos percentuais são gravados em PlatformConfig com as chaves:
  "ambassadorBronzeRate", "ambassadorSilverRate", "ambassadorGoldRate"
E a alteração é registrada no AdminLog com before/after dos valores
E uma mensagem de confirmação exibe
  "Os novos percentuais se aplicam somente a comissoes geradas a partir de agora.
   Comissoes ja geradas nao sao recalculadas."

Dado que tento salvar um percentual maior que 100% da taxa ShareO
Quando clico em "Salvar"
Então vejo uma mensagem de erro de validação
  "O percentual do embaixador nao pode ultrapassar 100% da taxa da plataforma."
E os valores não são persistidos
```

---

#### Cenário 3 — Ativação e desativação do programa

```gherkin
Dado que estou na aba "Configuracoes" de /admin/embaixadores
Quando altero a chave "ambassadorPayoutEnabled" para "true"
Então todos os créditos com isBlocked = true passam a isBlocked = false
E os embaixadores que tinham saldo acumulado recebem uma notificação
  "Seu saldo de comissoes esta disponivel para resgate!"
E o botão de resgate aparece no painel de cada embaixador
E a ação é registrada no AdminLog com o ID do admin que autorizou

Dado que o programa está ativo e precisa ser pausado
Quando altero "ambassadorPayoutEnabled" para "false"
Então novos créditos gerados ficam com isBlocked = true
E créditos já desbloqueados (isBlocked = false) não são re-bloqueados
E uma notificação é enviada aos embaixadores com saldo informando
  "O programa de embaixadores esta temporariamente pausado. Seu saldo esta seguro."
```

---

#### Cenário 4 — Detecção e tratamento de abuso

```gherkin
Dado que o sistema identifica um usuário com mais de 50 auto-indicações
  (contas cadastradas com o mesmo IP ou dispositivo via seu link)
Quando o cron de auditoria de indicações executa (sugerido: diário)
Então um alerta é criado na fila de revisão do admin operacional
E o embaixador suspeito é marcado com flag "underReview = true"
E suas comissões geradas pelas contas suspeitas ficam com isBlocked = true
  independente do status do D4
E um AdminLog é criado com action = "AMBASSADOR_FRAUD_ALERT"

Dado que o admin revisa e confirma o abuso
Quando clica em "Confirmar fraude e bloquear"
Então os créditos das contas suspeitas são cancelados permanentemente
E o embaixador recebe uma notificação sobre o bloqueio
E o registro é mantido por 5 anos conforme ADR-017 (retenção de dados)
```

---

#### Cenário 5 — Exportação do relatório do programa

```gherkin
Dado que acesso /admin/embaixadores na aba "Relatorio"
Quando clico em "Exportar CSV"
Então o sistema gera um arquivo com as colunas:
  embaixador_id, embaixador_nome, embaixador_email, tier_atual,
  indicados_cadastrados, indicados_ativos, total_comissoes_geradas_cents,
  total_comissoes_pagas_cents, total_comissoes_bloqueadas_cents,
  periodo_inicio, periodo_fim
E o arquivo é gerado de forma assíncrona via ExportJob se o período > 90 dias
E o arquivo é gerado de forma síncrona se o período <= 90 dias
```

---

### Notas Técnicas — US-EMB-02

**Rota:** `/admin/embaixadores` — protegida por `requireAdminRole(["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO"])`

**PlatformConfig — chaves novas para o painel admin:**
- `ambassadorBronzeRate`: basis points (default 300 = 3%)
- `ambassadorSilverRate`: basis points (default 500 = 5%)
- `ambassadorGoldRate`: basis points (default 700 = 7%)
- `ambassadorTierBronzeMin` / `ambassadorTierBronzeMax`: limites de indicados ativos por tier
- `ambassadorPayoutEnabled`: "false" | "true"

**Estimativa:** M (3–5 dias) — dashboard admin, CRUD de configurações, alertas de fraude básicos.

**Fase:** H2 — Crescimento (implementar junto com US-EMB-01)

---

## Matriz de Riscos

### Riscos Regulatórios

| Risco | Lei / Base Legal | Severidade | Mitigação |
|---|---|---|---|
| Programa de indicação com remuneração pode ser enquadrado como captação irregular de recursos de terceiros | Lei 12.865/2013 (Art. 6, VII) — risco de enquadramento como arranjo de pagamento não autorizado pelo BACEN | CRITICO — bloqueador até D4 | Aguardar sign-off do jurídico; manter payout bloqueado via `ambassadorPayoutEnabled = false`; estruturar como comissão por indicação (não como produto financeiro) |
| Coleta de dados do indicado (IP de origem, cookie de rastreamento) sem consentimento explícito | LGPD Art. 7 (consentimento), Art. 9 (informação ao titular) | ALTO | Consentimento em modal antes de habilitar o link; registrar timestamp, versão da política e IP; permitir revogação em /perfil/privacidade |
| Comissão pode ser caracterizada como relação de emprego ou prestação de serviços tributável (ISS, IR) | CLT Art. 3, Lei 9.250/1995 | MEDIO | Enquadrar juridicamente como "programa de fidelidade" — validar com jurídico no D4; para volumes > R$28.559,70/ano, orientar embaixador sobre IR |
| Compartilhamento de dados do indicado com o embaixador (nome, status de locação) | LGPD Art. 18 (direito do titular) | MEDIO | Anonimizar ou minimizar dados exibidos ao embaixador — exibir apenas primeiro nome + sobrenome abreviado; nunca exibir e-mail, CPF ou endereço do indicado |
| Relação de consumo com o embaixador — expectativa de recebimento criada na UI antes da liberação jurídica | CDC Art. 30 (oferta vinculante), Art. 37 (publicidade enganosa) | MEDIO | Linguagem cautelosa na UI: "comissoes em analise juridica" — não prometer data de liberação; termos e condições do programa devem conter cláusula de suspensão |

### Riscos de Negócio

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Fraude de autoindicação (contas falsas criadas para acumular tier) | ALTA | ALTO | Verificação de e-mail obrigatória já implementada; gate de locação concluída antes de contar como "ativo"; monitoramento de IP/device por cron diário |
| Custo do programa maior que o previsto — embaixadores Ouro com alto volume | MEDIA | MEDIO | Teto mensal de comissão por embaixador configurável via PlatformConfig; relatório de custo/GMV no painel admin para monitorar ROI |
| Regressão de tier desmotivando embaixadores | BAIXA | MEDIO | Comunicação proativa por e-mail ao regredir tier; período de carência de 30 dias antes da regressão de tier (validar com produto) |
| Efeito de viralização negativa ("ShareO paga mal") se o ticket médio for baixo | MEDIA | MEDIO | Calculadora de potencial de ganho na página do programa; exemplos com tickets reais do seed de demonstração |
| Interferência com Programa Fundadores (customFeeRate + comissão de embaixador podem se sobrepor) | BAIXA | ALTO | Definir regra de precedência: customFeeRate de Fundadores aplica primeiro; comissão do embaixador incide sobre a taxa efetiva após customFeeRate, não sobre a taxa padrão |

### Riscos Técnicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Cookie de rastreamento `shareo_ref` perdido por bloqueadores de terceiros / iOS ITP | Perda de atribuição de indicação | Persistir parâmetro `ref` na URL até o cadastro; fallback: campo "Você foi indicado? Informe o código" no formulário de cadastro |
| Cálculo de tier incorreto se cron de reavaliação falhar | Embaixador com tier errado, comissão incorreta | Recalcular tier on-demand ao gerar cada crédito; cron é otimização, não fonte de verdade |
| `getPlatformFeeRate()` retornar fallback (1500) enquanto banco está inacessível — comissão gerada sobre taxa padrão, não a customizada | Desvio < 5% do valor esperado | Aceitável para MVP; registrar o `commissionRate` aplicado em `ReferralCredit` para auditoria |
| Migration com ALTER TYPE para novo enum `AmbassadorTier` na mesma transação que UPDATE de dados | Erro PostgreSQL conhecido (ver CLAUDE.md) | Separar em dois SQLs: primeiro ADD VALUE ao enum, depois UPDATE; testar em local antes de staging |

---

## Metricas de Sucesso (KPIs)

| Metrica | Definição | Meta H2 (3 meses pós-lançamento) |
|---|---|---|
| Taxa de adoção do programa | % de usuários cadastrados que geraram ao menos 1 indicado cadastrado | > 15% da base ativa |
| Taxa de conversão de indicados | % de indicados cadastrados que concluíram ao menos 1 locação | > 25% |
| Custo de aquisição por locatário ativo (CAC-referral) | Total de comissões pagas / locatários ativos adquiridos via indicação | < R$15 (benchmark do modelo anterior) |
| GMV atribuído ao canal Indicação | Valor total das locações geradas por usuários cadastrados via link | > 20% do GMV total em H2 |
| NPS do programa | Pesquisa pós-primeiro-crédito: "O quanto você recomendaria o programa de embaixadores?" | > 50 |
| Fraud rate | % de indicados bloqueados por abuso sobre total de indicados | < 2% |
| Distribuição de tiers | % de embaixadores em cada tier — indicador de saúde do programa | Bronze > 70%, Prata > 20%, Ouro > 5% |
| Custo do programa como % do GMV | Total de comissões pagas / GMV total do período | < 1,5% do GMV |

---

## Definition of Done — Programa de Embaixadores

Uma entrega do programa de embaixadores está pronta quando:

1. Todos os critérios de aceitação dos Cenários 1 a 9 (US-EMB-01) e Cenários 1 a 5 (US-EMB-02) foram atendidos.
2. A flag `ambassadorPayoutEnabled = "false"` está ativa em staging e produção — pagamento real bloqueado até D4.
3. Consentimento LGPD para compartilhamento de link foi implementado e registrado com timestamp e versão.
4. Autoindicação é bloqueada silenciosamente (testado em E2E).
5. Cálculo de comissão nunca usa taxa hardcoded — sempre via `getPlatformFeeRate()`.
6. O campo `commissionRate` está preenchido em cada `ReferralCredit` para auditoria.
7. A migration foi testada em local e staging sem erros (dois SQLs separados para o enum).
8. O painel `/perfil/indicacoes` foi validado em mobile (375px), tablet (768px) e desktop (1280px).
9. O painel `/admin/embaixadores` foi validado nos roles SUPERADMIN e FINANCEIRO — OPERACIONAL não tem acesso.
10. Todas as ações admin foram auditadas no `AdminLog`.
11. Testes E2E cobrem: ativação do link, cadastro via ref, crédito pós-locação concluída, estado bloqueado pré-D4, progressão de tier e prevenção de autoindicação.
12. O item foi demonstrado e aceito em Review pelo PO antes do merge.

---

## Histórico de Revisões

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-11 | Product Owner | Versão inicial — substituição do cashback fixo pelo modelo de comissão percentual por tier |
