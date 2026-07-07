# /shareo-status

**Nome do skill:** Status executivo do ShareO

Produza o status atual do projeto no template padrão abaixo. Este é o ritual mais frequente do fundador (abre a maioria das sessões com "status"/"pendências") — a resposta deve ser **consistente entre sessões** e baseada em fontes verificáveis, nunca em memória solta.

## Fontes obrigatórias (coletar antes de escrever)

1. `docs/STATUS.md` — estado declarado.
2. `git log --oneline -15` na branch atual + `git status` — trabalho em andamento.
3. `gh pr list --state open` e últimos merges (`gh pr list --state merged --limit 5`).
4. CI: `gh run list --limit 5` (workflow deploy + android-smoke).
5. `docs/backlog-atividades-priorizadas.md` — pendências P0–P3.
6. Memória do projeto (MEMORY.md) — bloqueadores e decisões (D4!).

## Template de saída

```
# Status ShareO — [data]

## 🚦 Resumo em 3 linhas
[o que mudou desde o último status, em linguagem de fundador]

## ✅ Entregue recentemente
- [PRs mesclados / deploys, com nº e link]

## 🔄 Em andamento
- [branch atual, PRs abertos, CI vermelho/verde]

## 🔴 Bloqueadores
- D4 (jurídico) — [estado atual das 4 condições]
- [outros]

## 📋 Próximos passos (ordem de prioridade)
1. ...

## ⏳ Aguardando terceiros
- [Apple Developer, contrato MP, etc.]
```

## Regras

- **Verdade verificável**: cada item de "Entregue" precisa de evidência (PR mesclado, run verde, commit). Item sem evidência vai para "Em andamento" — nunca inflar o entregue. Reportar ✅ sem verificação já minou a confiança do fundador ~10× (ver regra de verificação no CLAUDE.md).
- **D4 sempre presente** na seção de bloqueadores enquanto produção estiver gated.
- Se o status for para stakeholders externos (investidores/fundadores), gere também o PDF via pipeline `npx marked` + Chrome headless (ver memória `reference-md-to-pdf`).
- Datas sempre absolutas (dd/mm/aaaa), nunca "semana passada".
