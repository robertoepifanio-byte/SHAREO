# ADR-019 — Informe de Rendimentos para Declaração de Imposto de Renda

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro Fase 4

---

## Contexto

Proprietários que recebem repasses pela plataforma têm obrigação de declarar esses valores no Imposto de Renda Pessoa Física (IRPF). A Receita Federal exige que rendimentos de aluguéis sejam declarados na ficha adequada (Rendimentos Tributáveis ou Rendimentos de Aluguéis, dependendo da situação do declarante).

Sem um informe consolidado, o proprietário precisaria somar manualmente todos os repasses recebidos ao longo do ano — experiência ruim e propensa a erros.

Duas abordagens foram avaliadas:

- **Informe em PDF** (estilo bancário): mais formal, requer biblioteca de geração de PDF, maior complexidade de manutenção.
- **Página web + API JSON**: mais simples, permite filtro por ano, dados sempre atualizados, pode ser impresso pelo usuário se necessário.

## Decisão

1. **`GET /api/user/informe-rendimentos?year=YYYY`**: retorna o total de repasses `COMPLETED` do proprietário no ano solicitado, com detalhamento por repasse (item, período de locação, data de recebimento, valor).
2. **Anos válidos**: 2024 (início da plataforma) até o ano corrente. Máximo de 5 anos de histórico (alinhado com [[ADR-017-retencao-dados-financeiros]] — CTN Art. 173).
3. **Página `/perfil/repasses/informe`**: seletor de ano, total em destaque, tabela detalhada, aviso orientando sobre a ficha correta de declaração. Acessível via botão "📄 Informe IR" na página de repasses e no menu de perfil.
4. **Não emitimos documento fiscal com validade legal** (Declaração de Rendimentos assinada) — o informe é informativo. O proprietário deve consultar seu contador para a declaração formal. Esse limite é explicitado na UI.
5. **Sem geração de PDF no MVP** — a página pode ser impressa pelo browser (Ctrl+P). PDF formal pode ser adicionado em V1+ se houver demanda.

## Consequências

### Positivas
- Experiência melhorada: proprietário tem visibilidade do total anual sem precisar somar repasse a repasse.
- Conformidade facilitada: orienta sobre a ficha correta sem praticar advocacia tributária.
- Simples de manter: dados vêm diretamente da tabela `Payout` já existente.

### Negativas / Trade-offs
- Não substitui informe formal de rendimentos com assinatura — usuários avançados podem solicitar documento mais robusto.
- Sem geração de PDF automático no MVP — usuário depende de impressão manual pelo browser.
- Ano de referência do IRPF é o ano-calendário anterior ao de entrega; a UI exibe o ano de `processedAt` (data de recebimento real), que é a referência correta para o fisco.

## Decisões relacionadas

- [[ADR-017-retencao-dados-financeiros]] — define horizonte de 5 anos de dados acessíveis
- [[ADR-014-payout-trigger]] — `processedAt` é o campo usado como data de recebimento no informe
- [[ADR-012-modelo-pix-centralizado]] — repasses são o único veículo de pagamento ao proprietário no MVP
