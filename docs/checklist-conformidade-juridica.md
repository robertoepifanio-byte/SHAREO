# Checklist de Conformidade Jurídica — ShareO

**Atualizado:** 2026-06-28 (s39) · **Fonte:** parecer técnico-jurídico **preliminar** do D4 (em revisão com a advogada) + dossiê [`briefing-juridico-d4.md`](briefing-juridico-d4.md).

> ⚠️ **D4 NÃO está fechado.** O parecer é **preliminar/em revisão** — não é o parecer FORMAL. Nenhuma atividade de produção antes do sign-off formal (regra absoluta). Este checklist **rastreia** os ajustes exigidos; não os declara cumpridos juridicamente.

> Legenda: ✅ **pronto** (no produto/código) · 🟡 **parcial / verificar** · 🔨 **trabalho novo** · 🔵 **decisão de negócio/jurídico** (fora do código)

---

## 1. Pagamentos (Lei 12.865/2013 · BACEN)
- 🔵🔨 Migrar recebimento para **PSP licenciado** — **DECIDIDO: Mercado Pago** ([[project-mercadopago-migration]]). Hoje o staging usa PIX manual em **chave pessoal de sócio** (temporário).
- 🔵 Formalizar **contrato com o PSP** (Mercado Pago) — fundadores/jurídico.
- 🔨 Garantir fluxo **split/escrow** para afastar enquadramento como instituição de pagamento (aponta para o "Modelo B" da migração MP).
- 🔵 **Conta de recebimento = PJ da ShareO** (nunca pessoal) — societário.

## 2. Fiscal / Tributário
- 🔨 **Emissão de NF** sobre a taxa de 15% (receita da plataforma).
- 🔵 Definição contábil: **85% repassado ao proprietário ≠ receita** da ShareO.
- 🟡 Orientação fiscal a proprietários (PF declara IR / PJ emite NF própria) — hoje há **Informe de IR informativo** com disclaimer; formalizar orientação.
- 🔵 Revisão por **tributarista** (ISS/PIS/COFINS).

## 3. LGPD (Lei 13.709/2018)
- ✅ **DPO/Encarregado** designado + canal (`privacidade@shareo.com.br`, `lib/legal-config.ts`).
- 🔨 **RIPD** (Relatório de Impacto) elaborado e arquivado.
- 🔨 **Formalizar transferência internacional** (Resend/Sentry/Mapbox/Vercel — EUA) com cláusulas-padrão (art. 33).
- ✅ **Direitos do titular**: acesso/exclusão (art. 18, `DELETE /api/users/me`) + portabilidade (art. 20, `GET /api/users/me/export`).
- ✅ **Segurança**: AES-256-GCM em CPF/CNPJ + HMAC; bucket `id-docs` privado; PII mascarada em logs.

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
- 🔨 **Contrato de locação aceito eletronicamente** por locador e locatário (no momento da reserva).
- 🔨 Cláusula de **responsabilidade por dano/perda** do item (risco do locatário, salvo vício preexistente).
- 🔵 **Seguro opcional** disponível (parceria/seguradora) — decisão de negócio.
- 🟡 **Multas e atrasos** previstos — verificar cobertura atual (devolução em atraso).

## 7. Marco Civil da Internet (Lei 12.965/2014)
- 🟡 **Guarda de logs por 6 meses** (art. 15) — **VERIFICAR** o que é logado e a retenção atual.
- 🔨 Política de **notificação e retirada** de conteúdo (art. 19).
- ✅ **Termos de Uso e Política de Privacidade publicados/acessíveis** (`/termos`, `/privacidade`) — **revisar o conteúdo** conforme o parecer.

## 8. Complementar
- ✅ **Registro da marca "ShareO" no INPI** — **FEITO** (confirmado no parecer).
- 🔵 Avaliar **seguro coletivo** / parceria com seguradora.
- 🔵 **Estrutura societária** revisada (PJ titular da conta e dos contratos com PSP).

---

## 🚦 Go-live só após (condições do próprio parecer)
1. **Parecer jurídico FORMAL** sobre os 5 pontos críticos (o atual é preliminar/em revisão).
2. **Contrato com PSP (Mercado Pago) assinado + conta PJ ativa.**
3. **Termos de Uso e Política de Privacidade revisados e publicados.**
4. **Checklist acima 100% cumprido.**

> Ver também: [`checklist-go-live.md`](checklist-go-live.md) (infra/técnico) · [`d4-cobranca-juridico.md`](d4-cobranca-juridico.md) · memória [[project-d4-juridico]].
