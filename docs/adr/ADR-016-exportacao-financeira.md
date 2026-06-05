# ADR-016 — Exportação Financeira: Síncrona até 90 Dias, Assíncrona para Períodos Maiores

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro

---

## Contexto

Administradores financeiros precisam exportar relatórios de transações (CSV/XLSX) para reconciliação contábil e prestação de contas. O desafio técnico é o timeout de **10 segundos** das Vercel Serverless Functions.

Alternativas avaliadas:

- **Sempre síncrono:** simples, mas períodos longos (ex: ano fiscal completo) com alto volume de transações estouram o timeout — resposta truncada ou erro 504 para o admin.
- **Sempre assíncrono (job + polling):** elimina o problema de timeout, porém adiciona complexidade de UX (spinner, polling, e-mail) para exportações curtas que resolveriam em < 2s.
- **Híbrido por janela temporal:** exportações curtas são síncronas (resposta imediata); exportações longas disparam job assíncrono. Melhor trade-off entre simplicidade e robustez.

O volume esperado no MVP é baixo (< 200 transações/mês), logo a maioria dos relatórios operacionais cabe dentro de 90 dias sem risco de timeout.

## Decisão

1. **Se `endDate - startDate <= 90 dias`:** exportação síncrona — query direta, stream de CSV na resposta HTTP, download imediato.
2. **Se `endDate - startDate > 90 dias`:** exportação assíncrona:
   - Endpoint retorna `202 Accepted` com `jobId`.
   - Job processa em background (Vercel Background Function ou cron dedicado).
   - Arquivo gerado é salvo no **Supabase Storage** (bucket privado, path `exports/{adminId}/{jobId}.csv`).
   - URL assinada (validade 48h) enviada por e-mail ao admin solicitante.
3. Tabela `ExportJob` registra `status`, `requestedBy`, `periodStart`, `periodEnd`, `fileUrl`.
4. Limite máximo de período: **5 anos** (alinhado com ADR-017 de retenção).

## Consequências

### Positivas
- UX imediata para o caso mais comum (relatório mensal/trimestral).
- Exportações anuais ou plurianuais não geram timeout nem erro silencioso.
- Arquivo em Storage permite re-download sem reprocessamento.

### Negativas / Trade-offs
- Dois code paths distintos aumentam superfície de testes.
- Exportações longas dependem de e-mail funcional (SendGrid/Resend configurado).
- URL assinada expira em 48h — admin precisa re-solicitar se perder o e-mail.

## Decisões relacionadas

- [[ADR-017-retencao-dados-financeiros]] — define o horizonte máximo de dados exportáveis (5 anos)
- [[ADR-010-upload-imagens]] — Supabase Storage já configurado; bucket de exports usa mesma infraestrutura
