# ADR-015 — Caução Adiada no MVP: Teto de R$ 500 como Proteção de Risco

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro

---

## Contexto

Itens de alto valor exigem alguma forma de proteção ao proprietário contra danos ou não-devolução. As alternativas são:

- **Caução via Stripe (PaymentIntent separado):** cria um segundo PaymentIntent como pré-autorização; capturado em caso de dano, cancelado em caso de devolução ok. Exige lógica de dois PaymentIntents por locação, tela de contestação, workflow de retenção parcial e integrações com SEC-FIN-7/9. Estimativa: +10 dias de desenvolvimento.
- **Caução via PIX (valor retido em conta ShareO):** semanticamente equivalente, mas sem mecanismo nativo de pré-autorização no PIX — o locatário paga a caução; ShareO reembolsa manualmente. Adiciona complexidade operacional semelhante.
- **Sem caução + teto de valor:** limitar o valor máximo de locação elimina o risco de perdas catastróficas sem complexidade adicional no MVP.

O foco do MVP é validar demanda e fluxo de locação, não gestão de risco avançada. A base de usuários inicial em Natal/RN é conhecida, reduzindo risco de má-fé.

> **Atualização (12/06/2026):** por decisão dos fundadores, o lançamento será nacional. A premissa de "base de usuários conhecida" deixa de valer — o teto de R$500 por transação ganha ainda mais importância como mitigador de risco até a implementação da caução na V1.

## Decisão

1. **Nenhuma caução implementada no MVP.**
2. **Teto de R$ 500** por locação, validado no backend (`BookingService`) e no frontend (`PriceCalc.tsx`).
3. Itens com valor declarado acima de R$ 500/locação não podem ser anunciados no MVP — exibição de aviso ao proprietário no formulário de anúncio.
4. Feature flag `FEATURE_CAUCAO=false` no `.env` para habilitar quando implementada.
5. Caução PIX formal implementada na **V1**, após processo jurídico documentado e especificação técnica de SEC-FIN-7/9.

## Consequências

### Positivas
- Reduz escopo do MVP em aproximadamente 10 dias de desenvolvimento.
- Fluxo de pagamento mantido simples: 1 PaymentIntent por locação.
- Proprietários de baixo risco não são prejudicados por fricção desnecessária.

### Negativas / Trade-offs
- Proprietários de itens de maior valor (câmeras, ferramentas elétricas, equipamentos) ficam fora da plataforma no MVP.
- Teto de R$ 500 pode limitar categorias de produto viáveis para o mercado-alvo.

## Decisões relacionadas

- [[ADR-012-modelo-pix-centralizado]] — caução PIX futura seguirá o mesmo modelo centralizado
- [[ADR-014-payout-trigger]] — ausência de caução simplifica cálculo e trigger de payout
