# ADR-021 — Programa de Fundadores e Captação de Leads Pré-Lançamento

**Status:** Aceito  
**Data:** 2026-06-11  
**Decisores:** Roberto Epifânio (PO), arquiteto-shareo, designer-shareo, seguranca-shareo  
**Consulted:** Compliance (D4 pendente para ativação de benefícios financeiros)

---

## Contexto

A seção "Lista VIP" da homepage possuía três problemas críticos identificados em auditoria multi-agente (2026-06-11):

1. **CDC Art. 30/37** — benefícios prometidos ("taxa promocional permanente", "destaque permanente nos resultados") sem nenhuma implementação técnica. Promessa vincula contrato; publicidade enganosa é ilícito.
2. **LGPD Art. 7-9** — ausência de base legal explícita para coleta de e-mail com fins de marketing. O CTA redirecionava para `/cadastro` sem consentimento específico.
3. **Contador falso** — "247 proprietários já entraram" era JSX hardcoded, caracterizando publicidade enganosa (CDC Art. 37).
4. **Mistura semântica** — leads de pré-lançamento não devem ser usuários registrados (tabela `users`). Diferente lifecycle, diferentes regras de retenção LGPD.

---

## Decisão

### 1. Separação estrita Lead vs. Usuário

Leads de pré-lançamento vivem em `founder_leads` — **nunca no model `User`**. A conversão é explícita: `convertedUserId` é preenchido apenas quando o lead clica em link de convite e completa o cadastro. Isso permite:
- Retenção diferenciada (leads: 1 ano; usuários: regulação aplicável)
- Exclusão de leads sem impacto em usuários ativos
- Métricas de funil separadas (leads → convidados → convertidos)

### 2. Mini-formulário inline (FounderCaptureForm)

`<Link href="/cadastro">` substituído por `FounderCaptureForm` — componente client-side com estados: `collapsed → expanded → loading → success | error-network | error-duplicate`.

Coleta mínima (minimização LGPD):
- E-mail (obrigatório)
- Nome (opcional)
- Intent (proprietario/locatario) — para segmentação futura

### 3. Consentimento LGPD explícito e auditável

Campos obrigatórios em `founder_leads`:

| Campo | Propósito |
|---|---|
| `marketingConsentAt` | Timestamp do consentimento (base legal: Art. 7, IX) |
| `consentVersion` | Versão do texto exibido ("v1.0") |
| `consentIp` | IP do solicitante para auditoria |
| `consentUserAgent` | UA para detecção de bots |

Microcopy no formulário: *"Sem spam. Exclusão a qualquer momento em privacidade@shareo.com.br"*

### 4. Copy reescrito — sem promessas vinculantes

| Antes (violação CDC) | Depois (seguro) |
|---|---|
| "Taxa promocional permanente" | "Condições especiais — detalhes no lançamento" |
| "Destaque nos resultados" | "Acesso antecipado" |
| "Vagas limitadas" (hardcoded) | Badge condicional — só exibe se `total >= 10` leads reais |
| "247 proprietários" (hardcoded) | Contador dinâmico via ISR 5 min + `revalidateTag("founders")` |

### 5. Sistema de Waves (pré-configurado, não ativado)

Schema preparado para waves com benefícios configuráveis:
- WAVE_1: posições 1–500
- WAVE_2: posições 501–1500  
- WAVE_3: posições 1501+

`assignWave(queuePosition)` em `lib/founders.ts` — pura, sem DB. Benefits em `founder_benefits` (chave/valor por wave).

---

## O que NÃO foi implementado — aguarda D4 jurídico

| Feature | Arquivo afetado | Motivo do bloqueio |
|---|---|---|
| `getEffectiveFeeRate(ownerId)` | `lib/platform-config.ts` | Modifica caminho crítico financeiro (`calcSplit`) |
| Badge "Fundador" no dashboard | `app/dashboard/` | Sem benefício real entregue ainda |
| `searchBoost` na listagem | `app/api/items/route.ts` | Vantagem competitiva — requer política comercial clara |
| Ativação de `isFounder` no register | `app/api/auth/register/route.ts` | Fluxo completo de conversão — pós-D4 |

---

## Consequências

### Positivas
- Nenhuma promessa que não pode ser entregue
- LGPD: consentimento auditável com timestamp, IP e versão
- Leads capturados antes do go-live sem conta criada desnecessariamente
- Contadores reais no lugar de números fabricados

### Negativas / trade-offs
- Formulário inline é mais fricção que um botão simples → mitigado pelo estado `collapsed` (expande ao clicar)
- Copy mais cauteloso pode reduzir conversão → aceitável; é o correto legalmente

---

## Migration necessária

```bash
# Local
pnpm prisma migrate dev --name add-founder-program

# Staging (após geração da migration)
dotenv -e .env.staging-migrate -- pnpm prisma migrate deploy
```

Ou aplicar o SQL gerado manualmente via Supabase SQL Editor no projeto `fflpuoluiqmhpvcxubqi`.

Após migration, remover os casts `prisma as any` nos arquivos:
- `components/home/ListaVIP.tsx`
- `app/api/founders/leads/route.ts`
- `app/api/founders/stats/route.ts`

---

## Referências

- CDC Art. 30 (promessa vincula contrato), Art. 37 (publicidade enganosa)
- LGPD Art. 7 (bases legais), Art. 9 (consentimento), Art. 18 (direitos do titular)
- ANPD precedente: legítimo interesse não é base válida para marketing direto sem consentimento
- [[project-d4-juridico]] — bloqueador de go-live em produção
- [[project-mvp-status]] — estado geral do MVP
