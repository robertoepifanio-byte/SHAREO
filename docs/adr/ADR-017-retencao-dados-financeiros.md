# ADR-017 — Retenção de Dados Financeiros por 5 Anos (CTN Art. 173)

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro

---

## Contexto

Dois marcos regulatórios entram em tensão:

- **LGPD (Lei 13.709/2018):** usuário tem direito à exclusão de seus dados pessoais mediante solicitação (Art. 18, IV).
- **CTN Art. 173 + Decreto 70.235/72:** créditos tributários prescrevem em 5 anos; a Receita Federal pode autuar até esse prazo, exigindo que documentos fiscais — incluindo comprovantes de pagamento e repasses — sejam guardados pelo mesmo período.

Adicionalmente, o Marco Civil da Internet (Art. 15) exige retenção de logs de conexão por 6 meses, e registros de aplicação por 6 meses.

A estratégia de exclusão total de conta (hard delete) é incompatível com obrigações fiscais para usuários que realizaram transações financeiras na plataforma.

## Decisão

1. **`PlatformTransaction` e `Payout`** jamais sofrem hard delete dentro do período de retenção. Aplicar **soft delete** (`deletedAt`, `isAnonymized: false`) para remoção lógica da interface.
2. **Período de retenção: 5 anos** a partir da data da transação (`createdAt`). Após 5 anos, dados podem ser expurgados por job de limpeza agendado.
3. **Dados pessoais** (nome, CPF, CNPJ, chave PIX) vinculados a transações são **anonimizados** após solicitação de exclusão de conta — substituídos por hash SHA-256 — preservando a integridade financeira do registro sem manter dados identificáveis além do necessário.
4. CPF/CNPJ armazenados em campo encriptado (AES-256, ADR-005) durante o período de retenção.
5. Solicitações de exclusão total de conta de usuários com transações ativas ou dentro do período de retenção retornam resposta documentada ao titular explicando a limitação legal.

## Consequências

### Positivas
- Conformidade com CTN Art. 173 — proteção contra autuação fiscal.
- Anonimização parcial honra o espírito da LGPD sem violar obrigações fiscais.
- Job de expurgo automatizado após 5 anos elimina acúmulo indefinido de dados.

### Negativas / Trade-offs
- Usuários não podem obter exclusão total de dados financeiros dentro do período de 5 anos — necessário comunicar claramente nos Termos de Uso.
- Anonimização requer cuidado para não quebrar foreign keys ou relatórios históricos que dependam de dados do usuário.

## Decisões relacionadas

- [[ADR-005-criptografia-documentos]] — encriptação de CPF/CNPJ nos registros retidos
- [[ADR-012-modelo-pix-centralizado]] — `PlatformTransaction` e `Payout` são os modelos primários sujeitos a esta política
- [[ADR-016-exportacao-financeira]] — exportações são limitadas ao horizonte de 5 anos definido aqui
